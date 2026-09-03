// Turns a raw event log (array of cases) into a directly-follows graph plus
// the metrics that actually drive an automation decision: not just "what
// paths exist", but where time concentrates, where rework loops happen, and
// which observed path is fastest end-to-end.

function buildProcessModel(cases) {
  const nodeStats = new Map(); // task -> {visits, totalDuration, cases}
  const edgeStats = new Map(); // "from||to" -> {count, cases}
  const variantMap = new Map(); // signature -> {count, path, caseIds, totalDuration}
  const reworkStats = new Map(); // task -> {caseCount, extraVisits}
  const reworkedCaseIds = new Set(); // cases where ANY step repeated

  const touch = (map, key, init) => {
    if (!map.has(key)) map.set(key, init());
    return map.get(key);
  };

  for (const c of cases) {
    // Node stats: count every visit (a rework loop can visit a task twice)
    c.steps.forEach((s) => {
      const stat = touch(nodeStats, s.task, () => ({ visits: 0, totalDuration: 0, cases: new Set(), durations: [] }));
      stat.visits += 1;
      stat.totalDuration += s.duration;
      stat.cases.add(c.caseId);
      stat.durations.push(s.duration);
    });

    // Rework: did this case revisit the same task more than once?
    const visitsInCase = new Map();
    c.steps.forEach((s) => visitsInCase.set(s.task, (visitsInCase.get(s.task) || 0) + 1));
    visitsInCase.forEach((count, task) => {
      if (count > 1) {
        const r = touch(reworkStats, task, () => ({ caseCount: 0, extraVisits: 0 }));
        r.caseCount += 1;
        r.extraVisits += count - 1;
        reworkedCaseIds.add(c.caseId);
      }
    });

    // Edge stats. A transition is flagged as "rework" specifically when its
    // target task was already visited earlier in this same case — i.e. the
    // case is looping back to redo work, not just following a variant order
    // where that task happens to come later on its first-ever visit.
    const seenInCase = new Set();
    let prevTask = START;
    for (let i = 0; i <= c.steps.length; i++) {
      const toTask = i < c.steps.length ? c.steps[i].task : END;
      const key = `${prevTask}||${toTask}`;
      const stat = touch(edgeStats, key, () => ({ from: prevTask, to: toTask, count: 0, cases: new Set(), reworkCases: new Set() }));
      stat.count += 1;
      stat.cases.add(c.caseId);
      if (toTask !== END && seenInCase.has(toTask)) stat.reworkCases.add(c.caseId);
      if (toTask !== END) seenInCase.add(toTask);
      prevTask = toTask;
    }

    // Variant signature = the exact sequence of tasks (order matters, loops included)
    const signature = c.steps.map((s) => s.task).join(' → ');
    const variant = touch(variantMap, signature, () => ({
      signature,
      path: c.steps.map((s) => s.task),
      count: 0,
      caseIds: [],
      totalDuration: 0,
    }));
    variant.count += 1;
    variant.caseIds.push(c.caseId);
    variant.totalDuration += c.totalDuration;
  }

  const totalCases = cases.length;

  const nodes = Array.from(nodeStats.entries()).map(([task, stat]) => {
    const rework = reworkStats.get(task);
    return {
      id: task,
      label: task,
      visits: stat.visits,
      caseCount: stat.cases.size,
      casePct: stat.cases.size / totalCases,
      avgDuration: stat.totalDuration / stat.visits,
      medianDuration: median(stat.durations),
      minDuration: Math.min(...stat.durations),
      maxDuration: Math.max(...stat.durations),
      totalTime: stat.totalDuration,
      reworkCaseCount: rework ? rework.caseCount : 0,
      reworkExtraVisits: rework ? rework.extraVisits : 0,
      reworkRate: (rework ? rework.caseCount : 0) / totalCases,
    };
  });
  nodes.push({ id: START, label: 'Start', visits: totalCases, caseCount: totalCases, casePct: 1, avgDuration: 0, medianDuration: 0, totalTime: 0, reworkCaseCount: 0, reworkRate: 0, virtual: true });
  nodes.push({ id: END, label: 'End', visits: totalCases, caseCount: totalCases, casePct: 1, avgDuration: 0, medianDuration: 0, totalTime: 0, reworkCaseCount: 0, reworkRate: 0, virtual: true });

  const edges = Array.from(edgeStats.values()).map((e) => ({
    from: e.from,
    to: e.to,
    count: e.count,
    caseCount: e.cases.size,
    casePct: e.cases.size / totalCases,
    reworkCaseCount: e.reworkCases.size,
  }));

  const variants = Array.from(variantMap.values())
    .sort((a, b) => b.count - a.count)
    .map((v, i) => ({
      ...v,
      rank: i + 1,
      pct: v.count / totalCases,
      avgDuration: v.totalDuration / v.count,
    }));

  // The most frequent variant is treated as the "happy path" baseline.
  const happyPath = variants[0];
  const happyPathEdgeKeys = new Set();
  if (happyPath) {
    const seq = [START, ...happyPath.path, END];
    for (let i = 0; i < seq.length - 1; i++) happyPathEdgeKeys.add(`${seq[i]}||${seq[i + 1]}`);
  }
  edges.forEach((e) => {
    e.onHappyPath = happyPathEdgeKeys.has(`${e.from}||${e.to}`);
  });

  // Deviation rate per task: of the cases that pass through this task, what
  // share aren't following the happy path overall? Every happy-path case
  // that visits this task counts as "on path"; anything else — a different
  // variant, whether or not it happens to visit this same task — is a
  // deviation, since a task the happy path never touches at all is a
  // deviation 100% of the time it's hit.
  const happyPathTaskSet = new Set(happyPath ? happyPath.path : []);
  nodes.forEach((n) => {
    if (n.virtual) return;
    const onPathCaseCount = happyPathTaskSet.has(n.id) ? happyPath.count : 0;
    n.deviationCaseCount = Math.max(0, n.caseCount - onPathCaseCount);
    n.deviationRate = n.caseCount ? n.deviationCaseCount / n.caseCount : 0;
  });

  // Where is the most time being spent? Rank real tasks by their aggregate
  // time burden (avg duration × how often it's hit) — that's what actually
  // drives ROI, not just the slowest single visit.
  const realNodes = nodes.filter((n) => !n.virtual);
  const totalProcessTime = realNodes.reduce((s, n) => s + n.totalTime, 0);
  realNodes.forEach((n) => { n.timeShare = totalProcessTime ? n.totalTime / totalProcessTime : 0; });
  const timeRanking = realNodes.slice().sort((a, b) => b.totalTime - a.totalTime);

  // Where is the most rework happening?
  const reworkRanking = realNodes.filter((n) => n.reworkCaseCount > 0).sort((a, b) => b.reworkCaseCount - a.reworkCaseCount);

  // Which observed path finishes fastest? Ignore one-off outlier variants
  // (fewer than ~1% of cases) so a single lucky case can't claim the title.
  const significantVariants = variants.filter((v) => v.count >= Math.max(2, totalCases * 0.01));
  const fastestPath = (significantVariants.length ? significantVariants : variants)
    .slice()
    .sort((a, b) => a.avgDuration - b.avgDuration)[0];

  // Case completion: a recorded case doesn't necessarily reach a genuine
  // resolution just because its trace ends somewhere — some may have been
  // cut off mid-process. A case counts as having "reached the end" if it
  // finishes on one of the small set of tasks most cases actually conclude
  // on (accumulating to ~80% of cases, largest first); finishing on a
  // rarer, one-off task instead flags it as a stall rather than a normal
  // conclusion. Edges into END already give the exact per-task tally.
  const endEdges = edges.filter((e) => e.to === END).sort((a, b) => b.caseCount - a.caseCount);
  const recognizedEndings = [];
  const rareEndings = [];
  let endingCoverage = 0;
  endEdges.forEach((e) => {
    const entry = { task: e.from, count: e.caseCount, pct: e.casePct };
    if (endingCoverage < 0.8) {
      recognizedEndings.push(entry);
      endingCoverage += entry.pct;
    } else {
      rareEndings.push(entry);
    }
  });
  const completedCaseCount = recognizedEndings.reduce((s, e) => s + e.count, 0);
  const completion = {
    completedCaseCount,
    completedPct: completedCaseCount / totalCases,
    notCompletedCaseCount: totalCases - completedCaseCount,
    notCompletedPct: 1 - completedCaseCount / totalCases,
    recognizedEndings,
    rareEndings,
    recognizedTaskSet: new Set(recognizedEndings.map((e) => e.task)),
  };

  return {
    nodes,
    edges,
    variants,
    totalCases,
    happyPath,
    fastestPath,
    totalProcessTime,
    timeRanking,
    reworkRanking,
    reworkedCasePct: reworkedCaseIds.size / totalCases,
    completion,
  };
}
