/* global d3, dagre, generateEventLog, buildProcessModel, normalizeCaseLog, extractTaskInsights, median, SAMPLE_JSON_TEMPLATE, START, END */

const TASK_W = 220;
const TASK_H = 62;
const PILL_W = 108;
const PILL_H = 42;
const DIAMOND_SIZE = 92;
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
  cases: [], // the currently active view — state.allCases narrowed by state.filters, or === state.allCases when no filter is active
  model: null, // buildProcessModel(state.cases) — everything on screen (graph, Insights, task detail) reads this
  allCases: [], // the full, unfiltered case log for the current dataset
  baseModel: null, // buildProcessModel(state.allCases) — drives the filter panel's option lists so they don't shrink as filters narrow the view
  filters: {
    taskNames: new Set(),
    variantSignatures: new Set(),
    durationMin: null,
    durationMax: null,
    processIds: new Set(),
    userIds: new Set(),
  },
  threshold: 100, // Path Filter slider value 0-100 (0 = fewest deviations, 100 = all)
  highlight: null, // null | { kind: 'variant', value: variant } | { kind: 'node', value: nodeId }
  expandedBubbles: new Set(), // source node ids whose "N variants" bubble is currently expanded
  comparison: null, // null | result of computeFastVsTypical() when "Compare to typical" is active
  selectedTaskId: null, // task id whose detail panel is open, or null
  expandedSubtypeIds: new Set(), // subtype ids currently expanded in the Task Subtype accordion
  taskInsights: null, // null | { byTaskName, instancesByTaskName } from extractTaskInsights() — only present when the raw upload was a task-catalog export
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

