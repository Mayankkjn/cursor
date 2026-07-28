// Static, hand-laid-out example of a decision-node process map: a single
// decision point near the start ("Cost") fans out into three structurally
// distinct downstream processes. This mirrors the normal process map's UX
// (sidebar insights, AI summary, pan/zoom) even though the top-level shape
// here is fixed/hand-authored rather than dagre-computed.

const PATH_STEPS = {
  1: {
    steps: [
      { name: 'Create Request', seconds: 45, icon: 'F', color: '#ff9800' },
      { name: 'Manager Approval', seconds: 95, icon: 'M', color: '#e5484d' },
      { name: 'Finance Review', seconds: 55, icon: '$', color: '#1f9d5c' },
      { name: 'Budget Check', seconds: 65, icon: '$', color: '#1f9d5c' },
      { name: 'Legal Review', seconds: 120, icon: 'L', color: '#5b5e78' },
      { name: 'Vendor Selection', seconds: 50, icon: 'V', color: '#2563eb' },
      { name: 'PO Creation', seconds: 40, icon: 'P', color: '#7c3aed' },
      { name: 'Goods Receipt', seconds: 110, icon: 'G', color: '#0d9488' },
      { name: 'Invoice Match', seconds: 35, icon: 'I', color: '#d97706' },
      { name: 'Payment', seconds: 55, icon: '$', color: '#1f9d5c' },
    ],
    deviations: { 1: 5, 2: 11, 4: 6, 6: 8 },
  },
  2: {
    steps: [
      { name: 'Create Request', seconds: 90, icon: 'F', color: '#ff9800' },
      { name: 'Auto-Approval', seconds: 320, icon: 'A', color: '#6366f1' },
      { name: 'Payment', seconds: 180, icon: '$', color: '#1f9d5c' },
    ],
    deviations: {},
  },
  3: {
    steps: [
      { name: 'Create Request', seconds: 50, icon: 'F', color: '#ff9800' },
      { name: 'Manager Approval', seconds: 90, icon: 'M', color: '#e5484d' },
      { name: 'Finance Review', seconds: 70, icon: '$', color: '#1f9d5c' },
      { name: 'Executive Approval', seconds: 240, icon: 'M', color: '#e5484d' },
      { name: 'Vendor Selection', seconds: 90, icon: 'V', color: '#2563eb' },
      { name: 'PO Creation', seconds: 45, icon: 'P', color: '#7c3aed' },
      { name: 'Payment', seconds: 147, icon: '$', color: '#1f9d5c' },
    ],
    deviations: { 3: 9, 4: 4 },
  },
};

const PATH_META = {
  1: { label: 'Path 1', condition: '$50k > Cost > $10k', pct: 0.10, avgLabel: '11m 10s', cases: 6 },
  2: { label: 'Path 2', condition: 'Cost<$10K', pct: 0.30, avgLabel: '09m 50s', cases: 18 },
  3: { label: 'Path 3', condition: 'Cost>$50k', pct: 0.60, avgLabel: '12m 12s', cases: 36 },
};

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function formatSeconds(totalSeconds) {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  if (m === 0) return `${s}s`;
  return `${m}m ${String(s).padStart(2, '0')}s`;
}

const CLOCK_SVG = '<svg width="11" height="11" viewBox="0 0 12 12" fill="none"><circle cx="6" cy="6" r="5.25" stroke="currentColor" stroke-width="1.2"/><path d="M6,3 L6,6 L8.3,7.3" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const KEBAB_SVG = '<svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor"><circle cx="6" cy="2" r="1.1"/><circle cx="6" cy="6" r="1.1"/><circle cx="6" cy="10" r="1.1"/></svg>';
const SWAP_SVG = '<svg width="10" height="10" viewBox="0 0 11 12" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"><path d="M0,3 L9,3 M6,0 L9,3 L6,6"/><path d="M9,9 L0,9 M3,6 L0,9 L3,12"/></svg>';

// Builds a task-card-styled chain (icon, title, kebab, duration) for one
// path — the same visual language as the top-level map's task cards — with
// small deviation badges on the edges where some cases branch off.
function buildChainHtml(pathId) {
  const data = PATH_STEPS[pathId];
  if (!data) return '';
  const parts = [`<p class="dm-task-map-heading">Path ${pathId} — task-level map</p><div class="dm-chain">`];
  data.steps.forEach((step, i) => {
    parts.push(`
      <div class="dm-chain-node">
        <div class="dm-chain-icon" style="background:${step.color}">${escapeHtml(step.icon)}</div>
        <div class="dm-chain-node-body">
          <div class="dm-chain-node-title">${escapeHtml(step.name)}</div>
          <div class="dm-chain-node-meta">${CLOCK_SVG} ${formatSeconds(step.seconds)}</div>
        </div>
        <div class="dm-chain-kebab">${KEBAB_SVG}</div>
      </div>`);
    if (i < data.steps.length - 1) {
      const devPct = data.deviations[i];
      if (devPct) {
        parts.push(`
          <div class="dm-chain-connector">
            <div class="dm-chain-connector-line"></div>
            <div class="dm-chain-badge" data-tip="${devPct}% of cases deviated at this step">${SWAP_SVG} ${devPct}%</div>
          </div>`);
      } else {
        parts.push('<div class="dm-chain-connector dm-chain-connector-plain"><div class="dm-chain-connector-line"></div></div>');
      }
    }
  });
  parts.push('</div>');
  return parts.join('');
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
  const svgEl = document.getElementById('decision-graph');
  if (!pathId) {
    svg.transition().duration(400).call(zoomBehavior.transform, d3.zoomIdentity);
    return;
  }
  const target = document.getElementById(`dm-path-card-${pathId}`);
  if (!target) return;
  target.classList.add('dm-flash');
  setTimeout(() => target.classList.remove('dm-flash'), 1300);

  const bbox = target.getBBox();
  const vb = svgEl.viewBox.baseVal;
  const k = 1.3;
  const cx = bbox.x + bbox.width / 2;
  const cy = bbox.y + bbox.height / 2;
  const tx = vb.width / 2 - k * cx;
  const ty = vb.height / 2 - k * cy;
  svg.transition().duration(500).call(zoomBehavior.transform, d3.zoomIdentity.translate(tx, ty).scale(k));
}

// ---- task-count chips: expand into a task-level mini map ----
document.querySelectorAll('.dm-task-chip').forEach((chip) => {
  const pathId = chip.getAttribute('data-path');
  const panel = document.querySelector(`.dm-task-list-fo[data-path="${pathId}"]`);
  const mapDiv = panel ? panel.querySelector('.dm-task-map') : null;

  chip.addEventListener('click', () => {
    const isOpen = chip.classList.toggle('open');
    if (!panel) return;
    if (isOpen && mapDiv && !mapDiv.dataset.built) {
      mapDiv.innerHTML = buildChainHtml(pathId);
      mapDiv.dataset.built = '1';
      mapDiv.querySelectorAll('.dm-chain-badge').forEach((badge) => {
        badge.addEventListener('click', (evt) => {
          evt.stopPropagation();
          showTooltip(evt, badge.getAttribute('data-tip'));
          setTimeout(hideTooltip, 2200);
        });
      });
    }
    panel.style.display = isOpen ? 'block' : 'none';
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

function parseDuration(label) {
  const m = label.match(/(\d+)m\s*(\d+)s/);
  if (!m) return 0;
  return Number(m[1]) + Number(m[2]) / 60;
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
