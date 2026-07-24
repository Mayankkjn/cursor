/* global d3, dagre, generateEventLog, buildProcessModel, START, END */

const TASK_W = 220;
const TASK_H = 62;
const PILL_W = 108;
const PILL_H = 42;
const DIAMOND_SIZE = 84;

const state = {
  cases: [],
  model: null,
  threshold: 0, // hide edges below this % of the busiest edge
  mode: 'frequency', // 'frequency' | 'duration'
  activeVariant: null, // variant object or null
};

const svg = d3.select('#graph');
const defs = svg.append('defs');
const viewport = svg.append('g').attr('class', 'viewport');
const edgeLayer = viewport.append('g').attr('class', 'edge-layer');
const nodeLayer = viewport.append('g').attr('class', 'node-layer');
const tooltip = d3.select('#tooltip');

function addMarker(id, color) {
  defs.append('marker')
    .attr('id', id)
    .attr('viewBox', '0 0 10 10')
    .attr('refX', 8.5)
    .attr('refY', 5)
    .attr('markerWidth', 7)
    .attr('markerHeight', 7)
    .attr('orient', 'auto-start-reverse')
    .append('path')
    .attr('d', 'M0,0 L10,5 L0,10 z')
    .attr('fill', color);
}
addMarker('arrow-happy', '#1f9d5c');
addMarker('arrow-deviation', '#9a9fb5');

const zoomBehavior = d3.zoom()
  .scaleExtent([0.2, 2.5])
  .on('zoom', (event) => viewport.attr('transform', event.transform));
svg.call(zoomBehavior);

function fitToView() {
  const bounds = nodeLayer.node().getBBox();
  if (!bounds.width || !bounds.height) return;
  const svgNode = svg.node();
  const fullWidth = svgNode.clientWidth;
  const fullHeight = svgNode.clientHeight;
  const padding = 60;
  const scale = Math.min(
    (fullWidth - padding) / bounds.width,
    (fullHeight - padding) / bounds.height,
    1.1
  );
  const translateX = fullWidth / 2 - scale * (bounds.x + bounds.width / 2);
  const translateY = fullHeight / 2 - scale * (bounds.y + bounds.height / 2);
  svg.transition().duration(350).call(
    zoomBehavior.transform,
    d3.zoomIdentity.translate(translateX, translateY).scale(scale)
  );
}

function formatDuration(minutes) {
  if (minutes < 60) return `${Math.round(minutes)}m`;
  const hours = minutes / 60;
  if (hours < 24) return `${hours.toFixed(1)}h`;
  return `${(hours / 24).toFixed(1)}d`;
}

function labelForNode(id) {
  if (id === START) return 'Start';
  if (id === END) return 'End';
  return id;
}

function edgeKey(e) { return `${e.from}||${e.to}`; }

function applyThreshold(model, thresholdPct) {
  const maxEdgeCount = Math.max(...model.edges.map((e) => e.count));
  model.edges.forEach((e) => {
    e.hidden = e.count < maxEdgeCount * thresholdPct && !e.onHappyPath;
  });
}

// Turns the raw directly-follows graph into what actually gets drawn: the
// happy path stays as plain node-to-node edges, but when a node has more
// than one deviating destination those edges are bundled through a small
// diamond "N cases branch here" waypoint so the source node isn't fanned
// out with a tangle of individual connectors.
function buildRenderGraph(model) {
  const keepNodeIds = new Set([START, END]);
  model.edges.forEach((e) => {
    if (e.hidden) return;
    keepNodeIds.add(e.from);
    keepNodeIds.add(e.to);
  });

  const nodes = model.nodes
    .filter((n) => keepNodeIds.has(n.id))
    .map((n) => ({ ...n, kind: n.virtual ? (n.id === START ? 'start' : 'end') : 'task' }));

  const edges = [];
  const deviationByFrom = new Map();
  model.edges.forEach((e) => {
    if (e.hidden) return;
    if (e.onHappyPath) { edges.push({ from: e.from, to: e.to, kind: 'happy', sourceEdges: [e] }); return; }
    if (!deviationByFrom.has(e.from)) deviationByFrom.set(e.from, []);
    deviationByFrom.get(e.from).push(e);
  });

  deviationByFrom.forEach((group, from) => {
    if (group.length === 1) {
      const e = group[0];
      edges.push({ from: e.from, to: e.to, kind: 'deviation', label: `${e.caseCount}`, sourceEdges: [e] });
      return;
    }
    const total = group.reduce((s, e) => s + e.caseCount, 0);
    const diamondId = `diamond::${from}`;
    nodes.push({ id: diamondId, kind: 'diamond', label: `${total}`, sourceEdges: group });
    edges.push({ from, to: diamondId, kind: 'deviation-bundle', label: `${total}`, sourceEdges: group });
    group.forEach((e) => {
      edges.push({ from: diamondId, to: e.to, kind: 'deviation', label: `${e.caseCount}`, sourceEdges: [e] });
    });
  });

  return { nodes, edges };
}