// Spreadsheet-style column labels for the Filter panel's path list: 1->A,
// 2->B, ... 26->Z, 27->AA, 28->AB, ... so it never runs out even with
// dozens of variants.
function pathLetterLabel(rank) {
  let label = '';
  let n = rank;
  while (n > 0) {
    const rem = (n - 1) % 26;
    label = String.fromCharCode(65 + rem) + label;
    n = Math.floor((n - 1) / 26);
  }
  return label;
}

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

  const nodes = model.nodes
    .filter((n) => keepNodeIds.has(n.id))
    .map((n) => ({ ...n, kind: n.virtual ? (n.id === START ? 'start' : 'end') : 'task' }));

  const edges = [];
  const deviationByFrom = new Map();
  survivingEdges.forEach((e) => {
    if (e.onHappyPath) { edges.push({ from: e.from, to: e.to, kind: 'happy', sourceEdges: [e] }); return; }
    if (bundleSourceOf.has(e)) return; // handled via its fork's minor bundle below, not as a plain group member
    if (!deviationByFrom.has(e.from)) deviationByFrom.set(e.from, []);
    deviationByFrom.get(e.from).push(e);
  });
  // Every fork with a minor bundle gets an entry here even when none of its
  // OTHER edges survive individually — that's what guarantees the circular
  // waypoint (and its collapse/expand affordance) still gets created below.
  bubblesByFrom.forEach((b, from) => {
    if (!deviationByFrom.has(from)) deviationByFrom.set(from, []);
  });

  deviationByFrom.forEach((group, from) => {
    const bubble = bubblesByFrom.get(from) || null;
    if (!bubble && group.length === 1) {
      const e = group[0];
      edges.push({ from: e.from, to: e.to, kind: 'deviation', label: `${e.caseCount}`, casePct: e.caseCount / model.totalCases, sourceEdges: e.sourceEdges || [e] });
      return;
    }
    // A fork's total is its own surviving branches plus whatever its minor
    // bundle covers — each edge counted exactly once here regardless of
    // collapse state, so the circle's own number never doubles up when
    // expanding also starts drawing those same minor branches individually.
    const minorTotal = bubble ? bubble.minorEdges.reduce((s, e) => s + e.caseCount, 0) : 0;
    const total = group.reduce((s, e) => s + e.caseCount, 0) + minorTotal;
    const totalPct = total / model.totalCases;
    const diamondId = `diamond::${from}`;
    const allSourceEdges = group.flatMap((e) => e.sourceEdges || [e]).concat(bubble ? bubble.minorEdges : []);
    nodes.push({
      id: diamondId, kind: 'diamond', label: `${total}`, casePct: totalPct, sourceEdges: allSourceEdges,
      hasBubble: !!bubble, bubbleExpanded: bubble ? bubble.expanded : false, fromNode: from,
    });
    edges.push({ from, to: diamondId, kind: 'deviation-bundle', label: `${total}`, casePct: totalPct, sourceEdges: allSourceEdges });
    group.forEach((e) => {
      edges.push({ from: diamondId, to: e.to, kind: 'deviation', label: `${e.caseCount}`, casePct: e.caseCount / model.totalCases, sourceEdges: e.sourceEdges || [e] });
    });
    // Only once expanded do the bundle's own minor branches fan out from
    // the circle as their own individually-drawn edges.
    if (bubble && bubble.expanded) {
      bubble.minorEdges.forEach((e) => {
        edges.push({ from: diamondId, to: e.to, kind: 'deviation', label: `${e.caseCount}`, casePct: e.caseCount / model.totalCases, sourceEdges: [e] });
      });
    }
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

// A fork's waypoint: a plain circular total when it's just multiple
// always-shown branches converging, or (when it also bundles minor,
// low-frequency branches) a collapsible circle whose chevron toggles
// those minor branches between a folded-in total and drawn individually.
function buildDiamond(g, n, p) {
  const cx = p.width / 2;
  const cy = p.height / 2;
  g.append('circle')
    .attr('class', `diamond-shape${n.hasBubble ? ' has-bubble' : ''}${n.bubbleExpanded ? ' expanded' : ''}`)
    .attr('cx', cx).attr('cy', cy).attr('r', p.width / 2);
  const labelY = n.hasBubble ? cy - 13 : cy - 2;
  const subY = n.hasBubble ? cy + 5 : cy + 14;
  g.append('text').attr('class', 'diamond-label').attr('x', cx).attr('y', labelY).text(n.label);
  g.append('text').attr('class', 'diamond-sub').attr('x', cx).attr('y', subY)
    .text(n.label === '1' ? 'instance' : 'instances');
  if (n.hasBubble) {
    const chevY = cy + 21;
    const d = n.bubbleExpanded
      ? `M${cx - 5},${chevY + 3} L${cx},${chevY - 3} L${cx + 5},${chevY + 3}`
      : `M${cx - 5},${chevY - 3} L${cx},${chevY + 3} L${cx + 5},${chevY - 3}`;
    g.append('path').attr('class', 'diamond-chevron').attr('d', d);
  }
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
  // as opposed to a variant that simply orders steps differently.
  renderGraph.edges.forEach((e) => {
    e.isRework = e.kind === 'deviation' && e.sourceEdges[0].reworkCaseCount > 0;
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
    .on('mouseenter', (event, e) => showTooltip(event, edgeTooltipHtml(e, model)))
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
    const text = e.casePct != null ? `${e.label} (${Math.round(e.casePct * 100)}%)` : `${e.label} instance${e.label === '1' ? '' : 's'}`;
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
    .attr('class', (n) => `node ${n.kind}${nodeIsActive(n) ? '' : ' dimmed'}${n.id === state.selectedTaskId ? ' selected' : ''}`)
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

  mergedNodes.filter((n) => n.kind === 'diamond' && n.hasBubble).on('click', (event, n) => {
    if (n.bubbleExpanded) state.expandedBubbles.delete(n.fromNode);
    else state.expandedBubbles.add(n.fromNode);
    render(true);
  });

  mergedNodes.filter((n) => n.kind === 'task').on('click', (event, n) => {
    event.stopPropagation();
    openTaskDetail(n.id);
  });

  renderProcessSummary(model);
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
    const toggleNote = n.hasBubble ? `<div>${n.bubbleExpanded ? 'Click to collapse' : 'Click to expand'}</div>` : '';
    return `<strong>${pluralCases(Number(n.label))} branch here</strong>${rows}${toggleNote}`;
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

function edgeTooltipHtml(e, model) {
  if (e.kind === 'happy') {
    return `<strong>${labelForNode(e.from)} → ${labelForNode(e.to)}</strong><div>Part of the most common path</div>`;
  }
  if (e.kind === 'deviation-bundle') {
    return `<strong>${e.sourceEdges.length} deviation paths from ${labelForNode(e.from)}</strong><div>${pluralCases(Number(e.label))} total (${Math.round(e.casePct * 100)}%)</div>`;
  }
  const orig = e.sourceEdges[0];
  const toNode = model.nodes.find((n) => n.id === orig.to);
  const pct = Math.round(e.casePct * 100);
  return `
    <div class="edge-tooltip-card">
      <div class="edge-tooltip-step"><span class="edge-tooltip-icon">${TASK_ICON_SVG}</span><span>${labelForNode(orig.from)}</span></div>
      <div class="edge-tooltip-connector"></div>
      <div class="edge-tooltip-step"><span class="edge-tooltip-icon">${TASK_ICON_SVG}</span><span>${labelForNode(orig.to)}</span></div>
      <div class="edge-tooltip-stats">
        <div class="edge-tooltip-stat">
          <span class="edge-tooltip-stat-label">Total instance</span>
          <span class="edge-tooltip-stat-value">${Number(e.label)} time${Number(e.label) === 1 ? '' : 's'} (${pct}%)</span>
        </div>
        <div class="edge-tooltip-stat">
          <span class="edge-tooltip-stat-label">Median Time</span>
          <span class="edge-tooltip-stat-value">${toNode ? formatDuration(toNode.medianDuration) : '–'}</span>
        </div>
      </div>
      ${e.isRework ? '<div class="edge-tooltip-note">Rework — loops back to redo this step</div>' : ''}
    </div>
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

// Plain-language overview of the whole process, plus the completion split
// (recognized conclusion vs. an uncommon stopping point) — meant to orient
// someone before they dig into the Key Takeaways / time / rework panels.
function renderProcessSummary(model) {
  const pct = (n) => `${(n * 100).toFixed(0)}%`;
  const taskCount = model.nodes.filter((n) => !n.virtual).length;

  const entryEdges = model.edges.filter((e) => e.from === START).sort((a, b) => b.caseCount - a.caseCount);
  const topEntry = entryEdges[0];
  const entryPhrase = entryEdges.length <= 1
    ? `start with "${escapeHtml(topEntry ? topEntry.to : '—')}"`
    : `start at ${entryEdges.length} different tasks, most often "${escapeHtml(topEntry.to)}" (${pct(topEntry.casePct)})`;

  const c = model.completion;
  const topEnding = c.recognizedEndings[0];
  const endingPhrase = topEnding ? `, and most often conclude at "${escapeHtml(topEnding.task)}" (${pct(topEnding.pct)})` : '';

  const overviewHtml =
    `<p>Mined from <strong>${model.totalCases} case${model.totalCases === 1 ? '' : 's'}</strong> across ` +
    `<strong>${taskCount} task${taskCount === 1 ? '' : 's'}</strong>, fanning out into ` +
    `<strong>${model.variants.length} distinct path${model.variants.length === 1 ? '' : 's'}</strong>. ` +
    `Cases ${entryPhrase}${endingPhrase}.</p>` +
    (c.rareEndings.length
      ? `<p class="hint">Uncommon stopping points: ${c.rareEndings.slice(0, 4).map((e) => `"${escapeHtml(e.task)}"`).join(', ')}${c.rareEndings.length > 4 ? ', …' : ''}.</p>`
      : '');

  d3.select('#process-summary-overview').html(overviewHtml);
  d3.select('#process-summary-completed-value').text(pct(c.completedPct));
  d3.select('#process-summary-completed-detail').text(`${pluralCases(c.completedCaseCount)} reached a recognized conclusion`);
  d3.select('#process-summary-incomplete-value').text(pct(c.notCompletedPct));
  d3.select('#process-summary-incomplete-detail').text(
    c.notCompletedCaseCount ? `${pluralCases(c.notCompletedCaseCount)} stopped at an uncommon point` : 'Every case reached a typical conclusion'
  );
}

// A one-line, plain-language "story" for a single path variant — what kind
// of run this is (quick single-touch vs. long and looping) and whether it
// actually reached a normal conclusion or trailed off somewhere unusual.
function buildPathStory(v, model) {
  const path = v.path;
  const n = path.length;
  const start = path[0];
  const end = path[n - 1];
  const hasLoop = new Set(path).size < n;
  const reachedEnd = model.completion.recognizedTaskSet.has(end);

  let shape;
  if (n === 1) {
    shape = `Resolved in a single touch at "${escapeHtml(start)}".`;
  } else if (n <= 3) {
    shape = `A short, direct run from "${escapeHtml(start)}" to "${escapeHtml(end)}".`;
  } else {
    const middle = n - 2;
    shape = `Runs from "${escapeHtml(start)}" through ${middle} more step${middle === 1 ? '' : 's'} to "${escapeHtml(end)}"` +
      `${hasLoop ? ', looping back to redo at least one step along the way' : ''}.`;
  }

  const ending = n === 1
    ? (reachedEnd ? '' : ' An uncommon stopping point for this process.')
    : (reachedEnd ? ' Ends at a typical resolution point.' : ` Trails off at "${escapeHtml(end)}" — an uncommon stopping point, likely stalled before a full resolution.`);

  return shape + ending;
}

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
    <div class="variant-story">${buildPathStory(v, model)}</div>
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
  d3.select('#insight-compare-btn').classed('active', !!state.comparison).attr('aria-checked', String(!!state.comparison));
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
  closeTaskDetail();
  closeFilterPanel();
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
  closeTaskDetail();
  closeFilterPanel();
  document.getElementById('insights-btn').classList.add('active');
  document.getElementById('insights-btn').setAttribute('aria-expanded', 'true');
  document.getElementById('insights-panel').classList.remove('hidden');
}

function closeInsights() {
  document.getElementById('insights-btn').classList.remove('active');
  document.getElementById('insights-btn').setAttribute('aria-expanded', 'false');
  document.getElementById('insights-panel').classList.add('hidden');
}

// ---- task detail panel ----
// Always-available data: every (case, occurrence) of a task, straight from
// the normalized case log — this works for any uploaded log, not just a
// task-catalog export. The panel layers the richer subtype/reasoning detail
// from state.taskInsights on top of this when that detail happens to exist.
function getTaskInstanceRows(taskLabel) {
  const rows = [];
  state.cases.forEach((c) => {
    c.steps.forEach((s) => {
      if (s.task !== taskLabel) return;
      rows.push({ caseId: c.caseId, duration: s.duration, users: c.users || [] });
    });
  });
  return rows;
}

const SUBTYPE_ICON_SVG = '<svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M4 3 V8 A2 2 0 0 0 6 10 H10 M4 3 L2.3 4.7 M4 3 L5.7 4.7 M10 10 L11.7 11.7 M10 10 L8.3 11.7" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round" /></svg>';
const CHEVRON_DOWN_SVG = '<svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true"><path d="M3 5 L7 9 L11 5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" /></svg>';

// Every instance card — whether nested in a Task Subtype accordion row or in
// the plain fallback list — is labeled by which path (variant) it took,
// reusing the same Path A/B/C convention as the Filter panel, since that's
// real and derivable for any case regardless of whether the upload carries
// rich per-instance detail.
function instancePathLabel(caseId) {
  const variant = state.model.variants.find((v) => v.caseIds.includes(caseId));
  return variant ? `Path ${pathLetterLabel(variant.rank)}` : null;
}

function appendInstanceCard(container, { caseId, idLabel, durationMinutes, text, tag }) {
  const isActive = state.highlight && state.highlight.kind === 'variant' && state.highlight.value.caseIds.includes(caseId);
  const card = container.append('div')
    .attr('class', `instance-card${isActive ? ' active' : ''}`)
    .on('click', () => selectInstance(caseId));
  if (tag) card.append('span').attr('class', 'instance-card-tag').text(tag);
  const top = card.append('div').attr('class', 'instance-card-top');
  top.append('span').attr('class', 'instance-card-id').text(idLabel);
  top.append('span').attr('class', 'instance-card-duration').text(formatDuration(durationMinutes));
  if (text) card.append('p').attr('class', 'instance-card-text').text(text);
}

function openTaskDetail(taskId) {
  state.selectedTaskId = taskId;
  state.expandedSubtypeIds = new Set();
  closeInsights();
  closeAISummary();
  closeFilterPanel();
  setTaskDetailTab('overview');
  d3.select('#task-detail-panel').classed('hidden', false);
  renderTaskDetail();
  syncTaskDetailLayout();
  render();
}

function setTaskDetailTab(tab) {
  d3.selectAll('.task-detail-tab').classed('active', function () { return this.dataset.tab === tab; });
  d3.select('#task-detail-overview-tab').classed('hidden', tab !== 'overview');
  d3.select('#task-detail-automation-tab').classed('hidden', tab !== 'automation');
}

function closeTaskDetail() {
  if (!state.selectedTaskId) {
    d3.select('#task-detail-panel').classed('hidden', true);
    syncTaskDetailLayout();
    return;
  }
  state.selectedTaskId = null;
  state.expandedSubtypeIds = new Set();
  d3.select('#task-detail-panel').classed('hidden', true);
  syncTaskDetailLayout();
  render();
}

function renderTaskDetail() {
  const taskId = state.selectedTaskId;
  if (!taskId) return;
  const model = state.model;
  const node = model.nodes.find((n) => n.id === taskId);
  if (!node) { closeTaskDetail(); return; }

  const rows = getTaskInstanceRows(taskId);
  const uniqueUsers = new Set(rows.flatMap((r) => r.users));
  const pathCount = model.variants.filter((v) => v.path.includes(taskId)).length;

  const meta = state.taskInsights && state.taskInsights.byTaskName.get(taskId);
  // Rich per-instance detail is keyed straight off the raw upload, so it
  // isn't narrowed by the active filters the way state.cases already is —
  // restrict it to the case IDs the filters actually left in play.
  const activeCaseIds = new Set(state.cases.map((c) => c.caseId));
  const richInstancesAll = state.taskInsights && state.taskInsights.instancesByTaskName.get(taskId);
  const richInstances = richInstancesAll && richInstancesAll.filter((r) => activeCaseIds.has(r.caseId));

  d3.select('#task-detail-title').text(taskId);
  d3.select('#task-detail-meta').text(
    `${pluralCases(node.caseCount)} · ${uniqueUsers.size} unique user${uniqueUsers.size === 1 ? '' : 's'} · ${pathCount} path${pathCount === 1 ? '' : 's'}`
  );

  // Task Details stat grid — all straight from the process model, real for
  // any uploaded log.
  const pct = (n) => `${(n * 100).toFixed(0)}%`;
  const taskStats = [
    { label: 'Total Executions', value: `${node.visits}` },
    { label: 'Unique Users', value: `${uniqueUsers.size}` },
    { label: 'Frequency', value: `${pct(node.casePct)} of instances` },
    { label: 'Median Duration', value: formatDuration(node.medianDuration) },
    { label: 'Rework Rate', value: pct(node.reworkRate) },
    { label: 'Deviation Rate', value: pct(node.deviationRate) },
  ];
  const statSel = d3.select('#task-detail-stats').selectAll('.task-stat').data(taskStats, (d) => d.label);
  statSel.exit().remove();
  const statEnter = statSel.enter().append('div').attr('class', 'task-stat');
  statEnter.append('span').attr('class', 'task-stat-label');
  statEnter.append('span').attr('class', 'task-stat-value');
  const statMerged = statEnter.merge(statSel);
  statMerged.select('.task-stat-label').text((d) => d.label);
  statMerged.select('.task-stat-value').attr('class', (d) => `task-stat-value${d.muted ? ' muted' : ''}`).text((d) => d.value);

  const summarySection = d3.select('#task-detail-summary-section');
  if (meta && meta.canonicalReasoning) {
    summarySection.classed('hidden', false);
    d3.select('#task-detail-summary-text').text(meta.canonicalReasoning);
  } else {
    summarySection.classed('hidden', true);
  }

  // Input/Output context: the raw upload's canonical_reasoning is prose,
  // but it consistently narrates "The trigger is X; the output is Y." —
  // pull those two clauses out rather than dumping the same paragraph
  // twice. Hidden (not "not available") when the pattern doesn't match,
  // since the Summary section above already covers this ground in prose.
  const ioMatch = meta && meta.canonicalReasoning && meta.canonicalReasoning.match(/trigger is (.+?);\s*the output is (.+?)\.\s*$/i);
  d3.select('#task-detail-io-section').classed('hidden', !ioMatch);
  if (ioMatch) {
    d3.select('#task-detail-io-trigger').text(ioMatch[1]);
    d3.select('#task-detail-io-output').text(ioMatch[2]);
  }

  // Applications Involved — only real when the raw upload's task catalog
  // carries an app_id; most exports (including this one) leave it null,
  // so say so plainly instead of guessing an app name out of prose.
  const appsBody = d3.select('#task-detail-apps-body');
  appsBody.selectAll('*').remove();
  if (meta && meta.appId) {
    appsBody.append('span').attr('class', 'task-app-tag').text(meta.appId);
  } else {
    appsBody.append('p').attr('class', 'task-detail-muted-note').text('Not tracked in this dataset.');
  }

  // Users Performing This Task — real, from whichever cases (filtered view)
  // actually pass through this task, generic or rich upload alike.
  const userCounts = new Map();
  rows.forEach((r) => (r.users || []).forEach((u) => userCounts.set(u, (userCounts.get(u) || 0) + 1)));
  const topUsers = Array.from(userCounts.entries())
    .map(([user, count]) => ({ user, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);
  const usersBody = d3.select('#task-detail-users-body');
  usersBody.selectAll('*').remove();
  if (topUsers.length) {
    const list = usersBody.append('div').attr('class', 'task-user-list');
    topUsers.forEach((u) => {
      const row = list.append('div').attr('class', 'task-user-row');
      row.append('span').attr('class', 'task-user-row-name').text(u.user);
      row.append('span').attr('class', 'task-user-row-count').text(`${u.count} execution${u.count === 1 ? '' : 's'}`);
    });
  } else {
    usersBody.append('p').attr('class', 'task-detail-muted-note').text('No user data available for this task.');
  }

  const MAX_SHOWN = 50;
  const subtypeSection = d3.select('#task-detail-subtype-section');
  const subtypeCatalog = meta && meta.subtypes && meta.subtypes.length ? meta.subtypes : null;
  let subtypesWithCounts = null;
  let instancesBySubtype = null;
  if (subtypeCatalog && richInstances && richInstances.length) {
    instancesBySubtype = new Map();
    richInstances.forEach((inst) => {
      if (!inst.subtypeId) return;
      const list = instancesBySubtype.get(inst.subtypeId) || [];
      list.push(inst);
      instancesBySubtype.set(inst.subtypeId, list);
    });
    subtypesWithCounts = subtypeCatalog
      .map((s) => ({ ...s, count: (instancesBySubtype.get(s.id) || []).length }))
      .filter((s) => s.count > 0)
      .sort((a, b) => b.count - a.count);
  }

  const instanceListSel = d3.select('#task-detail-instance-list');
  instanceListSel.selectAll('*').remove();

  if (subtypesWithCounts && subtypesWithCounts.length) {
    subtypeSection.classed('hidden', false);
    d3.select('#task-detail-subtype-count').text(subtypesWithCounts.length);

    // The fallback flat list only exists for tasks with no subtype catalog —
    // once a task has subtypes, its instances live nested inside each
    // subtype's own accordion row instead.
    d3.select('#task-detail-instances-section').classed('hidden', true);

    const list = d3.select('#task-detail-subtype-list');
    list.selectAll('*').remove();
    subtypesWithCounts.forEach((s) => {
      const expanded = state.expandedSubtypeIds.has(s.id);
      const item = list.append('div').attr('class', `subtype-accordion-item${expanded ? ' expanded' : ''}`);
      const header = item.append('button').attr('class', 'subtype-accordion-header').attr('type', 'button')
        .on('click', () => {
          if (state.expandedSubtypeIds.has(s.id)) state.expandedSubtypeIds.delete(s.id);
          else state.expandedSubtypeIds.add(s.id);
          renderTaskDetail();
        });
      header.append('span').attr('class', 'subtype-accordion-icon').html(SUBTYPE_ICON_SVG);
      const titleWrap = header.append('span').attr('class', 'subtype-accordion-title');
      titleWrap.append('span').attr('class', 'subtype-accordion-name').text(s.name);
      titleWrap.append('span').attr('class', 'subtype-accordion-count').text(`${s.count} instance${s.count === 1 ? '' : 's'}`);
      header.append('span').attr('class', 'subtype-accordion-chevron').html(CHEVRON_DOWN_SVG);

      if (expanded) {
        const body = item.append('div').attr('class', 'subtype-accordion-body');
        const instances = instancesBySubtype.get(s.id) || [];
        instances.slice(0, MAX_SHOWN).forEach((r) => {
          const pathLabel = instancePathLabel(r.caseId);
          const idText = r.ticketId ? `Ticket #${r.ticketId}` : r.caseId;
          appendInstanceCard(body, {
            caseId: r.caseId,
            idLabel: pathLabel ? `${pathLabel} · ${idText}` : idText,
            durationMinutes: r.durationMinutes,
            text: r.reasoning,
          });
        });
        if (instances.length > MAX_SHOWN) {
          body.append('p').attr('class', 'hint').text(`Showing ${MAX_SHOWN} of ${instances.length} instances.`);
        }
      }
    });
  } else {
    subtypeSection.classed('hidden', true);
    state.expandedSubtypeIds = new Set();

    d3.select('#task-detail-instances-section').classed('hidden', false);
    if (rows.length) {
      rows.slice(0, MAX_SHOWN).forEach((r) => {
        const pathLabel = instancePathLabel(r.caseId);
        appendInstanceCard(instanceListSel, {
          caseId: r.caseId,
          idLabel: pathLabel ? `${pathLabel} · ${r.caseId}` : r.caseId,
          durationMinutes: r.duration,
          text: r.users.length ? `User: ${r.users.join(', ')}` : '',
        });
      });
      if (rows.length > MAX_SHOWN) {
        instanceListSel.append('p').attr('class', 'hint').text(`Showing ${MAX_SHOWN} of ${rows.length} instances.`);
      }
    } else {
      instanceListSel.append('p').attr('class', 'hint').text('No instance data available for this task.');
    }
  }

  renderAutomationTab(node, meta, uniqueUsers);
}

