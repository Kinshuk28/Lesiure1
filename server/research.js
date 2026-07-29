import Anthropic from '@anthropic-ai/sdk';
import { REPORT_SCHEMA } from './schema.js';
import { buildSystemPrompt, buildUserPrompt, DISCLAIMER } from './prompt.js';

const MODEL = 'claude-opus-5';

// Thinking is on by default on Opus 5, and max_tokens caps thinking + response
// text together. Sizing this tightly around the expected JSON would truncate
// mid-report, so leave real headroom and stream (which is also why we never hit
// the SDK's non-streaming timeout guard).
const MAX_TOKENS = 24000;

// A long research turn can pause when the server-side search loop hits its
// iteration limit. Each resume costs a round trip, so cap it.
const MAX_RESUMES = 4;

const client = new Anthropic();

/**
 * Runs one research report, emitting progress events as it goes.
 *
 * @param {object} opts
 * @param {(event: {type: string, [k: string]: unknown}) => void} opts.onEvent
 * @returns {Promise<object>} the parsed report
 */
export async function researchStock({ query, horizon, risk, onEvent }) {
  const today = new Date().toISOString().slice(0, 10);

  const effort = process.env.RESEARCH_EFFORT || 'high';
  const maxSearches = Number(process.env.MAX_SEARCHES || 14);

  const messages = [{ role: 'user', content: buildUserPrompt({ query, horizon, risk }) }];

  const params = {
    model: MODEL,
    max_tokens: MAX_TOKENS,
    system: buildSystemPrompt({ today }),

    // Summarized thinking gives the UI something honest to show during the
    // long quiet stretch while the model reasons between searches. Display
    // only — thinking happens and is billed the same either way.
    thinking: { type: 'adaptive', display: 'summarized' },

    output_config: {
      effort,
      format: { type: 'json_schema', schema: REPORT_SCHEMA },
    },

    // Server-side search: Anthropic runs the queries, we never touch a search
    // API. The _20260209 variant filters results before they reach the context
    // window, which matters here because stock queries return heavy SEO spam.
    tools: [{ type: 'web_search_20260209', name: 'web_search', max_uses: maxSearches }],

    messages,
  };

  let searchCount = 0;
  let finalMessage = null;

  for (let resume = 0; ; resume++) {
    const stream = client.messages.stream(params);

    // Tool inputs arrive as streamed JSON fragments, so accumulate per block
    // index and parse on close to recover the actual query string.
    const pendingToolInput = new Map();

    stream.on('streamEvent', (event) => {
      if (event.type === 'content_block_start') {
        const block = event.content_block;
        if (block.type === 'server_tool_use' && block.name === 'web_search') {
          pendingToolInput.set(event.index, '');
        } else if (block.type === 'thinking') {
          onEvent({ type: 'status', stage: 'thinking', message: 'Reasoning about what to check next…' });
        }
        return;
      }

      if (event.type === 'content_block_delta') {
        if (event.delta.type === 'input_json_delta' && pendingToolInput.has(event.index)) {
          pendingToolInput.set(event.index, pendingToolInput.get(event.index) + event.delta.partial_json);
        } else if (event.delta.type === 'thinking_delta' && event.delta.thinking) {
          onEvent({ type: 'thinking', text: event.delta.thinking });
        }
        return;
      }

      if (event.type === 'content_block_stop' && pendingToolInput.has(event.index)) {
        const raw = pendingToolInput.get(event.index);
        pendingToolInput.delete(event.index);
        searchCount += 1;
        let q = '';
        try {
          q = JSON.parse(raw).query || '';
        } catch {
          // Partial or malformed fragment — the search still ran, we just
          // can't name it in the UI.
        }
        onEvent({ type: 'search', query: q, n: searchCount, max: maxSearches });
      }
    });

    finalMessage = await stream.finalMessage();

    if (finalMessage.stop_reason !== 'pause_turn') break;

    if (resume >= MAX_RESUMES) {
      throw new Error(
        `Research did not finish after ${MAX_RESUMES} resumes — the search loop kept pausing. Try a more specific ticker.`,
      );
    }

    // Resume by appending the paused turn and re-sending. Do not add a
    // "continue" message: the API detects the trailing server_tool_use and
    // picks up where it left off.
    params.messages = [...messages, { role: 'assistant', content: finalMessage.content }];
    onEvent({ type: 'status', stage: 'resuming', message: 'Search loop paused — resuming…' });
  }

  if (finalMessage.stop_reason === 'refusal') {
    throw new Error('The request was declined by safety classifiers. Try rephrasing the company name.');
  }

  if (finalMessage.stop_reason === 'max_tokens') {
    throw new Error('The report was cut off before it finished. Try again, or narrow the request.');
  }

  const textBlock = finalMessage.content.find((b) => b.type === 'text');
  if (!textBlock) {
    throw new Error('The model returned no report text.');
  }

  let report;
  try {
    report = JSON.parse(textBlock.text);
  } catch {
    throw new Error('The model returned malformed JSON.');
  }

  // The schema constrains shape, not content. These are the two rules where a
  // silent miss would actively mislead someone, so enforce them here rather
  // than trusting the prompt alone.
  if (!Array.isArray(report.bear_case) || report.bear_case.length === 0) {
    throw new Error('Report omitted the bear case — refusing to render a one-sided summary.');
  }
  if (typeof report.disclaimer !== 'string' || !report.disclaimer.includes(DISCLAIMER)) {
    report.disclaimer = DISCLAIMER;
  }

  return {
    report,
    usage: {
      input_tokens: finalMessage.usage.input_tokens,
      output_tokens: finalMessage.usage.output_tokens,
      searches: searchCount,
    },
  };
}