function layout(renderGraph) {
  const g = new dagre.graphlib.Graph();
  g.setGraph({ rankdir: 'TB', nodesep: 46, ranksep: 64, marginx: 30, marginy: 30 });
  g.setDefaultEdgeLabel(() => ({}));

  renderGraph.nodes.forEach((n) => {
    let width = TASK_W;
    let height = TASK_H;
    if (n.kind === 'start' || n.kind === 'end') { width = PILL_W; height = PILL_H; }
    if (n.kind === 'diamond') { width = DIAMOND_SIZE; height = DIAMOND_SIZE; }
    g.setNode(n.id, { width, height });
  });
  renderGraph.edges.forEach((e) => {
    g.setEdge(e.from, e.to, { weight: e.kind === 'happy' ? 10 : 1 });
  });

  dagre.layout(g);

  const nodePos = new Map();
  g.nodes().forEach((id) => nodePos.set(id, g.node(id)));
  const edgePos = new Map();
  g.edges().forEach((e) => edgePos.set(`${e.v}||${e.w}`, g.edge(e)));

  return { nodePos, edgePos };
}

// ---- small inline icons ----
function appendTaskIcon(g, x, y) {
  g.append('rect').attr('class', 'icon-task').attr('x', x).attr('y', y).attr('width', 14).attr('height', 14).attr('rx', 3);
}
function appendKebab(g, x, y) {
  const k = g.append('g').attr('class', 'icon-kebab');
  [-5, 0, 5].forEach((dy) => k.append('circle').attr('cx', x).attr('cy', y + dy).attr('r', 1.3));
}
function appendClockIcon(g, x, y) {
  const k = g.append('g').attr('class', 'icon-clock');
  k.append('circle').attr('cx', x + 6).attr('cy', y + 6).attr('r', 6.25);
  k.append('path').attr('d', `M${x + 6},${y + 2.5} L${x + 6},${y + 6} L${x + 9},${y + 8}`);
  return k;
}
function appendFlagIcon(g, cx, cy, colorClass) {
  const k = g.append('g').attr('class', `icon-flag ${colorClass}`);
  k.append('line').attr('x1', cx - 3).attr('y1', cy - 6).attr('x2', cx - 3).attr('y2', cy + 6);
  k.append('path').attr('d', `M${cx - 3},${cy - 6} L${cx + 5},${cy - 4} L${cx - 3},${cy - 1.5} Z`);
  return k;
}

function buildTaskCard(g, n, p) {
  g.append('rect').attr('class', 'card-bg').attr('width', p.width).attr('height', p.height).attr('rx', 10);
  g.append('rect').attr('class', 'card-accent').attr('width', 4).attr('height', p.height).attr('rx', 2);
  appendTaskIcon(g, 16, 14);
  g.append('text').attr('class', 'node-title').attr('x', 40).attr('y', 25).text(n.label);
  appendKebab(g, p.width - 16, p.height / 2 - 11);
  const clock = appendClockIcon(g, 16, p.height - 24);
  g.append('text').attr('class', 'node-meta').attr('x', 40).attr('y', p.height - 14)
    .text(`${n.caseCount} cases · ${formatDuration(n.avgDuration)}`);
  return clock;
}

function buildPill(g, n, p) {
  const isStart = n.kind === 'start';
  g.append('rect').attr('class', 'pill-bg').attr('width', p.width).attr('height', p.height).attr('rx', p.height / 2);
  const cx = 22;
  const cy = p.height / 2;
  g.append('circle').attr('class', isStart ? 'badge-start' : 'badge-end').attr('cx', cx).attr('cy', cy).attr('r', 13);
  appendFlagIcon(g, cx, cy, isStart ? 'flag-start' : 'flag-end');
  g.append('text').attr('class', 'pill-label').attr('x', cx + 20).attr('y', cy + 5).text(n.label);
}

function buildDiamond(g, n, p) {
  const half = p.width / 2;
  g.append('path').attr('class', 'diamond-shape')
    .attr('d', `M${half},0 L${p.width},${half} L${half},${p.height} L0,${half} Z`);
  g.append('text').attr('class', 'diamond-label').attr('x', half).attr('y', half - 2).text(n.label);
  g.append('text').attr('class', 'diamond-sub').attr('x', half).attr('y', half + 14)
    .text(n.label === '1' ? 'case' : 'cases');
}