const CHECK_ICON_SVG = '<svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true"><path d="M2.5 6.5 L5 9 L9.5 3.5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" /></svg>';

// Draws the semicircular gauge: a fixed background track plus a foreground
// arc whose visible length is set via stroke-dasharray/dashoffset, and a
// needle rotated to match. Geometry (cx=48, cy=48, r=40) matches the fixed
// path data in the SVG markup, so this is pure arithmetic, not measurement.
function updateAutomationGauge(fraction, colorVar) {
  const r = 40;
  const arcLength = Math.PI * r;
  d3.select('#automation-gauge-fill')
    .style('stroke-dasharray', `${arcLength}`)
    .style('stroke-dashoffset', `${arcLength * (1 - fraction)}`)
    .style('stroke', colorVar);
  const angleRad = (180 - fraction * 180) * (Math.PI / 180);
  const needleLength = 32;
  const cx = 48;
  const cy = 48;
  d3.select('#automation-gauge-needle')
    .attr('x2', cx + needleLength * Math.cos(angleRad))
    .attr('y2', cy - needleLength * Math.sin(angleRad));
}

function buildStatTile(container, { label, value, sub, muted }) {
  const tile = container.append('div').attr('class', 'task-stat');
  tile.append('span').attr('class', 'task-stat-label').text(label);
  tile.append('span').attr('class', `task-stat-value${muted ? ' muted' : ''}`).text(value);
  if (sub) tile.append('span').attr('class', 'task-stat-sub').text(sub);
}

