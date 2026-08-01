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

const explicit = (process.env.PROVIDER || '').toLowerCase();

const hasGemini = Boolean(process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY);
const hasAnthropic = Boolean(process.env.ANTHROPIC_API_KEY);

export function selectedProvider() {
  if (explicit === 'gemini' || explicit === 'anthropic') return explicit;
  if (hasGemini) return 'gemini';
  if (hasAnthropic) return 'anthropic';
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
