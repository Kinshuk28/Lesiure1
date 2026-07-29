'use strict';

/* ---------------------------------------------------------------- helpers */

const $ = (id) => document.getElementById(id);

/** Build an element. Text always goes in via textContent — model output is
 *  never interpolated as HTML. */
function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined && text !== null && text !== '') node.textContent = String(text);
  return node;
}

const fmtPct = (v) => `${v > 0 ? '+' : ''}${Number(v).toFixed(1)}%`;

function citation(source, date) {
  const parts = [source, date].filter(Boolean);
  return parts.length ? `${parts.join(' · ')}` : '';
}

/* ------------------------------------------------------------------ theme */

const root = document.documentElement;
const savedTheme = localStorage.getItem('theme');
if (savedTheme) root.setAttribute('data-theme', savedTheme);

$('theme-toggle').addEventListener('click', () => {
  const current =
    root.getAttribute('data-theme') ||
    (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  const next = current === 'dark' ? 'light' : 'dark';
  root.setAttribute('data-theme', next);
  localStorage.setItem('theme', next);
  if (lastReport) renderScenarios(lastReport); // re-measure against new surface
});

/* ------------------------------------------------------------ SSE request */

let activeStream = null;
let lastReport = null;

$('search-form').addEventListener('submit', (e) => {
  e.preventDefault();
  const q = $('q').value.trim();
  if (!q) return;
  runResearch(q, $('horizon').value, $('risk').value);
});

function runResearch(q, horizon, risk) {
  if (activeStream) activeStream.close();

  $('report').hidden = true;
  $('error').hidden = true;
  $('progress').hidden = false;
  $('search-log').replaceChildren();
  $('progress-message').textContent = `Resolving ${q}…`;
  $('submit').disabled = true;

  const url = `/api/research?q=${encodeURIComponent(q)}&horizon=${encodeURIComponent(horizon)}&risk=${encodeURIComponent(risk)}`;
  const source = new EventSource(url);
  activeStream = source;

  source.onmessage = (msg) => {
    let event;
    try {
      event = JSON.parse(msg.data);
    } catch {
      return;
    }

    if (event.type === 'status') {
      $('progress-message').textContent = event.message;
    } else if (event.type === 'search') {
      $('progress-message').textContent = `Searching (${event.n} of ${event.max})…`;
      const li = el('li', null, event.query || 'search');
      $('search-log').appendChild(li);
      $('search-log').scrollTop = $('search-log').scrollHeight;
    } else if (event.type === 'result') {
      finish(source);
      renderReport(event.report, event.usage);
    } else if (event.type === 'error') {
      finish(source);
      showError(event.message);
    }
  };

  source.onerror = () => {
    // EventSource fires this on normal server close too, so only surface it
    // when we never got a result.
    if (activeStream === source) {
      finish(source);
      if ($('report').hidden) showError('Connection to the research stream was lost.');
    }
  };
}

function finish(source) {
  source.close();
  if (activeStream === source) activeStream = null;
  $('progress').hidden = true;
  $('submit').disabled = false;
}

function showError(message) {
  const box = $('error');
  box.replaceChildren(el('strong', null, 'Research failed. '), document.createTextNode(message));
  box.hidden = false;
}

/* ----------------------------------------------------------- report render */

function renderReport(r, usage) {
  lastReport = r;

  // Header
  $('r-company').textContent = r.resolved.company_name;
  $('r-listing').textContent = [r.resolved.ticker, r.resolved.exchange, r.resolved.currency]
    .filter(Boolean)
    .join(' · ');

  const amb = $('r-ambiguity');
  if (r.resolved.ambiguity_note && r.resolved.ambiguity_note.trim()) {
    amb.textContent = r.resolved.ambiguity_note;
    amb.hidden = false;
  } else {
    amb.hidden = true;
  }

  renderVerdict(r.verdict);

  $('r-hinges').replaceChildren(
    el('strong', null, 'What it hinges on'),
    document.createTextNode(r.verdict.hinges_on),
  );

  renderSnapshot(r.snapshot);
  renderScenarios(r);
  renderDevelopments(r);
  renderCases(r);
  renderAnalysts(r.analyst_views);
  renderRedFlags(r);
  renderMovement(r.unusual_movement);
  $('r-sector').textContent = r.sector_context;
  renderGaps(r.data_gaps);

  $('r-disclaimer').textContent = r.disclaimer;
  $('r-meta').textContent = `Compiled ${r.as_of} · ${usage.searches} searches · ${usage.output_tokens.toLocaleString()} output tokens`;

  $('report').hidden = false;
  $('report').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function renderVerdict(v) {
  const map = {
    Favorable: { cls: 'verdict-favorable', glyph: '▲' },
    'Neutral-Watch': { cls: 'verdict-neutral', glyph: '◆' },
    Unfavorable: { cls: 'verdict-unfavorable', glyph: '▼' },
  };
  const style = map[v.label] || map['Neutral-Watch'];
  const box = $('r-verdict');
  box.className = `verdict ${style.cls}`;
  box.replaceChildren(
    el('span', 'glyph', style.glyph),
    el('span', null, v.label),
    el('span', 'conf', `${v.confidence} confidence`),
  );
  box.title = v.reasoning;
}

function renderSnapshot(s) {
  const grid = $('r-snapshot');
  grid.replaceChildren();

  const item = (k, v, full) => {
    const box = el('div', `snap-item${full ? ' snap-full' : ''}`);
    box.append(el('div', 'k', k), el('div', 'v', v));
    return box;
  };

  grid.append(
    item('What it does', s.what_it_does, true),
    item('Sector', s.sector),
    item('Price', s.price),
    item('Market cap', s.market_cap),
    item('3–6 month trend', s.trend_3_6mo, true),
  );

  const sources = $('r-snapshot-sources');
  sources.replaceChildren();
  (s.sources || []).forEach((src) => sources.appendChild(el('li', null, src)));
}

/* --------------------------------------------------------- scenario chart */

const SCENARIOS = [
  { key: 'bear', label: 'Bear', cls: 'bar-bear', token: 'var(--bear)' },
  { key: 'base', label: 'Base', cls: 'bar-base', token: 'var(--base)' },
  { key: 'bull', label: 'Bull', cls: 'bar-bull', token: 'var(--bull)' },
];

function niceStep(range, target = 6) {
  const raw = range / target;
  const mag = Math.pow(10, Math.floor(Math.log10(raw)));
  const norm = raw / mag;
  const mult = norm < 1.5 ? 1 : norm < 3 ? 2 : norm < 7 ? 5 : 10;
  return mult * mag;
}

function renderScenarios(r) {
  const sc = r.scenarios;
  const months = sc.horizon_months;

  $('r-scenario-intro').textContent =
    `Percentage moves over roughly ${months} month${months === 1 ? '' : 's'}, each tied to a stated assumption chain. ` +
    `These are conditional scenarios, not forecasts — the same assumptions failing in the other direction is equally plausible.`;

  // Domain always includes 0 so the zero line is meaningful.
  const values = [0];
  SCENARIOS.forEach(({ key }) => values.push(sc[key].pct_low, sc[key].pct_high));
  const rawMin = Math.min(...values);
  const rawMax = Math.max(...values);
  const pad = Math.max((rawMax - rawMin) * 0.12, 2);
  const dMin = rawMin - pad;
  const dMax = rawMax + pad;
  const span = dMax - dMin || 1;
  const pos = (v) => ((v - dMin) / span) * 100;

  const step = niceStep(dMax - dMin);
  const ticks = [];
  for (let t = Math.ceil(dMin / step) * step; t <= dMax; t += step) {
    ticks.push(Math.abs(t) < 1e-9 ? 0 : t);
  }
  if (!ticks.some((t) => Math.abs(t) < 1e-9)) ticks.push(0);
  ticks.sort((a, b) => a - b);

  const chart = $('scenario-chart');
  chart.replaceChildren();

  SCENARIOS.forEach(({ key, label, cls, token }) => {
    const s = sc[key];
    const row = el('div', 'chart-row');
    row.appendChild(el('div', 'row-label', label));

    const track = el('div', 'track');

    ticks.forEach((t) => {
      const line = el('div', Math.abs(t) < 1e-9 ? 'zeroline' : 'gridline');
      line.style.left = `${pos(t)}%`;
      track.appendChild(line);
    });

    const left = pos(Math.min(s.pct_low, s.pct_high));
    const right = pos(Math.max(s.pct_low, s.pct_high));
    const bar = el('div', `bar ${cls}`);
    bar.style.left = `${left}%`;
    bar.style.width = `${Math.max(right - left, 1.2)}%`;
    track.appendChild(bar);

    // Direct-label every bar: identity and value never rest on hue alone.
    const text = `${fmtPct(s.pct_low)} to ${fmtPct(s.pct_high)}`;
    const lab = el('div', 'bar-label', text);
    if (right < 74) {
      lab.style.left = `calc(${right}% + 10px)`;
    } else {
      lab.style.right = `calc(${100 - left}% + 10px)`;
    }
    track.appendChild(lab);

    attachTooltip(track, { label, token, range: text, assumptions: s.assumptions, anchor: s.anchor });

    row.appendChild(track);
    chart.appendChild(row);
  });

  // Axis
  const axis = el('div', 'axis');
  axis.appendChild(el('div'));
  const axisLine = el('div', 'axis-line');
  ticks.forEach((t) => {
    const isZero = Math.abs(t) < 1e-9;
    const tick = el('div', `tick${isZero ? ' tick-zero' : ''}`, `${t > 0 ? '+' : ''}${Math.round(t)}%`);
    tick.style.left = `${pos(t)}%`;
    axisLine.appendChild(tick);
  });
  axis.appendChild(axisLine);
  chart.appendChild(axis);

  $('scenario-caption').textContent =
    `Range of modelled outcomes over ~${months} months, relative to the current price. ` +
    `Zero marks no change. Hover any bar for the assumptions and the comparable it is anchored to.`;

  // Table view — the same numbers, plus the reasoning that does not fit on a bar.
  const tbody = $('scenario-tbody');
  tbody.replaceChildren();
  SCENARIOS.forEach(({ key, label, token }) => {
    const s = sc[key];
    const tr = document.createElement('tr');

    const nameCell = document.createElement('td');
    const nameWrap = el('div', 'scenario-cell');
    const swatch = el('span', 'dot');
    swatch.style.background = token;
    nameWrap.append(swatch, el('span', null, label));
    nameCell.appendChild(nameWrap);

    const rangeCell = el('td', 'num', `${fmtPct(s.pct_low)} to ${fmtPct(s.pct_high)}`);

    tr.append(nameCell, rangeCell, el('td', null, s.assumptions), el('td', null, s.anchor));
    tbody.appendChild(tr);
  });
}

/* --------------------------------------------------------------- tooltip */

const tooltip = $('tooltip');

function attachTooltip(target, data) {
  const show = (evt) => {
    tooltip.replaceChildren();

    const title = el('div', 'tt-title');
    const swatch = el('span', 'dot');
    swatch.style.background = data.token;
    title.append(swatch, el('span', null, `${data.label} · ${data.range}`));
    tooltip.appendChild(title);

    const assume = el('div', 'tt-row');
    assume.append(el('b', null, 'Assumes: '), document.createTextNode(data.assumptions));
    tooltip.appendChild(assume);

    const anchor = el('div', 'tt-row');
    anchor.append(el('b', null, 'Anchored to: '), document.createTextNode(data.anchor));
    tooltip.appendChild(anchor);

    tooltip.hidden = false;
    position(evt);
  };

  const position = (evt) => {
    const pad = 14;
    const rect = tooltip.getBoundingClientRect();
    let x = evt.clientX + pad;
    let y = evt.clientY + pad;
    if (x + rect.width > innerWidth - 8) x = evt.clientX - rect.width - pad;
    if (y + rect.height > innerHeight - 8) y = evt.clientY - rect.height - pad;
    tooltip.style.left = `${Math.max(8, x)}px`;
    tooltip.style.top = `${Math.max(8, y)}px`;
  };

  target.addEventListener('mouseenter', show);
  target.addEventListener('mousemove', position);
  target.addEventListener('mouseleave', () => {
    tooltip.hidden = true;
  });
}

/* -------------------------------------------------------- view switching */

document.querySelectorAll('.vt-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    const view = btn.dataset.view;
    document.querySelectorAll('.vt-btn').forEach((b) => {
      const active = b === btn;
      b.classList.toggle('is-active', active);
      b.setAttribute('aria-pressed', String(active));
    });
    $('scenario-figure').hidden = view !== 'chart';
    $('scenario-table-wrap').hidden = view !== 'table';
  });
});