// Automation Opportunity: a transparent, deterministic blend of signals
// already shown as real stats elsewhere in this panel (frequency,
// consistency = 1 - deviation rate, rework rate) — nothing here is
// invented. The one soft signal is "human judgment", proxied by how many
// distinct ways the task gets carried out: more subtypes (or, lacking
// subtype data, more deviation) implies more situational judgment.
function renderAutomationTab(node, meta, uniqueUsers) {
  const pct = (n) => `${(n * 100).toFixed(0)}%`;
  const consistency = 1 - node.deviationRate;
  const frequency = node.casePct;
  const reworkFactor = 1 - node.reworkRate;

  const subtypeCount = meta && meta.subtypes ? meta.subtypes.length : 0;
  let judgment;
  if (subtypeCount > 0) judgment = subtypeCount <= 1 ? 'Low' : subtypeCount <= 3 ? 'Medium' : 'High';
  else judgment = node.deviationRate < 0.1 ? 'Low' : node.deviationRate < 0.3 ? 'Medium' : 'High';
  const judgmentFactor = judgment === 'Low' ? 1 : judgment === 'Medium' ? 0.6 : 0.25;

  const score = Math.round(100 * (0.3 * frequency + 0.3 * consistency + 0.2 * reworkFactor + 0.2 * judgmentFactor));
  const tier = score >= 70 ? 'high' : score >= 40 ? 'medium' : 'low';
  const tierLabel = tier === 'high' ? 'High' : tier === 'medium' ? 'Medium' : 'Low';
  const tierColorVar = tier === 'high' ? 'var(--path-main)' : tier === 'medium' ? 'var(--rework)' : 'var(--flag-end-fg)';

  d3.select('#automation-tier-badge').attr('class', `automation-tier-badge ${tier}`).text(tierLabel);
  d3.select('#automation-score').html(`${score} <span>/100</span>`);
  updateAutomationGauge(score / 100, tierColorVar);

  const reasonParts = [];
  if (consistency >= 0.8) reasonParts.push('its consistency');
  if (judgment === 'Low') reasonParts.push('low need for human judgement');
  if (node.reworkRate < 0.05) reasonParts.push('minimal rework');
  const reasonText = reasonParts.length ? reasonParts.join(' and ') : 'a mix of moderate consistency and judgment needs';
  const verdict = tier === 'high' ? 'highly automatable' : tier === 'medium' ? 'a moderate automation candidate' : 'a weaker automation candidate';
  d3.select('#automation-opportunity-text').text(
    `This task is ${verdict} due to ${reasonText}, potentially saving ~${formatDuration(node.totalTime)} effort.`
  );

  const whyGrid = d3.select('#automation-why-grid');
  whyGrid.selectAll('*').remove();
  buildStatTile(whyGrid, { label: 'Frequency', value: pct(frequency), sub: 'of all instances' });
  buildStatTile(whyGrid, { label: 'Consistency', value: pct(consistency), sub: 'same pattern' });
  buildStatTile(whyGrid, { label: 'Executions', value: `${node.visits}`, sub: 'total' });
  buildStatTile(whyGrid, { label: 'Avg Duration', value: formatDuration(node.avgDuration), sub: 'per execution' });
  buildStatTile(whyGrid, {
    label: 'Rework Rate',
    value: pct(node.reworkRate),
    sub: node.reworkCaseCount ? `${pluralCases(node.reworkCaseCount)} reworked` : 'no rework',
  });
  buildStatTile(whyGrid, {
    label: 'Human Judgment',
    value: judgment,
    sub: judgment === 'Low' ? 'rules based' : judgment === 'Medium' ? 'some judgment needed' : 'case-by-case',
  });
  buildStatTile(whyGrid, meta && meta.appId
    ? { label: 'Applications', value: '1', sub: meta.appId }
    : { label: 'Applications', value: 'Not tracked', sub: 'in this dataset', muted: true });
  buildStatTile(whyGrid, { label: 'Error Rate', value: 'Not tracked', sub: 'in this data', muted: true });
  buildStatTile(whyGrid, {
    label: 'Deviation Rate',
    value: pct(node.deviationRate),
    sub: node.deviationCaseCount ? `${pluralCases(node.deviationCaseCount)} deviate` : 'no deviations',
  });

  d3.select('#automation-impact-time').text(formatDuration(node.totalTime));
  d3.select('#automation-impact-pct').text('100%');
  const impactVerdict = tier === 'high'
    ? 'a strong candidate for automation'
    : tier === 'medium'
      ? 'a moderate candidate for automation'
      : 'not a strong candidate for full automation right now';
  d3.select('#automation-impact-text').text(
    `This task is ${impactVerdict} and can save ~${formatDuration(node.totalTime)} of effort across all instances.`
  );

  // "What will be automated?" uses the task's own real subtype names as the
  // step list when available — it's real content, just re-presented as
  // steps, not a fabricated click-by-click breakdown. Nothing stands in for
  // that when a dataset has no subtype catalog at all.
  const stepsBody = d3.select('#automation-steps-body');
  stepsBody.selectAll('*').remove();
  if (meta && meta.subtypes && meta.subtypes.length) {
    const list = stepsBody.append('div').attr('class', 'automation-steps-list');
    meta.subtypes.forEach((s, i) => {
      const row = list.append('div').attr('class', 'automation-step-row');
      row.append('span').attr('class', 'automation-step-number').text(i + 1);
      row.append('span').text(s.name);
    });
  } else {
    stepsBody.append('p').attr('class', 'task-detail-muted-note').text('Not available — no step-level breakdown in this dataset.');
  }

  const nextStepTitle = tier === 'high'
    ? 'Automate this task'
    : tier === 'medium'
      ? 'Consider automating this task'
      : 'Manual review recommended';
  const nextStepText = tier === 'high'
    ? 'High consistency and low complexity make this task ideal for automation.'
    : tier === 'medium'
      ? 'Moderate consistency suggests partial automation could help, with review for exceptions.'
      : 'Lower consistency or higher judgment needs make this task a weaker automation candidate for now.';
  d3.select('#automation-next-step-icon').html(CHECK_ICON_SVG);
  d3.select('#automation-next-step-title').text(nextStepTitle);
  d3.select('#automation-next-step-text').text(nextStepText);
}

// Lets an instance card act as a path filter: traces that instance's exact
// case through the map (same highlight mechanism as the Insights path
// list), dimming everything not on its route. Clicking the same instance
// again toggles the highlight off, via setHighlight's existing toggle.
function selectInstance(caseId) {
  const variant = state.model.variants.find((v) => v.caseIds.includes(caseId));
  if (variant) setHighlight('variant', variant);
  renderTaskDetail();
}

d3.select('#task-detail-close').on('click', closeTaskDetail);

d3.selectAll('.task-detail-tab').on('click', function () {
  setTaskDetailTab(this.dataset.tab);
});
d3.select('#task-detail-view-steps').on('click', () => setTaskDetailTab('overview'));
d3.select('#task-detail-watch-replays').on('click', () => {
  if (state.selectedTaskId) openSessionReplay(state.selectedTaskId);
});
// "Automate with Seek" is an intentionally inert placeholder CTA — there's
// no real automation integration behind this app, so it deliberately has
// no click handler rather than implying one.

