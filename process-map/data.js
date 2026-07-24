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
