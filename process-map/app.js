/* global d3, dagre, generateEventLog, buildProcessModel, normalizeCaseLog, SAMPLE_JSON_TEMPLATE, START, END */

const TASK_W = 220;
const TASK_H = 62;
const PILL_W = 108;
const PILL_H = 42;
const DIAMOND_SIZE = 84;

const state = {
  cases: [],
  model: null,
  threshold: 0, // hide edges below this % of the busiest edge
  mode: 'frequency', // 'frequency' | 'duration' | 'rework'
  highlight: null, // null | { kind: 'variant', value: variant } | { kind: 'node', value: nodeId }
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
addMarker('arrow-rework', '#d17d2c');

const taskIconGradient = defs.append('linearGradient')
  .attr('id', 'task-icon-gradient')
  .attr('x1', '0').attr('y1', '0').attr('x2', '1').attr('y2', '1');
taskIconGradient.append('stop').attr('offset', '0').attr('stop-color', '#C7C9D6');
taskIconGradient.append('stop').attr('offset', '1').attr('stop-color', '#8B8FA6');

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

function pluralCases(n) { return `${n} case${n === 1 ? '' : 's'}`; }

function labelForNode(id) {
  if (id === START) return 'Start';
  if (id === END) return 'End';
  return id;
}

function edgeKey(e) { return `${e.from}||${e.to}`; }

function setHighlight(kind, value) {
  const isSame = state.highlight && state.highlight.kind === kind && state.highlight.value === value;
  state.highlight = isSame ? null : { kind, value };
  render();
}

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
  const k = g.append('g').attr('class', 'icon-task');
  k.append('rect').attr('class', 'icon-task-body').attr('x', x).attr('y', y).attr('width', 14).attr('height', 14).attr('rx', 3.5);
  k.append('rect').attr('class', 'icon-task-highlight').attr('x', x + 2).attr('y', y + 2).attr('width', 10).attr('height', 3).attr('rx', 1.5);
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
  if (n.reworkCaseCount > 0) {
    g.append('circle').attr('class', 'node-badge').attr('cx', p.width - 34).attr('cy', 14).attr('r', 5);
  }
  appendKebab(g, p.width - 16, p.height / 2 - 11);
  appendClockIcon(g, 16, p.height - 24);
  g.append('text').attr('class', 'node-meta').attr('x', 40).attr('y', p.height - 14)
    .text(`${pluralCases(n.caseCount)} · ${formatDuration(n.avgDuration)}`);
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

  // A deviation edge is "rework" when the transition's target was already
  // visited earlier in the same case (graph.js flags this at the source),
  // as opposed to a variant that simply orders steps differently.
  renderGraph.edges.forEach((e) => {
    e.isRework = e.kind === 'deviation' && e.sourceEdges[0].reworkCaseCount > 0;
  });

  const durations = model.nodes.filter((n) => !n.virtual).map((n) => n.avgDuration);
  const durationColor = d3.scaleSequential(d3.interpolateRdYlGn)
    .domain([d3.max(durations) * 1.1, 0]); // red = slow, green = fast

  const maxReworkRate = d3.max(model.nodes.filter((n) => !n.virtual), (n) => n.reworkRate) || 0;
  const reworkColor = d3.scaleSequential(d3.interpolateOranges).domain([0, maxReworkRate || 1]);
  const metricFill = (n) => {
    if (state.mode === 'duration') return durationColor(n.avgDuration);
    if (state.mode === 'rework') return n.reworkRate > 0 ? reworkColor(n.reworkRate) : '#9fa3ba';
    return null;
  };

  const highlight = state.highlight;
  const activeSeq = highlight && highlight.kind === 'variant' ? [START, ...highlight.value.path, END] : null;
  const activeEdgeKeys = new Set();
  if (activeSeq) {
    for (let i = 0; i < activeSeq.length - 1; i++) activeEdgeKeys.add(`${activeSeq[i]}||${activeSeq[i + 1]}`);
  }
  const focusNodeId = highlight && highlight.kind === 'node' ? highlight.value : null;

  const edgeIsActive = (e) => {
    if (activeSeq) return e.sourceEdges.some((se) => activeEdgeKeys.has(`${se.from}||${se.to}`));
    if (focusNodeId) return e.sourceEdges.some((se) => se.from === focusNodeId || se.to === focusNodeId);
    return true;
  };

  // When focused on a single node, also keep its direct neighbors lit up —
  // an active edge dangling from a greyed-out box reads as a rendering bug.
  const focusNeighborIds = new Set();
  if (focusNodeId) {
    focusNeighborIds.add(focusNodeId);
    renderGraph.edges.forEach((e) => {
      if (edgeIsActive(e)) { focusNeighborIds.add(e.from); focusNeighborIds.add(e.to); }
    });
  }

  const nodeIsActive = (n) => {
    if (activeSeq) {
      if (n.kind === 'diamond') return n.sourceEdges.some((se) => activeEdgeKeys.has(`${se.from}||${se.to}`));
      return activeSeq.includes(n.id);
    }
    if (focusNodeId) return focusNeighborIds.has(n.id);
    return true;
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
    .attr('class', (e) => {
      const classes = ['edge', e.kind];
      if (e.isRework) classes.push('rework');
      if (!edgeIsActive(e)) classes.push('dimmed');
      return classes.join(' ');
    })
    .on('mouseenter', (event, e) => showTooltip(event, edgeTooltipHtml(e)))
    .on('mousemove', moveTooltip)
    .on('mouseleave', hideTooltip);

  mergedEdges.select('path.edge-path')
    .attr('d', (e) => lineGen(edgePos.get(edgeKey(e)).points))
    .attr('marker-end', (e) => {
      if (e.kind === 'happy') return 'url(#arrow-happy)';
      if (e.isRework) return 'url(#arrow-rework)';
      return 'url(#arrow-deviation)';
    })
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
    .attr('class', (n) => `node ${n.kind}${state.mode !== 'frequency' && n.kind === 'task' ? ' metric-mode' : ''}${nodeIsActive(n) ? '' : ' dimmed'}`)
    .style('--metric-fill', (n) => (n.kind === 'task' ? metricFill(n) : null))
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

  renderInsights(model);
  renderTimeList(model);
  renderReworkList(model);
  renderVariantList(model);
  renderStats(model);
  if (fit) fitToView();
}

function nodeTooltipHtml(n, model) {
  if (n.kind === 'start' || n.kind === 'end') return `<strong>${n.label}</strong>`;
  if (n.kind === 'diamond') {
    const rows = n.sourceEdges.map((e) => `<div>→ ${labelForNode(e.to)}: ${pluralCases(e.caseCount)}</div>`).join('');
    return `<strong>${pluralCases(Number(n.label))} branch here</strong>${rows}`;
  }
  const reworkLine = n.reworkCaseCount > 0
    ? `<div>${(n.reworkRate * 100).toFixed(0)}% of cases looped back to redo this step</div>`
    : '';
  return `
    <strong>${n.label}</strong>
    <div>${n.caseCount} of ${model.totalCases} cases (${(n.casePct * 100).toFixed(0)}%)</div>
    <div>Avg time in task: ${formatDuration(n.avgDuration)} · ${(n.timeShare * 100).toFixed(0)}% of all process time</div>
    <div>${n.visits} total visits${n.visits !== n.caseCount ? ' (includes rework)' : ''}</div>
    ${reworkLine}
  `;
}

function edgeTooltipHtml(e) {
  if (e.kind === 'happy') {
    return `<strong>${labelForNode(e.from)} → ${labelForNode(e.to)}</strong><div>Part of the most common path</div>`;
  }
  if (e.kind === 'deviation-bundle') {
    return `<strong>${e.sourceEdges.length} deviation paths from ${labelForNode(e.from)}</strong><div>${pluralCases(Number(e.label))} total</div>`;
  }
  const orig = e.sourceEdges[0];
  return `
    <strong>${labelForNode(orig.from)} → ${labelForNode(orig.to)}</strong>
    <div>${pluralCases(Number(e.label))} · ${e.isRework ? 'rework: loops back to an earlier step' : 'deviation from the most common path'}</div>
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

function renderInsights(model) {
  d3.select('#insight-frequent-value').text(`${(model.happyPath.pct * 100).toFixed(0)}%`);
  d3.select('#insight-frequent-detail').text(`${model.happyPath.path.length} steps · ${formatDuration(model.happyPath.avgDuration)} avg`);

  d3.select('#insight-fastest-value').text(formatDuration(model.fastestPath.avgDuration));
  d3.select('#insight-fastest-detail').text(`${(model.fastestPath.pct * 100).toFixed(1)}% of cases take this route`);

  const topTime = model.timeRanking[0];
  d3.select('#insight-timesink-value').text(topTime ? topTime.label : '–');
  d3.select('#insight-timesink-detail').text(topTime ? `${(topTime.timeShare * 100).toFixed(0)}% of all time spent across the process` : '');

  const topRework = model.reworkRanking[0];
  d3.select('#insight-rework').property('disabled', !topRework);
  d3.select('#insight-rework-value').text(topRework ? topRework.label : 'None found');
  d3.select('#insight-rework-detail').text(topRework ? `${(topRework.reworkRate * 100).toFixed(0)}% of cases looped back here` : 'No repeated steps in this data');

  const isActive = (kind, value) => state.highlight && state.highlight.kind === kind && state.highlight.value === value;
  d3.select('#insight-frequent').classed('active', isActive('variant', model.happyPath));
  d3.select('#insight-fastest').classed('active', isActive('variant', model.fastestPath));
  d3.select('#insight-timesink').classed('active', !!topTime && isActive('node', topTime.id));
  d3.select('#insight-rework').classed('active', !!topRework && isActive('node', topRework.id));
}

function renderTimeList(model) {
  const top = model.timeRanking.slice(0, 5);
  const list = d3.select('#time-list');
  const items = list.selectAll('li').data(top, (n) => n.id);
  items.exit().remove();
  const enter = items.enter().append('li').attr('class', 'metric-item');
  enter.append('div').attr('class', 'metric-item-top');
  enter.append('div').attr('class', 'metric-item-sub');
  enter.append('div').attr('class', 'metric-bar-track').append('div').attr('class', 'metric-bar-fill');

  const merged = enter.merge(items);
  merged
    .attr('class', (n) => `metric-item${state.highlight && state.highlight.kind === 'node' && state.highlight.value === n.id ? ' active' : ''}`)
    .on('click', (event, n) => setHighlight('node', n.id));
  merged.select('.metric-item-top').html((n) => `<span>${n.label}</span><span>${(n.timeShare * 100).toFixed(0)}%</span>`);
  merged.select('.metric-item-sub').text((n) => `${formatDuration(n.totalTime)} total · ${formatDuration(n.avgDuration)} avg · ${pluralCases(n.caseCount)}`);
  merged.select('.metric-bar-fill').style('width', (n) => `${Math.max(2, n.timeShare * 100)}%`);
}

function renderReworkList(model) {
  const top = model.reworkRanking.slice(0, 5);
  const list = d3.select('#rework-list');
  d3.select('#rework-list-empty').remove();

  if (!top.length) {
    list.selectAll('li').remove();
    list.node().insertAdjacentHTML('afterend', '<p id="rework-list-empty" class="metric-empty">No steps show repeated visits in this data.</p>');
    return;
  }

  const items = list.selectAll('li').data(top, (n) => n.id);
  items.exit().remove();
  const enter = items.enter().append('li').attr('class', 'metric-item rework');
  enter.append('div').attr('class', 'metric-item-top');
  enter.append('div').attr('class', 'metric-item-sub');
  enter.append('div').attr('class', 'metric-bar-track').append('div').attr('class', 'metric-bar-fill');

  const merged = enter.merge(items);
  merged
    .attr('class', (n) => `metric-item rework${state.highlight && state.highlight.kind === 'node' && state.highlight.value === n.id ? ' active' : ''}`)
    .on('click', (event, n) => setHighlight('node', n.id));
  merged.select('.metric-item-top').html((n) => `<span>${n.label}</span><span>${(n.reworkRate * 100).toFixed(0)}%</span>`);
  merged.select('.metric-item-sub').text((n) => `${pluralCases(n.reworkCaseCount)} needed rework · ${n.reworkExtraVisits} extra visit${n.reworkExtraVisits === 1 ? '' : 's'}`);
  merged.select('.metric-bar-fill').style('width', (n) => `${Math.max(2, n.reworkRate * 100)}%`);
}

function renderVariantList(model) {
  const list = d3.select('#variant-list');
  const items = list.selectAll('li').data(model.variants, (v) => v.signature);
  items.exit().remove();
  const enter = items.enter().append('li').attr('class', 'variant-item');
  enter.append('div').attr('class', 'variant-rank');
  enter.append('div').attr('class', 'variant-body');

  const merged = enter.merge(items);
  merged
    .attr('class', (v) => `variant-item${state.highlight && state.highlight.kind === 'variant' && state.highlight.value === v ? ' active' : ''}`)
    .on('click', (event, v) => setHighlight('variant', v));
  merged.select('.variant-rank').text((v) => `#${v.rank}`);
  merged.select('.variant-body').html((v) => `
    <div class="variant-pct">${(v.pct * 100).toFixed(1)}% <span class="variant-count">(${v.count} case${v.count === 1 ? '' : 's'})</span>${v === model.fastestPath ? ' <span class="fastest-badge" title="Fastest observed path">⚡ fastest</span>' : ''}</div>
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
  d3.select('#stat-rework-pct').text(`${(model.reworkedCasePct * 100).toFixed(0)}%`);
}

function regenerate(numCases) {
  state.cases = generateEventLog(numCases);
  state.model = buildProcessModel(state.cases);
  state.highlight = null;
  setSourceBadge('Sample data');
  setUploadStatus('');
  render(true);
}

function setSourceBadge(text) {
  d3.select('#source-badge').text(text);
}

function setUploadStatus(message, kind) {
  d3.select('#upload-status')
    .attr('class', `upload-status${kind ? ` ${kind}` : ''}`)
    .text(message);
}

function handleUploadFile(file) {
  if (!/\.json$/i.test(file.name) && file.type && file.type !== 'application/json') {
    setUploadStatus(`"${file.name}" doesn't look like a .json file — export your log as JSON and try again.`, 'error');
    return;
  }
  const reader = new FileReader();
  reader.onload = () => {
    let raw;
    try {
      raw = JSON.parse(reader.result);
    } catch (err) {
      setUploadStatus(`"${file.name}" isn't valid JSON: ${err.message}`, 'error');
      return;
    }
    try {
      const cases = normalizeCaseLog(raw);
      state.cases = cases;
      state.model = buildProcessModel(cases);
      state.highlight = null;
      state.threshold = 0;
      d3.select('#threshold').property('value', 0);
      updateThresholdHeadline(0);
      setSourceBadge(file.name);
      setUploadStatus(`Loaded ${cases.length} case${cases.length === 1 ? '' : 's'} from "${file.name}".`, 'success');
      render(true);
      setTimeout(closeImportModal, 700);
    } catch (err) {
      setUploadStatus(`Couldn't read "${file.name}": ${err.message}`, 'error');
    }
  };
  reader.onerror = () => setUploadStatus(`Couldn't read "${file.name}".`, 'error');
  reader.readAsText(file);
}

// ---- collapsible sidebar panels ----
d3.selectAll('.panel-header').on('click', function () {
  const panel = this.closest('.panel');
  const collapsed = panel.classList.toggle('collapsed');
  d3.select(this).attr('aria-expanded', collapsed ? 'false' : 'true');
});

// ---- import modal ----
function openImportModal() { d3.select('#import-modal').classed('hidden', false); }
function closeImportModal() { d3.select('#import-modal').classed('hidden', true); }

d3.select('#import-button').on('click', openImportModal);
d3.select('#import-close').on('click', closeImportModal);
d3.select('#import-modal').on('click', function (event) {
  if (event.target === this) closeImportModal();
});
d3.select(document).on('keydown', (event) => {
  if (event.key === 'Escape' && !d3.select('#import-modal').classed('hidden')) closeImportModal();
});

// ---- upload ----
d3.select('#upload-input').on('change', function () {
  const file = this.files && this.files[0];
  if (file) handleUploadFile(file);
  this.value = '';
});

const dropzone = d3.select('#upload-dropzone');
dropzone
  .on('dragover', (event) => { event.preventDefault(); dropzone.classed('dragover', true); })
  .on('dragleave', () => dropzone.classed('dragover', false))
  .on('drop', (event) => {
    event.preventDefault();
    dropzone.classed('dragover', false);
    const file = event.dataTransfer.files && event.dataTransfer.files[0];
    if (file) handleUploadFile(file);
  });

d3.select('#download-sample').on('click', () => {
  const blob = new Blob([JSON.stringify(SAMPLE_JSON_TEMPLATE, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'process-map-sample.json';
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
});

// A programmatic <a download> click is blocked inside some sandboxed
// embeds, so "View JSON" gives a copy-pasteable fallback that always works.
function copyText(text) {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    return navigator.clipboard.writeText(text).catch(() => fallbackCopy(text));
  }
  return fallbackCopy(text);
}
function fallbackCopy(text) {
  return new Promise((resolve) => {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    try { document.execCommand('copy'); } catch (err) { /* best effort */ }
    document.body.removeChild(ta);
    resolve();
  });
}

d3.select('#toggle-sample').on('click', function () {
  const panel = d3.select('#sample-json-panel');
  const willShow = panel.classed('hidden');
  panel.classed('hidden', !willShow);
  d3.select(this).text(willShow ? 'Hide JSON' : 'View JSON');
  if (willShow && !panel.attr('data-filled')) {
    d3.select('#sample-json-code').text(JSON.stringify(SAMPLE_JSON_TEMPLATE, null, 2));
    panel.attr('data-filled', 'true');
  }
});

d3.select('#copy-sample').on('click', function () {
  const btn = d3.select(this);
  copyText(JSON.stringify(SAMPLE_JSON_TEMPLATE, null, 2)).then(() => {
    btn.text('Copied!');
    setTimeout(() => btn.text('Copy'), 1500);
  });
});

// ---- key insights ----
d3.select('#insight-frequent').on('click', () => setHighlight('variant', state.model.happyPath));
d3.select('#insight-fastest').on('click', () => setHighlight('variant', state.model.fastestPath));
d3.select('#insight-timesink').on('click', () => {
  if (state.model.timeRanking[0]) setHighlight('node', state.model.timeRanking[0].id);
});
d3.select('#insight-rework').on('click', () => {
  if (state.model.reworkRanking[0]) setHighlight('node', state.model.reworkRanking[0].id);
});

// ---- controls ----
function updateThresholdHeadline(value) {
  d3.select('#threshold-headline').text(
    value == 0 ? 'Showing all paths' : `Showing paths above ${value}% frequency`
  );
}

d3.select('#threshold').on('input', function () {
  state.threshold = +this.value / 100;
  updateThresholdHeadline(this.value);
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
  state.highlight = null;
  render();
});

// If the user arrived here by clicking a process on the Overview page,
// reflect that process's name in the header (one-time; doesn't persist
// across a plain reload of this page) and, if that row carried a real
// dataset, load it instead of the synthetic demo generator.
const selectedProcessName = sessionStorage.getItem('selectedProcessName');
const selectedProcessDataRaw = sessionStorage.getItem('selectedProcessData');
sessionStorage.removeItem('selectedProcessName');
sessionStorage.removeItem('selectedProcessData');

if (selectedProcessName) {
  document.getElementById('page-title').textContent = `Process Map — ${selectedProcessName}`;
  document.title = `Process Map — ${selectedProcessName}`;
}

let loadedFromHandoff = false;
if (selectedProcessDataRaw) {
  try {
    const cases = normalizeCaseLog(JSON.parse(selectedProcessDataRaw));
    state.cases = cases;
    state.model = buildProcessModel(cases);
    state.highlight = null;
    setSourceBadge(selectedProcessName || 'Example data');
    render(true);
    loadedFromHandoff = true;
  } catch (err) {
    // Fall through to the default demo data below if the handoff payload
    // was somehow malformed — better than a blank map.
  }
}

if (!loadedFromHandoff) regenerate(500);
