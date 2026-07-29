import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { researchStock } from './research.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
const PORT = process.env.PORT || 3000;

if (!process.env.ANTHROPIC_API_KEY) {
  console.error('ANTHROPIC_API_KEY is not set. Copy .env.example to .env and add your key.');
  process.exit(1);
}

app.use(express.static(path.join(__dirname, '..', 'public')));

const VALID_HORIZONS = new Set(['short', 'medium', 'long', 'unspecified']);
const VALID_RISKS = new Set(['conservative', 'moderate', 'aggressive', 'unspecified']);

/**
 * Turn an SDK error into something worth showing a user. The raw APIError
 * stringifies to a JSON blob with a request ID in it — useful in the server
 * log, noise in the browser.
 */
function toUserMessage(err) {
  switch (err?.status) {
    case 401:
      return 'The API key was rejected. Check ANTHROPIC_API_KEY in your .env.';
    case 403:
      return 'This API key is not permitted to use the requested model.';
    case 429:
      return 'Rate limited by the API. Wait a moment and try again.';
    case 400:
      return 'The API rejected the request. Check the server log for details.';
    default:
      if (err?.status >= 500) return 'The API is temporarily unavailable. Try again shortly.';
      return err?.message || 'Research failed.';
  }
}

/**
 * Server-Sent Events so the page can show search progress during a run that
 * routinely takes a couple of minutes. A plain POST would leave the user
 * staring at a spinner with no idea whether anything is happening.
 */
app.get('/api/research', async (req, res) => {
  const query = String(req.query.q || '').trim();
  const horizon = VALID_HORIZONS.has(req.query.horizon) ? req.query.horizon : 'unspecified';
  const risk = VALID_RISKS.has(req.query.risk) ? req.query.risk : 'unspecified';

  if (!query) {
    res.status(400).json({ error: 'Missing ticker or company name.' });
    return;
  }
  if (query.length > 120) {
    res.status(400).json({ error: 'Query too long.' });
    return;
  }

  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
  });

  let closed = false;
  req.on('close', () => {
    closed = true;
  });

  const send = (event) => {
    if (closed) return;
    res.write(`data: ${JSON.stringify(event)}\n\n`);
  };

  // Proxies and load balancers will drop an idle connection well before a long
  // research run finishes; a comment line every 15s keeps it open.
  const heartbeat = setInterval(() => {
    if (!closed) res.write(': keepalive\n\n');
  }, 15000);

  try {
    send({ type: 'status', stage: 'starting', message: `Resolving ${query}…` });

    const { report, usage } = await researchStock({ query, horizon, risk, onEvent: send });

    send({ type: 'result', report, usage });
  } catch (err) {
    console.error('[research] failed:', err);
    send({ type: 'error', message: toUserMessage(err) });
  } finally {
    clearInterval(heartbeat);
    if (!closed) res.end();
  }
});

app.listen(PORT, () => {
  console.log(`Stock research summarizer running at http://localhost:${PORT}`);
});