// Keeps the panel flush against the topbar's bottom edge (0 in fullscreen,
// where the topbar is hidden) and slides the Insights/AI Summary/fullscreen
// buttons left by the panel's current width so the open panel never covers
// them — recomputed on open/close, on every resize-drag frame, and on
// window resize (the topbar can wrap to a second line on a narrow window).
function syncTaskDetailLayout() {
  const panel = document.getElementById('task-detail-panel');
  const toolbar = document.querySelector('.canvas-toolbar');
  const isOpen = !panel.classList.contains('hidden');
  if (!isOpen) {
    toolbar.style.marginRight = '0px';
    return;
  }
  const topbar = document.querySelector('.topbar');
  const topbarBottom = topbar ? Math.max(0, topbar.getBoundingClientRect().bottom) : 0;
  panel.style.top = `${topbarBottom}px`;
  toolbar.style.marginRight = `${panel.getBoundingClientRect().width}px`;
}
window.addEventListener('resize', syncTaskDetailLayout);

(function setupTaskDetailResize() {
  const handle = document.getElementById('task-detail-resize-handle');
  const panel = document.getElementById('task-detail-panel');
  let dragging = false;
  let startX = 0;
  let startWidth = 0;
  handle.addEventListener('mousedown', (event) => {
    dragging = true;
    startX = event.clientX;
    startWidth = panel.getBoundingClientRect().width;
    handle.classList.add('dragging');
    event.preventDefault();
  });
  window.addEventListener('mousemove', (event) => {
    if (!dragging) return;
    const delta = startX - event.clientX;
    const maxWidth = Math.min(900, window.innerWidth - 80);
    const next = Math.min(Math.max(startWidth + delta, 320), maxWidth);
    panel.style.width = `${next}px`;
    syncTaskDetailLayout();
  });
  window.addEventListener('mouseup', () => {
    if (!dragging) return;
    dragging = false;
    handle.classList.remove('dragging');
  });
})();

// ---- filter panel ----
// state.allCases is always the full, unfiltered dataset; state.cases/state.model
// are what's actually on screen. Applying a filter narrows allCases down into
// cases and rebuilds the model from that — every other panel (graph, Insights,
// task detail) already reads state.cases/state.model, so they follow for free.
// Filter Sets are cleared in place (never reassigned) so the searchable
// selects' closures — which capture these Set references once at setup —
// stay attached to the live filter state across a reset.
function resetFilters() {
  state.filters.taskNames.clear();
  state.filters.variantSignatures.clear();
  state.filters.durationMin = null;
  state.filters.durationMax = null;
  state.filters.processIds.clear();
  state.filters.userIds.clear();
  if (processIdSelect) { processIdSelect.renderChips(); processIdSelect.closeDropdown(); processIdSelect.clearInput(); }
  if (userIdSelect) { userIdSelect.renderChips(); userIdSelect.closeDropdown(); userIdSelect.clearInput(); }
  syncDurationSliderBounds();
  state.cases = state.allCases;
  state.model = state.baseModel;
}

function getFilteredCases() {
  const f = state.filters;
  const hasTask = f.taskNames.size > 0;
  const hasPath = f.variantSignatures.size > 0;
  const hasProcessId = f.processIds.size > 0;
  const hasUserId = f.userIds.size > 0;
  return state.allCases.filter((c) => {
    if (hasTask && !c.steps.some((s) => f.taskNames.has(s.task))) return false;
    if (hasPath && !f.variantSignatures.has(c.steps.map((s) => s.task).join(' → '))) return false;
    if (f.durationMin != null && c.totalDuration < f.durationMin) return false;
    if (f.durationMax != null && c.totalDuration > f.durationMax) return false;
    if (hasProcessId && !f.processIds.has(c.caseId)) return false;
    if (hasUserId && !(c.users || []).some((u) => f.userIds.has(String(u)))) return false;
    return true;
  });
}

// A filter combination that matches nothing would otherwise hand an empty
// case list to buildProcessModel() — every ratio in there divides by
// totalCases, so that's NaN and a crash waiting to happen (model.happyPath
// is undefined). Instead, leave the map showing its last valid state and
// just report the mismatch in the panel.
function applyFilters() {
  const filtered = getFilteredCases();
  if (filtered.length) {
    state.cases = filtered;
    state.model = buildProcessModel(filtered);
    state.highlight = null;
    state.expandedBubbles = new Set();
    state.comparison = null;
    d3.select('#insight-compare-btn').classed('active', false).attr('aria-checked', 'false');
    render(true);
    if (state.selectedTaskId) renderTaskDetail();
  }
  renderFilterPanel(filtered.length);
}

function renderFilterPanel(matchCountOverride) {
  const base = state.baseModel;
  if (!base) return;
  const f = state.filters;
  const matchCount = matchCountOverride != null ? matchCountOverride : state.cases.length;
  const total = state.allCases.length;

  d3.select('#filter-summary').text(
    matchCount === total
      ? `Showing all ${total} instance${total === 1 ? '' : 's'}.`
      : matchCount
        ? `Showing ${matchCount} of ${total} instance${total === 1 ? '' : 's'}.`
        : `No instances match — showing the last matching view.`
  );

  const activeFacets = [f.taskNames.size > 0, f.variantSignatures.size > 0, f.durationMin != null || f.durationMax != null, f.processIds.size > 0, f.userIds.size > 0]
    .filter(Boolean).length;
  d3.select('#filter-count-badge').classed('hidden', activeFacets === 0).text(activeFacets);
  d3.select('#filter-process-id-count').text(f.processIds.size);
  d3.select('#filter-user-id-count').text(f.userIds.size);

  d3.select('#filter-task-count').text(f.taskNames.size);
  const taskItems = base.nodes.filter((n) => !n.virtual).slice().sort((a, b) => b.caseCount - a.caseCount);
  const taskList = d3.select('#filter-task-list');
  const taskSel = taskList.selectAll('.filter-checklist-item').data(taskItems, (n) => n.id);
  taskSel.exit().remove();
  const taskEnter = taskSel.enter().append('label').attr('class', 'filter-checklist-item');
  const taskTop = taskEnter.append('div').attr('class', 'filter-checklist-item-top');
  taskTop.append('input').attr('type', 'checkbox');
  taskTop.append('span').attr('class', 'filter-checklist-item-label');
  taskTop.append('span').attr('class', 'filter-checklist-item-count');
  const taskMerged = taskEnter.merge(taskSel);
  taskMerged.attr('class', (n) => `filter-checklist-item${f.taskNames.has(n.id) ? ' checked' : ''}`);
  taskMerged.select('input').property('checked', (n) => f.taskNames.has(n.id)).on('change', (event, n) => {
    if (f.taskNames.has(n.id)) f.taskNames.delete(n.id); else f.taskNames.add(n.id);
    applyFilters();
  });
  taskMerged.select('.filter-checklist-item-label').text((n) => n.label);
  taskMerged.select('.filter-checklist-item-count').text((n) => `${n.caseCount}`);

  d3.select('#filter-path-count').text(f.variantSignatures.size);
  const pathList = d3.select('#filter-path-list');
  const pathSel = pathList.selectAll('.filter-checklist-item').data(base.variants, (v) => v.signature);
  pathSel.exit().remove();
  const pathEnter = pathSel.enter().append('label').attr('class', 'filter-checklist-item');
  const pathTop = pathEnter.append('div').attr('class', 'filter-checklist-item-top');
  pathTop.append('input').attr('type', 'checkbox');
  pathTop.append('span').attr('class', 'filter-checklist-item-label');
  pathTop.append('span').attr('class', 'filter-checklist-item-count');
  pathEnter.append('div').attr('class', 'filter-checklist-item-path');
  const pathMerged = pathEnter.merge(pathSel);
  pathMerged.attr('class', (v) => `filter-checklist-item${f.variantSignatures.has(v.signature) ? ' checked' : ''}`);
  pathMerged.select('input').property('checked', (v) => f.variantSignatures.has(v.signature)).on('change', (event, v) => {
    if (f.variantSignatures.has(v.signature)) f.variantSignatures.delete(v.signature); else f.variantSignatures.add(v.signature);
    applyFilters();
  });
  pathMerged.select('.filter-checklist-item-label').text((v) => `Path ${pathLetterLabel(v.rank)} · ${(v.pct * 100).toFixed(1)}%`);
  pathMerged.select('.filter-checklist-item-path').text((v) => v.path.join(' → '));
  pathMerged.select('.filter-checklist-item-count').text((v) => pluralCases(v.count));
}

function openFilterPanel() {
  closeInsights();
  closeAISummary();
  closeTaskDetail();
  document.getElementById('filter-btn').classList.add('active');
  document.getElementById('filter-btn').setAttribute('aria-expanded', 'true');
  document.getElementById('filter-panel').classList.remove('hidden');
  renderFilterPanel();
}

function closeFilterPanel() {
  document.getElementById('filter-btn').classList.remove('active');
  document.getElementById('filter-btn').setAttribute('aria-expanded', 'false');
  document.getElementById('filter-panel').classList.add('hidden');
}

