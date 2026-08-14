/* global d3, dagre, generateEventLog, buildProcessModel, normalizeCaseLog, median, SAMPLE_JSON_TEMPLATE, START, END */

const TASK_W = 220;
const TASK_H = 62;
const PILL_W = 108;
const PILL_H = 42;
const DIAMOND_SIZE = 84;
const BUBBLE_W = 172;
const BUBBLE_H = 54;
const COMPARE_BADGE_H = 22; // extra card height reserved for a fast-vs-typical badge

// Semantic zoom: a fork's deviation branches are "minor" once they drop
// below this share of the fork's total volume — bundled into one "+N minor
// variants" bubble instead of drawing every low-frequency destination
// permanently. Only bundled when there are at least this many minor
// branches (bundling a single one saves no clutter) and only when the
// destination is otherwise unconnected, so collapsing it can never orphan
// one of its own outgoing edges elsewhere in the graph.
const MINOR_SHARE = 0.2;
const MIN_MINOR_BRANCHES = 2;

const state = {
  cases: [],
  model: null,
  threshold: 100, // Path Filter slider value 0-100 (0 = fewest deviations, 100 = all)
  highlight: null, // null | { kind: 'variant', value: variant } | { kind: 'node', value: nodeId }
  expandedBubbles: new Set(), // source node ids whose "N variants" bubble is currently expanded
  comparison: null, // null | result of computeFastVsTypical() when "Compare to typical" is active
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

function pluralCases(n) { return `${n} instance${n === 1 ? '' : 's'}`; }

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

// Reveals deviation edges by rank (most-frequent first) rather than by a
// relative-frequency cutoff — a frequency threshold can jump from showing 2
// edges to 20 in a single slider step whenever there's a gap in the
// frequency distribution; ranking guarantees each step in sliderValue
// reveals a proportional, incremental slice of the edges instead.
function applyThreshold(model, sliderValue) {
  const deviations = model.edges.filter((e) => !e.onHappyPath);
  const sorted = deviations.slice().sort((a, b) => b.count - a.count);
  const visibleCount = Math.round((sliderValue / 100) * sorted.length);
  const visible = new Set(sorted.slice(0, visibleCount));
  model.edges.forEach((e) => {
    e.hidden = !e.onHappyPath && !visible.has(e);
  });
}

const FAST_COHORT_SHARE = 0.05; // bottom 5% of cases by total duration
const COMPARE_MIN_DELTA_SHARE = 0.1; // ignore per-task time deltas under 10% of the typical duration
const COMPARE_PRESENCE_HIGH = 0.5; // "normally part of" this cohort's path
const COMPARE_PRESENCE_LOW = 0.2; // "rare in / absent from" this cohort's path

// Compares the fastest-finishing cases against the happy path to surface
// concrete automation/guidance candidates: steps the fast cohort skips
// entirely, and steps it completes meaningfully faster than typical. Uses a
// cohort (the fastest 5% of cases) rather than a single "fastest variant" so
// one lucky case can't be the whole basis for a recommendation.
function computeFastVsTypical(model, cases) {
  if (!model.happyPath || cases.length < 10) return null;

  const fastCohortSize = Math.max(3, Math.round(cases.length * FAST_COHORT_SHARE));
  const sorted = cases.slice().sort((a, b) => a.totalDuration - b.totalDuration);
  const fastCohort = sorted.slice(0, fastCohortSize);

  const happyCaseIds = new Set(model.happyPath.caseIds);
  const happyCases = cases.filter((c) => happyCaseIds.has(c.caseId));
  if (!happyCases.length) return null;

  const taskStats = (caseList) => {
    const stats = new Map();
    caseList.forEach((c) => {
      const seenInCase = new Set();
      c.steps.forEach((s) => {
        const st = stats.get(s.task) || { totalDuration: 0, visits: 0, caseCount: 0 };
        st.totalDuration += s.duration;
        st.visits += 1;
        if (!seenInCase.has(s.task)) { st.caseCount += 1; seenInCase.add(s.task); }
        stats.set(s.task, st);
      });
    });
    return stats;
  };

  const happyStats = taskStats(happyCases);
  const fastStats = taskStats(fastCohort);
  const allTasks = new Set([...happyStats.keys(), ...fastStats.keys()]);

  const items = [];
  allTasks.forEach((task) => {
    const h = happyStats.get(task);
    const f = fastStats.get(task);
    const hPresence = h ? h.caseCount / happyCases.length : 0;
    const fPresence = f ? f.caseCount / fastCohort.length : 0;
    if (hPresence < COMPARE_PRESENCE_HIGH) return; // only compare against steps typical of the happy path
    const hAvg = h.totalDuration / h.visits;

    if (fPresence <= COMPARE_PRESENCE_LOW) {
      items.push({ task, kind: 'skipped', timeSaved: hAvg, hAvg, fAvg: null });
      return;
    }
    if (fPresence >= COMPARE_PRESENCE_HIGH) {
      const fAvg = f.totalDuration / f.visits;
      const delta = hAvg - fAvg;
      if (delta > 0 && delta / hAvg >= COMPARE_MIN_DELTA_SHARE) {
        items.push({ task, kind: 'faster', timeSaved: delta, hAvg, fAvg });
      }
    }
  });

  items.sort((a, b) => b.timeSaved - a.timeSaved);

  const happyAvgTotal = happyCases.reduce((s, c) => s + c.totalDuration, 0) / happyCases.length;
  const fastAvgTotal = fastCohort.reduce((s, c) => s + c.totalDuration, 0) / fastCohort.length;

  return {
    fastCohortSize: fastCohort.length,
    fastCohortPct: fastCohort.length / cases.length,
    happyAvgTotal,
    fastAvgTotal,
    totalGap: happyAvgTotal - fastAvgTotal,
    items,
  };
}

// Turns the raw directly-follows graph into what actually gets drawn: the
// happy path stays as plain node-to-node edges, but when a node has more
// than one deviating destination those edges are bundled through a small
// diamond "N cases branch here" waypoint so the source node isn't fanned
// out with a tangle of individual connectors. Semantic zoom then goes one
// step further: a fork's low-frequency branches collapse into a single
// "N variants" bubble instead of each getting its own permanent
// branch, so the map stays complete (nothing is discarded — click the
// bubble to expand it) without every rare fork being drawn at once.
function buildRenderGraph(model) {
  const survivingEdges = model.edges.filter((e) => !e.hidden);

  // How many surviving edges touch each node.
  const touchCount = new Map();
  survivingEdges.forEach((e) => {
    touchCount.set(e.from, (touchCount.get(e.from) || 0) + 1);
    touchCount.set(e.to, (touchCount.get(e.to) || 0) + 1);
  });

  const deviationsByFrom = new Map();
  survivingEdges.forEach((e) => {
    if (e.onHappyPath) return;
    if (!deviationsByFrom.has(e.from)) deviationsByFrom.set(e.from, []);
    deviationsByFrom.get(e.from).push(e);
  });

  // Pass 1: classify candidate-minor edges by relative share alone, per fork
  // (ignoring, for now, whether collapsing them is structurally safe).
  const candidatesByFork = new Map(); // from -> [edges below MINOR_SHARE]
  const allCandidates = new Set();
  deviationsByFrom.forEach((group, from) => {
    if (group.length < 3) return;
    const total = group.reduce((s, e) => s + e.caseCount, 0);
    const candidates = group.filter((e) => e.caseCount / total < MINOR_SHARE);
    if (candidates.length < MIN_MINOR_BRANCHES) return;
    candidatesByFork.set(from, candidates);
    candidates.forEach((e) => allCandidates.add(e));
  });

  // A destination stays "guaranteed visible" if some OTHER, non-candidate
  // edge already brings it into the picture (real workflows are richly
  // connected — a task rarely reached from THIS fork is often a common step
  // reached mainly from elsewhere). Folding a rare edge into a bubble is
  // always safe in that case: the node is drawn regardless via its bigger
  // connection, this fork just stops drawing its own low-frequency line
  // into it. Only an INCOMING edge counts here — a node's own outgoing
  // edge doesn't make it independently reachable, it would just orphan
  // that edge too (that's what the dead-end/terminates-at-END checks below
  // exist to catch instead).
  const guaranteedVisible = new Set([START, END]);
  survivingEdges.forEach((e) => {
    if (allCandidates.has(e)) return;
    guaranteedVisible.add(e.to);
  });

  // Decide, per fork, which of its candidate edges are actually safe to
  // bundle: destination already guaranteed visible elsewhere, a pure dead
  // end (this is its only connection), or a one-step detour that
  // terminates the case (its only other edge goes to END).
  const bundleSourceOf = new Map(); // edge -> the fork (from) whose bubble it belongs to
  const bubblesByFrom = new Map(); // from -> { minorEdges, expanded }
  candidatesByFork.forEach((candidates, from) => {
    const minor = [];
    const absorbed = []; // a bundled destination's own trailing edge to END, dropped along with it
    candidates.forEach((e) => {
      if (guaranteedVisible.has(e.to)) { minor.push(e); return; }
      const destTouch = touchCount.get(e.to);
      if (destTouch === 1) { minor.push(e); return; }
      if (destTouch === 2) {
        const trailing = survivingEdges.find((oe) => oe.from === e.to && oe.to === END);
        if (trailing) { minor.push(e); absorbed.push(trailing); }
      }
    });
    if (minor.length < MIN_MINOR_BRANCHES) return;
    bubblesByFrom.set(from, { minorEdges: minor, expanded: state.expandedBubbles.has(from) });
    minor.forEach((e) => bundleSourceOf.set(e, from));
    absorbed.forEach((e) => bundleSourceOf.set(e, from));
  });

  const keepNodeIds = new Set([START, END]);
  survivingEdges.forEach((e) => {
    const bundleFrom = bundleSourceOf.get(e);
    if (bundleFrom && !bubblesByFrom.get(bundleFrom).expanded) return; // hidden behind a collapsed bubble
    keepNodeIds.add(e.from);
    keepNodeIds.add(e.to);
  });
  bubblesByFrom.forEach((b, from) => keepNodeIds.add(`bubble::${from}`));

  const nodes = model.nodes
    .filter((n) => keepNodeIds.has(n.id))
    .map((n) => ({ ...n, kind: n.virtual ? (n.id === START ? 'start' : 'end') : 'task' }));
  bubblesByFrom.forEach((b, from) => {
    nodes.push({ id: `bubble::${from}`, kind: 'bubble', count: b.minorEdges.length, minorEdges: b.minorEdges, fromNode: from, expanded: b.expanded });
  });

  const edges = [];
  const deviationByFrom = new Map();
  survivingEdges.forEach((e) => {
    if (e.onHappyPath) { edges.push({ from: e.from, to: e.to, kind: 'happy', sourceEdges: [e] }); return; }
    const bundleFrom = bundleSourceOf.get(e);
    if (bundleFrom && !bubblesByFrom.get(bundleFrom).expanded) return; // represented by the bubble's own edge below
    if (!deviationByFrom.has(e.from)) deviationByFrom.set(e.from, []);
    deviationByFrom.get(e.from).push(e);
  });
  // The bubble always gets its own edge from the fork — a single collapsed
  // waypoint when hidden, or (once expanded) a "− Collapse" toggle sitting
  // alongside its now individually-drawn minor branches.
  bubblesByFrom.forEach((b, from) => {
    const total = b.minorEdges.reduce((s, e) => s + e.caseCount, 0);
    if (!deviationByFrom.has(from)) deviationByFrom.set(from, []);
    deviationByFrom.get(from).push({ from, to: `bubble::${from}`, caseCount: total, isBubbleEdge: true, sourceEdges: b.minorEdges });
  });

  deviationByFrom.forEach((group, from) => {
    if (group.length === 1) {
      const e = group[0];
      edges.push({ from: e.from, to: e.to, kind: 'deviation', label: `${e.caseCount}`, sourceEdges: e.sourceEdges || [e], isBubbleEdge: e.isBubbleEdge });
      return;
    }
    const total = group.reduce((s, e) => s + e.caseCount, 0);
    const diamondId = `diamond::${from}`;
    const allSourceEdges = group.flatMap((e) => e.sourceEdges || [e]);
    nodes.push({ id: diamondId, kind: 'diamond', label: `${total}`, sourceEdges: allSourceEdges });
    edges.push({ from, to: diamondId, kind: 'deviation-bundle', label: `${total}`, sourceEdges: allSourceEdges });
    group.forEach((e) => {
      edges.push({ from: diamondId, to: e.to, kind: 'deviation', label: `${e.caseCount}`, sourceEdges: e.sourceEdges || [e], isBubbleEdge: e.isBubbleEdge });
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
    if (n.kind === 'bubble') { width = BUBBLE_W; height = BUBBLE_H; }
    if (n.kind === 'task' && n.compareInfo) height += COMPARE_BADGE_H;
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
  k.append('rect').attr('class', 'icon-task-inset').attr('x', x + 2.4).attr('y', y + 2.4).attr('width', 9.2).attr('height', 9.2).attr('rx', 2);
  k.append('circle').attr('class', 'icon-task-dot').attr('cx', x + 5.6).attr('cy', y + 5.4).attr('r', 1.9);
  k.append('circle').attr('class', 'icon-task-dot').attr('cx', x + 7.6).attr('cy', y + 5.4).attr('r', 1.9);
}
function appendKebab(g, x, y, onClick) {
  const hit = g.append('g').attr('class', 'icon-kebab-hit');
  hit.append('rect').attr('x', x - 11).attr('y', y - 13).attr('width', 22).attr('height', 26).attr('fill', 'transparent');
  const k = hit.append('g').attr('class', 'icon-kebab');
  [-5, 0, 5].forEach((dy) => k.append('circle').attr('cx', x).attr('cy', y + dy).attr('r', 1.3));
  if (onClick) hit.on('click', onClick);
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
  // Fixed to the card's base height (not p.height) so a fast-vs-typical
  // badge — which grows the card — adds a new row below rather than
  // shifting these positions around.
  appendKebab(g, p.width - 16, TASK_H / 2 - 11, (event) => {
    event.stopPropagation();
    openTaskMenu(event, n.id);
  });
  appendClockIcon(g, 16, TASK_H - 24);
  g.append('text').attr('class', 'node-meta').attr('x', 40).attr('y', TASK_H - 14)
    .text(`${pluralCases(n.caseCount)} · ${formatDuration(n.avgDuration)}`);
  if (n.compareInfo) buildCompareBadge(g, n, p);
}

// A small pill in the extra space a compared task's card grows to hold,
// reading either "Skipped in fastest instances" or "N faster in fastest
// instances" depending on which signal the comparison found for this task.
function buildCompareBadge(g, n, p) {
  const info = n.compareInfo;
  const isSkipped = info.kind === 'skipped';
  const y = TASK_H + 4;
  const h = p.height - TASK_H - 8;
  g.append('rect').attr('class', `compare-badge-bg ${isSkipped ? 'skipped' : 'faster'}`)
    .attr('x', 10).attr('y', y).attr('width', p.width - 20).attr('height', h).attr('rx', h / 2);
  const label = isSkipped
    ? 'Skipped in fastest instances'
    : `${formatDuration(info.timeSaved)} faster in fastest instances`;
  g.append('text').attr('class', `compare-badge-text ${isSkipped ? 'skipped' : 'faster'}`)
    .attr('x', p.width / 2).attr('y', y + h / 2 + 3).attr('text-anchor', 'middle')
    .text(label);
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
    .text(n.label === '1' ? 'instance' : 'instances');
}

// Semantic zoom's collapsed/expanded waypoint. Collapsed, it reads "N
// variants — click to expand"; once expanded it flips to a "− Collapse"
// toggle in the exact same spot, so the affordance to put the clutter away
// again is always right where the bubble was.
function buildBubble(g, n, p) {
  const label = n.expanded
    ? `− Collapse ${n.count} variant${n.count === 1 ? '' : 's'}`
    : `${n.count} variant${n.count === 1 ? '' : 's'}`;
  g.append('rect').attr('class', `bubble-bg${n.expanded ? ' expanded' : ''}`)
    .attr('width', p.width).attr('height', p.height).attr('rx', p.height / 2);
  g.append('text').attr('class', 'bubble-label').attr('x', p.width / 2).attr('y', p.height / 2 - 3)
    .attr('text-anchor', 'middle').text(label);
  g.append('text').attr('class', 'bubble-sub').attr('x', p.width / 2).attr('y', p.height / 2 + 14)
    .attr('text-anchor', 'middle').text(n.expanded ? 'Click to collapse' : 'Click to expand');
}

function render(fit = false) {
  const model = state.model;
  applyThreshold(model, state.threshold);
  updatePathFilterUI(model);
  const renderGraph = buildRenderGraph(model);

  // Fast-vs-typical comparison annotates whichever of its tasks are
  // currently on the canvas — a task hidden by a filter or folded into a
  // semantic-zoom bubble just doesn't get a badge, same as any other
  // per-node decoration.
  if (state.comparison) {
    const compareByTask = new Map(state.comparison.items.map((it) => [it.task, it]));
    renderGraph.nodes.forEach((n) => {
      if (n.kind === 'task') n.compareInfo = compareByTask.get(n.id) || null;
    });
  }

  const { nodePos, edgePos } = layout(renderGraph);

  // A deviation edge is "rework" when the transition's target was already
  // visited earlier in the same case (graph.js flags this at the source),
  // as opposed to a variant that simply orders steps differently. A bubble
  // edge bundles multiple minor edges that may not agree on this, so it
  // never gets styled as rework — just a plain grey deviation connector.
  renderGraph.edges.forEach((e) => {
    e.isRework = e.kind === 'deviation' && !e.isBubbleEdge && e.sourceEdges[0].reworkCaseCount > 0;
  });

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
      if (n.kind === 'bubble') return n.minorEdges.some((se) => activeEdgeKeys.has(`${se.from}||${se.to}`));
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
    });

  mergedEdges.each(function (e) {
    const labelGroup = d3.select(this).select('g.edge-label');
    labelGroup.selectAll('*').remove();
    if (e.kind === 'happy' || !e.label) return;
    const pts = edgePos.get(edgeKey(e)).points;
    const mid = pts[Math.floor(pts.length / 2)];
    const text = `${e.label} instance${e.label === '1' ? '' : 's'}`;
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
    .attr('class', (n) => `node ${n.kind}${nodeIsActive(n) ? '' : ' dimmed'}`)
    .on('mouseenter', (event, n) => showTooltip(event, nodeTooltipHtml(n, model)))
    .on('mousemove', moveTooltip)
    .on('mouseleave', hideTooltip);

  mergedNodes.each(function (n) {
    const g = d3.select(this);
    g.selectAll('*').remove();
    const p = nodePos.get(n.id);
    if (n.kind === 'task') buildTaskCard(g, n, p);
    else if (n.kind === 'diamond') buildDiamond(g, n, p);
    else if (n.kind === 'bubble') buildBubble(g, n, p);
    else buildPill(g, n, p);
  });

  mergedNodes.filter((n) => n.kind === 'bubble').on('click', (event, n) => {
    if (n.expanded) state.expandedBubbles.delete(n.fromNode);
    else state.expandedBubbles.add(n.fromNode);
    render(true);
  });

  renderInsights(model);
  renderTimeList(model);
  renderReworkList(model);
  renderVariantList(model);
  renderStats(model);
  renderFastCompare();
  if (fit) fitToView();
}

function nodeTooltipHtml(n, model) {
  if (n.kind === 'start' || n.kind === 'end') return `<strong>${n.label}</strong>`;
  if (n.kind === 'diamond') {
    const rows = n.sourceEdges.map((e) => `<div>→ ${labelForNode(e.to)}: ${pluralCases(e.caseCount)}</div>`).join('');
    return `<strong>${pluralCases(Number(n.label))} branch here</strong>${rows}`;
  }
  if (n.kind === 'bubble') {
    const rows = n.minorEdges.map((e) => `<div>→ ${labelForNode(e.to)}: ${pluralCases(e.caseCount)}</div>`).join('');
    return `<strong>${n.count} variant${n.count === 1 ? '' : 's'}</strong>${rows}<div>${n.expanded ? 'Click to collapse' : 'Click to expand'}</div>`;
  }
  const reworkLine = n.reworkCaseCount > 0
    ? `<div>${(n.reworkRate * 100).toFixed(0)}% of instances looped back to redo this step</div>`
    : '';
  return `
    <strong>${n.label}</strong>
    <div>${n.caseCount} of ${model.totalCases} instances (${(n.casePct * 100).toFixed(0)}%)</div>
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
  if (e.isBubbleEdge) {
    return `<strong>${e.sourceEdges.length} variants from ${labelForNode(e.from)}</strong><div>${pluralCases(Number(e.label))} total</div>`;
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
  d3.select('#insight-fastest-detail').text(`${(model.fastestPath.pct * 100).toFixed(1)}% of instances take this route`);

  const topTime = model.timeRanking[0];
  d3.select('#insight-timesink-value').text(topTime ? topTime.label : '–');
  d3.select('#insight-timesink-detail').text(topTime ? `${(topTime.timeShare * 100).toFixed(0)}% of all time spent across the process` : '');

  const topRework = model.reworkRanking[0];
  d3.select('#insight-rework').property('disabled', !topRework);
  d3.select('#insight-rework-value').text(topRework ? topRework.label : 'None found');
  d3.select('#insight-rework-detail').text(topRework ? `${(topRework.reworkRate * 100).toFixed(0)}% of instances looped back here` : 'No repeated steps in this data');

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
    <div class="variant-pct">${(v.pct * 100).toFixed(1)}% <span class="variant-count">(${v.count} instance${v.count === 1 ? '' : 's'})</span>${v === model.fastestPath ? ' <span class="fastest-badge" title="Fastest observed path">⚡ fastest</span>' : ''}</div>
    <div class="variant-path">${v.path.join(' → ')}</div>
    <div class="variant-duration">Avg total time: ${formatDuration(v.avgDuration)}</div>
  `);
}

function renderStats(model) {
  d3.select('#stat-cases').text(model.totalCases);

  const uniqueUsers = new Set(state.cases.flatMap((c) => c.users || []));
  d3.select('#stat-users').text(uniqueUsers.size > 0 ? uniqueUsers.size : '–');

  const medianTotal = median(state.cases.map((c) => c.totalDuration));
  d3.select('#stat-avg-duration').text(formatDuration(medianTotal));
}

function renderFastCompare() {
  const panel = document.getElementById('fast-compare-panel');
  const comparison = state.comparison;
  if (!comparison) { panel.hidden = true; return; }
  panel.hidden = false;

  d3.select('#fast-compare-summary').html(
    `Fastest ${(comparison.fastCohortPct * 100).toFixed(0)}% of instances (${comparison.fastCohortSize}) finish ` +
    `<strong>${formatDuration(comparison.totalGap)} faster</strong> than the most common path ` +
    `(${formatDuration(comparison.fastAvgTotal)} vs ${formatDuration(comparison.happyAvgTotal)} avg).`
  );

  const list = d3.select('#fast-compare-list');
  if (!comparison.items.length) {
    list.html('<li class="metric-empty">No clear differences found beyond normal variation.</li>');
    return;
  }

  const items = list.selectAll('li.metric-item').data(comparison.items, (d) => d.task);
  items.exit().remove();
  const enter = items.enter().append('li');
  enter.append('div').attr('class', 'metric-item-top');
  enter.append('div').attr('class', 'metric-item-sub');

  const merged = enter.merge(items);
  merged.attr('class', (d) => `metric-item compare-${d.kind}`);
  merged.select('.metric-item-top').html((d) => d.kind === 'skipped'
    ? `<span>Skipped: ${escapeHtml(d.task)}</span><span>${formatDuration(d.timeSaved)}</span>`
    : `<span>${escapeHtml(d.task)}</span><span>${formatDuration(d.timeSaved)} faster</span>`);
  merged.select('.metric-item-sub').text((d) => d.kind === 'skipped'
    ? "Not part of the fastest instances' path"
    : `${formatDuration(d.fAvg)} vs ${formatDuration(d.hAvg)} typical`);
}

function toggleFastCompare() {
  if (state.comparison) {
    state.comparison = null;
  } else {
    const comparison = computeFastVsTypical(state.model, state.cases);
    if (!comparison) {
      d3.select('#fast-compare-summary').text('');
      window.alert("There isn't enough data in this process to compute a meaningful fast-vs-typical comparison.");
      return;
    }
    state.comparison = comparison;
  }
  d3.select('#insight-compare-btn').classed('active', !!state.comparison);
  render();
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// Builds a plain-language narrative from the same model stats that drive the
// Key Takeaways cards, so the "AI Summary" panel reads like an analyst's
// write-up instead of just restating the header numbers.
function buildAISummaryHtml(model) {
  const paragraphs = [];
  const pct = (n) => `${(n * 100).toFixed(0)}%`;
  const steps = (path) => path.map(escapeHtml).join(' → ');

  paragraphs.push(
    `<p>This map is mined from <strong>${model.totalCases} instance${model.totalCases === 1 ? '' : 's'}</strong>, ` +
    `which fan out into <strong>${model.variants.length} distinct path${model.variants.length === 1 ? '' : 's'}</strong> ` +
    `through the process.</p>`
  );

  if (model.happyPath) {
    paragraphs.push(
      `<p><strong>Most common path:</strong> ${pct(model.happyPath.pct)} of instances (${model.happyPath.count}) follow the same ` +
      `${model.happyPath.path.length}-step route, taking about ${formatDuration(model.happyPath.avgDuration)} on average: ` +
      `${steps(model.happyPath.path)}.</p>`
    );
  }

  if (model.fastestPath && model.fastestPath !== model.happyPath) {
    paragraphs.push(
      `<p><strong>Fastest observed path:</strong> ${steps(model.fastestPath.path)}, finishing in about ` +
      `${formatDuration(model.fastestPath.avgDuration)} — worth comparing against the most common route above.</p>`
    );
  }

  const timeSink = model.timeRanking[0];
  if (timeSink) {
    paragraphs.push(
      `<p><strong>Where time goes:</strong> "${escapeHtml(timeSink.label)}" is the biggest time sink, accounting for ` +
      `${pct(timeSink.timeShare)} of all process time across ${pluralCases(timeSink.caseCount)} ` +
      `(avg ${formatDuration(timeSink.avgDuration)} per visit).</p>`
    );
  }

  const reworkTop = model.reworkRanking[0];
  if (model.reworkedCasePct > 0 && reworkTop) {
    paragraphs.push(
      `<p><strong>Rework:</strong> ${pct(model.reworkedCasePct)} of instances loop back to redo a step at least once, most often at ` +
      `"${escapeHtml(reworkTop.label)}" (${pluralCases(reworkTop.reworkCaseCount)} re-enter it).</p>`
    );
  } else {
    paragraphs.push(`<p><strong>Rework:</strong> no meaningful rework loops detected — instances mostly move forward without looping back.</p>`);
  }

  if (timeSink) {
    const callout = reworkTop
      ? `Automating or simplifying "${escapeHtml(timeSink.label)}" would have the biggest time impact, while fixing the rework loop at "${escapeHtml(reworkTop.label)}" would cut down repeat work.`
      : `Automating or simplifying "${escapeHtml(timeSink.label)}" would have the biggest time impact on the overall process.`;
    paragraphs.push(`<p class="summary-callout">${callout}</p>`);
  }

  return paragraphs.join('');
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
    body.innerHTML = buildAISummaryHtml(state.model);
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

function regenerate(numCases) {
  state.cases = generateEventLog(numCases);
  state.model = buildProcessModel(state.cases);
  state.highlight = null;
  setUploadStatus('');
  render(true);
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
      state.threshold = 100;
      state.expandedBubbles = new Set();
      state.comparison = null;
      d3.select('#insight-compare-btn').classed('active', false);
      d3.select('#pf-slider').property('value', 100);
      closeTaskMenu();
      closeSessionReplay();
      setUploadStatus(`Loaded ${cases.length} instance${cases.length === 1 ? '' : 's'} from "${file.name}".`, 'success');
      render(true);
      setTimeout(closeImportModal, 700);
    } catch (err) {
      setUploadStatus(`Couldn't read "${file.name}": ${err.message}`, 'error');
    }
  };
  reader.onerror = () => setUploadStatus(`Couldn't read "${file.name}".`, 'error');
  reader.readAsText(file);
}

// ---- AI summary panel ----
d3.select('#ai-summary-btn').on('click', () => {
  const panel = document.getElementById('ai-summary-panel');
  if (panel.classList.contains('hidden')) openAISummary();
  else closeAISummary();
});
d3.select('#ai-summary-close').on('click', closeAISummary);

// ---- insights drawer ----
d3.select('#insights-btn').on('click', () => {
  const panel = document.getElementById('insights-panel');
  if (panel.classList.contains('hidden')) openInsights();
  else closeInsights();
});
d3.select('#insights-close').on('click', closeInsights);

// ---- fullscreen toggle ----
d3.select('#fullscreen-btn').on('click', function () {
  const isFullscreen = document.body.classList.toggle('app-fullscreen');
  d3.select(this).classed('active', isFullscreen).attr('aria-pressed', String(isFullscreen));
  requestAnimationFrame(fitToView);
});

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
d3.select(document).on('keydown.sessionReplay', (event) => {
  if (event.key !== 'Escape') return;
  if (!d3.select('#session-replay-modal').classed('hidden')) closeSessionReplay();
  else if (!d3.select('#task-menu').classed('hidden')) closeTaskMenu();
});

// ---- task "..." menu ----
let taskMenuTargetId = null;

function openTaskMenu(event, taskId) {
  taskMenuTargetId = taskId;
  hideTooltip();
  const menu = document.getElementById('task-menu');
  menu.classList.remove('hidden');
  // Clamp so the menu never renders off the right/bottom edge of the viewport.
  const menuWidth = 180;
  const menuHeight = 44;
  const left = Math.min(event.clientX, window.innerWidth - menuWidth - 8);
  const top = Math.min(event.clientY, window.innerHeight - menuHeight - 8);
  menu.style.left = `${left}px`;
  menu.style.top = `${top}px`;
}
function closeTaskMenu() {
  taskMenuTargetId = null;
  d3.select('#task-menu').classed('hidden', true);
}
d3.select('#task-menu-watch').on('click', () => {
  const taskId = taskMenuTargetId;
  closeTaskMenu();
  if (taskId) openSessionReplay(taskId);
});
d3.select(document).on('click.taskMenu', (event) => {
  const menu = document.getElementById('task-menu');
  if (!menu.classList.contains('hidden') && !menu.contains(event.target)) closeTaskMenu();
});

// ---- Session Replay ----
// There's no real screen-recording data behind this app's synthetic event
// logs, so the "recording" is an honest placeholder (a static player frame,
// non-functional play button) while everything else — who performed each
// session, which path it took, every task in it and how long it really
// took — is real, derived straight from the case log. Only the click-level
// step breakdown inside a task is a clearly-templated stand-in for detail
// the log doesn't capture.
const srState = {
  taskId: null, taskLabel: '', sessions: [], metaSuffix: '',
  expandedSessionIndex: null, activeIndex: 0, focusedStepGroupIndex: 0,
  steps: [], totalSeconds: 0, currentStepIndex: 0,
};

const PERSON_ICON_SVG = '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true"><circle cx="8" cy="5.4" r="2.7" stroke="currentColor" stroke-width="1.4"/><path d="M2.8 14 C2.8 10.6 5 9 8 9 C11 9 13.2 10.6 13.2 14" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>';
const TASK_ICON_SVG = '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true"><rect x="2.5" y="3.5" width="11" height="9" rx="2" stroke="currentColor" stroke-width="1.4"/><rect x="9.4" y="6.9" width="2.7" height="2.7" rx="0.7" fill="currentColor"/></svg>';

function hashStr(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0;
  return h;
}
function formatClock(totalSeconds) {
  const m = Math.floor(totalSeconds / 60);
  const s = Math.round(totalSeconds % 60);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}
function formatUserId(user) {
  return `ID:${String(user).replace(/^U-/, '')}`;
}

// One row per instance that touched the target task — real data throughout:
// who ran it, which variant/path it followed, and its full ordered list of
// tasks (with real per-task durations from the case log).
function buildTaskSessions(cases, taskId, model) {
  const sessions = [];
  cases.forEach((c) => {
    const occurrences = c.steps.filter((s) => s.task === taskId);
    if (!occurrences.length) return;
    const caseDuration = occurrences.reduce((sum, s) => sum + s.duration, 0);
    const variant = model.variants.find((v) => v.caseIds.includes(c.caseId));
    sessions.push({
      caseId: c.caseId,
      user: (c.users && c.users[0]) || 'Unknown user',
      isRework: occurrences.length > 1,
      caseDuration,
      variantRank: variant ? variant.rank : null,
      path: c.steps,
    });
  });
  return sessions;
}

function isTaskRepeated(session, taskName) {
  return session.path.filter((s) => s.task === taskName).length > 1;
}

// Synthesizes a plausible step-by-step breakdown scaled to a short (2-6.5min)
// "recording length" — a stand-in for click-level detail the event log
// doesn't capture, deterministic per task-occurrence so the same one always
// shows the same steps.
function buildSessionSteps(taskLabel, isRework, seed) {
  const totalSeconds = 150 + (seed % 240);
  const marks = isRework ? [0, 0.18, 0.42, 0.64, 0.86, 1] : [0, 0.22, 0.5, 0.8, 1];
  const labels = isRework
    ? [`Opened ${taskLabel}`, 'Reviewed related information', 'Entered required details', 'Reopened previous entry', 'Confirmed changes', `Completed ${taskLabel}`]
    : [`Opened ${taskLabel}`, 'Reviewed related information', 'Entered required details', 'Confirmed changes', `Completed ${taskLabel}`];
  const steps = marks.map((frac, i) => ({ t: Math.round(frac * totalSeconds), label: labels[i], loop: isRework && i === 3 }));
  return { totalSeconds, steps };
}

function openSessionReplay(taskId) {
  const model = state.model;
  const node = model.nodes.find((n) => n.id === taskId);
  const sessions = buildTaskSessions(state.cases, taskId, model);
  if (!node || !sessions.length) return;

  srState.taskId = taskId;
  srState.taskLabel = node.label;
  srState.sessions = sessions;
  srState.expandedSessionIndex = null;
  const reworkIndex = sessions.findIndex((s) => s.isRework);
  srState.activeIndex = reworkIndex >= 0 ? reworkIndex : 0;

  const paths = model.variants.filter((v) => v.path.includes(taskId));
  const uniqueUserCount = new Set(sessions.map((s) => s.user)).size;
  srState.metaSuffix = `${sessions.length} instance${sessions.length === 1 ? '' : 's'} · ${uniqueUserCount} unique user${uniqueUserCount === 1 ? '' : 's'} · ${paths.length} path${paths.length === 1 ? '' : 's'}`;

  loadActiveSession();
  renderSessionsList();
  renderScrubber();
  d3.select('#session-replay-modal').classed('hidden', false);
}
function closeSessionReplay() {
  d3.select('#session-replay-modal').classed('hidden', true);
  d3.select('#sr-panel').classed('sr-panel-expanded', false);
}

// Seeds the player with the target task's own occurrence in the default
// active session, and sets the header — called once on open, and again
// whenever a different session becomes active (but not on every step or
// same-session task click).
function loadActiveSession() {
  const session = srState.sessions[srState.activeIndex];
  const targetIndex = session.path.findIndex((s) => s.task === srState.taskId);
  srState.focusedStepGroupIndex = targetIndex >= 0 ? targetIndex : 0;
  const built = buildSessionSteps(srState.taskLabel, session.isRework, hashStr(`${session.caseId}:${srState.focusedStepGroupIndex}`));
  srState.steps = built.steps;
  srState.totalSeconds = built.totalSeconds;
  srState.currentStepIndex = 0;

  d3.select('#sr-task-name').text(srState.taskLabel);
  d3.select('#sr-task-sub').text(`${built.steps.length} steps · ${srState.metaSuffix}`);
}

function expandSession(sessionIndex) {
  srState.expandedSessionIndex = sessionIndex;
  const session = srState.sessions[sessionIndex];
  const targetIndex = session.path.findIndex((s) => s.task === srState.taskId);
  focusTask(sessionIndex, targetIndex >= 0 ? targetIndex : 0);
}

// Switches the player to a specific task within a session — the target
// task by default when a session first expands, or whichever other task
// in that same path the user clicks to peek at its own step breakdown.
function focusTask(sessionIndex, stepGroupIndex) {
  const sessionChanged = sessionIndex !== srState.activeIndex;
  srState.activeIndex = sessionIndex;
  srState.focusedStepGroupIndex = stepGroupIndex;

  const session = srState.sessions[sessionIndex];
  const taskEntry = session.path[stepGroupIndex];
  const built = buildSessionSteps(taskEntry.task, isTaskRepeated(session, taskEntry.task), hashStr(`${session.caseId}:${stepGroupIndex}`));
  srState.steps = built.steps;
  srState.totalSeconds = built.totalSeconds;
  srState.currentStepIndex = 0;

  if (sessionChanged) {
    const targetIndex = session.path.findIndex((s) => s.task === srState.taskId);
    const targetBuilt = buildSessionSteps(srState.taskLabel, session.isRework, hashStr(`${session.caseId}:${targetIndex}`));
    d3.select('#sr-task-sub').text(`${targetBuilt.steps.length} steps · ${srState.metaSuffix}`);
  }

  renderScrubber();
  renderSessionsList();
}

function selectStep(stepIndex) {
  srState.currentStepIndex = stepIndex;
  updateScrubberPosition();
  renderSessionsList();
}

function renderSessionsList() {
  const panel = d3.select('#sr-sessions-panel');
  panel.selectAll('*').remove();
  d3.select('#sr-session-count').text(srState.sessions.length);

  srState.sessions.forEach((session, sessionIndex) => {
    const isExpanded = sessionIndex === srState.expandedSessionIndex;
    const row = panel.append('div')
      .attr('class', `sr-user-row${isExpanded ? ' expanded' : ''}`)
      .on('click', () => {
        if (srState.expandedSessionIndex === sessionIndex) { srState.expandedSessionIndex = null; renderSessionsList(); }
        else expandSession(sessionIndex);
      });
    row.append('span').attr('class', 'sr-user-avatar').html(PERSON_ICON_SVG);
    const info = row.append('span').attr('class', 'sr-user-info');
    info.append('span').attr('class', 'sr-user-name').text(formatUserId(session.user));
    info.append('span').attr('class', 'sr-user-meta').text(`Path ${session.variantRank != null ? session.variantRank : '–'} · ${session.path.length} Tasks`);

    if (!isExpanded) return;
    session.path.forEach((taskEntry, stepGroupIndex) => {
      const isFocused = sessionIndex === srState.activeIndex && stepGroupIndex === srState.focusedStepGroupIndex;
      const taskRow = panel.append('div')
        .attr('class', `sr-task-row${isFocused ? ' focused' : ''}`)
        .on('click', (event) => { event.stopPropagation(); focusTask(sessionIndex, stepGroupIndex); });
      const header = taskRow.append('div').attr('class', 'sr-task-row-header');
      header.append('span').attr('class', 'sr-task-row-icon').html(TASK_ICON_SVG);
      const textCol = header.append('span').attr('class', 'sr-task-row-text');
      const built = buildSessionSteps(taskEntry.task, isTaskRepeated(session, taskEntry.task), hashStr(`${session.caseId}:${stepGroupIndex}`));
      textCol.append('div').attr('class', 'sr-task-row-top').text(taskEntry.task);
      textCol.append('div').attr('class', 'sr-task-row-sub').text(`${built.steps.length} steps`);
      header.append('span').attr('class', 'sr-task-row-duration').text(formatDuration(taskEntry.duration));

      if (!isFocused) return;
      taskRow.append('div').attr('class', 'sr-task-row-divider');
      const timeline = taskRow.append('div').attr('class', 'sr-task-timeline-wrap').append('div').attr('class', 'sr-timeline');
      built.steps.forEach((step, stepIdx) => {
        const isCurrent = stepIdx === srState.currentStepIndex;
        const item = timeline.append('div')
          .attr('class', `sr-timeline-item${step.loop ? ' loop' : ''}${isCurrent ? ' current' : ''}`)
          .on('click', (event) => { event.stopPropagation(); selectStep(stepIdx); });
        item.append('div').attr('class', 'sr-timeline-time').text(formatClock(step.t));
        item.append('div').attr('class', 'sr-timeline-label').text(step.label);
      });
    });
  });
}

function renderScrubber() {
  const track = d3.select('#sr-scrubber-track');
  track.selectAll('.sr-scrubber-tick').remove();
  srState.steps.forEach((step) => {
    track.append('div')
      .attr('class', `sr-scrubber-tick${step.loop ? ' loop' : ''}`)
      .style('left', `${(step.t / srState.totalSeconds) * 100}%`);
  });
  updateScrubberPosition();
}
function updateScrubberPosition() {
  const step = srState.steps[srState.currentStepIndex];
  const pct = srState.totalSeconds ? (step.t / srState.totalSeconds) * 100 : 0;
  d3.select('#sr-scrubber-fill').style('width', `${pct}%`);
  d3.select('#sr-scrubber-thumb').style('left', `${pct}%`);
  d3.select('#sr-time-current').text(formatClock(step.t));
  d3.select('#sr-time-total').text(formatClock(srState.totalSeconds));
}

d3.select('#sr-close').on('click', closeSessionReplay);
d3.select('#session-replay-modal').on('click', function (event) {
  if (event.target === this) closeSessionReplay();
});
d3.select('#sr-scrubber-track').on('click', function (event) {
  const rect = this.getBoundingClientRect();
  const frac = Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width));
  const targetT = frac * srState.totalSeconds;
  let nearest = 0;
  let nearestDist = Infinity;
  srState.steps.forEach((s, i) => {
    const d = Math.abs(s.t - targetT);
    if (d < nearestDist) { nearestDist = d; nearest = i; }
  });
  selectStep(nearest);
});

// Restart affordances (header + control-bar icon) — there's no real
// playback to pause/resume, so both just reset the scrubber to the start.
d3.select('#sr-header-play').on('click', () => selectStep(0));
d3.select('#sr-pause-btn').on('click', () => selectStep(0));

// Speed and "skip inactive" are cosmetic toggles — honest about there being
// no real video whose rate or dead-time they could actually affect.
d3.selectAll('.sr-speed').on('click', function () {
  d3.selectAll('.sr-speed').classed('active', false);
  d3.select(this).classed('active', true);
});
d3.select('#sr-skip-toggle').on('click', function () {
  d3.select(this).classed('active', !this.classList.contains('active'));
});

d3.select('#sr-expand').on('click', () => {
  d3.select('#sr-panel').classed('sr-panel-expanded', !document.getElementById('sr-panel').classList.contains('sr-panel-expanded'));
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
d3.select('#insight-compare-btn').on('click', (event) => {
  event.stopPropagation();
  toggleFastCompare();
});
d3.select('#fast-compare-close').on('click', () => {
  state.comparison = null;
  d3.select('#insight-compare-btn').classed('active', false);
  render();
});

// ---- controls ----
// The slider runs "Popular path" (0, fewest deviation edges shown) to "All
// paths" (100, everything) — the inverse of the raw filter threshold, which
// hides a deviation edge once its frequency drops below (100 - value)%.
function updatePathFilterUI(model) {
  const slider = document.getElementById('pf-slider');
  const value = Number(slider.value);
  const deviations = model.edges.filter((e) => !e.onHappyPath);
  const visibleCount = deviations.filter((e) => !e.hidden).length;

  document.getElementById('pf-value').textContent = `${value}%`;
  document.getElementById('pf-subtext').textContent = deviations.length
    ? `Showing ${visibleCount} of ${deviations.length} process variants`
    : 'No deviations recorded for this process';
  slider.style.background = `linear-gradient(to right, #1f9d5c 0%, #1f9d5c ${value}%, #e6e7f0 ${value}%, #e6e7f0 100%)`;
}

d3.select('#pf-slider').on('input', function () {
  state.threshold = Number(this.value);
  render(true);
});

function stepPathFilter(delta) {
  const slider = document.getElementById('pf-slider');
  slider.value = Math.min(100, Math.max(0, Number(slider.value) + delta));
  slider.dispatchEvent(new Event('input'));
}
d3.select('#pf-minus').on('click', () => stepPathFilter(-10));
d3.select('#pf-plus').on('click', () => stepPathFilter(10));

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
    render(true);
    loadedFromHandoff = true;
  } catch (err) {
    // Fall through to the default demo data below if the handoff payload
    // was somehow malformed — better than a blank map.
  }
}

if (!loadedFromHandoff) regenerate(500);
