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

// Task Description + Task Subtype catalog for the sample "Purchase Order
// to Payment" process, so the demo dataset shows the same kind of task
// metadata a real task-catalog upload would — rather than the "Not
// available" placeholders a demo with no catalog at all would show.
const DEMO_TASK_CATALOG = {
  'Create Request': {
    stage: 'Request Intake',
    description: 'The requester submits a new purchase request, specifying the item, quantity, and business justification.',
    subtypes: [
      { id: 'standard-purchase', name: 'Standard Purchase', weight: 70, reasoning: 'Routine purchase submitted through the standard request form.' },
      { id: 'rush-request', name: 'Rush Request', weight: 20, reasoning: 'Marked urgent by the requester, requiring expedited handling.' },
      { id: 'recurring-order', name: 'Recurring Order', weight: 10, reasoning: 'Auto-generated from a recurring supply schedule.' },
    ],
  },
  'Manager Approval': {
    stage: 'Approval & Budget',
    description: "The requester's manager reviews the request and approves or rejects it based on budget authority and business need.",
    subtypes: [
      { id: 'standard-approval', name: 'Standard Approval', weight: 65, reasoning: "Approved directly by the requester's manager." },
      { id: 'delegated-approval', name: 'Delegated Approval', weight: 20, reasoning: 'Manager was unavailable; approval delegated to a backup approver.' },
      { id: 'conditional-approval', name: 'Conditional Approval', weight: 15, reasoning: 'Approved with a note requesting follow-up on vendor terms.' },
    ],
  },
  'Budget Check': {
    stage: 'Approval & Budget',
    description: 'Finance verifies that sufficient budget is available in the relevant cost center before the purchase proceeds.',
    subtypes: [
      { id: 'within-budget', name: 'Within Budget', weight: 75, reasoning: 'Cost center had sufficient budget headroom.' },
      { id: 'requires-reallocation', name: 'Requires Reallocation', weight: 25, reasoning: 'Budget was reallocated from an underspent cost center to cover the request.' },
    ],
  },
  'Vendor Selection': {
    stage: 'Procurement',
    description: 'The buyer selects a vendor to fulfill the request, using an existing preferred vendor or sourcing a new one.',
    subtypes: [
      { id: 'preferred-vendor', name: 'Preferred Vendor', weight: 60, reasoning: 'Fulfilled through an existing preferred-vendor contract.' },
      { id: 'competitive-bid', name: 'Competitive Bid', weight: 25, reasoning: 'Multiple vendors were quoted before selection.' },
      { id: 'new-vendor-onboarding', name: 'New Vendor Onboarding', weight: 15, reasoning: 'Required onboarding a vendor not previously used.' },
    ],
  },
  'PO Creation': {
    stage: 'Procurement',
    description: 'A formal purchase order is generated and issued to the selected vendor.',
    subtypes: [
      { id: 'standard-po', name: 'Standard PO', weight: 80, reasoning: 'One-time purchase order issued for this request.' },
      { id: 'blanket-po', name: 'Blanket PO', weight: 20, reasoning: 'Issued against an existing blanket purchase order agreement.' },
    ],
  },
  'Goods Receipt': {
    stage: 'Fulfillment & Invoicing',
    description: 'The ordered goods or services are received and logged against the purchase order.',
    subtypes: [
      { id: 'full-delivery', name: 'Full Delivery', weight: 70, reasoning: 'Entire order received in a single shipment.' },
      { id: 'partial-delivery', name: 'Partial Delivery', weight: 20, reasoning: 'Order arrived split across multiple shipments.' },
      { id: 'delayed-delivery', name: 'Delayed Delivery', weight: 10, reasoning: 'Delivery arrived after the expected date.' },
    ],
  },
  'Invoice Match': {
    stage: 'Fulfillment & Invoicing',
    description: "The vendor's invoice is matched against the purchase order and goods receipt before payment is authorized.",
    subtypes: [
      { id: '3-way-match', name: '3-Way Match', weight: 75, reasoning: 'Invoice, PO, and goods receipt all matched automatically.' },
      { id: '2-way-match', name: '2-Way Match', weight: 25, reasoning: 'Matched against the PO only, for a service with no physical receipt.' },
    ],
  },
  'Invoice Mismatch': {
    stage: 'Fulfillment & Invoicing',
    description: 'A discrepancy between the invoice, purchase order, or goods receipt is flagged for resolution before payment.',
    subtypes: [
      { id: 'price-discrepancy', name: 'Price Discrepancy', weight: 55, reasoning: 'Invoiced unit price differed from the PO price.' },
      { id: 'quantity-discrepancy', name: 'Quantity Discrepancy', weight: 45, reasoning: "Invoiced quantity didn't match the quantity received." },
    ],
  },
  'Payment': {
    stage: 'Payment',
    description: 'The vendor is paid according to the agreed terms once the invoice is cleared.',
    subtypes: [
      { id: 'standard-payment-run', name: 'Standard Payment Run', weight: 70, reasoning: 'Paid in the next scheduled payment batch.' },
      { id: 'expedited-payment', name: 'Expedited Payment', weight: 20, reasoning: 'Paid outside the normal cycle to meet an early-payment discount or vendor deadline.' },
      { id: 'wire-transfer', name: 'Wire Transfer', weight: 10, reasoning: "Paid via wire transfer at the vendor's request." },
    ],
  },
  'Rejected': {
    stage: 'Exceptions',
    description: 'The request is declined by the approver and the process ends without a purchase being made.',
    subtypes: [
      { id: 'budget-exceeded', name: 'Budget Exceeded', weight: 50, reasoning: 'Rejected because the request exceeded available budget.' },
      { id: 'policy-violation', name: 'Policy Violation', weight: 30, reasoning: 'Rejected for not complying with procurement policy.' },
      { id: 'insufficient-justification', name: 'Insufficient Justification', weight: 20, reasoning: 'Rejected pending a clearer business justification.' },
    ],
  },
  'Escalated to Finance Review': {
    stage: 'Exceptions',
    description: "A high-value or non-standard request is routed to finance for additional review beyond the manager's approval authority.",
    subtypes: [
      { id: 'high-value-exception', name: 'High-Value Exception', weight: 60, reasoning: "Request value exceeded the manager's approval limit." },
      { id: 'non-standard-terms', name: 'Non-Standard Terms', weight: 40, reasoning: 'Payment or contract terms fell outside standard policy.' },
    ],
  },
  'Escalated to Legal Review': {
    stage: 'Exceptions',
    description: 'The request is routed to legal for review of contract or compliance terms before proceeding.',
    subtypes: [
      { id: 'contract-terms-review', name: 'Contract Terms Review', weight: 65, reasoning: 'Vendor contract included non-standard terms requiring legal sign-off.' },
      { id: 'compliance-flag', name: 'Compliance Flag', weight: 35, reasoning: 'Request was flagged by a compliance rule for manual review.' },
    ],
  },
  'Flagged as Duplicate Request': {
    stage: 'Exceptions',
    description: 'The request is identified as a likely duplicate of an existing request and held for confirmation.',
    subtypes: [
      { id: 'system-auto-flag', name: 'System Auto-Flag', weight: 70, reasoning: 'Automatically flagged by duplicate-detection matching against a recent request.' },
      { id: 'manual-flag', name: 'Manual Flag by Approver', weight: 30, reasoning: 'Flagged manually by the approver as a possible duplicate.' },
    ],
  },
};

