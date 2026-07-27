// Sample process catalog for the Overview page. Exactly 10 example rows.
// #1 "Purchase Order to Payment" opens the process map's own synthetic demo
// generator. #2 and #3 are backed by real uploaded ground-truth data (see
// sample-datasets.js) — their stats below are computed from that data, not
// invented. The rest are decorative placeholders to fill out the table.

const PURCHASE_ORDER_TEMPLATE = {
  title: 'Purchase Order to Payment',
  description: 'End-to-end purchase order handling: request, approval, vendor selection, receipt, and payment',
  role: 'Manager',
  businessUnit: 'Finance',
  medianDurationSeconds: 79200,
  processCount: 500,
  users: 340,
};

const PLACEHOLDER_TEMPLATES = [
  { title: 'Care transition', description: 'Changing the hospitals for a patient based on request', role: 'Support', businessUnit: 'Support', medianDurationSeconds: 792, processCount: 165, users: 235 },
  { title: 'Pharmacy selection', description: 'Selecting the pharmacy based on medical records', role: 'Coordinator', businessUnit: 'Finance', medianDurationSeconds: 724, processCount: 176, users: 432 },
  { title: 'Claim denial handling', description: 'Reviewing denial reasons and identifying next steps', role: 'Support', businessUnit: 'Finance', medianDurationSeconds: 662, processCount: 198, users: 875 },
  { title: 'Claim approval', description: 'Analysing claim denial reasons and suggesting next steps', role: 'Manager', businessUnit: 'Finance', medianDurationSeconds: 604, processCount: 132, users: 654 },
  { title: 'Monitoring existing cases', description: 'Reviewing the progress of existing cases', role: 'Coordinator', businessUnit: 'Support', medianDurationSeconds: 661, processCount: 145, users: 767 },
  { title: 'Provider network review', description: 'Verifying provider eligibility against the current network', role: 'Analyst', businessUnit: 'Operations', medianDurationSeconds: 670, processCount: 106, users: 372 },
  { title: 'Appeals processing', description: 'Handling member appeals against a prior decision', role: 'Specialist', businessUnit: 'Operations', medianDurationSeconds: 707, processCount: 159, users: 503 },
];

function formatMedianDuration(rawSeconds) {
  const totalSeconds = Math.round(rawSeconds);
  if (totalSeconds >= 3600) {
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    return `${h}h ${String(m).padStart(2, '0')}m`;
  }
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${String(m).padStart(2, '0')}m ${String(s).padStart(2, '0')}s`;
}

function median(numbers) {
  if (!numbers.length) return 0;
  const sorted = numbers.slice().sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

// Turns one embedded real dataset into a catalog row by actually running it
// through the same normalizeCaseLog/buildProcessModel pipeline the Import
// modal uses, so the stats shown here are real, not placeholders.
function buildRealExampleRow(example, index) {
  try {
    const cases = normalizeCaseLog(example.data);
    const totalDurations = cases.map((c) => c.totalDuration);
    const process = example.data.processes[0];
    const distinctUsers = new Set(
      (process.execution_paths || []).flatMap((ep) => ep.users || [])
    );
    return {
      id: `PROC-REAL-${index}`,
      title: example.title,
      description: example.description,
      role: example.role,
      businessUnit: example.businessUnit,
      medianDurationSeconds: median(totalDurations) * 60,
      processCount: cases.length,
      users: distinctUsers.size || cases.length,
      datasetRaw: example.data,
    };
  } catch (err) {
    return {
      id: `PROC-REAL-${index}`,
      title: example.title,
      description: example.description,
      role: example.role,
      businessUnit: example.businessUnit,
      medianDurationSeconds: 0,
      processCount: 0,
      users: 0,
      datasetRaw: example.data,
    };
  }
}

function generateProcessCatalog() {
  const rows = [{ id: 'PROC-1000', ...PURCHASE_ORDER_TEMPLATE }];
  (typeof EXTRA_PROCESS_EXAMPLES !== 'undefined' ? EXTRA_PROCESS_EXAMPLES : []).forEach((example, i) => {
    rows.push(buildRealExampleRow(example, i + 1));
  });
  PLACEHOLDER_TEMPLATES.forEach((template, i) => {
    rows.push({ id: `PROC-${1010 + i}`, ...template });
  });
  return rows;
}