function estimateEdgeDuration(e, model) {
  const durations = e.sourceEdges
    .map((se) => model.nodes.find((n) => n.id === se.to))
    .filter((t) => t && !t.virtual)
    .map((t) => t.avgDuration);
  if (!durations.length) return 0;
  return durations.reduce((a, b) => a + b, 0) / durations.length;
}

function render(fit = false) {
  const model = state.model;
  applyThreshold(model, state.threshold);
  const renderGraph = buildRenderGraph(model);
  const { nodePos, edgePos } = layout(renderGraph);

  const durations = model.nodes.filter((n) => !n.virtual).map((n) => n.avgDuration);
  const durationColor = d3.scaleSequential(d3.interpolateRdYlGn)
    .domain([d3.max(durations) * 1.1, 0]); // red = slow, green = fast

  const activeSeq = state.activeVariant
    ? [START, ...state.activeVariant.path, END]
    : null;
  const activeEdgeKeys = new Set();
  if (activeSeq) {
    for (let i = 0; i < activeSeq.length - 1; i++) activeEdgeKeys.add(`${activeSeq[i]}||${activeSeq[i + 1]}`);
  }
  const edgeIsActive = (e) => !activeSeq || e.sourceEdges.some((se) => activeEdgeKeys.has(`${se.from}||${se.to}`));
  const nodeIsActive = (n) => {
    if (!activeSeq) return true;
    if (n.kind === 'diamond') return n.sourceEdges.some((se) => activeEdgeKeys.has(`${se.from}||${se.to}`));
    return activeSeq.includes(n.id);
  };

  const lineGen = d3.line().x((d) => d.x).y((d) => d.y).curve(d3.curveBasis);

  // ---- edges ----
  const visibleEdges = renderGraph.edges.filter((e) => edgePos.has(edgeKey(e)));
  const edgeSel = edgeLayer.selectAll('g.edge').data(visibleEdges, edgeKey);
  edgeSel.exit().remove();
  const edgeEnter = edgeSel.enter().append('g').attr('class', 'edge');
  edgeEnter.append('path').attr('class', 'edge-path');
  edgeEnter.append('g').attr('class', 'edge-label');

  const mergedEdges = edgeEnter.merge(edgeSel);
  mergedEdges
    .attr('class', (e) => `edge ${e.kind}${edgeIsActive(e) ? '' : ' dimmed'}`)
    .on('mouseenter', (event, e) => showTooltip(event, edgeTooltipHtml(e)))
    .on('mousemove', moveTooltip)
    .on('mouseleave', hideTooltip);

  mergedEdges.select('path.edge-path')
    .attr('d', (e) => lineGen(edgePos.get(edgeKey(e)).points))
    .attr('marker-end', (e) => (e.kind === 'happy' ? 'url(#arrow-happy)' : 'url(#arrow-deviation)'))
    .attr('stroke', (e) => (state.mode === 'duration' ? durationColor(estimateEdgeDuration(e, model)) : null));

  mergedEdges.each(function (e) {
    const labelGroup = d3.select(this).select('g.edge-label');
    labelGroup.selectAll('*').remove();
    if (e.kind === 'happy' || !e.label) return;
    const pts = edgePos.get(edgeKey(e)).points;
    const mid = pts[Math.floor(pts.length / 2)];
    const text = `${e.label} case${e.label === '1' ? '' : 's'}`;
    const t = labelGroup.append('text').attr('x', mid.x).attr('y', mid.y).text(text);
    const bbox = t.node().getBBox();
    labelGroup.insert('rect', 'text')
      .attr('x', bbox.x - 5).attr('y', bbox.y - 2)
      .attr('width', bbox.width + 10).attr('height', bbox.height + 4)
      .attr('rx', 4);
  });

  // ---- nodes ----
  const nodeSel = nodeLayer.selectAll('g.node').data(renderGraph.nodes, (n) => n.id);
  nodeSel.exit().remove();
  const nodeEnter = nodeSel.enter().append('g').attr('class', 'node');

  const mergedNodes = nodeEnter.merge(nodeSel);
  mergedNodes
    .attr('transform', (n) => {
      const p = nodePos.get(n.id);
      return `translate(${p.x - p.width / 2}, ${p.y - p.height / 2})`;
    })
    .attr('class', (n) => `node ${n.kind}${state.mode === 'duration' && n.kind === 'task' ? ' duration-mode' : ''}${nodeIsActive(n) ? '' : ' dimmed'}`)
    .style('--duration-fill', (n) => (state.mode === 'duration' && n.kind === 'task' ? durationColor(n.avgDuration) : null))
    .on('mouseenter', (event, n) => showTooltip(event, nodeTooltipHtml(n, model)))
    .on('mousemove', moveTooltip)
    .on('mouseleave', hideTooltip);

  mergedNodes.each(function (n) {
    const g = d3.select(this);
    g.selectAll('*').remove();
    const p = nodePos.get(n.id);
    if (n.kind === 'task') buildTaskCard(g, n, p);
    else if (n.kind === 'diamond') buildDiamond(g, n, p);
    else buildPill(g, n, p);
  });

  renderVariantList(model);
  renderStats(model);
  if (fit) fitToView();
}

