// Sample process catalog for the Overview page. Exactly 10 example
// processes — enough to demonstrate the table (search/sort/filter/click-
// through) without pretending this is a real multi-hundred-process org.
// "Purchase Order to Payment" is first and is the one process that maps to
// real data: it's the same demo dataset the process map itself opens with.

const PROCESS_TEMPLATES = [
  { title: 'Purchase Order to Payment', description: 'End-to-end purchase order handling: request, approval, vendor selection, receipt, and payment', role: 'Manager', businessUnit: 'Finance', medianDurationSeconds: 79200, processCount: 500, users: 340 },
  { title: 'Case Identification & Authorisation', description: 'Analysis of the new requests and suggesting alternates', role: 'Manager', businessUnit: 'Finance', medianDurationSeconds: 664, processCount: 90, users: 234 },
  { title: 'Discharge planning', description: 'Detailed plan for discharge of the patient post hospitalisation', role: 'Manager', businessUnit: 'Support', medianDurationSeconds: 909, processCount: 143, users: 354 },
  { title: 'Care transition', description: 'Changing the hospitals for a patient based on request', role: 'Support', businessUnit: 'Support', medianDurationSeconds: 792, processCount: 165, users: 235 },
  { title: 'Pharmacy selection', description: 'Selecting the pharmacy based on medical records', role: 'Coordinator', businessUnit: 'Finance', medianDurationSeconds: 724, processCount: 176, users: 432 },
  { title: 'Claim denial handling', description: 'Reviewing denial reasons and identifying next steps', role: 'Support', businessUnit: 'Finance', medianDurationSeconds: 662, processCount: 198, users: 875 },
  { title: 'Claim approval', description: 'Analysing claim denial reasons and suggesting next steps', role: 'Manager', businessUnit: 'Finance', medianDurationSeconds: 604, processCount: 132, users: 654 },
  { title: 'Monitoring existing cases', description: 'Reviewing the progress of existing cases', role: 'Coordinator', businessUnit: 'Support', medianDurationSeconds: 661, processCount: 145, users: 767 },
  { title: 'Provider network review', description: 'Verifying provider eligibility against the current network', role: 'Analyst', businessUnit: 'Operations', medianDurationSeconds: 670, processCount: 106, users: 372 },
  { title: 'Appeals processing', description: 'Handling member appeals against a prior decision', role: 'Specialist', businessUnit: 'Operations', medianDurationSeconds: 707, processCount: 159, users: 503 },
];

function formatMedianDuration(totalSeconds) {
  if (totalSeconds >= 3600) {
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    return `${h}h ${String(m).padStart(2, '0')}m`;
  }
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${String(m).padStart(2, '0')}m ${String(s).padStart(2, '0')}s`;
}

function generateProcessCatalog() {
  return PROCESS_TEMPLATES.map((template, i) => ({ id: `PROC-${1000 + i}`, ...template }));
}
