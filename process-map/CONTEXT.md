# Whatfix Lens: complete UI context

This is the full context for the **Whatfix Lens** prototype UI, covering the **Overview landing page** through to the **process detail page**. It is written so that a designer, engineer or AI assistant can understand, demo, rebuild or extend the product without reading the source first. File and line references point into `process-map/`.

> **Single-file build:** `build/whatfix-lens-app.html` is the complete UI in one offline HTML file (~1.6 MB). Open it in any modern browser; no server or network is needed. See [§9](#9-builds-and-the-single-file-app).

---

## 1. What the product is

Whatfix Lens is process discovery that recommends what to automate next. From recorded user activity (an event log of cases → steps), it:

1. **Mines the real process.** It builds a directly-follows graph and lists every variant: the most common path, the fastest path, deviations and rework loops.
2. **Explains it in plain language.** This is done through Insights, an AI Summary, and a process summary.
3. **Scores what to automate.** Each task gets an automation-opportunity score with its evidence, and can be handed off to **Seek**, the automation agent ("Automate with Seek →").

The prototype is a static web app: vanilla JS, d3 v7, dagre and jsPDF. It has no backend. Every "AI" text is produced by local templates.

---

## 2. Page flow

```
                    ┌──────────────────────────────┐
                    │  home.html  ·  "Overview"    │  landing page / process catalog
                    └──────┬───────────────┬───────┘
         click a row       │               │  row with targetPage
  (sessionStorage hand-off)│               │
                           ▼               ▼
        ┌───────────────────────────┐   ┌─────────────────────────────────┐
        │ index.html                │   │ decision-map.html               │
        │ Process detail page       │   │ "Purchase Approval by Cost"     │
        │ (BPMN view / Path view)   │   │ (decision node → 3 processes)   │
        └─────────────┬─────────────┘   └─────────────┬───────────────────┘
                      │ ← back arrow (href="home.html")│
                      └─────────────────────────────────┘
```

| Page | `<title>` | H1 | Back link |
|---|---|---|---|
| `home.html` | "Whatfix Lens — Overview" | "Overview" | none (root) |
| `index.html` | "Process Map Visualizer", renamed to `Process Map — <name>` on hand-off | `#page-title`, default "Process Map — Purchase Order to Payment" | `a.back-link` → `home.html` ("Back to Overview") |
| `decision-map.html` | "Process Map — Purchase Approval by Cost" | same | `a.back-link` → `home.html` |

**Hand-off** (`home.js` `openProcess`, lines 42–54):
- A row with `targetPage` navigates there directly (only the decision-map row).
- Any other row sets `sessionStorage.selectedProcessName = row.title`, plus `selectedProcessData = JSON.stringify(row.datasetRaw)` when the row has a real dataset, then goes to `index.html`.
- `app.js` (4242–4273) reads **and removes** both keys, so the hand-off is one-time.
- It titles the page `Process Map — <name>`, loads the dataset if one is present, and otherwise falls back to the synthetic demo, `regenerate(500)`.
- Placeholder rows therefore open the demo data under their own title.

---

## 3. Landing page: `home.html` (Overview)

**Files:** `home.html`, `home.css`, `home.js`, `home-data.js`, plus `data.js`, `graph.js` and `sample-datasets.js`. Scripts load in the order data → graph → sample-datasets → home-data → home.

### Layout
- **Side nav** (dark, `#12141c`; 264 px wide, 76 px collapsed):
  - Brand: a 6-petal orange pinwheel with "Whatfix Lens".
  - A dot-grid "Switch apps" button (no behaviour).
  - Nav items **Overview** (active) and **Settings**. Both are buttons with no navigation.
  - User footer: avatar "JD", "John Doe".
  - A round collapse chevron `#sidebar-collapse` toggles `.collapsed`.
- **Header:** `h1` "Overview".
- **Stat cards** (computed over the full catalog; filters do not change them):

  | Card | Value | Computation |
  |---|---|---|
  | Total Process Discovered | 10 | number of rows |
  | Total Unique Users | 3,721 | **sum** of `row.users` |
  | Total Roles | 4 | distinct roles |
  | Total Business Units | 3 | distinct BUs |

- **"All processes" table:**
  - Toolbar: **Filter** button (popover with a "Business Unit" select, "All" plus the sorted BUs; closes on outside click) and a **Search** box.
  - Search is a case-insensitive substring match over title and description.
  - Columns: **Title** (sortable asc/desc; bold title with a grey description), Role, Business Units, Median Duration, Instance count, Users.
  - Empty state: "No processes match your search."
  - Footer: "Rows a-b of n" and pagination (`PAGE_SIZE = 16`; ‹ › with first, last, current±1 and ellipses; active page `#2563eb`).
  - Clicking a row runs `openProcess(row)`.
- **Duration format** (`formatMedianDuration`): at or above 1 h it shows `Hh MMm`, otherwise `MMm SSs`.

### Catalog (`generateProcessCatalog`, home-data.js 92–104)

| # | Title | Role | BU | Median | Instances | Users | Opens |
|---|---|---|---|---|---|---|---|
| 1 | Purchase Order to Payment | Manager | Finance | 22h 00m | 500 | 340 | `index.html` with the **synthetic demo** |
| 2 | Purchase Approval by Cost | Manager | Finance | 15m 27s | 60 | 44 | **`decision-map.html`** |
| 3 | Tech Support Ticket Handling | Support | Support | 02m 02s* | 18* | 1* | `index.html` with a **real dataset** |
| 4 | Resolve Customer Support Tickets | Coordinator | Support | 02m 10s* | 4* | 1* | `index.html` with a **real dataset** |
| 5–10 | Care transition · Pharmacy selection · Claim denial handling · Claim approval · Monitoring existing processes · Provider network review | — | — | hard-coded | hard-coded | hard-coded | `index.html` with the demo data (placeholders) |

\* Computed at load time by `buildRealExampleRow`:
- It runs `normalizeCaseLog(example.data)`.
- Median = `median(totalDuration)` × 60 s.
- Instances = number of cases.
- Users = distinct `execution_paths[].users`.

### `sample-datasets.js`
Defines `const EXTRA_PROCESS_EXAMPLES = [{ title, description, role, businessUnit, data }]`. Each `data` is the exact raw JSON a user could upload in the Import modal, in the "ground-truth" shape.

```jsonc
{ "processes": [ {
  "id": "...", "name": "...", "objective": "...",
  "nodes": [ { "id": "task_review_ticket", "name": "Review Ticket", "description": "..." } ],
  "execution_paths": [ {
    "id": "...", "count": 1, "users": ["Supreet J"],
    "path": [ { "task_id": "...", "task_start_time": 1782303162326, "task_end_time": 1782303190000, "screenshots": ["…jpg"] } ],
    "metadata": { "support_ticket_id": "…", "issue": "…" }, "metadata_evidence": { … }
  } ],
  "decision_nodes": [ { "node": "...", "branches": [ { "condition": "...", "next": "...", "reason": "..." } ], "merge_node": "..." } ]
} ] }
```

The two datasets are:
- **Tech Support Ticket Handling:** 20 nodes, 18 paths, 2 decision nodes.
- **Resolve Customer Support Tickets:** 4 processes, of which only `processes[0]` is used.

---

## 4. Process detail page: `index.html`

**Files:** `index.html`, `styles.css`, `app.js` (~4.3k lines), `data.js`, `graph.js`, plus `vendor/d3.min.js`, `vendor/dagre.min.js` and `vendor/jspdf.umd.min.js`.

### 4.1 Layout (ids and labels)

**Topbar:**
- Back arrow.
- `#page-title`.
- Subtitle: "Directly-follows graph mined from process history. Thicker path = more frequent. Highlighted path = most common route."
- **Export ▾**, with "Export as PNG" and "Export as PDF".
- **Import**, the primary orange button.

**KPI band:**
- **Total Instances**, **Total unique users** and **Median completion time**.
- Toolbar:
  - **Insights**
  - **Automation** ⚡
  - **AI Summary** ✦
  - **Filter** (with a badge showing the count of active facets)
  - a full-screen toggle

**Canvas (`svg#graph`):**
- Top-left: the BPMN breadcrumb (back arrow plus trail).
- Top-right: **▶ Play** (shows "Stop" while playing), plus a speed control with 0.5x / **1x** / 2x / 4x.
- Bottom-left: the **Process Variants** panel: value %, "Showing X of Y process variants", a − slider + control, and end labels "Popular path" … "All paths".
- Bottom-center: the view toggle, **BPMN view** (default) / **Path view**.
- Bottom-right: the legend, which changes with the view.
  - BPMN view: Most common path · Sequence flow · Message flow · Start event · End event · Exclusive gateway.
  - Path view: Most common path · Deviation, moving forward · Deviation that loops back (rework).

**Side drawers** (only one open at a time; `Esc` closes the topmost):
- **Insights** contains:
  - **Process Summary**: overview text, "Reached the end", "Did not reach the end".
  - **Key Takeaways**: the cards Most followed path, Fastest path, Biggest time sink and Top rework hotspot (click to trace on the map, click again to clear), plus the "Compare fastest to typical" switch.
  - **Where time is going**: top 5 by total time.
  - **Where rework is happening**: top 5 by repeat rate.
  - **Paths, ranked by frequency**: click to trace; ⚡ marks the fastest.
- **Automation Opportunities**: "N opportunities found", "Sort by" Impact / Score / Frequency, a list of 5 with "View all opportunities →", and the top card auto-expanded.
- **Filter**: "Reset all", a summary line, then:
  - "Single instance per variant"
  - By Task
  - By Path
  - By Duration (dual range)
  - By Process ID
  - By User ID

  The searchable facets show chips. Facets combine with AND; selections within one facet combine with OR.
- **AI Summary** (340 px card): skeleton lines for 500 ms, then templated paragraphs covering the overview, most common path, fastest path, where time goes, rework, and a recommendation callout.

**Task detail panel** (right side, 420 px, resizable 320–900 px):
- Header: title and meta ("N instances · U unique users · P paths").
- **Overview tab:**
  - Task Details stats: Total Executions, Unique Users, Frequency, Median Duration, Rework Rate, Deviation Rate.
  - Task Description and Summary.
  - Automation Opportunity card: tier badge, score /100, semicircle gauge.
  - Input/Output Context: "Trigger (input)" / "Output".
  - Task Subtype accordion.
  - Applications Involved.
  - Users Performing This Task (top 10, each with ▶ replay).
  - Discovered Paths.
- **Automation tab:**
  - "Why automate this task?": 9 tiles.
  - Estimated Impact: time saved (total) and % of task time.
  - "What will be automated?"
  - Next Step.
- Footer buttons: **View steps**, **Watch replays**, **Automate with Seek →**.

**Modals:**
- **Import your process data**:
  - "Download sample format" / "View JSON" / "Copy".
  - Drop zone: "Click to upload, or drag a .json or .bpmn file here".
- **Automation Preview**:
  - Lens recommendation, plus Coverage, Expected automation and Estimated time saved.
  - **Send to Seek →** shows "Context sent to Seek" with the payload (no API call).
- **Session replay**:
  - Left column: paths, users and tasks.
  - Main area: a placeholder player with a synthetic scrubber, chapter ticks and ±10 s controls.

**Task kebab menu:** "Watch session".

### 4.2 Data model

**Case** (internal, after `normalizeCaseLog`). Durations are in minutes, and virtual nodes are `START = '● START'` and `END = '■ END'`.
```js
{ caseId, totalDuration /*min*/, users: [...], steps: [{ task, startOffset, duration /*min*/ }], variantId? }
```

**Accepted inputs** (`extractRawCases`, data.js 407–533):

| Shape | Recognised by | Notes |
|---|---|---|
| Native | `[...cases]` or `{cases:[...]}` | `SAMPLE_JSON_TEMPLATE` (CASE-1001…1003) is the downloadable sample. Steps may be strings or `{task\|name\|activity\|step, duration\|minutes\|durationMinutes\|seconds\|durationHours}` |
| Task-execution export | `{tasks, task_executions}` | caseId = `user_id[0:8]-session_date` |
| Ground-truth export | `{processes:[{nodes, execution_paths}]}` | first process only; times in epoch ms; each path repeated `count` times (max 5000) |
| Task-catalog export | `{tasks, execution_paths:[{path:[{task_id, instances:[…]}]}]}` | grouped by `execution_id`, sorted by start |
| AI-consolidated capture | `{instances, graph, subprocesses, coverage_manifest}` | durations are 0; carries nested subprocesses |
| BPMN 2.0 XML | `.bpmn` / `.xml` | `parseBpmnXml`: pools/lanes, subProcesses, gateways → shown **as-is** (structural mode) |
| `{nodes, edges}` only | — | rejected: "pre-built diagram… not a case log" |

**`buildProcessModel(cases)`** (graph.js) returns:
- `nodes[]`: visits, caseCount/Pct, avg/median/min/max duration, totalTime, reworkCaseCount/Rate, deviationRate, timeShare.
- `edges[]`: count, caseCount/Pct, reworkCaseCount, onHappyPath. An edge counts as rework when its target was already visited in the same case.
- `variants[]`: signature "A → B → …", count, pct, avgDuration, caseIds.
- `happyPath`: the most frequent variant.
- `fastestPath`: the lowest avg duration among variants with count ≥ max(2, 1% of cases).
- `timeRanking` and `reworkRanking`.
- `reworkedCasePct`.
- `completion`: recognised endings covering about 80% of cases, versus rare endings.
- `totalCases` and `totalProcessTime`.

**Task insights** (`state.taskInsights`):
- `extractTaskInsights` (task-catalog shape) gives description, canonical reasoning, subtypes, appId, stage and autonomy, plus instances per task.
- `extractGraphTaskInsights` (capture shape) gives stage = the enclosing subProcess, plus `subprocessId` and `subStepCount` for tasks that have nested sub-steps.
- The demo uses `buildDemoTaskInsights`.

**Synthetic demo** (`regenerate(500)` → `generateEventLog`). The demo is "Purchase Order to Payment":
- Case ids `PO-1000…`.
- Users = 68% of the case count.
- Durations come from `STEP_DURATION_MINUTES`, skewed short.
- Variants (`VARIANT_DEFS`):

  | Variant | Weight |
  |---|---|
  | **Standard** (Create Request → Manager Approval → Budget Check → Vendor Selection → PO Creation → Goods Receipt → Invoice Match → Payment) | 66 |
  | Low-value, skips Budget Check | 14 |
  | Invoice-mismatch rework loop | 9 |
  | Rejected at approval | 6 |
  | Approval/Budget swapped | 5 |
  | Escalated to Finance Review | 2 |
  | Escalated to Legal Review | 1.5 |
  | Flagged as Duplicate Request | 1 |

- Stages (BPMN lanes): Request Intake · Approval & Budget · Procurement · Fulfillment & Invoicing · Payment · Exceptions.
- **Budget Check** has a demo subprocess: Check Budget Line → Validate Threshold → Record Decision (3 sub-steps).

### 4.3 Rendering

**Shared:**
- d3 SVG layers: edge, node, bpmn-lane, bpmn-edge, bpmn-node, ball.
- Zoom range 0.2–2.5×.
- **Trackpad:** a horizontal swipe pans; a vertical scroll or a pinch zooms around the pointer. Dragging pans.
- `fitToView()`: padding 60, max 1.1×, 350 ms. It also runs on window resize (debounced 150 ms), on full-screen toggle and on view toggle.

**BPMN view** (default, `renderBpmnView`):
- Built with dagre, left to right.
- Synthetic split/join **gateways** (◇ X) are added wherever a task has more than one outgoing or incoming edge.
- **Swimlanes** come from task stages, inside a pool labelled with the process name.
- Task boxes are sized to their text (168–260 px wide, at least 76 px tall).
- **Collision-aware orthogonal routing:**
  - Edges bend in the free gaps between node columns.
  - Sibling edges spread apart.
  - An edge that would cross a node flies over along the nearest lane divider.
  - Corners are rounded (r = 10).
  - Endpoints are pulled back so the **arrowheads** stay visible.
- Edge styles: happy path green 2 px; other edges grey 1.3 px; message flows (send/receive tasks) dashed.
- Start and end events are drawn green and red.
- **Hover:**
  - Node: highlights its immediate neighbours (walking through gateways) and shows a **hover card above the node**. The card has a kind chip, happy/deviation chip, description, a quote, "Seen in N of M cases", median duration, an autonomy pill, and **Watch session** / **View details** buttons. It stays open while the pointer moves into it (200 ms grace).
  - Edge: highlights the edge and **both connected nodes**.
- **Subprocess drill-down:**
  - Tasks with sub-steps show "N sub steps" and a green bottom-right corner bracket.
  - Clicking one enters the subprocess. The breadcrumb reads "Root / Level / …", has a **back arrow**, and its earlier crumbs are clickable.
  - Clicking any other task opens the **task detail panel**.
- **Play** (top level only):
  - Up to 120 sampled cases become green balls, each one an instance.
  - Balls are released over 27 s ÷ speed and each travels its real path along the drawn edges in 7.8 s ÷ speed.
  - Speeds are 0.5 / **1** / 2 / 4×. Changing the speed restarts the animation.
  - Any re-render stops it.

**Path view:**
- Built with dagre, top to bottom.
- Task cards are 220×62: green bar, title, rework dot, kebab menu, "N instances · avg".
- Start and End are drawn as pills with a flag.
- Edge kinds: happy (green), deviation (grey dashed), and rework that loops back (orange). Labels read "count (pct%)".
- A node with several deviations routes through a circular **waypoint** labelled "N instances".
- **Semantic zoom:** at a fork with 3 or more deviations, minor branches (under 20% of the fork's volume, at least 2 of them) collapse into a clickable **bubble**.
- Hovering a node highlights everything reachable downstream.

**Structural mode** (BPMN file import):
- Adds `body.structural-diagram`, which hides the stats, Insights, Automation, AI Summary, Filter, Path view, the variants slider and Play.
- The diagram is drawn as authored (pools, lanes, subprocess drill-down).

### 4.4 Features and logic

| Feature | How it works |
|---|---|
| **Process Variants slider** | Rank-based. Deviation edges are sorted by count and the top `round(value% × n)` are shown; the happy path is always shown. Steps are ±10 and the fill is green. Applies to both views. |
| **Filters** | Rebuild the model from the matching cases. If nothing matches, the last view is kept and a note is shown. The duration ends mean "no limit". |
| **Insights** | Cards highlight a variant (most followed / fastest) or a node (time sink / rework). **Fast vs typical:** needs at least 10 cases. The fast cohort is the fastest 5% (minimum 3), compared on tasks that appear in at least 50% of happy-path cases. A task is "Skipped in fastest instances" if it is in ≤20% of the cohort, and "X faster" if the gap is ≥10%. |
| **Automation score** | `round(100·(0.3·casePct + 0.3·(1−deviationRate) + 0.2·(1−reworkRate) + 0.2·judgment))`. The judgment factor comes from the number of subtypes (≤1 → 1, ≤3 → 0.6, more → 0.25); with no subtypes it comes from the deviation rate. Tiers: **≥70 Fully Automatable** (green), **≥40 Assisted Automation** (orange), **<40 Fully Manual** (red). |
| **Automation Preview** | coverage = consistency · expected = visits × coverage · time saved = coverage × total time · steps = the task's subtypes. "Send to Seek" shows the payload text. |
| **AI Summary** | Local templates (`buildAISummaryHtml`). No API call. |
| **Export** | Clones the SVG, crops it to the visible view, inlines the CSS, and rasterises at 2×. **PNG** via `canvas.toBlob`; **PDF** via jsPDF (Letter, auto orientation, margin 24). Filename `<title-slug>-<bpmn\|flow>.png/.pdf`. |
| **Import** | JSON event log (any shape above) or BPMN XML. Drag and drop is supported. The modal closes after 700 ms on success. If `raw.goal.name` is present it becomes the title. |
| **Session replay** | The video area is a placeholder. The timeline is synthetic (150–389 s per task, seeded per task) with task-boundary ticks and a hover preview. |
| **Full screen** | `body.app-fullscreen` hides the topbar and stats and floats the toolbar, then re-fits. |

### 4.5 State and render pipeline
`state` (app.js 20–48) holds:
- `cases`, `model`, `allCases`, `baseModel`, `filters{…}`
- `threshold` (100), `highlight`, `expandedBubbles`, `comparison`
- `selectedTaskId`, `expandedSubtypeIds`, `taskInsights`
- `expandedOpportunityIds`, `opportunitySort`, `opportunityShowAll`
- `viewMode` ('bpmn'), `drilldown` ([]), `staticDiagram`, `playbackSpeed` (1)

`render(fit)` runs these steps in order:
1. Stop the animation.
2. In structural mode, go straight to the BPMN view.
3. Apply the threshold.
4. Build the Path-view graph, then lay it out and draw it.
5. Update Process Summary, Insights, time/rework/variant lists, stats and fast-compare.
6. `renderBpmnView`.
7. `syncViewLayers`.
8. Fit, if requested.

The filter panel, automation list and task detail render separately.

---

## 5. Decision map page: `decision-map.html`

**Files:** `decision-map.html`, `styles.css`, `decision-map.css`, `decision-map.js`, d3. This page is a **static, hand-laid-out** example: it does not load data.js, graph.js or the hand-off.

**Header and KPIs:**
- Back arrow, then "Process Map — Purchase Approval by Cost".
- Subtitle: "A decision node near the start of the process routes each request into one of three structurally distinct approval processes, based on the request cost."
- KPIs: **60** Total Instances · **44** unique users · **15m 27s** median.
- Toolbar: Insights, AI Summary, full screen.

**Canvas** (`svg#decision-graph`, viewBox 1900×1260; d3 zoom 0.4–2.5×):
- Start → "Process authorisation" (4m 04s) → decision diamond **Cost** (dashed green).
- The diamond fans out into three branches:

  | Branch | Edge label | Pill | Card | Steps |
  |---|---|---|---|---|
  | Path 1 | $50k > Cost > $10k | 10% followed this | 10 Tasks, avg 11m 10s, 6 requests | Create Request, Manager Approval, Finance Review, Budget Check, Legal Review, Vendor Selection, PO Creation, Goods Receipt, Invoice Match, Payment |
  | Path 2 | Cost<$10K | 30% | 3 Tasks, avg 09m 50s, 18 requests | Create Request, Auto-Approval, Payment |
  | Path 3 | Cost>$50k | 60% | 7 Tasks, avg 12m 12s, 36 requests | Create Request, Manager Approval, Finance Review, Executive Approval, Vendor Selection, PO Creation, Payment |

- Dashed merge lines lead to **End**.
- Clicking a **"N tasks"** chip expands that path's task-level chain inline. Only one path is open at a time.
  - Forward detours appear as side cards (dashed grey, "~N% of requests"); rework appears as an orange "N% rework" side loop.
  - The layout re-flows downward to make room.
- The kebab icons show "More options are not available in this demo example."
- Hint: "Scroll to zoom · drag to pan · click "N tasks" to open that process's task-level map".

**Insights drawer:**
- **Key Takeaways:** Dominant process (60%, Path 3) · Fastest process (9m 50s, Path 2) · Biggest time sink (Path 3) · Decision point (Cost). Clicking a card zooms to the path and flashes it.
- **Processes:** a list of the three paths.

**Process Variants slider:** 5 variants in total, top-N by share.

**AI Summary:** templated, with dominant process, fastest process, where time concentrates, and a recommendation.

**Known demo inconsistencies:**
- Every path card says "8 deviations", although Path 2 has none.
- Card averages do not equal the sum of the step minutes.
- "$10K" and "$10k" are capitalised inconsistently.

---

## 6. Design system

**Product palette** (`styles.css :root`; colour carries meaning):

| Token | Hex | Meaning |
|---|---|---|
| `--path-main` | `#1f9d5c` (soft `#e4f6ec`) | most common / happy path, fastest badge, start event, high automation tier, play balls, slider fill |
| `--path-deviation` | `#9a9fb5` (soft `#eef0f6`) | deviations (dashed), BPMN sequence flow |
| `--rework` | `#d17d2c` (soft `#fbf0e2`) | rework loops, medium tier |
| `--accent-ui` | `#c74900` (soft `#fbe8dc`) | interaction: active buttons and tabs, hover focus, selected filters, Import, "Automate with Seek →" |
| `--flag-end-fg` | `#cf3550` | end event, low tier |
| `--kind-info` | `#3568c4` | BPMN kind chips |
| `--bg` / `--card-bg` | `#f6f6f9` / `#ffffff` | canvas / surfaces |
| `--card-border` / `--panel-border` | `#eaeaf2` / `#ebebf3` | borders. BPMN boxes use `#1f9d5c`; lanes and pool use `#e2e2ed` |
| `--text-primary/secondary/tertiary` | `#2a2e45` / `#8b8fa6` / `#b2b5c6` | text |

- **Shadows:** `--shadow-sm 0 1px 2px rgba(24,26,51,.05)` · `--shadow-md 0 4px 16px rgba(24,26,51,.07)`.
- **Font:** system UI stack (`-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`).
- **Dimming:** hover-dim 0.12; highlight-dim 0.28 for nodes and 0.15 for edges.
- **Landing page** (`home.css`):
  - Dark sidebar `#12141c`, brand orange `#ff5a2e`.
  - Content `#f5f5f9` with white cards (radius 12) and borders `#e9e9f1`.
  - Text `#24263a` / `#8b8fa6`. The pagination accent is blue `#2563eb`.

---

## 7. File map

| File | Role |
|---|---|
| `home.html` / `home.css` / `home.js` / `home-data.js` | Overview landing page: catalog, stats, search, filter, sort, pagination, hand-off |
| `sample-datasets.js` | `EXTRA_PROCESS_EXAMPLES`: two real ground-truth datasets |
| `index.html` / `styles.css` / `app.js` | Process detail page: all UI, rendering and interactions |
| `data.js` | constants, demo generator, input parsers (`extractRawCases`, `normalizeCaseLog`), insight extraction, BPMN XML parser, `median` |
| `graph.js` | `buildProcessModel(cases)`: process mining (nodes, edges, variants, happy/fastest path, rework, completion) |
| `decision-map.html` / `decision-map.css` / `decision-map.js` | static decision-node example |
| `vendor/` | d3 v7, dagre, jsPDF (UMD) |
| `build_standalone.py` | builds `build/*.html` |
| `build/home.html`, `build/index.html`, `build/decision-map.html` | each page self-contained; relative links work when the files sit side by side |
| `build/whatfix-lens-app.html` | **the complete UI in one file** |

---

## 8. Running locally

The pages use only relative paths, so either of these works:
- Open `home.html` straight from disk.
- Serve the folder with `python3 -m http.server --directory process-map 8000`, then open `http://localhost:8000/home.html`.

---

## 9. Builds and the single-file app

Run `python3 process-map/build_standalone.py`. It produces:

1. **`build/home.html`, `build/index.html`, `build/decision-map.html`.** These have CSS and JS inlined, so each page is self-contained. Cross-page links are relative, so keep the files together.
2. **`build/whatfix-lens-app.html`.** This is the whole flow in one file:
   - A small **router shell** renders the current page in a full-window `<iframe srcdoc>`, which gives each page a fresh JS context, just like real navigation.
   - `sessionStorage` and `window.location.href` in the page scripts are rewritten at build time to `__lensSession` / `__lensNavigate`. Those post messages to the shell, which keeps the hand-off state and switches pages. In-app `<a href="home.html">` links are intercepted the same way.
   - Browser **back/forward** work. **Deep links** work: `#/home`, `#/index`, `#/decision-map`.
   - The tab title follows the current page.
   - d3, dagre and jsPDF are embedded **once** and injected into the pages that need them.
   - Verified with headless Chromium, with no console errors:
     - Overview → Purchase Order to Payment (35 nodes)
     - Back arrow → Overview
     - Tech Support Ticket Handling (real dataset, 78 nodes)
     - Browser Back → Overview
     - Purchase Approval by Cost (decision map)
     - Back arrow → Overview
     - Deep link `#/index`

**Edit the source files, never `build/`, and re-run the script.**

---

## 10. Extending: quick recipes

- **Add a catalog row that opens real data:** append `{ title, description, role, businessUnit, data }` to `EXTRA_PROCESS_EXAMPLES`. The row's stats are computed automatically.
- **Open a custom page from the catalog:** add `targetPage: 'my-page.html'` to the row template. For the single-file build, add the page to `PAGES` in `build_standalone.py` and to the page-name regex in the shell.
- **Support a new log format:** add a branch in `extractRawCases` (data.js) that returns `[{caseId, steps:[{task, duration}], users}]`.
- **Change automation scoring:** edit `computeAutomationMetrics` (app.js about 2704). The tiers are thresholds at 70 and 40.
- **Recolour:** change the `:root` tokens in `styles.css`. A few SVG markers use literal hexes in app.js (about 64–113) and decision-map.js.

## 11. Known limitations (prototype)

- There is no backend. Every "AI" string is templated, "Send to Seek" makes no API call, and session replay has no video.
- The landing page's Settings, app switcher and user menu are inert. Its "Total Unique Users" is a sum, not de-duplicated.
- Placeholder catalog rows open the demo dataset under their own title.
- The hand-off is one-time, so reloading `index.html` shows the demo.
- In the decision map, Path 2 shows "8 deviations" although it has none, and card averages do not match the step totals.
- The session-replay speed select does nothing. The "Error Rate" automation tile is always "Not tracked".
