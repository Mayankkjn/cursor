// Sample process: Purchase Order to Payment
// Each variant is one real-world route through the process. Weight controls
// how often that route occurs relative to the others in the generated log.

const START = '● START';
const END = '■ END';

const VARIANT_DEFS = [
  {
    id: 'v1',
    label: 'Standard flow',
    weight: 66,
    path: [
      'Create Request', 'Manager Approval', 'Budget Check',
      'Vendor Selection', 'PO Creation', 'Goods Receipt',
      'Invoice Match', 'Payment',
    ],
  },
  {
    id: 'v2',
    label: 'Low-value PO (budget check skipped)',
    weight: 14,
    path: [
      'Create Request', 'Manager Approval',
      'Vendor Selection', 'PO Creation', 'Goods Receipt',
      'Invoice Match', 'Payment',
    ],
  },
  {
    id: 'v3',
    label: 'Invoice mismatch rework loop',
    weight: 9,
    path: [
      'Create Request', 'Manager Approval', 'Budget Check',
      'Vendor Selection', 'PO Creation', 'Goods Receipt',
      'Invoice Mismatch', 'Vendor Selection', 'PO Creation', 'Goods Receipt',
      'Invoice Match', 'Payment',
    ],
  },
  {
    id: 'v4',
    label: 'Rejected at approval',
    weight: 6,
    path: [
      'Create Request', 'Manager Approval', 'Rejected',
    ],
  },
  {
    id: 'v5',
    label: 'Approval/budget order swapped',
    weight: 5,
    path: [
      'Create Request', 'Budget Check', 'Manager Approval',
      'Vendor Selection', 'PO Creation', 'Goods Receipt',
      'Invoice Match', 'Payment',
    ],
  },
  // v6-v8: a handful of rare one-off exception paths that all fork from the
  // same approval step. Individually each is a tiny sliver of cases — this
  // is exactly the shape semantic zoom collapses into a single "+N minor
  // variants" bubble rather than drawing four separate low-frequency
  // branches off "Manager Approval" permanently.
  {
    id: 'v6',
    label: 'Escalated to finance review',
    weight: 2,
    path: ['Create Request', 'Manager Approval', 'Escalated to Finance Review'],
  },
  {
    id: 'v7',
    label: 'Escalated to legal review',
    weight: 1.5,
    path: ['Create Request', 'Manager Approval', 'Escalated to Legal Review'],
  },
  {
    id: 'v8',
    label: 'Flagged as duplicate request',
    weight: 1,
    path: ['Create Request', 'Manager Approval', 'Flagged as Duplicate Request'],
  },
];

// [min, max] minutes a task typically takes. Used to synthesize durations.
const STEP_DURATION_MINUTES = {
  'Create Request': [5, 25],
  'Manager Approval': [30, 300],
  'Budget Check': [15, 120],
  'Vendor Selection': [60, 600],
  'PO Creation': [10, 45],
  'Goods Receipt': [180, 2000],
  'Invoice Match': [20, 100],
  'Invoice Mismatch': [40, 180],
  'Payment': [15, 60],
  'Rejected': [5, 20],
  'Escalated to Finance Review': [10, 45],
  'Escalated to Legal Review': [15, 60],
  'Flagged as Duplicate Request': [2, 10],
};

function pickVariant() {
  const total = VARIANT_DEFS.reduce((s, v) => s + v.weight, 0);
  let r = Math.random() * total;
  for (const v of VARIANT_DEFS) {
    if (r < v.weight) return v;
    r -= v.weight;
  }
  return VARIANT_DEFS[VARIANT_DEFS.length - 1];
}

function randomDuration(task) {
  const [min, max] = STEP_DURATION_MINUTES[task] || [10, 60];
  // Skew toward the low end with an occasional long tail, like real cycle times.
  const skew = Math.pow(Math.random(), 2);
  return Math.round(min + skew * (max - min));
}

