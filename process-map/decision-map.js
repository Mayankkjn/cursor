// Static, hand-laid-out example of a decision-node process map: a single
// decision point near the start ("Cost") fans out into three structurally
// distinct downstream processes. This mirrors the normal process map's UX
// (sidebar insights, AI summary, pan/zoom) even though the top-level shape
// here is fixed/hand-authored rather than dagre-computed. Expanding a path's
// "N tasks" chip inserts that process's real task-level map inline — the
// same task-card visual language used everywhere else in the app — and
// grows the canvas + reroutes the merge lines/End pill to make room.

// Each path is mostly one linear task sequence, but "8 deviations" means
// some cases within that same process take a detour — either a forward
// branch through an extra step before rejoining, or a genuine rework loop
// back to an earlier step (re-approval, redo). Both are real task-level
// variants, filterable by the Path filter slider exactly like deviation
// edges in the normal map. Path 2 has none, matching the AI summary's
// "only branch with zero deviations".
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
    variants: [
      { type: 'forward', afterIndex: 5, pct: 33, side: 'right', step: { name: 'Escalate to Sourcing Team', minutes: 3 } },
      { type: 'rework', fromIndex: 3, toIndex: 1, pct: 17, side: 'left' },
      { type: 'forward', afterIndex: 8, pct: 17, side: 'right', step: { name: 'Invoice Dispute Resolution', minutes: 2 } },
    ],
  },
  2: {
    cases: 18,
    steps: [
      { name: 'Create Request', minutes: 2 },
      { name: 'Auto-Approval', minutes: 5 },
      { name: 'Payment', minutes: 3 },
    ],
    variants: [],
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
    variants: [
      { type: 'forward', afterIndex: 2, pct: 17, side: 'left', step: { name: 'Escalate for Review', minutes: 3 } },
      { type: 'rework', fromIndex: 3, toIndex: 1, pct: 11, side: 'right' },
    ],
  },
};

const state = { threshold: 0 };

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
  return `${n} request${n === 1 ? '' : 's'}`;
}

// ---- builds one path's task-level map as real SVG task cards (same visual
// language as the "Process authorisation" card) connected by plain arrows ----
function taskCardSvg(x, y, title, meta, width) {
  const w = width || CARD_W;
  return `
    <g class="dm-task-card">
      <rect x="${x}" y="${y}" width="${w}" height="${CARD_H}" rx="12" />
      <rect x="${x}" y="${y}" width="4" height="${CARD_H}" rx="2" class="dm-task-accent" />
      <rect x="${x + 22}" y="${y + 16}" width="18" height="14" rx="3" class="dm-subtask-icon" />
      <text x="${x + 54}" y="${y + 30}" class="dm-task-title" style="font-size:15px;">${escapeHtml(title)}</text>
      <g class="dm-icon-kebab" transform="translate(${x + w - 22},${y + 31})">
        <circle cx="0" cy="-5" r="1.3" /><circle cx="0" cy="0" r="1.3" /><circle cx="0" cy="5" r="1.3" />
      </g>
      <g class="dm-icon-clock" transform="translate(${x + 22},${y + 42})">
        <circle cx="6" cy="6" r="6.25" fill="none" />
        <path d="M6,2.5 L6,6 L9,8" fill="none" />
      </g>
      <text x="${x + 47}" y="${y + 48}" class="dm-task-meta" style="font-size:13px;">${escapeHtml(meta)}</text>
    </g>`;
}

function arrowSvg(x1, y1, x2, y2, dashed) {
  const dash = dashed ? ' stroke-dasharray="5 4"' : '';
  const marker = dashed ? 'dm-arrow-grey' : 'dm-arrow-green';
  const color = dashed ? '#9a9fb5' : '#1f9d5c';
  return `<path d="M${x1},${y1} L${x2},${y2}" stroke="${color}" stroke-width="1.8"${dash} marker-end="url(#${marker})" fill="none" />`;
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
  const cardY = (i) => firstCardY + i * (CARD_H + GAP);

  const visibleSet = getVisibleVariantSet();
  const visible = (data.variants || []).filter((v) => visibleSet.has(v));
  const forwardByIndex = new Map(visible.filter((v) => v.type === 'forward').map((v) => [v.afterIndex, v]));
  const reworkVariants = visible.filter((v) => v.type === 'rework');

  let html = arrowSvg(cx, chipBottom, cx, firstCardY);
  data.steps.forEach((step, i) => {
    const y = cardY(i);
    html += taskCardSvg(x, y, step.name, `${step.minutes}m · ${pluralCases(data.cases)}`, CARD_W);

    if (i < data.steps.length - 1) {
      html += arrowSvg(cx, y + CARD_H, cx, cardY(i + 1));
      const fwd = forwardByIndex.get(i);
      if (fwd) html += buildDeviationBranchSvg(fwd, x, y, cardY(i + 1));
    }
  });

  reworkVariants.forEach((v) => {
    html += buildReworkLoopSvg(v, x, cardY(v.fromIndex), cardY(v.toIndex));
  });

  const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  g.setAttribute('class', 'dm-expanded-chain');
  g.setAttribute('data-path', pathId);
  g.innerHTML = html;
  return g;
}

