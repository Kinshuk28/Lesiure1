/**
 * JSON Schema for the research report.
 *
 * Passed to the Messages API as `output_config.format`, which constrains the
 * model's final text block to valid JSON matching this shape. That's what lets
 * the frontend render structured cards and a chart instead of parsing prose.
 *
 * Structured outputs reject several JSON Schema keywords — `minimum`,
 * `maxItems`, `minLength` and friends are not supported, and every object needs
 * `additionalProperties: false`. Caps like "max 5 developments" therefore live
 * in the system prompt, not here.
 */

const sourcedClaim = {
  type: 'object',
  additionalProperties: false,
  properties: {
    claim: { type: 'string', description: 'The factual statement, stated plainly.' },
    source: { type: 'string', description: 'Publication or primary source, e.g. "Business Standard" or "Company results release".' },
    date: { type: 'string', description: 'Publication date as YYYY-MM-DD. Use the article\'s stated date, never today\'s date as a stand-in.' },
    why_it_matters: { type: 'string', description: 'One sentence on the decision relevance.' },
  },
  required: ['claim', 'source', 'date', 'why_it_matters'],
};

const casePoint = {
  type: 'object',
  additionalProperties: false,
  properties: {
    point: { type: 'string', description: 'The argument in one line.' },
    evidence: { type: 'string', description: 'The specific number or event supporting it — not an adjective.' },
    source: { type: 'string' },
    date: { type: 'string', description: 'YYYY-MM-DD.' },
  },
  required: ['point', 'evidence', 'source', 'date'],
};

const scenario = {
  type: 'object',
  additionalProperties: false,
  properties: {
    pct_low: { type: 'number', description: 'Low end of the move, in percent. Negative for a decline, e.g. -22.5.' },
    pct_high: { type: 'number', description: 'High end of the move, in percent.' },
    assumptions: {
      type: 'string',
      description: 'The explicit, falsifiable assumption chain this range depends on.',
    },
    anchor: {
      type: 'string',
      description:
        'The real comparable this is anchored to — a named peer, event, or historical re-rating with a date. If no comparable was found, say so here rather than inventing one.',
    },
  },
  required: ['pct_low', 'pct_high', 'assumptions', 'anchor'],
};

export const REPORT_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    resolved: {
      type: 'object',
      additionalProperties: false,
      properties: {
        company_name: { type: 'string' },
        ticker: { type: 'string' },
        exchange: { type: 'string', description: 'e.g. NSE, BSE, NASDAQ, NYSE.' },
        currency: { type: 'string', description: 'ISO code, e.g. INR, USD.' },
        ambiguity_note: {
          type: 'string',
          description:
            'Empty string if the input mapped cleanly. Otherwise name the other listings it could have meant and which one was researched.',
        },
      },
      required: ['company_name', 'ticker', 'exchange', 'currency', 'ambiguity_note'],
    },

    as_of: { type: 'string', description: 'Date this report was compiled, YYYY-MM-DD.' },
    search_window: { type: 'string', description: 'The recency window searched, e.g. "2026-06-29 to 2026-07-29".' },

    snapshot: {
      type: 'object',
      additionalProperties: false,
      properties: {
        what_it_does: { type: 'string', description: 'Revenue mix in plain terms, not the marketing line.' },
        sector: { type: 'string' },
        price: { type: 'string', description: 'Price with currency and as-of timestamp. If not retrievable, say so explicitly.' },
        market_cap: { type: 'string', description: 'With unit as the source gave it (crore, billion). Say so if not retrievable.' },
        trend_3_6mo: { type: 'string', description: 'Direction and rough magnitude over 3-6 months, with source.' },
        sources: { type: 'array', items: { type: 'string' }, description: 'Source + date strings backing the snapshot.' },
      },
      required: ['what_it_does', 'sector', 'price', 'market_cap', 'trend_3_6mo', 'sources'],
    },

    recent_developments: {
      type: 'array',
      items: sourcedClaim,
      description: 'Max 5, most decision-relevant first. Empty array if nothing material surfaced in the window.',
    },

    bull_case: { type: 'array', items: casePoint, description: '2-3 points.' },
    bear_case: { type: 'array', items: casePoint, description: '2-3 points. Never empty.' },

    analyst_views: {
      type: 'array',
      description: 'Individual broker views. Present conflicts as conflicts — never average them into a fake consensus.',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          firm: { type: 'string' },
          stance: { type: 'string', description: 'e.g. Buy, Overweight, Underweight, Downgrade to Hold.' },
          target: { type: 'string', description: 'Price target as reported, or empty string if none given.' },
          reasoning: { type: 'string', description: 'The variable they are betting on — the most informative part.' },
          date: { type: 'string', description: 'YYYY-MM-DD.' },
        },
        required: ['firm', 'stance', 'target', 'reasoning', 'date'],
      },
    },

    sector_context: { type: 'string', description: 'Two or three sentences. Context, not the main event.' },

    red_flags: {
      type: 'array',
      description: 'Governance/regulatory/balance-sheet issues found. Empty array if the checks came back clean.',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          flag: { type: 'string' },
          detail: { type: 'string' },
          magnitude: { type: 'string', description: 'Sized against the company, or "could not size" stated plainly.' },
          status: { type: 'string', description: 'pending / settled / appealed / resolved.' },
          source: { type: 'string' },
          date: { type: 'string', description: 'YYYY-MM-DD.' },
        },
        required: ['flag', 'detail', 'magnitude', 'status', 'source', 'date'],
      },
    },

    red_flags_checked: {
      type: 'array',
      items: { type: 'string' },
      description: 'Checks run that came back clean — "no promoter pledge disclosed as of <date>" is a finding worth recording.',
    },

    unusual_movement: {
      type: 'object',
      additionalProperties: false,
      properties: {
        status: {
          type: 'string',
          enum: ['none_detected', 'movement_explained', 'movement_unexplained', 'data_unavailable'],
        },
        detail: { type: 'string', description: 'What was observed over the last 5 sessions, with source.' },
      },
      required: ['status', 'detail'],
    },

    verdict: {
      type: 'object',
      additionalProperties: false,
      properties: {
        label: { type: 'string', enum: ['Favorable', 'Neutral-Watch', 'Unfavorable'] },
        reasoning: { type: 'string', description: 'One line.' },
        confidence: { type: 'string', enum: ['low', 'medium', 'high'] },
        hinges_on: {
          type: 'string',
          description: 'The single variable that decides the outcome, and what would resolve it (with rough timing).',
        },
      },
      required: ['label', 'reasoning', 'confidence', 'hinges_on'],
    },

    scenarios: {
      type: 'object',
      additionalProperties: false,
      properties: {
        horizon_months: { type: 'number', description: 'Months the ranges apply over.' },
        bear: scenario,
        base: scenario,
        bull: scenario,
      },
      required: ['horizon_months', 'bear', 'base', 'bull'],
    },

    data_gaps: {
      type: 'array',
      items: { type: 'string' },
      description: 'What could not be found or was stale. Never leave a gap unstated.',
    },

    disclaimer: { type: 'string' },
  },

  required: [
    'resolved',
    'as_of',
    'search_window',
    'snapshot',
    'recent_developments',
    'bull_case',
    'bear_case',
    'analyst_views',
    'sector_context',
    'red_flags',
    'red_flags_checked',
    'unusual_movement',
    'verdict',
    'scenarios',
    'data_gaps',
    'disclaimer',
  ],
};
