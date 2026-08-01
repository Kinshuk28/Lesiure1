/**
 * Picks the research backend.
 *
 * Both backends export the same `researchStock({query, horizon, risk, onEvent})`
 * and enforce the same invariants, so the server and frontend don't know or
 * care which one ran. `prompt.js` and `schema.js` are shared — provider choice
 * changes the transport, not the methodology.
 *
 * Gemini is the default because it has a usable free tier with Google Search
 * grounding. Anthropic is used when its key is present, or when PROVIDER says
 * so explicitly.
 */

// Read at call time, not module scope: reading process.env when this module is
// first imported would capture the environment before .env has been loaded.
export function selectedProvider() {
  const explicit = (process.env.PROVIDER || '').trim().toLowerCase();
  if (explicit === 'gemini' || explicit === 'anthropic') return explicit;
  if (process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY) return 'gemini';
  if (process.env.ANTHROPIC_API_KEY) return 'anthropic';
  return null;
}

export function providerKeyName(provider) {
  return provider === 'anthropic' ? 'ANTHROPIC_API_KEY' : 'GEMINI_API_KEY';
}

export async function researchStock(opts) {
  const provider = selectedProvider();
  // Import lazily so a missing SDK for the unused provider can never break
  // startup for the one you're actually running.
  const mod =
    provider === 'anthropic'
      ? await import('./research-anthropic.js')
      : await import('./research-gemini.js');
  return mod.researchStock(opts);
}
