// Static, hand-laid-out example of a decision-node process map: a single
// decision point near the start ("Cost") fans out into three structurally
// distinct downstream processes. This mirrors the normal process map's UX
// (sidebar insights, AI summary, pan/zoom) even though the top-level shape
// here is fixed/hand-authored rather than dagre-computed. Expanding a path's
// "N tasks" chip inserts that process's real task-level map inline — the
// same task-card visual language used everywhere else in the app — and
// grows the canvas + reroutes the merge lines/End pill to make room.

const PATH_STEPS = {
  1: {
    cases: 6,
    steps: [
      { name: 'Create Request', minutes: 1 },
      { name: 'Manager Approval', minutes: 2 },
      { name: 'Finance Review', minutes: 1 },
      { name: 'Budget Check', minutes: 2 },
      { name: 'Legal Review', minutes: 2 },
      { name: 'Vendor Selection', minutes: 1 },
      { name: 'PO Creation', minutes: 1 },
      { name: 'Goods Receipt', minutes: 2 },
      { name: 'Invoice Match', minutes: 1 },
      { name: 'Payment', minutes: 1 },
    ],
  },
  2: {
    cases: 18,
    steps: [
      { name: 'Create Request', minutes: 2 },
      { name: 'Auto-Approval', minutes: 5 },
      { name: 'Payment', minutes: 3 },
    ],
  },
  3: {
    cases: 36,
    steps: [
      { name: 'Create Request', minutes: 1 },
      { name: 'Manager Approval', minutes: 2 },
      { name: 'Finance Review', minutes: 1 },
      { name: 'Executive Approval', minutes: 4 },
      { name: 'Vendor Selection', minutes: 2 },
      { name: 'PO Creation', minutes: 1 },
      { name: 'Payment', minutes: 2 },
    ],
  },
};

const PATH_META = {
  1: { label: 'Path 1', condition: '$50k > Cost > $10k', pct: 0.10, avgLabel: '11m 10s', cases: 6 },
  2: { label: 'Path 2', condition: 'Cost<$10K', pct: 0.30, avgLabel: '09m 50s', cases: 18 },
  3: { label: 'Path 3', condition: 'Cost>$50k', pct: 0.60, avgLabel: '12m 12s', cases: 36 },
};

// Fixed geometry of the top-level diagram (matches decision-map.html) — used
// both to know where each column's chip sits and to reroute things below it.
const COLUMN_X = { 1: 110, 2: 770, 3: 1430 };
const CHIP_BOTTOM = { 1: 870, 2: 964, 3: 870 };
const BASE_END_Y = 1076;
const CARD_W = 360;
const CARD_H = 62;
const GAP = 40;

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function pluralCases(n) {
  return `${n} case${n === 1 ? '' : 's'}`;
}

// ---- builds one path's task-level map as real SVG task cards (same visual
// language as the "Process authorisation" card) connected by plain arrows ----
function taskCardSvg(x, y, title, meta) {
  return `
    <g class="dm-task-card">
      <rect x="${x}" y="${y}" width="${CARD_W}" height="${CARD_H}" rx="12" />
      <rect x="${x}" y="${y}" width="4" height="${CARD_H}" rx="2" class="dm-task-accent" />
      <rect x="${x + 22}" y="${y + 16}" width="18" height="14" rx="3" class="dm-subtask-icon" />
      <text x="${x + 54}" y="${y + 30}" class="dm-task-title" style="font-size:15px;">${escapeHtml(title)}</text>
      <g class="dm-icon-kebab" transform="translate(${x + 338},${y + 31})">
        <circle cx="0" cy="-5" r="1.3" /><circle cx="0" cy="0" r="1.3" /><circle cx="0" cy="5" r="1.3" />
      </g>
      <g class="dm-icon-clock" transform="translate(${x + 22},${y + 42})">
        <circle cx="6" cy="6" r="6.25" fill="none" />
        <path d="M6,2.5 L6,6 L9,8" fill="none" />
      </g>
      <text x="${x + 47}" y="${y + 48}" class="dm-task-meta" style="font-size:13px;">${escapeHtml(meta)}</text>
    </g>`;
}

function arrowSvg(x1, y1, x2, y2) {
  return `<path d="M${x1},${y1} L${x2},${y2}" stroke="#1f9d5c" stroke-width="2" marker-end="url(#dm-arrow-green)" fill="none" />`;
}

function computeChainBottomY(pathId) {
  const data = PATH_STEPS[pathId];
  const firstCardY = CHIP_BOTTOM[pathId] + GAP;
  const lastCardY = firstCardY + (data.steps.length - 1) * (CARD_H + GAP);
  return lastCardY + CARD_H;
}