function nodeTooltipHtml(n, model) {
  if (n.kind === 'start' || n.kind === 'end') return `<strong>${n.label}</strong>`;
  if (n.kind === 'diamond') {
    const rows = n.sourceEdges.map((e) => `<div>→ ${labelForNode(e.to)}: ${e.caseCount} cases</div>`).join('');
    return `<strong>${n.label} cases branch here</strong>${rows}`;
  }
  return `
    <strong>${n.label}</strong>
    <div>${n.caseCount} of ${model.totalCases} cases (${(n.casePct * 100).toFixed(0)}%)</div>
    <div>Avg time in task: ${formatDuration(n.avgDuration)}</div>
    <div>${n.visits} total visits${n.visits !== n.caseCount ? ' (includes rework)' : ''}</div>
  `;
}

function edgeTooltipHtml(e) {
  if (e.kind === 'happy') {
    return `<strong>${labelForNode(e.from)} → ${labelForNode(e.to)}</strong><div>Part of the most common path</div>`;
  }
  if (e.kind === 'deviation-bundle') {
    return `<strong>${e.sourceEdges.length} deviation paths from ${labelForNode(e.from)}</strong><div>${e.label} cases total</div>`;
  }
  const orig = e.sourceEdges[0];
  return `
    <strong>${labelForNode(orig.from)} → ${labelForNode(orig.to)}</strong>
    <div>${e.label} cases · deviation from the most common path</div>
  `;
}

function showTooltip(event, html) {
  tooltip.style('display', 'block').html(html);
  moveTooltip(event);
}
function moveTooltip(event) {
  tooltip.style('left', `${event.clientX + 14}px`).style('top', `${event.clientY + 14}px`);
}
function hideTooltip() { tooltip.style('display', 'none'); }

function renderVariantList(model) {
  const list = d3.select('#variant-list');
  const items = list.selectAll('li').data(model.variants, (v) => v.signature);
  items.exit().remove();
  const enter = items.enter().append('li').attr('class', 'variant-item');
  enter.append('div').attr('class', 'variant-rank');
  enter.append('div').attr('class', 'variant-body');

  const merged = enter.merge(items);
  merged
    .attr('class', (v) => `variant-item${state.activeVariant === v ? ' active' : ''}`)
    .on('click', (event, v) => {
      state.activeVariant = state.activeVariant === v ? null : v;
      render();
    });
  merged.select('.variant-rank').text((v) => `#${v.rank}`);
  merged.select('.variant-body').html((v) => `
    <div class="variant-pct">${(v.pct * 100).toFixed(1)}% <span class="variant-count">(${v.count} cases)</span></div>
    <div class="variant-path">${v.path.join(' → ')}</div>
    <div class="variant-duration">Avg total time: ${formatDuration(v.avgDuration)}</div>
  `);
}

function renderStats(model) {
  d3.select('#stat-cases').text(model.totalCases);
  d3.select('#stat-variants').text(model.variants.length);
  const avgTotal = model.variants.reduce((s, v) => s + v.avgDuration * v.count, 0) / model.totalCases;
  d3.select('#stat-avg-duration').text(formatDuration(avgTotal));
  d3.select('#stat-happy-pct').text(`${(model.happyPath.pct * 100).toFixed(0)}%`);
}

function regenerate(numCases) {
  state.cases = generateEventLog(numCases);
  state.model = buildProcessModel(state.cases);
  state.activeVariant = null;
  render(true);
}

// ---- controls ----
d3.select('#threshold').on('input', function () {
  state.threshold = +this.value / 100;
  d3.select('#threshold-value').text(`${this.value}%`);
  render(true);
});

d3.selectAll('input[name="mode"]').on('change', function () {
  state.mode = this.value;
  d3.select('#legend').attr('data-mode', state.mode);
  render();
});

d3.select('#regenerate').on('click', () => {
  const n = +d3.select('#case-count').property('value') || 500;
  regenerate(n);
});

d3.select('#clear-variant').on('click', () => {
  state.activeVariant = null;
  render();
});

regenerate(500);
