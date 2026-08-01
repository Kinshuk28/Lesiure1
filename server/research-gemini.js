import { GoogleGenAI } from '@google/genai';
import { REPORT_SCHEMA } from './schema.js';
import { buildSystemPrompt, buildUserPrompt, DISCLAIMER } from './prompt.js';

/**
 * Gemini backend — the free-tier option.
 *
 * Uses the Interactions API with Google Search grounding and structured
 * output in a single call. That combination is a Gemini 3 capability; on
 * older Gemini models the same request fails with "controlled generation is
 * not supported with google_search tool", so do not downgrade this model ID
 * without re-checking that limitation.
 */

const MODEL = process.env.GEMINI_MODEL || 'gemini-3.6-flash';

const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
const client = new GoogleGenAI(apiKey ? { apiKey } : {});

/**
 * Gemini's schema dialect is stricter than full JSON Schema and has
 * historically rejected `additionalProperties`. Anthropic *requires* it for
 * strict output, so the shared schema carries it and we strip it here rather
 * than maintaining two schemas that could drift apart.
 */
function toGeminiSchema(node) {
  if (Array.isArray(node)) return node.map(toGeminiSchema);
  if (node && typeof node === 'object') {
    const out = {};
    for (const [k, v] of Object.entries(node)) {
      if (k === 'additionalProperties') continue;
      out[k] = toGeminiSchema(v);
    }
    return out;
  }
  return node;
}

const GEMINI_SCHEMA = toGeminiSchema(REPORT_SCHEMA);

export async function researchStock({ query, horizon, risk, onEvent }) {
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not set.');
  }

  const today = new Date().toISOString().slice(0, 10);
  let searchCount = 0;
  let text = '';
  let finalInteraction = null;

  const stream = await client.interactions.create({
    model: MODEL,
    system_instruction: buildSystemPrompt({ today }),
    input: buildUserPrompt({ query, horizon, risk }),
    tools: [{ type: 'google_search' }],
    response_format: {
      type: 'text',
      mime_type: 'application/json',
      schema: GEMINI_SCHEMA,
    },
    stream: true,
  });

  for await (const event of stream) {
    switch (event.event_type) {
      case 'step.start': {
        const step = event.step;
        if (step?.type === 'google_search_call') {
          searchCount += 1;
          // The query isn't always present on the start event depending on
          // how the step is chunked, so fall back to a plain counter rather
          // than showing "undefined" in the UI.
          const q = step.query || step.arguments?.query || '';
          onEvent({ type: 'search', query: q, n: searchCount, max: '~' });
        } else if (step?.type === 'model_output') {
          onEvent({ type: 'status', stage: 'writing', message: 'Writing the report…' });
        }
        break;
      }

      case 'step.delta': {
        // Accumulate as a fallback in case the completed event omits
        // output_text; the JSON body streams through these deltas.
        if (event.delta?.type === 'text' && event.delta.text) text += event.delta.text;
        break;
      }

      case 'interaction.completed':
        finalInteraction = event.interaction;
        break;

      case 'error':
        throw new Error(event.error?.message || 'Gemini stream error.');

      default:
        break;
    }
  }

  const raw = (finalInteraction?.output_text || text || '').trim();
  if (!raw) throw new Error('Gemini returned no report text.');

  let report;
  try {
    report = JSON.parse(raw);
  } catch {
    // Grounded responses occasionally wrap JSON in a ```json fence despite
    // the mime type, so make one salvage attempt before giving up.
    const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
    const inner = fenced ? fenced[1].trim() : raw.slice(raw.indexOf('{'), raw.lastIndexOf('}') + 1);
    try {
      report = JSON.parse(inner);
    } catch {
      throw new Error('Gemini returned malformed JSON.');
    }
  }

  // Same two invariants the Anthropic backend enforces — a one-sided summary
  // must never reach the page, whichever model produced it.
  if (!Array.isArray(report.bear_case) || report.bear_case.length === 0) {
    throw new Error('Report omitted the bear case — refusing to render a one-sided summary.');
  }
  if (typeof report.disclaimer !== 'string' || !report.disclaimer.includes(DISCLAIMER)) {
    report.disclaimer = DISCLAIMER;
  }

  const usage = finalInteraction?.usage || {};
  return {
    report,
    usage: {
      input_tokens: usage.input_tokens ?? 0,
      output_tokens: usage.output_tokens ?? usage.total_tokens ?? 0,
      searches: searchCount,
    },
  };
}
