# Red flag checklist

Step 6 of the research sequence. The reason it gets its own file and its own
dedicated searches: good news is pushed at you by company PR and picked up
everywhere, while problems sit in filings, exchange disclosures, and regulatory
orders that no one summarizes for you. If you only read what surfaces on a
generic "[company] news" search, you will systematically produce summaries that
are too optimistic.

Work the list for the relevant market. Not every item will apply — record what
you checked and found nothing on, because "no pledge disclosed as of [date]" is
a useful finding, not a blank.

## Universal

| Flag | Why it matters | What to search |
|---|---|---|
| Auditor resignation or qualified opinion | The single highest-signal governance event. Auditors rarely walk away over nothing. | `"[company]" auditor resign OR resignation OR "qualified opinion"` |
| CFO departure, especially abrupt or unexplained | Often precedes restatements. A CFO leaving "to pursue other interests" weeks before results is worth naming. | `"[company]" CFO resign OR steps down` |
| Restatement of prior financials | Prior numbers you're relying on may be wrong. | `"[company]" restate OR restatement accounts` |
| Debt covenant breach / refinancing difficulty | Turns a slow problem into a fast one. | `"[company]" covenant breach OR debt refinancing OR rating downgrade` |
| Credit rating downgrade or negative outlook | Rating agencies see the debt schedule before the market reacts. | `"[company]" rating downgrade CRISIL OR ICRA OR Moody's OR S&P` |
| Major litigation | Size it if you can — an unquantified suit is not automatically severe. | `"[company]" lawsuit OR litigation OR court order` |
| Regulatory probe or enforcement action | | `"[company]" investigation OR probe OR show cause notice` |
| Large equity dilution / frequent capital raises | Repeated raising without corresponding growth is a cash-burn tell. | `"[company]" QIP OR preferential allotment OR share sale` |
| Customer or supplier concentration | One customer at 40% of revenue is a single point of failure. | Check the annual report / risk factors section. |
| Related-party transactions at scale | Value leaking to promoter-controlled entities. | Annual report, related party disclosures. |

## India-listed (NSE/BSE)

| Flag | Why it matters | What to search |
|---|---|---|
| Promoter share pledge | Pledged promoter holdings can be force-sold in a decline, turning a drawdown into a cascade. Check the percentage pledged and its trend, not just presence. | `"[company]" promoter pledge shares percentage` |
| Promoter stake reduction | Insiders selling into strength deserves a mention. | `"[company]" promoter stake sale OR holding reduced` |
| SEBI order, notice, or adjudication | | `"[company]" SEBI order OR notice OR adjudication` |
| ASM / GSM surveillance framework | Exchange placement in Additional or Graded Surveillance signals unusual price/volume activity and brings trading restrictions — directly relevant to the 5-day movement flag. | `"[company]" ASM OR GSM surveillance NSE BSE` |
| Insolvency proceedings (IBC / NCLT) | | `"[company]" NCLT OR IBC OR insolvency` |
| Income Tax / ED / GST action | Search and seizure reports move Indian small and midcaps hard. | `"[company]" income tax raid OR ED OR GST notice` |
| Independent director resignations | Several in a short window is a governance signal in its own right. | `"[company]" independent director resign` |

## US-listed

| Flag | Why it matters | What to search |
|---|---|---|
| SEC enforcement / comment letters | | `"[company]" SEC investigation OR enforcement OR subpoena` |
| Going-concern doubt in filings | Explicit auditor statement of survival risk. | `"[company]" going concern 10-K` |
| Short-seller report | Treat as a claim to evaluate, not a verdict — but the market reaction is real either way. Note whether the company rebutted point by point. | `"[company]" short seller report OR Hindenburg OR Muddy Waters` |
| Material weakness in internal controls | Disclosed in 10-K/10-Q. Precursor to restatements. | `"[company]" material weakness internal control` |
| Heavy insider selling (Form 4) | Look for clustering, and distinguish it from scheduled 10b5-1 plan sales. | `"[company]" insider selling Form 4` |
| Class action securities litigation | | `"[company]" securities class action` |
| Delisting notice / listing standard deficiency | | `"[company]" delisting notice Nasdaq OR NYSE` |

## Sizing what you find

Finding a flag is only half the job — an unsized risk is nearly as unhelpful as
an unfound one, because the reader can't tell whether to care. For each flag,
try to establish:

- **Magnitude** — a ₹2cr penalty for a ₹40,000cr company is noise; the same
  penalty for a ₹200cr company is not.
- **Recency and status** — is it pending, settled, appealed, or resolved? A
  2019 matter closed in 2021 does not belong in a current bear case.
- **Whether it's already priced in** — if the stock fell 20% the day the probe
  was announced, the market has reacted; the open question is whether the
  reaction was proportionate.

If you find something serious that you cannot size, say exactly that in the
bear case: naming an unquantified risk is legitimate, quietly dropping it is
not.

## What not to do with red flags

Don't inflate routine disclosures into scandals. Ordinary tax notices,
standard-course litigation for a large company, and scheduled insider sales are
normal business, and treating them as alarming makes your genuine findings
easier to ignore. The bear case should contain the two or three things that
actually matter, not everything you found.