function generateEventLog(numCases = 500) {
  // Synthesize a plausible unique-user pool (68% of case volume, e.g. 340
  // for the default 500 cases) and shuffle case->user assignment so every
  // pool member is guaranteed to appear at least once.
  const userPoolSize = Math.max(1, Math.min(numCases, Math.round(numCases * 0.68)));
  const userIds = Array.from({ length: numCases }, (_, i) => `U-${1 + (i % userPoolSize)}`);
  for (let i = userIds.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [userIds[i], userIds[j]] = [userIds[j], userIds[i]];
  }

  const cases = [];
  for (let i = 0; i < numCases; i++) {
    const variant = pickVariant();
    let cursor = 0;
    const steps = variant.path.map((task) => {
      const duration = randomDuration(task);
      const step = { task, startOffset: cursor, duration };
      cursor += duration;
      return step;
    });
    cases.push({
      caseId: `PO-${1000 + i}`,
      variantId: variant.id,
      totalDuration: cursor,
      users: [userIds[i]],
      steps,
    });
  }
  return cases;
}

function median(numbers) {
  if (!numbers.length) return 0;
  const sorted = numbers.slice().sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

// A small, hand-written example a user can download to see the expected
// upload format: either { "cases": [...] } or a bare array of cases; each
// case either { "caseId", "steps": [...] } or a bare array of steps; each
// step either a plain string or { "task", "duration" } (minutes).
const SAMPLE_JSON_TEMPLATE = {
  cases: [
    {
      caseId: 'CASE-1001',
      steps: [
        { task: 'Create Request', duration: 12 },
        { task: 'Manager Approval', duration: 95 },
        { task: 'Budget Check', duration: 40 },
        { task: 'Vendor Selection', duration: 180 },
        { task: 'PO Creation', duration: 20 },
        { task: 'Goods Receipt', duration: 600 },
        { task: 'Invoice Match', duration: 45 },
        { task: 'Payment', duration: 25 },
      ],
    },
    {
      caseId: 'CASE-1002',
      steps: [
        { task: 'Create Request', duration: 8 },
        { task: 'Manager Approval', duration: 110 },
        { task: 'Vendor Selection', duration: 220 },
        { task: 'PO Creation', duration: 18 },
        { task: 'Goods Receipt', duration: 540 },
        { task: 'Invoice Match', duration: 38 },
        { task: 'Payment', duration: 22 },
      ],
    },
    {
      caseId: 'CASE-1003',
      steps: [
        { task: 'Create Request', duration: 15 },
        { task: 'Manager Approval', duration: 60 },
        { task: 'Rejected', duration: 10 },
      ],
    },
  ],
};

// Pulls a plain array of { caseId?, steps: [...] } out of whatever shape the
// uploaded JSON actually is. Recognizes a few real-world export shapes in
// addition to this app's own { "cases": [...] } format; throws a specific,
// actionable error for anything it can't turn into per-case event data.
function extractRawCases(raw) {
  if (Array.isArray(raw)) return raw;
  if (raw && Array.isArray(raw.cases)) return raw.cases;

  // Whatfix-style task-execution export: a shared "tasks" dictionary
  // (task_id -> name/duration) plus one entry per user session in
  // "task_executions", each holding that session's ordered task runs.
  if (raw && Array.isArray(raw.task_executions) && Array.isArray(raw.tasks)) {
    const taskNameById = new Map(raw.tasks.map((t) => [t.task_id, t.name || t.task_id]));
    return raw.task_executions.map((session, i) => {
      const steps = (session.tasks || []).map((exec) => ({
        task: taskNameById.get(exec.task_id) || exec.task_id || 'Unknown step',
        duration: exec.duration_ms != null ? exec.duration_ms / 60000 : exec.duration,
      }));
      const caseId = session.user_id
        ? `${String(session.user_id).slice(0, 8)}-${session.session_date || i + 1}`
        : `SESSION-${i + 1}`;
      return { caseId, steps, users: session.user_id ? [session.user_id] : [] };
    });
  }

  // Ground-truth process export: { processes: [{ nodes: [{id,name}],
  // execution_paths: [{ path: [{task_id, task_start_time, task_end_time}],
  // count, metadata }] }] }. Each execution_path is a distinct trace that
  // may represent more than one real case (via "count"), which is a
  // legitimate log-compression technique, not fabricated data — so it's
  // expanded into that many identical cases rather than counted once.
  if (raw && Array.isArray(raw.processes) && raw.processes.length) {
    const process = raw.processes[0];
    if (!Array.isArray(process.nodes) || !Array.isArray(process.execution_paths)) {
      throw new Error('Expected each entry in "processes" to have "nodes" and "execution_paths" arrays.');
    }
    const taskNameById = new Map(process.nodes.map((n) => [n.id, n.name || n.id]));
    const cases = [];
    process.execution_paths.forEach((ep, i) => {
      const steps = (ep.path || []).map((step) => {
        let duration = 0;
        if (step.task_start_time != null && step.task_end_time != null) {
          const ms = Number(step.task_end_time) - Number(step.task_start_time);
          if (Number.isFinite(ms) && ms > 0) duration = ms / 60000;
        }
        return { task: taskNameById.get(step.task_id) || step.task_id || 'Unknown step', duration };
      });
      const baseId = (ep.metadata && ep.metadata.support_ticket_id) || ep.id || `PATH-${i + 1}`;
      const repeat = Math.min(5000, Math.max(1, Math.round(Number(ep.count)) || 1));
      const epUsers = ep.users || [];
      for (let k = 0; k < repeat; k++) {
        cases.push({
          caseId: repeat > 1 ? `${baseId}-${k + 1}` : String(baseId),
          steps,
          users: epUsers.length ? [epUsers[k % epUsers.length]] : [],
        });
      }
    });
    return cases;
  }

  // A pre-built diagram (nodes/edges, e.g. from a layout tool) rather than
  // an event log. There's no per-case sequence or duration data to mine
  // here, so refuse rather than fabricate frequency/time/rework numbers.
  if (raw && Array.isArray(raw.nodes) && Array.isArray(raw.edges)) {
    throw new Error(
      'This file is a pre-built diagram (nodes/edges), not a case log. Frequency, time, and rework ' +
      'insights are computed from real process instances, so this tool needs per-case event data — ' +
      'e.g. { "cases": [{ "steps": [{ "task": "...", "duration": 12 }] }] } — not a static graph. ' +
      'Upload the underlying execution log if you have one.'
    );
  }

  throw new Error('Expected a JSON array of cases, or an object like { "cases": [...] }.');
}

// Validates and normalizes an arbitrary uploaded JSON payload into the same
// case-log shape generateEventLog() produces. Throws a descriptive Error
// (case/step index included) on anything it can't make sense of. Cases with
// no steps are dropped rather than failing the whole import, since a export
// covering thousands of cases will occasionally have an empty record.
function normalizeCaseLog(raw) {
  const rawCases = extractRawCases(raw);

  if (rawCases.length === 0) {
    throw new Error('The file has no cases to visualize.');
  }

  const cases = rawCases
    .map((rawCase, i) => {
      const caseNum = i + 1;
      let stepsRaw;
      let caseId;

      if (Array.isArray(rawCase)) {
        stepsRaw = rawCase;
        caseId = `CASE-${caseNum}`;
      } else if (rawCase && Array.isArray(rawCase.steps)) {
        stepsRaw = rawCase.steps;
        caseId = rawCase.caseId || rawCase.id || `CASE-${caseNum}`;
      } else {
        throw new Error(`Case ${caseNum} needs a "steps" array (or should itself be an array of steps).`);
      }

      if (stepsRaw.length === 0) return null;

      let cursor = 0;
      const steps = stepsRaw.map((rawStep, j) => {
        const stepNum = j + 1;
        let task;
        let duration = 0;

        if (typeof rawStep === 'string') {
          task = rawStep;
        } else if (rawStep && typeof rawStep === 'object') {
          task = rawStep.task || rawStep.name || rawStep.activity || rawStep.step;
          if (rawStep.duration != null) duration = Number(rawStep.duration);
          else if (rawStep.minutes != null) duration = Number(rawStep.minutes);
          else if (rawStep.durationMinutes != null) duration = Number(rawStep.durationMinutes);
          else if (rawStep.seconds != null) duration = Number(rawStep.seconds) / 60;
          else if (rawStep.durationHours != null) duration = Number(rawStep.durationHours) * 60;
        }

        if (!task || typeof task !== 'string') {
          throw new Error(
            `Case ${caseNum} ("${caseId}"), step ${stepNum} is missing a task name (expected "task", "name", "activity", or "step").`
          );
        }
        if (!Number.isFinite(duration) || duration < 0) duration = 0;

        const step = { task, startOffset: cursor, duration };
        cursor += duration;
        return step;
      });

      const users = rawCase && !Array.isArray(rawCase) && Array.isArray(rawCase.users) ? rawCase.users : [];
      return { caseId: String(caseId), totalDuration: cursor, steps, users };
    })
    .filter(Boolean);

  if (cases.length === 0) {
    throw new Error('None of the cases in this file have any steps.');
  }

  return cases;
}