/* ---------------------------------------------------------- other sections */

function renderDevelopments(r) {
  $('r-window').textContent = `Searched ${r.search_window}.`;
  const list = $('r-developments');
  list.replaceChildren();

  if (!r.recent_developments.length) {
    list.appendChild(
      el('li', null, `No material news found in this window. Silence is itself information — it usually means no near-term catalyst.`),
    );
    return;
  }

  r.recent_developments.forEach((d) => {
    const li = document.createElement('li');
    li.append(
      el('div', 'claim', d.claim),
      el('div', 'why', d.why_it_matters),
      el('div', 'cite', citation(d.source, d.date)),
    );
    list.appendChild(li);
  });
}

function renderCases(r) {
  const fill = (node, items) => {
    node.replaceChildren();
    items.forEach((c) => {
      const li = document.createElement('li');
      li.append(
        el('div', 'point', c.point),
        el('div', 'evidence', c.evidence),
        el('div', 'cite', citation(c.source, c.date)),
      );
      node.appendChild(li);
    });
  };
  fill($('r-bull'), r.bull_case);
  fill($('r-bear'), r.bear_case);
}

function renderAnalysts(views) {
  const section = $('r-analyst-section');
  const box = $('r-analysts');
  box.replaceChildren();

  if (!views || !views.length) {
    section.hidden = true;
    return;
  }
  section.hidden = false;

  views.forEach((v) => {
    const card = el('div', 'analyst');
    const head = el('div', 'analyst-head');
    head.append(el('span', 'firm', v.firm), el('span', 'stance', v.stance));
    if (v.target) head.appendChild(el('span', 'target', v.target));
    card.append(head, el('div', 'why', v.reasoning), el('div', 'cite', v.date));
    box.appendChild(card);
  });
}

