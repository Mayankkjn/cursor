/* global d3, dagre, generateEventLog, buildProcessModel, START, END */

const NODE_W = 172;
const NODE_H = 60;

const state = {
  cases: [],
  model: null,
  threshold: 0, // hide edges below this % of the busiest edge
  mode: 'frequency', // 'frequency' | 'duration'
  activeVariant: null, // variant object or null
};

const svg = d3.select('#graph');
const viewport = svg.append('g').attr('class', 'viewport');
const edgeLayer = viewport.append('g').attr('class', 'edge-layer');
const nodeLayer = viewport.append('g').attr('class', 'node-layer');
const tooltip = d3.select('#tooltip');

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

function edgeKey(e) { return `${e.from}||${e.to}`; }

function layout(model, keepNodeIds) {
  const g = new dagre.graphlib.Graph();
  g.setGraph({ rankdir: 'LR', nodesep: 26, ranksep: 90, marginx: 20, marginy: 20 });
  g.setDefaultEdgeLabel(() => ({}));

  model.nodes.forEach((n) => {
    if (!keepNodeIds.has(n.id)) return;
    g.setNode(n.id, { width: n.virtual ? 40 : NODE_W, height: n.virtual ? 40 : NODE_H });
  });
  model.edges.forEach((e) => {
    if (e.hidden) return;
    g.setEdge(e.from, e.to, { weight: e.count });
  });

  dagre.layout(g);

  const nodePos = new Map();
  g.nodes().forEach((id) => nodePos.set(id, g.node(id)));
  const edgePos = new Map();
  g.edges().forEach((e) => edgePos.set(`${e.v}||${e.w}`, g.edge(e)));

  return { nodePos, edgePos, graph: g.graph() };
}

function applyThreshold(model, thresholdPct) {
  const maxEdgeCount = Math.max(...model.edges.map((e) => e.count));
  model.edges.forEach((e) => {
    e.hidden = e.count < maxEdgeCount * thresholdPct && !e.onHappyPath;
  });
}

function render(fit = false) {
  const model = state.model;
  applyThreshold(model, state.threshold);

  const keepNodeIds = new Set([START, END]);
  model.edges.forEach((e) => {
    if (e.hidden) return;
    keepNodeIds.add(e.from);
    keepNodeIds.add(e.to);
  });

  const { nodePos, edgePos } = layout(model, keepNodeIds);

  const maxEdgeCount = Math.max(...model.edges.map((e) => e.count));
  const strokeScale = d3.scaleSqrt().domain([1, maxEdgeCount]).range([1.5, 14]);

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

  const lineGen = d3.line().x((d) => d.x).y((d) => d.y).curve(d3.curveBasis);

  // ---- edges ----
  const visibleEdges = model.edges.filter((e) => !e.hidden && edgePos.has(edgeKey(e)));
  const edgeSel = edgeLayer.selectAll('path.edge').data(visibleEdges, edgeKey);
  edgeSel.exit().remove();
  const edgeEnter = edgeSel.enter().append('path').attr('class', 'edge');
  edgeEnter.merge(edgeSel)
    .attr('d', (e) => lineGen(edgePos.get(edgeKey(e)).points))
    .attr('stroke-width', (e) => strokeScale(e.count))
    .attr('class', (e) => {
      const dimmed = activeSeq && !activeEdgeKeys.has(edgeKey(e));
      const classes = ['edge'];
      if (dimmed) classes.push('dimmed');
      if (state.mode === 'frequency') {
        classes.push(e.onHappyPath ? 'happy' : 'deviation');
      } else {
        classes.push('duration-edge');
      }
      return classes.join(' ');
    })
    .attr('stroke', (e) => (state.mode === 'duration' ? durationColor(estimateEdgeDuration(e, model)) : null))
    .on('mouseenter', (event, e) => showTooltip(event, edgeTooltipHtml(e)))
    .on('mousemove', moveTooltip)
    .on('mouseleave', hideTooltip);

  // ---- nodes ----
  const realNodes = model.nodes.filter((n) => nodePos.has(n.id));
  const nodeSel = nodeLayer.selectAll('g.node').data(realNodes, (n) => n.id);
  nodeSel.exit().remove();
  const nodeEnter = nodeSel.enter().append('g').attr('class', 'node');

  nodeEnter.append('rect');
  nodeEnter.append('text').attr('class', 'node-title');
  nodeEnter.append('text').attr('class', 'node-meta');

  const merged = nodeEnter.merge(nodeSel);
  merged
    .attr('transform', (n) => {
      const p = nodePos.get(n.id);
      return `translate(${p.x - p.width / 2}, ${p.y - p.height / 2})`;
    })
    .attr('class', (n) => {
      const dimmed = activeSeq && !activeSeq.includes(n.id);
      const classes = ['node', n.virtual ? 'virtual' : 'task'];
      if (dimmed) classes.push('dimmed');
      return classes.join(' ');
    })
    .on('mouseenter', (event, n) => showTooltip(event, nodeTooltipHtml(n, model)))
    .on('mousemove', moveTooltip)
    .on('mouseleave', hideTooltip);

  merged.select('rect')
    .attr('width', (n) => nodePos.get(n.id).width)
    .attr('height', (n) => nodePos.get(n.id).height)
    .attr('rx', (n) => (n.virtual ? 20 : 10))
    .style('fill', (n) => (state.mode === 'duration' && !n.virtual ? durationColor(n.avgDuration) : null));

  merged.classed('duration-mode', (n) => state.mode === 'duration' && !n.virtual);

  merged.select('text.node-title')
    .attr('x', (n) => nodePos.get(n.id).width / 2)
    .attr('y', (n) => (n.virtual ? nodePos.get(n.id).height / 2 + 4 : 22))
    .attr('text-anchor', 'middle')
    .text((n) => (n.virtual ? n.label : n.label));

  merged.select('text.node-meta')
    .attr('x', (n) => nodePos.get(n.id).width / 2)
    .attr('y', 40)
    .attr('text-anchor', 'middle')
    .text((n) => (n.virtual ? '' : `${n.caseCount} cases · ${formatDuration(n.avgDuration)}`));

  renderVariantList(model);
  renderStats(model);
  if (fit) fitToView();
}

function estimateEdgeDuration(e, model) {
  // Approximate a transition's "cost" using the average duration of the task it leads into.
  const target = model.nodes.find((n) => n.id === e.to);
  return target && !target.virtual ? target.avgDuration : 0;
}

function nodeTooltipHtml(n, model) {
  if (n.virtual) return `<strong>${n.label}</strong>`;
  return `
    <strong>${n.label}</strong>
    <div>${n.caseCount} of ${model.totalCases} cases (${(n.casePct * 100).toFixed(0)}%)</div>
    <div>Avg time in task: ${formatDuration(n.avgDuration)}</div>
    <div>${n.visits} total visits${n.visits !== n.caseCount ? ' (includes rework)' : ''}</div>
  `;
}

function edgeTooltipHtml(e) {
  const fromLabel = e.from === START ? 'Start' : e.from;
  const toLabel = e.to === END ? 'End' : e.to;
  return `
    <strong>${fromLabel} → ${toLabel}</strong>
    <div>${e.caseCount} cases (${(e.casePct * 100).toFixed(0)}%)</div>
    <div>${e.onHappyPath ? 'Part of the most common path' : 'Deviation from the most common path'}</div>
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
