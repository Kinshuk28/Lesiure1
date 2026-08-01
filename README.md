# Stock Research Summarizer

A shippable web app that researches a listed company live and returns a sourced,
decision-support summary — snapshot, recent developments, bull and bear cases,
analyst views, red flags, a Favorable / Neutral-Watch / Unfavorable verdict, and
**scenario percentage ranges** for potential gain and loss.

Research runs server-side through a model with built-in web search — Google Gemini
on the free tier, or Anthropic's Claude if you have credit. There is no scraper to
maintain and no market-data vendor to pay.

## Run it

```bash
npm install
cp .env.example .env      # add your GEMINI_API_KEY
npm start                 # http://localhost:3000
```

**Free option (default): Google Gemini.** Get a key at
[aistudio.google.com/apikey](https://aistudio.google.com/apikey) — sign in with
Google, "Create API key", no card required. Put it in `.env` as `GEMINI_API_KEY`.

**Paid option: Anthropic.** Set `ANTHROPIC_API_KEY` instead. If both keys are
present Gemini wins; set `PROVIDER=anthropic` to override.

### Why the provider matters

Both backends share `prompt.js` and `schema.js` and enforce the same invariants,
so the methodology is identical — only the transport differs.

What is **not** negotiable is live web search. Every rule in the prompt (date every
claim, cite every source, report gaps rather than filling them) exists to stop the
model inventing plausible stock facts. Gemini qualifies because Google Search
grounding is built in; a free model without search would answer from stale training
data and fabricate its sources, which for a tool people may act on financially is
worse than not shipping.

Gemini specifics: the request combines Search grounding with structured JSON output
in one call — a **Gemini 3 series** capability. Older Gemini models reject that
combination with *"controlled generation is not supported with google_search tool"*,
so don't lower `GEMINI_MODEL` below `gemini-3.6-flash` without re-checking. The free
tier has daily request caps ([current limits](https://aistudio.google.com/rate-limit));
a 429 in the UI means you've hit them, not that the app broke.

## Deploying

**GitHub Pages will not work.** Pages serves static files and has no Node.js
runtime, so `server/index.js` never runs. Making it static would mean shipping the
API key in browser JavaScript, where anyone could read it and spend your credit.
The key has to stay server-side.

Use a host that runs the Node app from this repo. `render.yaml` configures
[Render](https://render.com) — free tier, deploys on every push to `main`:

1. Sign in to Render with GitHub.
2. **New → Blueprint**, pick this repo. Render reads `render.yaml`.
3. When prompted for `GEMINI_API_KEY`, paste your key. It is stored by Render,
   never committed here.
4. Deploy. You get a public `*.onrender.com` URL.

Render's free tier sleeps after ~15 minutes idle, so the first request after a
quiet spell takes an extra ~50 seconds to wake up.

Serverless hosts (Vercel/Netlify functions) are a poor fit as-is: a research run
streams for one to three minutes, and their free tiers cut requests off well
before that.

> ⚠️ **Anyone with the URL consumes your API quota** (or credit, on Anthropic). There is no auth or rate
> limiting in this build — see *Before you put this in front of real users* below.
> Add protection before sharing the link.

## How it works

```
browser  ──GET /api/research (SSE)──▶  Express
                                          │
                                          ▼
                                    research.js
                          picks backend by which key is set
                                          │
                    ┌─────────────────────┴─────────────────────┐
                    ▼                                           ▼
        Gemini (gemini-3.6-flash)                Claude (claude-opus-5)
        ├─ google_search grounding               ├─ web_search tool
        └─ response_format JSON schema           └─ output_config.format
                    └─────────────────────┬─────────────────────┘
                                          │
       ◀──search progress, then result────┘
```

Both paths return the same JSON shape from `schema.js`, so the frontend is
provider-agnostic.

One request per report. Search queries stream back as they run, so the page shows
what's happening during a run that typically takes one to three minutes rather
than parking the user on a spinner.

| File | Role |
|---|---|
| `server/prompt.js` | The analyst system prompt — sourcing discipline, red-flag checklist, scenario rules |
| `server/schema.js` | JSON Schema passed as `output_config.format`, which constrains the model's reply |
| `server/research.js` | Picks the backend; both expose the same interface |
| `server/research-gemini.js` | Gemini backend — Search grounding + JSON output in one call |
| `server/research-anthropic.js` | Anthropic backend — web search tool, `pause_turn` resume |
| `server/index.js` | Express + Server-Sent Events |
| `public/` | Single-page frontend, no build step |

## Gain / loss numbers

The app answers "what could I make or lose" with three ranges — bear, base, bull —
as percentage moves over a stated horizon. Each range ships with two things that
make it honest rather than a disguised prediction:

- **An anchor**: a real, dated comparable — a named peer's re-rating, this
  company's own move after a similar past event. Not a feeling. If no comparable
  was found, the model says so and widens the range instead of inventing precision.
- **An assumption chain**: explicit and falsifiable — *"margins hold above 14% and
  the GST matter resolves without penalty"* — something the reader can check later.

The bear scenario gets the same rigor as the bull. These are conditional
scenarios, never forecasts.

### The chart

Bear/base/bull around a baseline is a **diverging** comparison, so it renders as
diverging range bars on one axis centred at 0% — red downside, gray neutral, blue
upside, with a weighted zero line as the anchor.

Blue rather than green for the upside is deliberate: green reads as endorsement,
and this tool does not endorse.

The three fills were run through a palette validator for colorblind separation,
normal-vision separation, and 3:1 contrast against their own surface in both light
and dark mode. Every bar is also direct-labeled and a table view carries the same
numbers, so nothing depends on color alone.

## What it refuses to do

These are enforced, not just requested:

- **The bear case can never be empty.** A report without one is rejected server-side
  rather than rendered, so a one-sided summary never reaches the page.
- **No claim without a source and a date.** The output schema requires both on every
  development, case point, analyst view, and red flag. The single worst failure mode
  in stock research is presenting a months-old article as current news; dating every
  claim is what makes the rest trustworthy.
- **Gaps are reported, never filled.** Missing news, stale results, and unavailable
  price/volume data each have a place in the output. A fabricated number is worse
  than an admitted gap because the reader may act on it.
- **Conflicting analyst views stay conflicting.** They are listed individually and
  never averaged into a fake consensus — the disagreement names the variable that
  decides the outcome, and averaging throws that signal away.
- **No buy/sell language.** The verdict describes the evidence, and `hinges_on` names
  what would change it.

## Configuration

| Variable | Default | Notes |
|---|---|---|
| `GEMINI_API_KEY` | — | Free tier; the server needs this **or** `ANTHROPIC_API_KEY` |
| `ANTHROPIC_API_KEY` | — | Paid alternative |
| `PROVIDER` | auto | `gemini` or `anthropic`; overrides auto-detection |
| `GEMINI_MODEL` | `gemini-3.6-flash` | Must stay on Gemini 3 series (see above) |
| `PORT` | `3000` | |
| `RESEARCH_EFFORT` | `high` | Anthropic only. `low` … `max`; `xhigh` digs harder on thin-coverage small caps |
| `MAX_SEARCHES` | `14` | Anthropic only. Raise for small caps that need more digging |

Cost scales with searches and reasoning depth, so `RESEARCH_EFFORT` and
`MAX_SEARCHES` are the two dials worth tuning for your traffic.

## Before you put this in front of real users

Deliberately out of scope for this build — flagging rather than silently omitting:

- **No auth, rate limiting, or quota.** The research endpoint is open, and each call
  spends API credit. Put it behind a login or a per-IP limit before exposing it.
- **No caching.** Two people asking about the same ticker a minute apart pay twice.
  A short-TTL cache keyed on ticker+horizon+risk is the obvious first optimization.
- **The disclaimer names SEBI**, per spec. For non-Indian listings the model appends
  the locally relevant regulator, but the SEBI line stays verbatim — change
  `DISCLAIMER` in `server/prompt.js` if that isn't right for your jurisdiction.
- **Not investment advice, and not a substitute for a licensed advisor.** Model
  output can be wrong or incomplete even with sources attached; the citations are
  there to be checked, not trusted blindly.

## Also in this repo

`.claude/skills/stock-research-summarizer/` holds the same research methodology
packaged as a Claude Code skill, for running these summaries from a terminal
instead of the web app. The two share no code — `server/prompt.js` is the app's
authoritative copy. Delete the skill directory if you only want the web app.