d3.select('#filter-btn').on('click', () => {
  const panel = document.getElementById('filter-panel');
  if (panel.classList.contains('hidden')) openFilterPanel();
  else closeFilterPanel();
});
d3.select('#filter-close').on('click', closeFilterPanel);
d3.select('#filter-reset').on('click', () => {
  resetFilters();
  render(true);
  renderFilterPanel();
});
// A searchable multi-select combobox: a text input filters a dropdown list
// (built from getOptions(), always the full unfiltered dataset so option
// counts stay stable), clicking an option toggles it into selectedSet and
// shows it as a removable chip. selectedSet is a Set living in
// state.filters — resetFilters() clears it in place rather than replacing
// it, so this closure never goes stale.
function setupFilterSelect({ inputId, dropdownId, chipsId, selectedSet, getOptions, onChange }) {
  const input = document.getElementById(inputId);
  const dropdownEl = document.getElementById(dropdownId);
  const dropdown = d3.select(dropdownEl);
  const chips = d3.select(`#${chipsId}`);
  const MAX_SHOWN = 200;

  function renderChips() {
    const items = Array.from(selectedSet);
    const sel = chips.selectAll('.filter-select-chip').data(items, (d) => d);
    sel.exit().remove();
    const enter = sel.enter().append('span').attr('class', 'filter-select-chip');
    enter.append('span').attr('class', 'filter-select-chip-label');
    enter.append('button').attr('type', 'button').attr('aria-label', 'Remove').html('&times;');
    const merged = enter.merge(sel);
    merged.select('.filter-select-chip-label').text((d) => d);
    merged.select('button').on('click', (event, d) => {
      selectedSet.delete(d);
      renderChips();
      renderDropdown();
      onChange();
    });
  }

  function renderDropdown() {
    const query = input.value.trim().toLowerCase();
    const options = getOptions();
    const filtered = query ? options.filter((o) => o.toLowerCase().includes(query)) : options;
    const shown = filtered.slice(0, MAX_SHOWN);
    dropdown.selectAll('*').remove();
    if (!shown.length) {
      dropdown.append('div').attr('class', 'filter-select-empty').text('No matches.');
    } else {
      shown.forEach((opt) => {
        dropdown.append('div')
          .attr('class', `filter-select-option${selectedSet.has(opt) ? ' selected' : ''}`)
          .text(opt)
          .on('click', () => {
            if (selectedSet.has(opt)) selectedSet.delete(opt); else selectedSet.add(opt);
            input.value = '';
            renderChips();
            renderDropdown();
            onChange();
          });
      });
      if (filtered.length > MAX_SHOWN) {
        dropdown.append('div').attr('class', 'filter-select-empty').text(`Showing first ${MAX_SHOWN} of ${filtered.length} — keep typing to narrow.`);
      }
    }
  }

  function closeDropdown() { dropdown.classed('hidden', true); }
  function clearInput() { input.value = ''; }

  input.addEventListener('focus', () => { dropdown.classed('hidden', false); renderDropdown(); });
  input.addEventListener('input', () => { dropdown.classed('hidden', false); renderDropdown(); });
  document.addEventListener('click', (event) => {
    if (event.target !== input && !dropdownEl.contains(event.target)) closeDropdown();
  });

  renderChips();
  return { renderChips, renderDropdown, closeDropdown, clearInput };
}

const processIdSelect = setupFilterSelect({
  inputId: 'filter-process-id-input',
  dropdownId: 'filter-process-id-dropdown',
  chipsId: 'filter-process-id-chips',
  selectedSet: state.filters.processIds,
  getOptions: () => state.allCases.map((c) => c.caseId),
  onChange: applyFilters,
});

const userIdSelect = setupFilterSelect({
  inputId: 'filter-user-id-input',
  dropdownId: 'filter-user-id-dropdown',
  chipsId: 'filter-user-id-chips',
  selectedSet: state.filters.userIds,
  getOptions: () => Array.from(new Set(state.allCases.flatMap((c) => c.users || []).map(String))),
  onChange: applyFilters,
});

// Dual-handle range slider: two overlapping <input type=range>, only the
// thumb itself accepts pointer events (see .duration-range-input CSS) so
// both stay independently draggable. Bounds track the full dataset's
// actual min/max duration, not an arbitrary 0-based scale.
function syncDurationSliderBounds() {
  const durations = state.allCases.map((c) => c.totalDuration);
  const dataMin = durations.length ? Math.floor(Math.min(...durations)) : 0;
  const dataMaxRaw = durations.length ? Math.ceil(Math.max(...durations)) : 100;
  const dataMax = dataMaxRaw > dataMin ? dataMaxRaw : dataMin + 1;
  const minSlider = document.getElementById('filter-duration-min-slider');
  const maxSlider = document.getElementById('filter-duration-max-slider');
  minSlider.min = dataMin; minSlider.max = dataMax;
  maxSlider.min = dataMin; maxSlider.max = dataMax;
  minSlider.value = state.filters.durationMin != null ? state.filters.durationMin : dataMin;
  maxSlider.value = state.filters.durationMax != null ? state.filters.durationMax : dataMax;
  updateDurationSliderUI();
}

function updateDurationSliderUI() {
  const minSlider = document.getElementById('filter-duration-min-slider');
  const maxSlider = document.getElementById('filter-duration-max-slider');
  const rangeMin = Number(minSlider.min);
  const rangeMax = Number(minSlider.max) || 1;
  const span = rangeMax - rangeMin || 1;
  const minPct = ((Number(minSlider.value) - rangeMin) / span) * 100;
  const maxPct = ((Number(maxSlider.value) - rangeMin) / span) * 100;
  document.getElementById('duration-slider-range').style.left = `${minPct}%`;
  document.getElementById('duration-slider-range').style.width = `${Math.max(0, maxPct - minPct)}%`;
  document.getElementById('filter-duration-min-label').textContent = formatDuration(Number(minSlider.value));
  document.getElementById('filter-duration-max-label').textContent = formatDuration(Number(maxSlider.value));
}

['filter-duration-min-slider', 'filter-duration-max-slider'].forEach((id) => {
  document.getElementById(id).addEventListener('input', () => {
    const minSlider = document.getElementById('filter-duration-min-slider');
    const maxSlider = document.getElementById('filter-duration-max-slider');
    // Keep the handles from crossing — push the other one along instead.
    if (Number(minSlider.value) > Number(maxSlider.value)) {
      if (id === 'filter-duration-min-slider') maxSlider.value = minSlider.value;
      else minSlider.value = maxSlider.value;
    }
    updateDurationSliderUI();
    const rangeMin = Number(minSlider.min);
    const rangeMax = Number(maxSlider.max);
    const minVal = Number(minSlider.value);
    const maxVal = Number(maxSlider.value);
    state.filters.durationMin = minVal <= rangeMin ? null : minVal;
    state.filters.durationMax = maxVal >= rangeMax ? null : maxVal;
    applyFilters();
  });
});