// A minority of cases detour through an extra step before rejoining the main
// chain — rendered beside the column (left for the rightmost path, right for
// the leftmost) so it never collides with the other paths' static cards.
function buildDeviationBranchSvg(deviation, mainX, afterCardY, nextCardY) {
  const branchW = 260;
  const branchX = deviation.side === 'right' ? mainX + CARD_W + 60 : mainX - 60 - branchW;
  const branchMidY = afterCardY + CARD_H / 2;
  const nextMidY = nextCardY + CARD_H / 2;
  const mainEdgeX = deviation.side === 'right' ? mainX + CARD_W : mainX;
  const branchNearEdgeX = deviation.side === 'right' ? branchX : branchX + branchW;
  const branchCenterX = branchX + branchW / 2;

  let html = arrowSvg(mainEdgeX, branchMidY, branchNearEdgeX, branchMidY, true);
  html += taskCardSvg(branchX, afterCardY, deviation.step.name, `${deviation.step.minutes}m · ~${deviation.pct}% of requests`, branchW);
  html += `<path d="M${branchCenterX},${afterCardY + CARD_H} L${branchCenterX},${nextMidY} L${mainEdgeX},${nextMidY}" stroke="#9a9fb5" stroke-width="1.8" stroke-dasharray="5 4" marker-end="url(#dm-arrow-grey)" fill="none" />`;

  const labelX = (mainEdgeX + branchNearEdgeX) / 2;
  html += `<text x="${labelX}" y="${branchMidY - 8}" text-anchor="middle" class="dm-deviation-label">${deviation.pct}%</text>`;
  return html;
}

