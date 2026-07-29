# Search playbook

Query patterns for each research step, plus how to judge what comes back.
Read this before your first search on a market you don't work in often.

## Source quality

Stock queries attract more SEO spam than almost any other topic. A large share
of results for "[ticker] share price target" are auto-generated pages with
invented targets and no attribution. Using one of those is worse than finding
nothing, because it launders a fabricated number into your summary with a
citation that looks legitimate.

**Rank sources roughly like this:**

1. **Primary** — company filings, exchange disclosures (NSE/BSE announcements,
   SEC EDGAR), earnings releases and call transcripts, regulator orders. Slow
   to find, impossible to beat for reliability.
2. **Established financial press** — Reuters, Bloomberg, Mint, Business
   Standard, Economic Times, Moneycontrol, FT, WSJ. Good for what happened and
   when; check whether a number is reported or the outlet's own estimate.
3. **Broker research summaries via reputable outlets** — usable for analyst
   views if the outlet names the broker and the date.
4. **Aggregators and screeners** (Screener.in, Yahoo Finance, TradingView) —
   fine for structured financials and price data, but verify anything
   surprising against a primary source.
5. **Avoid** — "will [stock] make you rich", target-price content farms,
   undated listicles, forum posts, Telegram/WhatsApp tip screenshots, anything
   without a byline and a date.

**If a source has no visible date, don't use it.** You cannot honor the dating
requirement with an undated source, and an undated claim is the exact failure
mode the whole summary format exists to prevent.

When two credible sources conflict on a number, report both and say they
conflict. That is a real finding about data quality.

## Query patterns by step

Replace `[company]` with the full registered name and `[ticker]` with the
exchange symbol. Running both name and ticker variants catches different
coverage — wire services use the name, retail-facing sites use the ticker.

### 1. Snapshot

```
[company] share price
[ticker] stock price today
[company] market cap
[company] revenue breakdown segments
[company] 6 month share price performance
```

For what the company *does*, prefer the segment breakdown in the annual report
over the boilerplate "About us" paragraph. A company describing itself as a
"technology-led financial services platform" may derive 80% of revenue from
lending — the reader needs the second fact, not the first.

### 2. Recent news (last 30 days)

```
[company] news
[company] latest news [current month] [current year]
[company] earnings results
[company] announcement NSE OR BSE          (India)
[company] press release 8-K                (US)
[company] management change OR CEO OR CFO
[company] order win OR contract
```

Add the month and year to force recency. Then check each result's actual
publication date anyway — search engines routinely return old articles for
recency-worded queries, and the date in the snippet is sometimes the crawl
date, not the publication date.

### 3. Financial results

```
[company] Q[N] FY[YY] results                (India)
[company] Q[N] [year] earnings                (US)
[company] quarterly results revenue profit margin
[company] debt to equity latest
[company] annual report [year]
```

Look for direction and drivers, not a table dump. Revenue up 12% matters less
than *why* — volume, price, acquisition, or one-off. Margin trend over three or
four quarters tells you more than any single quarter's number.

### 4. Analyst sentiment

```
[company] analyst rating upgrade OR downgrade
[company] price target [current year]
[company] brokerage view [recent month]
[ticker] analyst consensus
```

Capture the broker name, the direction, the target, the date, and the stated
reason. The reason is the valuable part — it identifies the variable each side
is betting on. Prefer three well-attributed recent views to a vague "consensus
is positive."

If views conflict, that goes in the output as a conflict. Never average them.

### 5. Sector and macro

```
[sector] sector outlook [current year]
[sector] stocks India OR US [recent month]
[sector] index performance
[relevant policy/commodity] impact [sector]
```

Keep this tight. Two or three sentences on whether the sector is in favor and
why. Sector context explains a stock's move; it rarely drives the verdict on
its own, and long macro digressions crowd out company-specific findings.

### 6. Red flags

See `red-flags.md` for the full checklist and per-market query patterns.

## Unusual movement in the last 5 days

The output format asks you to flag this, and it needs real observation:

```
[company] share price surge OR fall OR jump [recent date range]
[company] volume spike
[ticker] 52 week high OR low
[company] ASM OR GSM                        (India — surveillance placement)
```

Three outcomes, all reportable:

- **Movement found and explained** — attribute it to the news and cite it.
- **Movement found, unexplained** — say so plainly. Unexplained moves on heavy
  volume often mean information not yet public or widely reported, and the
  reader should know before acting.
- **Volume data not retrievable** — say that. Do not describe volume as
  "normal" when you simply have no data; that's an invented reassurance.

## Practical notes

- **Fiscal years differ.** Indian companies run April–March, so "Q1 FY27" is
  the quarter ending June 2026. Getting this wrong makes results look a year
  stale or a year early. Always state which quarter you mean, with its
  calendar dates.
- **Currency and unit.** Indian sources use crore and lakh; ₹1 crore = 10
  million. Keep the source's unit and label it rather than converting silently.
- **Search depth.** Roughly 8–15 searches covers most companies well. Large,
  heavily covered names need fewer; small caps need more and will still leave
  gaps — flag those gaps rather than padding with sector generalities.
- **Cross-check anything surprising.** A single source claiming a dramatic
  development deserves a second search before it goes in the summary. If it
  really happened, it will be reported more than once.