function regenerate(numCases) {
  state.allCases = generateEventLog(numCases);
  state.baseModel = buildProcessModel(state.allCases);
  resetFilters();
  state.highlight = null;
  state.taskInsights = null;
  closeTaskDetail();
  closeFilterPanel();
  setUploadStatus('');
  renderFilterPanel();
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
      state.allCases = cases;
      state.baseModel = buildProcessModel(cases);
      resetFilters();
      state.highlight = null;
      state.threshold = 100;
      state.expandedBubbles = new Set();
      state.comparison = null;
      state.taskInsights = (typeof extractTaskInsights === 'function') ? extractTaskInsights(raw) : null;
      d3.select('#insight-compare-btn').classed('active', false).attr('aria-checked', 'false');
      d3.select('#pf-slider').property('value', 100);
      closeTaskMenu();
      closeSessionReplay();
      closeTaskDetail();
      closeFilterPanel();
      renderFilterPanel();
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
  requestAnimationFrame(() => { fitToView(); syncTaskDetailLayout(); });
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
  else if (!d3.select('#task-detail-panel').classed('hidden')) closeTaskDetail();
  else if (!d3.select('#filter-panel').classed('hidden')) closeFilterPanel();
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
// instance, which path it took, every task in it and how long it really
// took — is real, derived straight from the case log. Only the click-level
// step breakdown inside a task is a clearly-templated stand-in for detail
// the log doesn't capture.
const srState = {
  taskId: null, taskLabel: '', paths: [], metaSuffix: '',
  activePathIndex: 0, activeUserIndex: 0, focusedStepGroupIndex: 0,
  segments: [], totalSeconds: 0, currentTime: 0,
};

const PERSON_ICON_SVG = '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true"><circle cx="8" cy="5.4" r="2.7" stroke="currentColor" stroke-width="1.4"/><path d="M2.8 14 C2.8 10.6 5 9 8 9 C11 9 13.2 10.6 13.2 14" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>';
const TASK_ICON_SVG = '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true"><rect x="2.5" y="3.5" width="11" height="9" rx="2" stroke="currentColor" stroke-width="1.4"/><rect x="9.4" y="6.9" width="2.7" height="2.7" rx="0.7" fill="currentColor"/></svg>';
const PATH_ICON_SVG = '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true"><circle cx="4" cy="4.3" r="1.8" stroke="currentColor" stroke-width="1.3"/><circle cx="12" cy="11.7" r="1.8" stroke="currentColor" stroke-width="1.3"/><path d="M4 6.1 C4 9.5 6 7.8 8 7.8 C10 7.8 12 6.3 12 9.9" stroke="currentColor" stroke-width="1.3" fill="none" stroke-linecap="round"/></svg>';
const CLOCK_ICON_SVG = '<svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true"><circle cx="8" cy="8" r="6" stroke="currentColor" stroke-width="1.3"/><path d="M8 4.8 V8 L10.2 9.4" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/></svg>';

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

// Groups every instance that touched the target task by which process
// variant (path) it followed, then by which real user ran it — real data
// throughout: which users ran each path, the path's ordered list of tasks,
// and (looked up per active user below) every task's real duration, since
// the same path can take a different amount of time for each person.
function buildTaskPaths(cases, taskId, model) {
  const byPath = new Map();
  cases.forEach((c) => {
    if (!c.steps.some((s) => s.task === taskId)) return;
    const variant = model.variants.find((v) => v.caseIds.includes(c.caseId));
    const taskNames = c.steps.map((s) => s.task);
    const key = variant ? variant.rank : `u:${taskNames.join('>')}`;
    if (!byPath.has(key)) byPath.set(key, { variantRank: variant ? variant.rank : null, taskNames, users: new Map() });
    const entry = byPath.get(key);
    const userId = (c.users && c.users[0]) || 'Unknown user';
    if (!entry.users.has(userId)) entry.users.set(userId, []);
    entry.users.get(userId).push(c);
  });
  return Array.from(byPath.values())
    .sort((a, b) => (a.variantRank ?? Infinity) - (b.variantRank ?? Infinity))
    .map((entry) => ({
      variantRank: entry.variantRank,
      taskNames: entry.taskNames,
      users: Array.from(entry.users.entries()).map(([userId, userCases]) => ({ userId, cases: userCases })),
    }));
}

function isTaskRepeated(taskNames, taskName) {
  return taskNames.filter((t) => t === taskName).length > 1;
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

// The whole path is one continuous "recording" — each task's own
// synthesized steps are laid end-to-end so the scrubber represents the
// full path, not just whichever task is currently focused.
function buildPathTimeline(path, caseObj) {
  let cursor = 0;
  const segments = path.taskNames.map((taskName, i) => {
    const built = buildSessionSteps(taskName, isTaskRepeated(path.taskNames, taskName), hashStr(`${caseObj.caseId}:${i}`));
    const startT = cursor;
    const steps = built.steps.map((s) => ({ ...s, t: s.t + startT }));
    cursor += built.totalSeconds;
    return { taskName, startT, endT: cursor, steps };
  });
  return { segments, totalSeconds: cursor };
}

function activePath() { return srState.paths[srState.activePathIndex]; }
function activeCase() { return activePath().users[srState.activeUserIndex].cases[0]; }

function openSessionReplay(taskId) {
  const model = state.model;
  const node = model.nodes.find((n) => n.id === taskId);
  const paths = buildTaskPaths(state.cases, taskId, model);
  if (!node || !paths.length) return;

  srState.taskId = taskId;
  srState.taskLabel = node.label;
  srState.paths = paths;
  srState.activePathIndex = 0;
  srState.activeUserIndex = 0;

  const allCases = paths.flatMap((p) => p.users.flatMap((u) => u.cases));
  const uniqueUserCount = new Set(allCases.map((c) => (c.users && c.users[0]) || 'Unknown user')).size;
  srState.metaSuffix = `${allCases.length} instance${allCases.length === 1 ? '' : 's'} · ${uniqueUserCount} unique user${uniqueUserCount === 1 ? '' : 's'} · ${paths.length} path${paths.length === 1 ? '' : 's'}`;

  loadActiveUser();
  renderPathsList();
  renderScrubber();

  const playPause = d3.select('#sr-play-pause').classed('is-playing', false);
  playPause.select('.sr-icon-play').style('display', '');
  playPause.select('.sr-icon-pause').style('display', 'none');

  d3.select('#session-replay-modal').classed('hidden', false);
}
function closeSessionReplay() {
  d3.select('#session-replay-modal').classed('hidden', true);
  d3.select('#sr-panel').classed('sr-panel-expanded', false);
}

// Rebuilds the whole path's timeline for the active user's case, and
// points the playhead at the target task's segment — called on open, and
// again whenever the active path or user changes (a different case means
// different real per-task durations, so the whole timeline is rebuilt).
function loadActiveUser() {
  const path = activePath();
  const targetIndex = path.taskNames.findIndex((t) => t === srState.taskId);
  srState.focusedStepGroupIndex = targetIndex >= 0 ? targetIndex : 0;

  const timeline = buildPathTimeline(path, activeCase());
  srState.segments = timeline.segments;
  srState.totalSeconds = timeline.totalSeconds;
  srState.currentTime = timeline.segments[srState.focusedStepGroupIndex].startT;

  d3.select('#sr-task-name').text(srState.taskLabel);
  d3.select('#sr-task-sub').text(`${timeline.segments[srState.focusedStepGroupIndex].steps.length} steps · ${srState.metaSuffix}`);
  renderUserBar();
  renderPlayerMeta();
}

function selectPath(pathIndex) {
  if (pathIndex === srState.activePathIndex) return;
  srState.activePathIndex = pathIndex;
  srState.activeUserIndex = 0;
  loadActiveUser();
  renderPathsList();
  renderScrubber();

  // Bring the just-selected path (and the task list revealed beneath it)
  // into view instead of leaving it to render below the fold.
  const row = document.querySelector(`#sr-sessions-panel [data-path-index="${pathIndex}"]`);
  if (row) row.scrollIntoView({ block: 'start', behavior: 'smooth' });
}

function selectUser(userIndex) {
  const clamped = Math.min(activePath().users.length - 1, Math.max(0, userIndex));
  if (clamped === srState.activeUserIndex) return;
  srState.activeUserIndex = clamped;
  loadActiveUser();
  renderPathsList();
  renderScrubber();
}

function stepUser(delta) { selectUser(srState.activeUserIndex + delta); }

// Switches the player to a specific task within the active path — the
// target task by default, or whichever other task the user clicks to peek
// at. Jumps the playhead to that task's own segment of the whole-path
// timeline (already built by loadActiveUser) rather than resetting to 0,
// so the scrubber visibly slides along the same bar as you move between
// tasks instead of restarting each time.
function focusTask(stepGroupIndex) {
  srState.focusedStepGroupIndex = stepGroupIndex;
  srState.currentTime = srState.segments[stepGroupIndex].startT;
  renderScrubber();
  renderPathsList();
  renderPlayerMeta();
}

// Moving the scrubber can cross into a different task's own segment of
// the whole-path timeline — when it does, that task becomes focused too,
// so the sidebar highlight and meta bar always track the playhead.
function seekToTime(targetT) {
  srState.currentTime = Math.min(srState.totalSeconds, Math.max(0, targetT));
  const segIndex = srState.segments.findIndex((seg) => srState.currentTime >= seg.startT && srState.currentTime < seg.endT);
  const newFocus = segIndex >= 0 ? segIndex : srState.segments.length - 1;
  if (newFocus !== srState.focusedStepGroupIndex) {
    srState.focusedStepGroupIndex = newFocus;
    renderPathsList();
    renderPlayerMeta();
  }
  updateScrubberPosition();
}
function seekBy(deltaSeconds) { seekToTime(srState.currentTime + deltaSeconds); }

// The player-side bar mirrors the sidebar's user picker (both rebuilt on
// every switch, so they never drift out of sync); prev/next arrows sit
// right next to the id itself, centered above the video.
function renderUserBar() {
  const bar = d3.select('#sr-player-userbar');
  bar.selectAll('*').remove();
  const path = activePath();

  bar.append('button').attr('class', 'sr-player-nav').attr('type', 'button').attr('aria-label', 'Previous user')
    .property('disabled', srState.activeUserIndex === 0)
    .html('<svg width="12" height="12" viewBox="0 0 14 14" fill="none" aria-hidden="true"><path d="M9 2 L4 7 L9 12" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>')
    .on('click', () => stepUser(-1));

  bar.append('span').html(PERSON_ICON_SVG);
  bar.append('span').text('User ID :');
  const select = bar.append('select').attr('class', 'sr-userbar-select');
  path.users.forEach((u, i) => {
    select.append('option').attr('value', i).property('selected', i === srState.activeUserIndex).text(formatUserId(u.userId));
  });
  select.on('change', function () { selectUser(Number(this.value)); });

  bar.append('button').attr('class', 'sr-player-nav').attr('type', 'button').attr('aria-label', 'Next user')
    .property('disabled', srState.activeUserIndex === path.users.length - 1)
    .html('<svg width="12" height="12" viewBox="0 0 14 14" fill="none" aria-hidden="true"><path d="M5 2 L10 7 L5 12" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>')
    .on('click', () => stepUser(1));
}

// The selected path, focused task, and that task's real duration for the
// active user — sits right above the video, between the user picker and
// the player itself. Refreshed whenever the focused task, path, or user
// changes.
function renderPlayerMeta() {
  const bar = d3.select('#sr-player-meta');
  bar.selectAll('*').remove();
  const path = activePath();
  const taskName = path.taskNames[srState.focusedStepGroupIndex];
  const duration = activeCase().steps[srState.focusedStepGroupIndex].duration;

  bar.append('span').html(PATH_ICON_SVG);
  bar.append('span').text(`Path ${path.variantRank != null ? path.variantRank : '–'}`);
  bar.append('span').attr('class', 'sr-player-meta-sep').text('·');
  bar.append('span').html(TASK_ICON_SVG);
  bar.append('span').text(taskName);
  bar.append('span').attr('class', 'sr-player-meta-sep').text('·');
  bar.append('span').html(CLOCK_ICON_SVG);
  bar.append('span').text(formatDuration(duration));

  d3.select('#sr-chapter-prev').property('disabled', srState.focusedStepGroupIndex === 0);
  d3.select('#sr-chapter-next').property('disabled', srState.focusedStepGroupIndex === path.taskNames.length - 1);
}

// Steps the player to the previous/next task ("chapter") in the active
// path's own order.
function stepTask(delta) {
  const path = activePath();
  const next = Math.min(path.taskNames.length - 1, Math.max(0, srState.focusedStepGroupIndex + delta));
  if (next === srState.focusedStepGroupIndex) return;
  focusTask(next);
}

function renderPathsList() {
  const panel = d3.select('#sr-sessions-panel');
  panel.selectAll('*').remove();
  d3.select('#sr-path-count').text(srState.paths.length);

  srState.paths.forEach((path, pathIndex) => {
    const isActive = pathIndex === srState.activePathIndex;
    const row = panel.append('div')
      .attr('class', `sr-user-row${isActive ? ' expanded' : ''}`)
      .attr('data-path-index', pathIndex)
      .on('click', () => selectPath(pathIndex));
    row.append('span').attr('class', 'sr-user-avatar').html(PATH_ICON_SVG);
    const info = row.append('span').attr('class', 'sr-user-info');
    info.append('span').attr('class', 'sr-user-name').text(`Path ${path.variantRank != null ? path.variantRank : '–'}`);
    info.append('span').attr('class', 'sr-user-meta').text(`${path.users.length} user${path.users.length === 1 ? '' : 's'} · ${path.taskNames.length} Tasks`);

    if (!isActive) return;

    const selectRow = panel.append('div').attr('class', 'sr-user-select-row');
    selectRow.append('span').text('User :');
    const select = selectRow.append('select').attr('class', 'sr-userbar-select');
    path.users.forEach((u, i) => {
      select.append('option').attr('value', i).property('selected', i === srState.activeUserIndex).text(formatUserId(u.userId));
    });
    select.on('change', function () { selectUser(Number(this.value)); });

    const currentCase = activeCase();
    path.taskNames.forEach((taskName, stepGroupIndex) => {
      const isFocused = stepGroupIndex === srState.focusedStepGroupIndex;
      const taskRow = panel.append('div')
        .attr('class', `sr-task-row${isFocused ? ' focused' : ''}`)
        .on('click', (event) => { event.stopPropagation(); focusTask(stepGroupIndex); });
      const header = taskRow.append('div').attr('class', 'sr-task-row-header');
      header.append('span').attr('class', 'sr-task-row-icon').html(TASK_ICON_SVG);
      const textCol = header.append('span').attr('class', 'sr-task-row-text');
      textCol.append('div').attr('class', 'sr-task-row-top').text(taskName);
      textCol.append('div').attr('class', 'sr-task-row-sub').text(`${srState.segments[stepGroupIndex].steps.length} steps`);
      header.append('span').attr('class', 'sr-task-row-duration').text(formatDuration(currentCase.steps[stepGroupIndex].duration));
    });
  });
}

// Ticks mark task boundaries across the whole path now, not individual
// synthetic steps within one task.
function renderScrubber() {
  const track = d3.select('#sr-scrubber-track');
  track.selectAll('.sr-scrubber-tick').remove();
  srState.segments.forEach((seg, i) => {
    if (i === 0) return; // no divider needed at the very start of the bar
    track.append('div')
      .attr('class', 'sr-scrubber-tick')
      .style('left', `${(seg.startT / srState.totalSeconds) * 100}%`);
  });
  updateScrubberPosition();
}
function updateScrubberPosition() {
  const t = srState.currentTime;
  const seg = srState.segments[srState.focusedStepGroupIndex];
  const pct = srState.totalSeconds ? (t / srState.totalSeconds) * 100 : 0;
  const segEndPct = srState.totalSeconds ? (seg.endT / srState.totalSeconds) * 100 : 100;
  d3.select('#sr-scrubber-fill').style('width', `${pct}%`);
  // Soft highlight covers the rest of the focused task's own segment,
  // ahead of the playhead — a preview of "how much of this chapter is
  // left", distinct from the solid orange already played.
  d3.select('#sr-scrubber-fill-soft').style('left', `${pct}%`).style('width', `${Math.max(0, segEndPct - pct)}%`);
  d3.select('#sr-scrubber-thumb').style('left', `${pct}%`);
  d3.select('#sr-time-current').text(formatClock(t));
  d3.select('#sr-time-total').text(formatClock(srState.totalSeconds));
}

d3.select('#sr-close').on('click', closeSessionReplay);
d3.select('#session-replay-modal').on('click', function (event) {
  if (event.target === this) closeSessionReplay();
});
d3.select('#sr-scrubber-track').on('click', function (event) {
  const rect = this.getBoundingClientRect();
  const frac = Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width));
  seekToTime(frac * srState.totalSeconds);
});