// A minority of cases loop back to redo an earlier step (re-approval, redo)
// — routed through a thin lane to the side of the column, spanning from the
// later step down to the earlier one, styled in the rework orange used
// throughout the app to distinguish "loops back" from forward deviations.
function buildReworkLoopSvg(variant, mainX, fromCardY, toCardY) {
  const laneOffset = 40;
  const side = variant.side || 'left';
  const laneX = side === 'right' ? mainX + CARD_W + laneOffset : mainX - laneOffset;
  const entryX = side === 'right' ? mainX + CARD_W : mainX;
  const fromMidY = fromCardY + CARD_H / 2;
  const toMidY = toCardY + CARD_H / 2;

  let html = `<path d="M${entryX},${fromMidY} L${laneX},${fromMidY} L${laneX},${toMidY} L${entryX},${toMidY}" stroke="#d17d2c" stroke-width="1.8" stroke-dasharray="5 4" marker-end="url(#dm-arrow-rework)" fill="none" />`;

  const labelY = (fromMidY + toMidY) / 2;
  const labelW = 78;
  html += `<rect x="${laneX - labelW / 2}" y="${labelY - 11}" width="${labelW}" height="22" rx="11" class="dm-rework-label-bg" />`;
  html += `<text x="${laneX}" y="${labelY + 4}" text-anchor="middle" class="dm-rework-label">${variant.pct}% rework</text>`;
  return html;
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

// ---- task-count chips: expand into a real task-level process map, inline.
// Only one path's task list is expanded at a time — opening another closes
// whichever one was open, the same "one at a time" behavior as an accordion. ----
function closeChain(pathId) {
  const chip = document.querySelector(`.dm-task-chip[data-path="${pathId}"]`);
  if (chip) chip.classList.remove('open');
  const chainG = document.querySelector(`.dm-expanded-chain[data-path="${pathId}"]`);
  if (chainG) chainG.style.display = 'none';
  chainBottoms[pathId] = CHIP_BOTTOM[pathId];
}

function openChain(pathId) {
  const chip = document.querySelector(`.dm-task-chip[data-path="${pathId}"]`);
  if (chip) chip.classList.add('open');
  let chainG = document.querySelector(`.dm-expanded-chain[data-path="${pathId}"]`);
  if (chainG) chainG.remove();
  chainG = buildExpandedChain(pathId);
  document.querySelector('#decision-graph .viewport').appendChild(chainG);
  chainBottoms[pathId] = computeChainBottomY(pathId);
}

function getOpenPathId() {
  const openChip = document.querySelector('.dm-task-chip.open');
  return openChip ? openChip.getAttribute('data-path') : null;
}

document.querySelectorAll('.dm-task-chip').forEach((chip) => {
  const pathId = chip.getAttribute('data-path');

  chip.addEventListener('click', () => {
    const wasOpen = chip.classList.contains('open');
    const currentlyOpen = getOpenPathId();
    if (currentlyOpen && currentlyOpen !== pathId) closeChain(currentlyOpen);

    if (wasOpen) closeChain(pathId);
    else openChain(pathId);

    relayout();
  });
});

// Rebuilds whichever chain is currently open so it reflects the latest
// view mode / path filter threshold, without changing what's expanded.
function refreshOpenChain() {
  const pathId = getOpenPathId();
  if (!pathId) return;
  const oldChain = document.querySelector(`.dm-expanded-chain[data-path="${pathId}"]`);
  if (oldChain) oldChain.remove();
  const chainG = buildExpandedChain(pathId);
  document.querySelector('#decision-graph .viewport').appendChild(chainG);
  chainBottoms[pathId] = computeChainBottomY(pathId);
  relayout();
}

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

// ---- Path Filter: slider runs "Popular path" (0, fewest variants) to "All
// paths" (100, everything). Variants are revealed by rank (most-frequent
// first) rather than by a frequency-percentage cutoff — a cutoff can jump
// from showing 2 variants to 20 in a single slider step whenever there's a
// gap in the frequency distribution; ranking guarantees each step in the
// slider value reveals a proportional, incremental slice instead. ----
function getAllVariants() {
  return Object.values(PATH_STEPS).flatMap((p) => p.variants || []);
}

function getVisibleVariantSet() {
  const sorted = getAllVariants().sort((a, b) => b.pct - a.pct);
  const visibleCount = Math.round((state.threshold / 100) * sorted.length);
  return new Set(sorted.slice(0, visibleCount));
}

function updatePathFilterUI() {
  const slider = document.getElementById('dm-pf-slider');
  const value = Number(slider.value);
  state.threshold = value;

  const all = getAllVariants();
  const visibleCount = getVisibleVariantSet().size;
  document.getElementById('dm-pf-value').textContent = `${value}%`;
  document.getElementById('dm-pf-subtext').textContent = `Showing ${visibleCount} of ${all.length} process variants`;
  slider.style.background = `linear-gradient(to right, #1f9d5c 0%, #1f9d5c ${value}%, #e6e7f0 ${value}%, #e6e7f0 100%)`;
}

document.getElementById('dm-pf-slider').addEventListener('input', function () {
  updatePathFilterUI();
  refreshOpenChain();
});

function stepPathFilter(delta) {
  const slider = document.getElementById('dm-pf-slider');
  slider.value = Math.min(100, Math.max(0, Number(slider.value) + delta));
  slider.dispatchEvent(new Event('input'));
}
document.getElementById('dm-pf-minus').addEventListener('click', () => stepPathFilter(-10));
document.getElementById('dm-pf-plus').addEventListener('click', () => stepPathFilter(10));

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
    <p>This process starts with a shared "Process authorisation" step, then a <strong>decision node on request cost</strong> routes each of the ${totalCases} requests into one of <strong>3 structurally distinct downstream processes</strong> — not just a deviation of one path, but genuinely different task sequences.</p>
    <p><strong>Dominant process:</strong> ${dominant.label} (${escapeHtml(dominant.condition)}) is followed by ${Math.round(dominant.pct * 100)}% of requests (${dominant.cases}), averaging ${dominant.avgLabel} end-to-end.</p>
    <p><strong>Fastest process:</strong> ${fastest.label} (${escapeHtml(fastest.condition)}) finishes fastest at ${fastest.avgLabel} on average — worth understanding why, since it's also the only branch with zero flagged deviations internally.</p>
    <p><strong>Where time concentrates:</strong> ${biggestSink.label} contributes the most total time across all requests (${biggestSink.cases} requests × ${biggestSink.avgLabel} avg), making it the best target for automation or simplification.</p>
    <p class="summary-callout">Since the decision variable (Cost) is known up front, routing logic itself is cheap to automate — the bigger opportunity is streamlining ${biggestSink.label}'s task list, which is where most of the process's total time actually goes.</p>
  `;
}

function openAISummary() {
  closeInsights();
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

function openInsights() {
  closeAISummary();
  document.getElementById('insights-btn').classList.add('active');
  document.getElementById('insights-btn').setAttribute('aria-expanded', 'true');
  document.getElementById('insights-panel').classList.remove('hidden');
}

function closeInsights() {
  document.getElementById('insights-btn').classList.remove('active');
  document.getElementById('insights-btn').setAttribute('aria-expanded', 'false');
  document.getElementById('insights-panel').classList.add('hidden');
}

document.getElementById('ai-summary-btn').addEventListener('click', () => {
  const panel = document.getElementById('ai-summary-panel');
  if (panel.classList.contains('hidden')) openAISummary();
  else closeAISummary();
});
document.getElementById('ai-summary-close').addEventListener('click', closeAISummary);

document.getElementById('insights-btn').addEventListener('click', () => {
  const panel = document.getElementById('insights-panel');
  if (panel.classList.contains('hidden')) openInsights();
  else closeInsights();
});
document.getElementById('insights-close').addEventListener('click', closeInsights);

document.getElementById('fullscreen-btn').addEventListener('click', function () {
  const isFullscreen = document.body.classList.toggle('app-fullscreen');
  this.classList.toggle('active', isFullscreen);
  this.setAttribute('aria-pressed', String(isFullscreen));
});

updatePathFilterUI();
relayout();