function renderRedFlags(r) {
  const list = $('r-redflags');
  list.replaceChildren();

  if (!r.red_flags.length) {
    const li = document.createElement('li');
    const line = el('div', 'clean');
    line.append(el('span', 'glyph', '✓'), el('span', null, 'No red flags surfaced in the checks below.'));
    li.appendChild(line);
    list.appendChild(li);
  } else {
    r.red_flags.forEach((f) => {
      const li = document.createElement('li');
      const head = el('div', 'flag-head');
      head.append(el('span', 'glyph', '⚠'), el('span', null, f.flag));
      if (f.status) head.appendChild(el('span', 'flag-status', f.status));
      li.append(
        head,
        el('div', 'flag-detail', f.detail),
        el('div', 'flag-detail', `Scale: ${f.magnitude}`),
        el('div', 'cite', citation(f.source, f.date)),
      );
      list.appendChild(li);
    });
  }

  const wrap = $('r-checked-wrap');
  const checked = $('r-checked');
  checked.replaceChildren();
  if (r.red_flags_checked && r.red_flags_checked.length) {
    r.red_flags_checked.forEach((c) => checked.appendChild(el('li', null, c)));
    wrap.hidden = false;
  } else {
    wrap.hidden = true;
  }
}

function renderMovement(m) {
  const map = {
    none_detected: { glyph: '○', text: 'Nothing unusual detected' },
    movement_explained: { glyph: '◆', text: 'Movement found and attributed' },
    movement_unexplained: { glyph: '⚠', text: 'Movement found, unexplained' },
    data_unavailable: { glyph: '—', text: 'Price/volume data not retrievable' },
  };
  const style = map[m.status] || map.data_unavailable;
  const box = $('r-movement');
  box.replaceChildren();
  const head = el('div', 'movement-head');
  head.append(el('span', 'glyph', style.glyph), el('span', null, style.text));
  box.append(head, el('div', 'movement-detail', m.detail));
}

function renderGaps(gaps) {
  const section = $('r-gaps-section');
  const list = $('r-gaps');
  list.replaceChildren();
  if (!gaps || !gaps.length) {
    section.hidden = true;
    return;
  }
  section.hidden = false;
  gaps.forEach((g) => list.appendChild(el('li', null, g)));
}