// Hover preview — shows which task's chapter sits under the cursor
// before you click, with its real duration (matching the task rows and
// meta bar elsewhere in this player).
d3.select('#sr-scrubber-track').on('mousemove', function (event) {
  const trackRect = this.getBoundingClientRect();
  const wrapRect = document.querySelector('.sr-scrubber').getBoundingClientRect();
  const frac = Math.min(1, Math.max(0, (event.clientX - trackRect.left) / trackRect.width));
  const t = frac * srState.totalSeconds;
  const segIndex = srState.segments.findIndex((seg) => t >= seg.startT && t < seg.endT);
  const idx = segIndex >= 0 ? segIndex : srState.segments.length - 1;

  const preview = d3.select('#sr-scrubber-preview');
  const left = Math.min(
    wrapRect.width - 74,
    Math.max(74, event.clientX - wrapRect.left),
  );
  preview.style('left', `${left}px`).classed('visible', true);
  d3.select('#sr-scrubber-preview-title').text(srState.segments[idx].taskName);
  d3.select('#sr-scrubber-preview-duration').text(formatDuration(activeCase().steps[idx].duration));
});
d3.select('#sr-scrubber-track').on('mouseleave', () => {
  d3.select('#sr-scrubber-preview').classed('visible', false);
});

d3.select('#sr-chapter-prev').on('click', () => stepTask(-1));
d3.select('#sr-chapter-next').on('click', () => stepTask(1));
d3.select('#sr-seek-back').on('click', () => seekBy(-10));
d3.select('#sr-seek-fwd').on('click', () => seekBy(10));

// Restart affordances — there's no real playback to pause/resume, so
// every one of these just resets the scrubber to the start. The big
// play/pause button also flips its own icon, purely cosmetic (matching
// the honest-placeholder pattern already used for speed/skip toggles
// elsewhere in this player) since nothing is actually playing.
d3.select('#sr-header-play').on('click', () => seekToTime(0));
d3.select('#sr-play-pause').on('click', function () {
  const btn = d3.select(this);
  const isPlaying = !btn.classed('is-playing');
  btn.classed('is-playing', isPlaying);
  btn.select('.sr-icon-play').style('display', isPlaying ? 'none' : '');
  btn.select('.sr-icon-pause').style('display', isPlaying ? '' : 'none');
  seekToTime(0);
});

// Speed is a cosmetic selector — honest about there being no real video
// whose rate it could actually affect.
d3.select('#sr-speed-select').on('change', function () {});

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
  d3.select('#insight-compare-btn').classed('active', false).attr('aria-checked', 'false');
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
    const rawHandoff = JSON.parse(selectedProcessDataRaw);
    const cases = normalizeCaseLog(rawHandoff);
    state.allCases = cases;
    state.baseModel = buildProcessModel(cases);
    resetFilters();
    state.highlight = null;
    state.taskInsights = (typeof extractTaskInsights === 'function') ? extractTaskInsights(rawHandoff) : null;
    renderFilterPanel();
    render(true);
    loadedFromHandoff = true;
  } catch (err) {
    // Fall through to the default demo data below if the handoff payload
    // was somehow malformed — better than a blank map.
  }
}

if (!loadedFromHandoff) regenerate(500);