function buildExpandedChain(pathId) {
  const data = PATH_STEPS[pathId];
  const x = COLUMN_X[pathId];
  const cx = x + CARD_W / 2;
  const chipBottom = CHIP_BOTTOM[pathId];
  const firstCardY = chipBottom + GAP;

  let html = arrowSvg(cx, chipBottom, cx, firstCardY);
  data.steps.forEach((step, i) => {
    const y = firstCardY + i * (CARD_H + GAP);
    html += taskCardSvg(x, y, step.name, `${step.minutes}m · ${pluralCases(data.cases)}`);
    if (i < data.steps.length - 1) {
      html += arrowSvg(cx, y + CARD_H, cx, y + CARD_H + GAP);
    }
  });

  const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  g.setAttribute('class', 'dm-expanded-chain');
  g.setAttribute('data-path', pathId);
  g.innerHTML = html;
  return g;
}

// ---- dynamic layout: reroutes the merge lines + End pill to sit below
// whichever column (expanded or not) currently extends the furthest down ----
const chainBottoms = { 1: CHIP_BOTTOM[1], 2: CHIP_BOTTOM[2], 3: CHIP_BOTTOM[3] };

function relayout() {
  const mergeY = Math.max(chainBottoms[1], chainBottoms[2], chainBottoms[3]) + 56;
  const jogY = mergeY - 20;
  const endY = mergeY + 56;
  const viewBoxHeight = endY + 184;

  document.getElementById('decision-graph').setAttribute('viewBox', `0 0 1900 ${viewBoxHeight}`);
  document.getElementById('dm-merge-line-1').setAttribute('d', `M290,${chainBottoms[1]} L290,${jogY} Q290,${jogY + 10} 300,${jogY + 10} L940,${jogY + 10} Q950,${jogY + 10} 950,${mergeY}`);
  document.getElementById('dm-merge-line-2').setAttribute('d', `M950,${chainBottoms[2]} L950,${mergeY}`);
  document.getElementById('dm-merge-line-3').setAttribute('d', `M1610,${chainBottoms[3]} L1610,${jogY} Q1610,${jogY + 10} 1600,${jogY + 10} L960,${jogY + 10} Q950,${jogY + 10} 950,${mergeY}`);
  document.getElementById('dm-merge-to-end').setAttribute('d', `M950,${mergeY} L950,${endY}`);
  document.getElementById('dm-end-group').setAttribute('transform', `translate(0, ${endY - BASE_END_Y})`);
}

// ---- tooltip ----
const tooltip = document.getElementById('dm-tooltip');

function showTooltip(evt, text) {
  tooltip.textContent = text;
  tooltip.style.display = 'block';
  tooltip.style.left = `${evt.clientX + 14}px`;
  tooltip.style.top = `${evt.clientY + 14}px`;
}

function hideTooltip() {
  tooltip.style.display = 'none';
}

// ---- pan & zoom, matching the normal process map's canvas ----
const svg = d3.select('#decision-graph');
const viewport = svg.select('.viewport');
const zoomBehavior = d3.zoom()
  .scaleExtent([0.4, 2.5])
  .on('zoom', (event) => viewport.attr('transform', event.transform));
svg.call(zoomBehavior);

function focusOnPath(pathId) {
  if (!pathId) {
    svg.transition().duration(400).call(zoomBehavior.transform, d3.zoomIdentity);
    return;
  }
  const target = document.getElementById(`dm-path-card-${pathId}`);
  if (!target) return;
  target.classList.add('dm-flash');
  setTimeout(() => target.classList.remove('dm-flash'), 1300);

  const svgEl = document.getElementById('decision-graph');
  const bbox = target.getBBox();
  const vb = svgEl.viewBox.baseVal;
  const k = 1.3;
  const cx = bbox.x + bbox.width / 2;
  const cy = bbox.y + bbox.height / 2;
  const tx = vb.width / 2 - k * cx;
  const ty = vb.height / 2 - k * cy;
  svg.transition().duration(500).call(zoomBehavior.transform, d3.zoomIdentity.translate(tx, ty).scale(k));
}

// ---- task-count chips: expand into a real task-level process map, inline ----
document.querySelectorAll('.dm-task-chip').forEach((chip) => {
  const pathId = chip.getAttribute('data-path');

  chip.addEventListener('click', () => {
    const isOpen = chip.classList.toggle('open');
    let chainG = document.querySelector(`.dm-expanded-chain[data-path="${pathId}"]`);

    if (isOpen) {
      if (!chainG) {
        chainG = buildExpandedChain(pathId);
        document.querySelector('#decision-graph .viewport').appendChild(chainG);
      } else {
        chainG.style.display = '';
      }
      chainBottoms[pathId] = computeChainBottomY(pathId);
    } else if (chainG) {
      chainG.style.display = 'none';
      chainBottoms[pathId] = CHIP_BOTTOM[pathId];
    }
    relayout();
  });
});

document.querySelectorAll('.dm-watch-btn').forEach((btn) => {
  btn.addEventListener('click', (evt) => {
    showTooltip(evt, btn.getAttribute('data-tip') || 'Session playback is not available in this demo example.');
    setTimeout(hideTooltip, 2200);
  });
});

