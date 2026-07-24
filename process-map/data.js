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
      steps,
    });
  }
  return cases;
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

// Validates and normalizes an arbitrary uploaded JSON payload into the same
// case-log shape generateEventLog() produces. Throws a descriptive Error
// (case/step index included) on anything it can't make sense of.
function normalizeCaseLog(raw) {
  let rawCases;
  if (Array.isArray(raw)) {
    rawCases = raw;
  } else if (raw && Array.isArray(raw.cases)) {
    rawCases = raw.cases;
  } else {
    throw new Error('Expected a JSON array of cases, or an object like { "cases": [...] }.');
  }

  if (rawCases.length === 0) {
    throw new Error('The file has no cases to visualize.');
  }

  return rawCases.map((rawCase, i) => {
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

    if (stepsRaw.length === 0) {
      throw new Error(`Case ${caseNum} ("${caseId}") has no steps.`);
    }

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

    return { caseId: String(caseId), totalDuration: cursor, steps };
  });
}