function pickWeighted(options) {
  const total = options.reduce((s, o) => s + o.weight, 0);
  let r = Math.random() * total;
  for (const o of options) {
    if (r < o.weight) return o;
    r -= o.weight;
  }
  return options[options.length - 1];
}

// Builds the same { byTaskName, instancesByTaskName } shape
// extractTaskInsights() produces for a real task-catalog upload, populated
// from DEMO_TASK_CATALOG — so the sample dataset's Task Detail panel shows
// real Task Description / Task Subtype content instead of "Not available"
// placeholders. canonicalReasoning/appId are left empty since this catalog
// doesn't have real input/output prose or application data to back them.
function buildDemoTaskInsights(cases) {
  const byTaskName = new Map();
  Object.keys(DEMO_TASK_CATALOG).forEach((name) => {
    const entry = DEMO_TASK_CATALOG[name];
    byTaskName.set(name, {
      description: entry.description,
      canonicalReasoning: '',
      subtypes: entry.subtypes.map((s) => ({ id: s.id, name: s.name })),
      appId: null,
      stage: entry.stage || null,
    });
  });

  const instancesByTaskName = new Map();
  let seq = 0;
  cases.forEach((c) => {
    c.steps.forEach((s) => {
      const catalog = DEMO_TASK_CATALOG[s.task];
      if (!catalog) return;
      const subtype = pickWeighted(catalog.subtypes);
      const list = instancesByTaskName.get(s.task) || [];
      list.push({
        caseId: c.caseId,
        userId: (c.users && c.users[0]) || null,
        ticketId: null,
        subtypeId: subtype.id,
        subtypeName: subtype.name,
        reasoning: subtype.reasoning,
        durationMinutes: s.duration,
        startTime: Date.now() - seq * 60000,
      });
      seq += 1;
      instancesByTaskName.set(s.task, list);
    });
  });

  return { byTaskName, instancesByTaskName };
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

  // Task-catalog process export: a top-level "tasks" catalog (task_id ->
  // name/description/canonical_reasoning/canonical_subtypes) plus top-level
  // "execution_paths", where the real per-case identity is the
  // "execution_id" that recurs at matching positions across every task
  // step's "instances" list. Grouping by it (ordered by task_start_time)
  // reconstructs each case's full step sequence with real per-step duration.
  if (raw && Array.isArray(raw.tasks) && Array.isArray(raw.execution_paths) && raw.tasks[0] && raw.tasks[0].task_id) {
    const taskNameById = new Map(raw.tasks.map((t) => [t.task_id, t.name || t.task_id]));
    const byCase = new Map(); // execution_id -> { steps: [{task, start, duration}], users: Set }
    raw.execution_paths.forEach((ep) => {
      (ep.path || []).forEach((step) => {
        const taskName = taskNameById.get(step.task_id) || step.task_id;
        (step.instances || []).forEach((inst) => {
          const entry = byCase.get(inst.execution_id) || { steps: [], users: new Set() };
          entry.steps.push({
            task: taskName,
            start: inst.task_start_time,
            duration: inst.duration_ms != null ? inst.duration_ms / 60000 : 0,
          });
          if (inst.user_id) entry.users.add(inst.user_id);
          byCase.set(inst.execution_id, entry);
        });
      });
    });
    return Array.from(byCase.entries()).map(([caseId, entry]) => ({
      caseId,
      steps: entry.steps.slice().sort((a, b) => a.start - b.start).map(({ task, duration }) => ({ task, duration })),
      users: Array.from(entry.users),
    }));
  }

  // AI-consolidated capture export: a hierarchical BPMN graph/subprocesses
  // tree (the distilled model — read separately by extractGraphTaskInsights
  // for its task descriptions) plus a top-level "instances" array, which is
  // the actual real per-case event log the model was distilled from — each
  // instance's "steps" is already a plain ordered list of canonical task
  // names, so no id lookup is needed. This format carries no per-step
  // timing at all, so every step's duration is honestly 0 rather than
  // invented — same fallback normalizeCaseLog already applies to any case
  // log missing duration data.
  if (raw && Array.isArray(raw.instances) && raw.instances.length && raw.instances[0] && Array.isArray(raw.instances[0].steps)) {
    const users = raw.coverage_manifest && raw.coverage_manifest.capture ? [raw.coverage_manifest.capture] : [];
    const seenIds = new Map();
    return raw.instances.map((inst, i) => {
      const baseId = inst.instance_id || inst.entity || `INSTANCE-${i + 1}`;
      const seen = seenIds.get(baseId) || 0;
      seenIds.set(baseId, seen + 1);
      const caseId = seen === 0 ? String(baseId) : `${baseId}#${seen + 1}`;
      return {
        caseId,
        steps: (inst.steps || []).map((task) => ({ task, duration: 0 })),
        users,
      };
    });
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

// Pulls the rich per-task and per-instance detail — description, canonical
// reasoning, subtype breakdown, per-instance reasoning/ticket-id — out of a
// task-catalog process export, for the task detail panel. Only that export
// shape carries this detail; normalizeCaseLog() already reduces everything
// (this shape included) down to plain { task, duration } steps for the
// graph itself, so this runs separately, straight over the raw upload, and
// returns null for any other shape (the panel then falls back to whatever
// it can compute from the normalized case log alone).
function extractTaskInsights(raw) {
  if (!raw || !Array.isArray(raw.tasks) || !Array.isArray(raw.execution_paths) || !raw.tasks[0] || !raw.tasks[0].task_id) {
    return null;
  }

  const taskNameById = new Map(raw.tasks.map((t) => [t.task_id, t.name || t.task_id]));
  const byTaskName = new Map();
  raw.tasks.forEach((t) => {
    byTaskName.set(t.name || t.task_id, {
      description: t.description || '',
      canonicalReasoning: t.canonical_reasoning || '',
      subtypes: t.canonical_subtypes || [],
      appId: t.app_id || null,
      stage: t.stage || t.phase || t.category || null,
      autonomy: t.autonomy || null,
    });
  });

  const instancesByTaskName = new Map();
  raw.execution_paths.forEach((ep) => {
    const metaByExecId = new Map((ep.instances_meta || []).map((m) => [m.execution_id, m]));
    (ep.path || []).forEach((step) => {
      const taskName = taskNameById.get(step.task_id) || step.task_id;
      const subtypeCatalog = byTaskName.get(taskName);
      const subtypeNameById = new Map((subtypeCatalog ? subtypeCatalog.subtypes : []).map((s) => [s.id, s.name]));
      const list = instancesByTaskName.get(taskName) || [];
      (step.instances || []).forEach((inst) => {
        const execMeta = metaByExecId.get(inst.execution_id);
        list.push({
          caseId: inst.execution_id,
          userId: inst.user_id,
          ticketId: (execMeta && execMeta.metadata && execMeta.metadata.ticket_id) || null,
          subtypeId: inst.subtype || null,
          subtypeName: inst.subtype ? (subtypeNameById.get(inst.subtype) || inst.subtype) : null,
          reasoning: inst.reasoning || '',
          durationMinutes: inst.duration_ms != null ? inst.duration_ms / 60000 : 0,
          startTime: inst.task_start_time,
        });
      });
      instancesByTaskName.set(taskName, list);
    });
  });

  instancesByTaskName.forEach((list) => list.sort((a, b) => (b.startTime || 0) - (a.startTime || 0)));

  return { byTaskName, instancesByTaskName };
}

// Cleans a BPMN edge label down to its plain branch name, stripping a
// trailing count/observation note like "(n=5)" or "— n=8" or
// "— not observed in capture" — those are real structural counts, just
// not part of the branch's actual name.
function cleanBranchLabel(label) {
  return label
    .replace(/\s*\(n\s*=\s*\d+\)\s*$/i, '')
    .replace(/\s*[—-]\s*n\s*=\s*\d+.*$/i, '')
    .replace(/\s*[—-]\s*not observed.*$/i, '')
    .trim();
}

// Pulls task descriptions and swimlane stages out of an AI-consolidated
// capture export (a hierarchical BPMN "graph" + "subprocesses" tree next
// to the real "instances" event log) — the counterpart to
// extractTaskInsights() for that shape. Two, and only two, things are
// derived here, both straight from real structure:
//   - a task with its own nested subprocess (a drill-down into how it's
//     actually carried out) gets a description built from that
//     subprocess's own labeled routing branches;
//   - every task's "stage" is the name of the top-level subprocess it
//     lives inside (so BPMN view can lay out real swimlanes when a
//     capture has more than one top-level subprocess) — one lane when
//     there's only one, same as no stage data at all.
// Everything else (canonicalReasoning, subtypes, appId) is left empty:
// this format has no per-task narrative, subtype, or application field to
// draw them from.
function extractGraphTaskInsights(raw) {
  if (!raw || !Array.isArray(raw.instances) || !raw.instances.length || !raw.instances[0] || !Array.isArray(raw.instances[0].steps)) {
    return null;
  }

  const subprocesses = raw.subprocesses || {};
  const byTaskName = new Map();
  const ensure = (name) => {
    if (!byTaskName.has(name)) {
      byTaskName.set(name, {
        description: '', canonicalReasoning: '', subtypes: [], appId: null, stage: null, nodeKind: null, autonomy: null,
        subprocessId: null, // id of this task's own nested subprocess (into `subprocesses`, below), or null if it's a plain leaf step
        subStepCount: 0, // real activity nodes inside that subprocess (start/end/gateway don't count)
      });
    }
    return byTaskName.get(name);
  };
  const isRealSubstep = (n) => !!n.name && n.kind !== 'startEvent' && n.kind !== 'endEvent' && n.kind !== 'exclusiveGateway' && n.kind !== 'parallelGateway';

  // Stage = the top-level subprocess a task's ancestry belongs to;
  // nodeKind = its own real BPMN activity kind (userTask/serviceTask/
  // sendTask/...), straight off the graph — drives BPMN view's task icon
  // and its message-flow edge styling, never guessed.
  const graphNodes = (raw.graph && raw.graph.nodes) || [];
  const topSubprocessNodes = graphNodes.filter((n) => n.kind === 'subProcess' && subprocesses[n.id]);
  const visited = new Set();
  const assignStage = (subKey, stageName) => {
    if (visited.has(subKey)) return;
    visited.add(subKey);
    const sub = subprocesses[subKey];
    if (!sub || !Array.isArray(sub.nodes)) return;
    sub.nodes.forEach((node) => {
      if (node.kind === 'startEvent' || node.kind === 'endEvent' || node.kind === 'exclusiveGateway' || node.kind === 'parallelGateway' || !node.name) return;
      const entry = ensure(node.name);
      entry.stage = stageName;
      entry.nodeKind = node.kind || null;
      if (node.autonomy) entry.autonomy = node.autonomy;
      if (node.kind === 'subProcess' && subprocesses[node.id]) assignStage(node.id, stageName);
    });
  };
  topSubprocessNodes.forEach((n) => assignStage(n.id, n.name));

  // Description = the labeled branches of a task's own nested subprocess,
  // when its internal routing gateway names real alternative ways the
  // task gets carried out. Every task with its own subprocess also gets a
  // subStepCount — drives the "N sub steps" badge and lets the canvas
  // drill into that subprocess's own flow on click.
  Object.keys(subprocesses).forEach((key) => {
    const sub = subprocesses[key];
    if (!sub || !Array.isArray(sub.nodes)) return;
    sub.nodes.forEach((node) => {
      if (node.kind !== 'subProcess' || !subprocesses[node.id] || !node.name) return;
      const inner = subprocesses[node.id];
      const entry = ensure(node.name);
      entry.subprocessId = node.id;
      entry.subStepCount = inner.nodes.filter(isRealSubstep).length;
      const branches = (inner.edges || [])
        .map((e) => e.label)
        .filter(Boolean)
        .map(cleanBranchLabel)
        .filter(Boolean);
      if (!branches.length) return;
      entry.description = `Carried out one of ${branches.length} ways depending on the case: ${branches.join('; ')}.`;
    });
  });

  const captureUser = (raw.coverage_manifest && raw.coverage_manifest.capture) || null;
  const instancesByTaskName = new Map();
  const seenIds = new Map();
  raw.instances.forEach((inst, i) => {
    const baseId = inst.instance_id || inst.entity || `INSTANCE-${i + 1}`;
    const seen = seenIds.get(baseId) || 0;
    seenIds.set(baseId, seen + 1);
    const caseId = seen === 0 ? String(baseId) : `${baseId}#${seen + 1}`;
    (inst.steps || []).forEach((task, si) => {
      const list = instancesByTaskName.get(task) || [];
      list.push({
        caseId,
        userId: captureUser,
        ticketId: null,
        subtypeId: null,
        subtypeName: null,
        reasoning: (inst.steps_detail && inst.steps_detail[si]) || '',
        durationMinutes: 0,
        startTime: null,
      });
      instancesByTaskName.set(task, list);
    });
  });

  // `subprocesses` is handed back as-is (id -> { nodes, edges }) so the
  // canvas can drill into any task's own subprocess on click, not just
  // read its flattened description/stage above.
  return { byTaskName, instancesByTaskName, subprocesses };
}

// Normalizes a raw BPMN 2.0 XML tag's local name (works whatever namespace
// prefix the exporting tool used — bpmn:task, bpmn2:task, or no prefix at
// all) down to the small kind vocabulary the rest of this app already
// understands from a hierarchical capture export: startEvent/endEvent/
// exclusiveGateway/subProcess, or the tag itself for a plain activity
// (userTask, serviceTask, ... — anything buildBpmnGraphFromSubprocess
// doesn't special-case falls through to a generic task box).
function bpmnTagToKind(tag) {
  if (tag === 'startEvent') return 'startEvent';
  if (tag === 'endEvent') return 'endEvent';
  if (tag === 'intermediateThrowEvent' || tag === 'intermediateCatchEvent' || tag === 'boundaryEvent') return 'startEvent';
  if (tag === 'exclusiveGateway' || tag === 'parallelGateway' || tag === 'inclusiveGateway' || tag === 'eventBasedGateway' || tag === 'complexGateway') return 'exclusiveGateway';
  if (tag === 'subProcess' || tag === 'adHocSubProcess' || tag === 'transaction') return 'subProcess';
  return tag;
}

// Real activity/gateway/event tags a BPMN process can directly contain —
// used to pick flowElements apart from a process/subProcess's other
// children (laneSet, extensionElements, ioSpecification, ...).
const BPMN_FLOW_NODE_TAGS = new Set([
  'startEvent', 'endEvent', 'intermediateThrowEvent', 'intermediateCatchEvent', 'boundaryEvent',
  'exclusiveGateway', 'parallelGateway', 'inclusiveGateway', 'eventBasedGateway', 'complexGateway',
  'task', 'userTask', 'serviceTask', 'scriptTask', 'sendTask', 'receiveTask', 'manualTask', 'businessRuleTask',
  'callActivity', 'subProcess', 'adHocSubProcess', 'transaction',
]);

// Reads one <process> or <subProcess> element's direct children into this
// app's { nodes, edges } shape — the same shape a hierarchical capture
// export's "subprocesses" map already carries per entry — and recurses
// into any child <subProcess> (storing it under its own id in `out`, the
// shared id -> {nodes,edges} map every nesting level writes into), so an
// embedded subprocess drills down exactly like one from that other format.
function readBpmnContainer(el, out) {
  const nodes = [];
  const edges = [];
  Array.from(el.children).forEach((child) => {
    const tag = child.localName;
    if (tag === 'sequenceFlow') {
      edges.push({
        from: child.getAttribute('sourceRef'),
        to: child.getAttribute('targetRef'),
        label: child.getAttribute('name') || '',
      });
      return;
    }
    if (!BPMN_FLOW_NODE_TAGS.has(tag)) return;
    const id = child.getAttribute('id');
    const name = child.getAttribute('name') || null;
    nodes.push({ id, name, kind: bpmnTagToKind(tag) });
    if (tag === 'subProcess' || tag === 'adHocSubProcess' || tag === 'transaction') {
      out[id] = readBpmnContainer(child, out);
    }
  });
  return { nodes, edges };
}

// Parses a <laneSet> directly under a <process> into the same
// { stageOrder, stageByTaskId } shape layoutBpmn()/renderBpmnLanes()
// already expect from computeBpmnLanes() — built straight from the
// diagram's own real lanes instead of inferred from task metadata, since a
// BPMN file carries its swimlanes explicitly. Returns null when the
// process has no laneSet (renders as a single unlabeled lane, same
// fallback as a dataset with no stage data).
function readBpmnLanes(processEl) {
  const laneSetEl = Array.from(processEl.children).find((c) => c.localName === 'laneSet');
  if (!laneSetEl) return null;
  const laneEls = Array.from(laneSetEl.children).filter((c) => c.localName === 'lane');
  if (!laneEls.length) return null;

  const stageOrder = [];
  const stageByTaskId = new Map();
  laneEls.forEach((laneEl, i) => {
    const stageName = laneEl.getAttribute('name') || `Lane ${i + 1}`;
    stageOrder.push(stageName);
    Array.from(laneEl.children)
      .filter((c) => c.localName === 'flowNodeRef')
      .forEach((ref) => stageByTaskId.set(ref.textContent.trim(), stageName));
  });
  const laneIndexOf = new Map(stageOrder.map((s, i) => [s, i]));
  return { stageOrder, stageByTaskId, laneIndexOf };
}

// Parses a raw BPMN 2.0 XML file (a static diagram export, not a case
// log) into everything the canvas needs to show it: a root { nodes, edges }
// entry plus one more per embedded <subProcess> (all in the same
// id -> {nodes,edges} shape a hierarchical capture export's "subprocesses"
// uses), the top-level swimlanes if the file has any, a pool/process label
// for the header, and a byTaskName carrying each subprocess-bearing task's
// subStepCount — the same fields extractGraphTaskInsights() computes, so
// app.js's existing drill-down code (attachSubprocessMeta, etc.) works on
// either source without caring which one it's looking at.
function parseBpmnXml(xmlText) {
  const doc = new DOMParser().parseFromString(xmlText, 'application/xml');
  if (doc.getElementsByTagName('parsererror').length) {
    throw new Error('This file is not well-formed XML.');
  }
  const allEls = Array.from(doc.getElementsByTagName('*'));
  const processEl = allEls.find((el) => el.localName === 'process');
  if (!processEl) {
    throw new Error('No <process> element found — this doesn\'t look like a BPMN 2.0 file.');
  }

  const rootId = processEl.getAttribute('id') || 'bpmn-root';
  const subprocesses = {};
  subprocesses[rootId] = readBpmnContainer(processEl, subprocesses);
  const lanes = readBpmnLanes(processEl);

  // A pool name (from a <collaboration><participant>) is a friendlier
  // label than the process's own id/name when the file has one.
  const participantEl = allEls.find((el) => el.localName === 'participant' && el.getAttribute('processRef') === processEl.getAttribute('id'));
  const poolLabel = (participantEl && participantEl.getAttribute('name'))
    || processEl.getAttribute('name')
    || 'Imported Diagram';

  const byTaskName = new Map();
  const ensure = (name) => {
    if (!byTaskName.has(name)) {
      byTaskName.set(name, {
        description: '', canonicalReasoning: '', subtypes: [], appId: null, stage: null, nodeKind: null, autonomy: null,
        subprocessId: null, subStepCount: 0,
      });
    }
    return byTaskName.get(name);
  };
  const isRealSubstep = (n) => !!n.name && n.kind !== 'startEvent' && n.kind !== 'endEvent' && n.kind !== 'exclusiveGateway';
  Object.keys(subprocesses).forEach((key) => {
    subprocesses[key].nodes.forEach((node) => {
      if (!subprocesses[node.id] || !node.name) return;
      const entry = ensure(node.name);
      entry.subprocessId = node.id;
      entry.subStepCount = subprocesses[node.id].nodes.filter(isRealSubstep).length;
    });
  });

  return { rootId, subprocesses, lanes, poolLabel, byTaskName };
}