document.querySelectorAll('.dm-icon-kebab').forEach((kebab) => {
  kebab.style.cursor = 'pointer';
  kebab.addEventListener('click', (evt) => {
    showTooltip(evt, 'More options are not available in this demo example.');
    setTimeout(hideTooltip, 2200);
  });
});

// ---- sidebar: Key Takeaways + Processes list trace the map, like index.html ----
document.querySelectorAll('#dm-insight-dominant, #dm-insight-fastest, #dm-insight-timesink, #dm-insight-decision').forEach((card) => {
  card.addEventListener('click', () => focusOnPath(card.getAttribute('data-path')));
});
document.querySelectorAll('#dm-path-list .metric-item').forEach((item) => {
  item.style.cursor = 'pointer';
  item.addEventListener('click', () => focusOnPath(item.getAttribute('data-path')));
});

// ---- collapsible sidebar panels (same accordion pattern as index.html) ----
document.querySelectorAll('.panel-header').forEach((header) => {
  header.addEventListener('click', () => {
    const panel = header.closest('.panel');
    const collapsed = panel.classList.toggle('collapsed');
    header.setAttribute('aria-expanded', collapsed ? 'false' : 'true');
  });
});

// ---- AI summary panel ----
function parseDuration(label) {
  const m = label.match(/(\d+)m\s*(\d+)s/);
  if (!m) return 0;
  return Number(m[1]) + Number(m[2]) / 60;
}

function buildDecisionAISummaryHtml() {
  const paths = [1, 2, 3].map((id) => ({ id, ...PATH_META[id] }));
  const dominant = paths.reduce((a, b) => (b.pct > a.pct ? b : a));
  const fastest = paths.reduce((a, b) => (parseDuration(b.avgLabel) < parseDuration(a.avgLabel) ? b : a));
  const totalCases = paths.reduce((s, p) => s + p.cases, 0);
  const timeContribution = paths.map((p) => ({ ...p, totalMinutes: parseDuration(p.avgLabel) * p.cases }));
  const biggestSink = timeContribution.reduce((a, b) => (b.totalMinutes > a.totalMinutes ? b : a));

  return `
    <p>This process starts with a shared "Process authorisation" step, then a <strong>decision node on request cost</strong> routes each of the ${totalCases} cases into one of <strong>3 structurally distinct downstream processes</strong> — not just a deviation of one path, but genuinely different task sequences.</p>
    <p><strong>Dominant process:</strong> ${dominant.label} (${escapeHtml(dominant.condition)}) is followed by ${Math.round(dominant.pct * 100)}% of cases (${dominant.cases}), averaging ${dominant.avgLabel} end-to-end.</p>
    <p><strong>Fastest process:</strong> ${fastest.label} (${escapeHtml(fastest.condition)}) finishes fastest at ${fastest.avgLabel} on average — worth understanding why, since it's also the only branch with zero flagged deviations internally.</p>
    <p><strong>Where time concentrates:</strong> ${biggestSink.label} contributes the most total time across all cases (${biggestSink.cases} cases × ${biggestSink.avgLabel} avg), making it the best target for automation or simplification.</p>
    <p class="summary-callout">Since the decision variable (Cost) is known up front, routing logic itself is cheap to automate — the bigger opportunity is streamlining ${biggestSink.label}'s task list, which is where most of the process's total time actually goes.</p>
  `;
}

function openAISummary() {
  const btn = document.getElementById('ai-summary-btn');
  const panel = document.getElementById('ai-summary-panel');
  const body = document.getElementById('ai-summary-body');
  btn.classList.add('active');
  btn.setAttribute('aria-expanded', 'true');
  panel.classList.remove('hidden');
  body.innerHTML = `
    <div class="ai-summary-loading">
      <div class="ai-summary-skeleton-line" style="width: 92%;"></div>
      <div class="ai-summary-skeleton-line" style="width: 78%;"></div>
      <div class="ai-summary-skeleton-line" style="width: 85%;"></div>
      <div class="ai-summary-skeleton-line" style="width: 60%;"></div>
    </div>
  `;
  setTimeout(() => {
    body.innerHTML = buildDecisionAISummaryHtml();
  }, 500);
}

function closeAISummary() {
  document.getElementById('ai-summary-btn').classList.remove('active');
  document.getElementById('ai-summary-btn').setAttribute('aria-expanded', 'false');
  document.getElementById('ai-summary-panel').classList.add('hidden');
}

document.getElementById('ai-summary-btn').addEventListener('click', () => {
  const panel = document.getElementById('ai-summary-panel');
  if (panel.classList.contains('hidden')) openAISummary();
  else closeAISummary();
});
document.getElementById('ai-summary-close').addEventListener('click', closeAISummary);

relayout();
