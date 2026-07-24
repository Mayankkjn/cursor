// Turns a raw event log (array of cases) into:
//  - a directly-follows graph (nodes + edges with frequency & duration stats)
//  - a ranked list of variants (distinct task sequences) with frequency

function buildProcessModel(cases) {
  const nodeStats = new Map(); // task -> {visits, totalDuration}
  const edgeStats = new Map(); // "from||to" -> {count, totalGap}
  const variantMap = new Map(); // signature -> {count, path, caseIds}

  const touch = (map, key, init) => {
    if (!map.has(key)) map.set(key, init());
    return map.get(key);
  };

  for (const c of cases) {
    const seq = [START, ...c.steps.map((s) => s.task), END];

    // Node stats: count every visit (a rework loop can visit a task twice)
    c.steps.forEach((s) => {
      const stat = touch(nodeStats, s.task, () => ({ visits: 0, totalDuration: 0, cases: new Set() }));
      stat.visits += 1;
      stat.totalDuration += s.duration;
      stat.cases.add(c.caseId);
    });

    // Edge stats
    for (let i = 0; i < seq.length - 1; i++) {
      const key = `${seq[i]}||${seq[i + 1]}`;
      const stat = touch(edgeStats, key, () => ({ from: seq[i], to: seq[i + 1], count: 0, cases: new Set() }));
      stat.count += 1;
      stat.cases.add(c.caseId);
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

  const nodes = Array.from(nodeStats.entries()).map(([task, stat]) => ({
    id: task,
    label: task,
    visits: stat.visits,
    caseCount: stat.cases.size,
    casePct: stat.cases.size / totalCases,
    avgDuration: stat.totalDuration / stat.visits,
  }));
  nodes.push({ id: START, label: 'Start', visits: totalCases, caseCount: totalCases, casePct: 1, avgDuration: 0, virtual: true });
  nodes.push({ id: END, label: 'End', visits: totalCases, caseCount: totalCases, casePct: 1, avgDuration: 0, virtual: true });

  const edges = Array.from(edgeStats.values()).map((e) => ({
    ...e,
    caseCount: e.cases.size,
    casePct: e.cases.size / totalCases,
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

  return { nodes, edges, variants, totalCases, happyPath };
}
