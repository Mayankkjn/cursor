(() => {
  /* ============================================================
   * Data model — the single source of truth for every rendered
   * list. Mutating these and calling renderAll() keeps every
   * view (and every place the same entity appears) in sync.
   * ============================================================ */

  const INSIGHTS = [
    {
      id: "i1",
      severity: "critical",
      flow: "Onboarding flow",
      title: 'Drop-off spike at "Connect integrations" step',
      cause: "38% of users abandon after the new permissions modal shipped Jul 24.",
      action: "Revert modal copy or add a guided tooltip before the permissions prompt.",
      primaryLabel: "Deploy guidance",
      storyboardId: "sb1",
      deployed: false,
      dismissed: false,
    },
    {
      id: "i2",
      severity: "warning",
      flow: "Settings flow",
      title: 'Tooltip "Y" ignored 73% of the time',
      cause: "Placement overlaps a native control on smaller viewports.",
      action: "Reposition the tooltip or shorten the copy to one line.",
      primaryLabel: "Deploy guidance",
      storyboardId: "sb2",
      deployed: false,
      dismissed: false,
    },
    {
      id: "i3",
      severity: "good",
      flow: "New invoice creation",
      title: "Completion rate up to 94%, from 81%",
      cause: "Inline smart tips added at the line-items step on Jul 20.",
      action: "Replicate the same smart-tip pattern on the Expense flow.",
      primaryLabel: "Replicate to Expense flow",
      storyboardId: "sb3",
      deployed: false,
      dismissed: false,
    },
    {
      id: "i4",
      severity: "warning",
      flow: "Bulk export flow · APAC",
      title: "Usage down 18%, third week running",
      cause: "A new export-limit dialog interrupts the flow for accounts over quota.",
      action: "A/B test a softer warning banner instead of a blocking dialog.",
      primaryLabel: "Deploy guidance",
      storyboardId: "sb4",
      deployed: false,
      dismissed: false,
    },
    {
      id: "i5",
      severity: "critical",
      flow: "Checkout flow · EU",
      title: "Payment step errors spiking",
      cause: "3-D Secure redirect fails on Safari 17 for roughly 9% of sessions.",
      action: "Add a fallback retry prompt and page engineering on the payments team.",
      primaryLabel: "Deploy guidance",
      storyboardId: "sb5",
      deployed: false,
      dismissed: false,
    },
  ];

  const STORYBOARDS = [
    {
      id: "sb1",
      flow: "Onboarding flow",
      title: "Connect integrations funnel",
      insightId: "i1",
      steps: [
        { name: "Start onboarding", pct: 100 },
        { name: "Choose integrations", pct: 82 },
        { name: "Permissions modal", pct: 61 },
        { name: "Connect integrations", pct: 38 },
        { name: "Complete", pct: 35 },
      ],
    },
    {
      id: "sb2",
      flow: "Settings flow",
      title: "Notification preferences journey",
      insightId: "i2",
      steps: [
        { name: "Open settings", pct: 100 },
        { name: "Reach notifications tab", pct: 74 },
        { name: "Tooltip Y shown", pct: 74 },
        { name: "Tooltip Y engaged", pct: 20 },
        { name: "Preference saved", pct: 66 },
      ],
    },
    {
      id: "sb3",
      flow: "New invoice creation",
      title: "Invoice line-items funnel",
      insightId: "i3",
      steps: [
        { name: "Start invoice", pct: 100 },
        { name: "Add line items", pct: 96 },
        { name: "Smart tip shown", pct: 96 },
        { name: "Apply tax & discount", pct: 91 },
        { name: "Invoice sent", pct: 94 },
      ],
    },
    {
      id: "sb4",
      flow: "Bulk export flow · APAC",
      title: "Bulk export quota journey",
      insightId: "i4",
      steps: [
        { name: "Start export", pct: 100 },
        { name: "Select records", pct: 88 },
        { name: "Quota dialog shown", pct: 54 },
        { name: "Export confirmed", pct: 41 },
      ],
    },
    {
      id: "sb5",
      flow: "Checkout flow · EU",
      title: "Payment authentication funnel",
      insightId: "i5",
      steps: [
        { name: "Start checkout", pct: 100 },
        { name: "Enter payment details", pct: 89 },
        { name: "3-D Secure redirect", pct: 80 },
        { name: "Authentication success", pct: 71 },
        { name: "Order confirmed", pct: 70 },
      ],
    },
  ];

  const DASHBOARDS = [
    {
      id: "d1",
      title: "Region-wise adoption Q3",
      author: "Riya A.",
      updated: "edited 2h ago",
      comments: 3,
      bars: [40, 65, 52, 78, 60, 90],
    },
    {
      id: "d2",
      title: "CX support flows — drop-off audit",
      author: "Dev K.",
      updated: "edited yesterday",
      comments: 1,
      bars: [70, 55, 48, 40, 35, 30],
    },
    {
      id: "d3",
      title: "Onboarding funnel — new hires",
      author: "You",
      updated: "edited 3 days ago",
      comments: 0,
      bars: [95, 80, 70, 55, 50, 48],
    },
    {
      id: "d4",
      title: "EU checkout health",
      author: "Whatfix AI",
      updated: "auto-generated",
      comments: 0,
      bars: [60, 62, 58, 66, 64, 71],
    },
  ];

  const GUIDANCE = [
    { id: "g1", title: "Guided tooltip — permissions modal", flow: "Onboarding flow", status: "draft" },
    { id: "g2", title: "Repositioned tooltip Y", flow: "Settings flow", status: "draft" },
    { id: "g3", title: "Smart tips — invoice line items", flow: "New invoice creation", status: "published" },
  ];

  const PINNED = [
    {
      id: "p1",
      name: "Sales team · Flow X adoption",
      meta: 'Alert if unused for 3 consecutive days · moves with <em>Onboarding completion</em>',
      points: "0,10 13,12 26,9 40,14 53,16 66,20 80,22",
      status: "warning",
      statusLabel: "2 days idle",
      pinned: true,
    },
    {
      id: "p2",
      name: "Checkout completion rate",
      meta: 'Threshold: alert below 70% · moves with <em>Tooltip Y engagement</em>',
      points: "0,20 13,17 26,18 40,13 53,11 66,8 80,5",
      status: "good",
      statusLabel: "On track",
      pinned: true,
    },
    {
      id: "p3",
      name: "EU region · Weekly active users",
      meta: "Goal: 1,200 WAU by end of quarter",
      points: "0,18 13,16 26,17 40,14 53,12 66,13 80,10",
      status: "good",
      statusLabel: "On track",
      pinned: true,
    },
  ];

  const AGENT_ALERTS = [
    {
      id: "a1",
      prompt: "Notify me if Sales stops using Flow X for 3 days",
      meta: "last triggered 2 days ago",
      status: "warning",
      statusLabel: "Firing",
      active: true,
      logic: "Monitors daily event volume for Flow X, scoped to the Sales team segment. Fires if zero completions are logged for 3 consecutive calendar days.",
      remediation: "Send a nudge campaign to the Sales team and flag the flow owner for a re-onboarding session.",
      evidence: {
        label: "Flow X completions · Sales team, last 10 days",
        points: [19, 17, 21, 16, 14, 9, 6, 2, 0, 0],
        note: "Completions dropped from ~18/day to 0 over the last 3 days — consistent with the alert's trigger condition.",
      },
    },
    {
      id: "a2",
      prompt: "Tell me when tooltip Y is ignored more than 70% of the time",
      meta: "fired repeatedly this week",
      status: "critical",
      statusLabel: "3 fires",
      active: true,
      logic: "Tracks tooltip Y impression-to-engagement ratio, rolling 24h window. Fires when the ignore rate exceeds 70% for two consecutive windows.",
      remediation: "Reposition tooltip Y away from the overlapping native control, or shorten its copy to a single line.",
      evidence: {
        label: "Tooltip Y ignore rate, last 7 days",
        points: [52, 58, 61, 65, 70, 74, 73],
        note: "Ignore rate has climbed steadily for a week and crossed the 70% trigger three times.",
      },
    },
    {
      id: "a3",
      prompt: "Alert me on any anomaly in the EU checkout flow",
      meta: "quiet for 12 days",
      status: "good",
      statusLabel: "Healthy",
      active: true,
      logic: "Runs anomaly detection on EU checkout completion rate and payment error rate, comparing to a 30-day trailing baseline.",
      remediation: "No action needed while healthy — recalibration suggested only if quiet periods start masking seasonal dips.",
      evidence: {
        label: "EU checkout anomaly score, last 12 days",
        points: [8, 6, 7, 5, 6, 4, 5, 4, 3, 4, 3, 4],
        note: "Anomaly score has stayed well under the alert threshold (20) for the full window.",
      },
    },
  ];

  let insightFilter = "all";

  /* ============================================================
   * Generative UI component kit
   *
   * Ask Whatfix AI doesn't return one fixed template — it composes
   * a response from this small set of primitives (bar chart, funnel,
   * stat pair, trend line, data table) based on what the query
   * actually asks for, the same way the response ships real,
   * wired controls (period, region, chart/table view) rather than
   * decorative follow-up text.
   * ============================================================ */

  function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }

  // ---- Trend line (used by evidence panels) ----
  function renderTrendChart(points, { width = 280, height = 64 } = {}) {
    const max = Math.max(...points);
    const min = Math.min(...points);
    const span = max - min || 1;
    const stepX = width / (points.length - 1);
    const toY = (v) => height - ((v - min) / span) * (height - 10) - 5;
    const coords = points.map((v, i) => [i * stepX, toY(v)]);
    const linePath = coords.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
    const areaPath = `${linePath} L${width},${height} L0,${height} Z`;
    const [endX, endY] = coords[coords.length - 1];
    const gridLines = [0.25, 0.5, 0.75]
      .map((f) => `<line class="trend-grid" x1="0" x2="${width}" y1="${(height * f).toFixed(1)}" y2="${(height * f).toFixed(1)}" />`)
      .join("");
    return `
      <svg class="trend-chart" viewBox="0 0 ${width} ${height}" preserveAspectRatio="none" aria-hidden="true">
        ${gridLines}
        <path class="trend-area" d="${areaPath}" />
        <path class="trend-line" d="${linePath}" />
        <circle class="trend-end" cx="${endX.toFixed(1)}" cy="${endY.toFixed(1)}" r="4"></circle>
      </svg>
    `;
  }

  // ---- Comparison (grouped bar + table, with live filters) ----
  function defaultComparisonState(data) {
    return { period: Object.keys(data.periods)[0], visible: new Set(data.entities.map((e) => e.id)), view: "chart" };
  }

  function renderComparisonHTML(data, state) {
    const period = data.periods[state.period];
    const otherKey = Object.keys(data.periods).find((k) => k !== state.period);
    const otherPeriod = data.periods[otherKey];
    const visible = data.entities.filter((e) => state.visible.has(e.id));
    const maxVal = Math.max(...Object.values(period.values)) * 1.2;

    const filterBar = `
      <div class="filter-bar">
        <span class="filter-bar-label">Period</span>
        <div class="segmented">
          ${Object.entries(data.periods)
            .map(([key, p]) => `<button type="button" class="segmented-btn${key === state.period ? " active" : ""}" data-control="period" data-value="${key}">${p.label}</button>`)
            .join("")}
        </div>
        <span class="filter-bar-label">Region</span>
        ${data.entities
          .map(
            (e) => `
          <button type="button" class="chip-toggle${state.visible.has(e.id) ? " active" : ""}" data-control="region" data-value="${e.id}" style="--chip-color:var(${e.colorVar})">
            <span class="chip-dot"></span>${e.label}
          </button>
        `
          )
          .join("")}
        <div class="segmented" style="margin-left:auto">
          <button type="button" class="segmented-btn${state.view === "chart" ? " active" : ""}" data-control="view" data-value="chart">Chart</button>
          <button type="button" class="segmented-btn${state.view === "table" ? " active" : ""}" data-control="view" data-value="table">Table</button>
        </div>
      </div>
    `;

    const legend = `
      <div class="legend-row">
        ${visible.map((e) => `<span class="legend-item"><span class="legend-swatch" style="--chip-color:var(${e.colorVar})"></span>${e.label}</span>`).join("")}
      </div>
    `;

    let body;
    if (!visible.length) {
      body = `<p class="empty-state">Select at least one region to compare.</p>`;
    } else if (state.view === "chart") {
      body = `
        <div class="bar-chart-card">
          <div class="bar-chart-vertical">
            ${visible
              .map((e) => {
                const val = period.values[e.id];
                const pct = Math.max(4, (val / maxVal) * 100);
                return `
                <div class="bar-col">
                  <span class="bar-col-value">${val}${data.unit}</span>
                  <div class="bar-shape" style="height:${pct}%; --chip-color:var(${e.colorVar})"></div>
                </div>
              `;
              })
              .join("")}
          </div>
          <div class="bar-chart-cats">
            ${visible.map((e) => `<div class="bar-col-cat">${e.label}</div>`).join("")}
          </div>
        </div>
        ${legend}
      `;
    } else {
      body = `
        <div class="data-table-wrap">
          <table class="data-table">
            <thead>
              <tr><th>Region</th><th class="num">${period.label}</th><th class="num">${otherPeriod.label}</th><th class="num">Δ</th></tr>
            </thead>
            <tbody>
              ${visible
                .map((e) => {
                  const curr = period.values[e.id];
                  const prev = otherPeriod.values[e.id];
                  const delta = curr - prev;
                  const deltaClass = delta >= 0 ? "good" : "critical";
                  return `
                  <tr>
                    <td class="entity-cell"><span class="legend-swatch" style="--chip-color:var(${e.colorVar})"></span>${e.label}</td>
                    <td class="num">${curr}${data.unit}</td>
                    <td class="num">${prev}${data.unit}</td>
                    <td class="num ${deltaClass}">${delta >= 0 ? "+" : ""}${delta}${data.unit}</td>
                  </tr>
                `;
                })
                .join("")}
            </tbody>
          </table>
        </div>
      `;
    }

    return `${filterBar}${body}`;
  }

  // ---- Funnel (process-mined steps, with a funnel/table view toggle) ----
  function defaultFunnelState() {
    return { view: "funnel" };
  }

  function renderFunnelHTML(data, state) {
    const filterBar = `
      <div class="filter-bar">
        <span class="filter-bar-label">${data.flow}</span>
        <div class="segmented" style="margin-left:auto">
          <button type="button" class="segmented-btn${state.view === "funnel" ? " active" : ""}" data-control="funnel-view" data-value="funnel">Funnel</button>
          <button type="button" class="segmented-btn${state.view === "table" ? " active" : ""}" data-control="funnel-view" data-value="table">Table</button>
        </div>
      </div>
    `;
    const body =
      state.view === "funnel"
        ? `<div class="funnel">${data.steps
            .map(
              (s) => `
          <div class="funnel-row">
            <span class="funnel-label">${s.name}</span>
            <div class="funnel-track"><div class="funnel-fill" style="width:${s.pct}%"></div></div>
            <span class="funnel-pct">${s.pct}%</span>
          </div>
        `
            )
            .join("")}</div>`
        : `
        <div class="data-table-wrap">
          <table class="data-table">
            <thead><tr><th>Step</th><th class="num">Completion</th></tr></thead>
            <tbody>
              ${data.steps.map((s) => `<tr><td>${s.name}</td><td class="num">${s.pct}%</td></tr>`).join("")}
            </tbody>
          </table>
        </div>
      `;
    return `${filterBar}${body}`;
  }

  // ---- Stat pair (simple, no controls needed) ----
  function renderStatHTML(data) {
    return `
      <div class="stat-pair">
        ${data.tiles
          .map(
            (t) => `
          <div class="stat-pair-tile">
            <p class="stat-label">${t.label}</p>
            <p class="stat-value">${t.value}</p>
            <p class="stat-delta ${t.good ? "good" : "critical"}">${t.delta}</p>
          </div>
        `
          )
          .join("")}
      </div>
    `;
  }

  // ---- Alert spec (agent-mode responses) ----
  function renderAlertHTML(data, activated) {
    return `
      <div class="alert-spec-card">
        <div class="alert-spec-row"><span class="label">Watching</span><span>"${escapeHtml(data.prompt)}"</span></div>
        <div class="alert-spec-row"><span class="label">Logic</span><span>${data.logic}</span></div>
        <div class="alert-spec-row"><span class="label">If it fires</span><span>${data.remediation}</span></div>
      </div>
      ${
        activated
          ? `<button type="button" class="pill-btn success small" disabled>✓ Alert activated</button>`
          : `<button type="button" class="pill-btn primary small" data-action="ask-activate-alert">Activate alert</button>`
      }
    `;
  }

  // ---- Mounts a comparison/funnel/stat component into a container,
  // wiring its own filter controls locally (works in the Ask AI
  // response panel and inside a dashboard preview modal alike). ----
  function mountGeneratedComponent(container, spec) {
    let uiState = null;
    if (spec.type === "comparison") uiState = defaultComparisonState(spec.data);
    else if (spec.type === "funnel") uiState = defaultFunnelState();

    function paint() {
      if (spec.type === "comparison") container.innerHTML = renderComparisonHTML(spec.data, uiState);
      else if (spec.type === "funnel") container.innerHTML = renderFunnelHTML(spec.data, uiState);
      else container.innerHTML = renderStatHTML(spec.data);
    }

    if (uiState) {
      container.addEventListener("click", (e) => {
        const ctrl = e.target.closest("[data-control]");
        if (!ctrl) return;
        const { control, value } = ctrl.dataset;
        if (control === "period") uiState.period = value;
        else if (control === "view" || control === "funnel-view") uiState.view = value;
        else if (control === "region") {
          if (uiState.visible.has(value)) {
            if (uiState.visible.size > 1) uiState.visible.delete(value);
          } else {
            uiState.visible.add(value);
          }
        }
        paint();
      });
    }

    paint();
  }

  // ---- Compact previews of a generated spec, for dashboard cards ----
  const TREND_POINTS = {
    up: "0,20 13,17 26,18 40,13 53,11 66,8 80,5",
    down: "0,8 13,10 26,9 40,14 53,16 66,20 80,22",
    flat: "0,14 13,13 26,15 40,13 53,14 66,12 80,13",
  };

  function miniFromSpec(spec) {
    if (spec.type === "comparison") {
      const periodKey = Object.keys(spec.data.periods)[0];
      const period = spec.data.periods[periodKey];
      const max = Math.max(...Object.values(period.values)) * 1.15;
      return `<div class="mini-chart">${spec.data.entities
        .map((e) => `<div class="bar" style="height:${(period.values[e.id] / max) * 100}%; --chip-color:var(${e.colorVar})"></div>`)
        .join("")}</div>`;
    }
    if (spec.type === "funnel") {
      return `<div class="funnel">${spec.data.steps
        .slice(0, 3)
        .map(
          (s) => `
        <div class="funnel-row" style="grid-template-columns: 96px 1fr 34px;">
          <span class="funnel-label">${s.name}</span>
          <div class="funnel-track"><div class="funnel-fill" style="width:${s.pct}%"></div></div>
          <span class="funnel-pct">${s.pct}%</span>
        </div>
      `
        )
        .join("")}</div>`;
    }
    const tile = spec.data.tiles[0];
    return `<div><p class="stat-value">${tile.value}</p><p class="stat-delta ${tile.good ? "good" : "critical"}">${tile.delta}</p></div>`;
  }

  // ---- What "Pin this" captures from a generated answer ----
  function summarizeForPin(spec) {
    if (spec.type === "comparison") {
      const periodKey = Object.keys(spec.data.periods)[0];
      const period = spec.data.periods[periodKey];
      const otherKey = Object.keys(spec.data.periods).find((k) => k !== periodKey);
      const top = spec.data.entities[0];
      const val = period.values[top.id];
      const delta = val - spec.data.periods[otherKey].values[top.id];
      return {
        name: `${top.label} adoption · ${period.label.toLowerCase()}`,
        statusLabel: `${val}${spec.data.unit}`,
        status: delta >= 0 ? "good" : "warning",
        trend: delta >= 0 ? "up" : "down",
      };
    }
    if (spec.type === "funnel") {
      const last = spec.data.steps[spec.data.steps.length - 1];
      return {
        name: `${spec.data.flow} · end-to-end completion`,
        statusLabel: `${last.pct}%`,
        status: last.pct >= 50 ? "good" : "warning",
        trend: last.pct >= 50 ? "flat" : "down",
      };
    }
    const tile = spec.data.tiles[0];
    return {
      name: tile.label,
      statusLabel: tile.value,
      status: tile.good ? "good" : "critical",
      trend: tile.good ? "up" : "down",
    };
  }


  /* ============================================================
   * Small utilities: modal, toast, escape handling
   * ============================================================ */

  const modalRoot = document.getElementById("modalRoot");
  const toastRoot = document.getElementById("toastRoot");

  function escListener(e) {
    if (e.key === "Escape") closeModal();
  }

  function closeModal() {
    modalRoot.innerHTML = "";
    document.removeEventListener("keydown", escListener);
  }

  function openModal({ title, bodyHtml, actionsHtml }) {
    modalRoot.innerHTML = `
      <div class="modal-backdrop" id="modalBackdrop">
        <div class="modal" role="dialog" aria-modal="true" aria-label="${title}">
          <div class="modal-header">
            <h3>${title}</h3>
            <button class="icon-btn" id="modalCloseBtn" type="button" aria-label="Close">✕</button>
          </div>
          <div class="modal-body">${bodyHtml}</div>
          ${actionsHtml ? `<div class="modal-actions">${actionsHtml}</div>` : ""}
        </div>
      </div>
    `;
    document.getElementById("modalCloseBtn").addEventListener("click", closeModal);
    document.getElementById("modalBackdrop").addEventListener("click", (e) => {
      if (e.target.id === "modalBackdrop") closeModal();
    });
    document.addEventListener("keydown", escListener);
  }

  function showToast(message) {
    const el = document.createElement("div");
    el.className = "toast";
    el.textContent = message;
    toastRoot.appendChild(el);
    requestAnimationFrame(() => el.classList.add("show"));
    setTimeout(() => {
      el.classList.remove("show");
      setTimeout(() => el.remove(), 250);
    }, 2800);
  }

  function closeDropdowns() {
    document.querySelectorAll(".dropdown-panel").forEach((p) => p.classList.add("hidden"));
    document.querySelectorAll(".dropdown-wrap > button").forEach((b) => b.setAttribute("aria-expanded", "false"));
  }

  /* ============================================================
   * Theme
   * ============================================================ */

  const root = document.documentElement;
  const themeToggle = document.getElementById("themeToggle");

  function applyTheme(theme) {
    root.setAttribute("data-theme", theme);
    themeToggle.textContent = theme === "dark" ? "☀" : "☾";
    localStorage.setItem("wf-analytics-theme", theme);
  }

  const storedTheme = localStorage.getItem("wf-analytics-theme");
  if (storedTheme) applyTheme(storedTheme);

  themeToggle.addEventListener("click", () => {
    const current = root.getAttribute("data-theme") === "dark" ? "dark" : "light";
    applyTheme(current === "dark" ? "light" : "dark");
  });

  /* ============================================================
   * Router — five real views, hash-driven, back/forward safe
   * ============================================================ */

  const VALID_VIEWS = ["overview", "insights", "dashboards", "storyboards", "guidance"];

  function currentView() {
    const raw = (location.hash || "#overview").slice(1);
    return VALID_VIEWS.includes(raw) ? raw : "overview";
  }

  function route() {
    closeDropdowns();
    closeModal();
    const view = currentView();
    document.querySelectorAll(".view").forEach((section) => {
      section.classList.toggle("hidden", section.id !== `view-${view}`);
    });
    document.querySelectorAll(".nav-link").forEach((link) => {
      link.classList.toggle("active", link.dataset.view === view);
    });
    window.scrollTo(0, 0);
  }

  window.addEventListener("hashchange", route);

  /* ============================================================
   * Renderers
   * ============================================================ */

  const severityMeta = {
    critical: { label: "Critical" },
    warning: { label: "Needs attention" },
    good: { label: "Best path" },
  };

  function renderInsightCard(insight) {
    const meta = severityMeta[insight.severity];
    const primaryBtn = insight.deployed
      ? `<button class="pill-btn small success" type="button" disabled>✓ Deployed</button>`
      : `<button class="pill-btn primary small" type="button" data-action="deploy-insight" data-id="${insight.id}">${insight.primaryLabel}</button>`;

    return `
      <li class="insight-card${insight.dismissed ? " dismissed" : ""}" data-severity="${insight.severity}" data-id="${insight.id}">
        <div class="insight-top">
          <span class="status-chip ${insight.severity}"><span class="status-dot" aria-hidden="true"></span>${meta.label}</span>
          <span class="insight-flow">${insight.flow}</span>
        </div>
        <h3>${insight.title}</h3>
        <p class="insight-cause"><strong>Likely cause:</strong> ${insight.cause}</p>
        <p class="insight-action"><strong>Recommended:</strong> ${insight.action}</p>
        <div class="insight-footer">
          ${primaryBtn}
          <button class="pill-btn small" type="button" data-action="open-storyboard" data-id="${insight.storyboardId}">View storyboard</button>
          <button class="icon-btn ghost small dismiss-btn" type="button" data-action="dismiss-insight" data-id="${insight.id}" aria-label="Dismiss">✕</button>
        </div>
      </li>
    `;
  }

  function renderInsightList(containerId, { filter = "all", limit = null } = {}) {
    const container = document.getElementById(containerId);
    if (!container) return;
    let items = INSIGHTS.filter((i) => !i.dismissed);
    if (filter !== "all") items = items.filter((i) => i.severity === filter);
    if (limit) items = items.slice(0, limit);
    container.innerHTML = items.length
      ? items.map(renderInsightCard).join("")
      : `<li class="empty-state">No insights match this filter right now.</li>`;
  }

  function renderPinnedList() {
    const container = document.getElementById("pinnedList");
    if (!container) return;
    container.innerHTML = PINNED.map(
      (p) => `
      <li class="pinned-row" style="opacity:${p.pinned ? 1 : 0.5}" data-id="${p.id}">
        <button class="pin-toggle${p.pinned ? " pinned" : ""}" type="button" data-action="toggle-pin" data-id="${p.id}" aria-label="${p.pinned ? "Unpin metric" : "Pin metric"}" title="${p.pinned ? "Unpin" : "Pin"}">★</button>
        <div class="pinned-main">
          <p class="pinned-name">${p.name}</p>
          <p class="pinned-meta">${p.meta}</p>
        </div>
        <svg class="sparkline small" viewBox="0 0 80 24" preserveAspectRatio="none" aria-hidden="true">
          <polyline class="spark-ghost" points="${p.points}" />
        </svg>
        <span class="status-chip ${p.status}">${p.statusLabel}</span>
      </li>
    `
    ).join("");
  }

  function miniChart(bars) {
    const max = Math.max(...bars);
    return `<div class="mini-chart">${bars.map((b) => `<div class="bar" style="height:${(b / max) * 100}%"></div>`).join("")}</div>`;
  }

  function renderRecentRow(d) {
    const initials = d.author
      .split(" ")
      .map((w) => w[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();
    return `
      <li class="recent-row" data-action="preview-dashboard" data-id="${d.id}" tabindex="0">
        <div class="avatar small">${initials}</div>
        <div class="recent-main">
          <p class="recent-name">${d.title}</p>
          <p class="recent-meta">${d.author} · ${d.updated}${d.comments ? ` · ${d.comments} comment${d.comments > 1 ? "s" : ""}` : ""}</p>
        </div>
        <button class="text-btn" type="button" data-action="preview-dashboard" data-id="${d.id}">Preview</button>
      </li>
    `;
  }

  function renderRecentList() {
    const container = document.getElementById("recentList");
    if (!container) return;
    container.innerHTML = DASHBOARDS.slice(0, 3).map(renderRecentRow).join("");
  }

  function renderDashboardCard(d) {
    const preview = d.generated
      ? `<div class="mini-generated"><span class="mini-generated-badge">✦ Generated by Whatfix AI</span>${miniFromSpec(d.spec)}</div>`
      : miniChart(d.bars);
    return `
      <article class="entity-card">
        <div>
          <h3>${d.title}</h3>
          <p class="entity-meta">${d.author} · ${d.updated}${d.comments ? ` · ${d.comments} comment${d.comments > 1 ? "s" : ""}` : ""}</p>
        </div>
        ${preview}
        <div class="entity-card-footer">
          <button class="pill-btn primary small" type="button" data-action="preview-dashboard" data-id="${d.id}">Preview</button>
        </div>
      </article>
    `;
  }

  function renderDashboardGrid() {
    const container = document.getElementById("dashboardGrid");
    if (!container) return;
    container.innerHTML = DASHBOARDS.map(renderDashboardCard).join("");
  }

  function renderStoryboardCard(sb) {
    const first = sb.steps[0].pct;
    const last = sb.steps[sb.steps.length - 1].pct;
    return `
      <article class="entity-card">
        <div>
          <p class="entity-flow">${sb.flow}</p>
          <h3>${sb.title}</h3>
          <p class="mini-funnel"><strong>${last}%</strong> end-to-end completion, from ${sb.steps.length} steps</p>
        </div>
        <div class="entity-card-footer">
          <button class="pill-btn primary small" type="button" data-action="open-storyboard" data-id="${sb.id}">Open storyboard</button>
        </div>
      </article>
    `;
  }

  function renderStoryboardGrid() {
    const container = document.getElementById("storyboardGrid");
    if (!container) return;
    container.innerHTML = STORYBOARDS.map(renderStoryboardCard).join("");
  }

  function renderAgentRow(a) {
    return `
      <li class="agent-row" data-action="open-alert" data-id="${a.id}" tabindex="0">
        <div class="agent-main">
          <p class="agent-name">"${a.prompt}"</p>
          <p class="agent-meta">${a.active ? "Active" : "Paused"} · ${a.meta}</p>
        </div>
        <span class="status-chip ${a.active ? a.status : "warning"}">${a.active ? a.statusLabel : "Paused"}</span>
      </li>
    `;
  }

  function renderAgentList() {
    const container = document.getElementById("agentList");
    if (!container) return;
    container.innerHTML = AGENT_ALERTS.map(renderAgentRow).join("");
  }

  function renderGuidanceRow(g) {
    const isPublished = g.status === "published";
    return `
      <li class="guidance-row">
        <div class="guidance-main">
          <p class="guidance-title">${g.title}</p>
          <p class="guidance-flow">${g.flow}</p>
        </div>
        <span class="status-chip ${isPublished ? "good" : "warning"}">${isPublished ? "Published" : "Draft"}</span>
        <button class="pill-btn small" type="button" data-action="toggle-guidance" data-id="${g.id}">${isPublished ? "Unpublish" : "Publish"}</button>
      </li>
    `;
  }

  function renderGuidanceList() {
    const container = document.getElementById("guidanceList");
    if (!container) return;
    container.innerHTML = GUIDANCE.length
      ? GUIDANCE.map(renderGuidanceRow).join("")
      : `<li class="empty-state">No guidance has been recommended yet.</li>`;
  }

  function renderAlertsDropdown() {
    const panel = document.getElementById("alertsPanel");
    const badge = document.getElementById("alertsBadge");
    const attention = AGENT_ALERTS.filter((a) => a.active && (a.status === "critical" || a.status === "warning"));
    const openInsights = INSIGHTS.filter((i) => !i.dismissed && !i.deployed && i.severity === "critical").length;
    const count = attention.length + openInsights;

    badge.textContent = String(count);
    badge.classList.toggle("hidden", count === 0);

    const rows = attention
      .map(
        (a) => `
      <div class="dropdown-alert-row" data-action="open-alert" data-id="${a.id}">
        <p>"${a.prompt}"</p>
        <p class="dropdown-alert-meta">${a.statusLabel} · ${a.meta}</p>
      </div>
    `
      )
      .join("");

    const insightRow =
      openInsights > 0
        ? `<div class="dropdown-alert-row" data-nav="insights"><p>${openInsights} critical insight${openInsights > 1 ? "s" : ""} awaiting review</p><p class="dropdown-alert-meta">Auto-surfaced by process mining</p></div>`
        : "";

    panel.innerHTML =
      rows || insightRow
        ? `${rows}${insightRow}<div class="dropdown-footer"><button class="text-btn" type="button" data-nav="overview" data-scroll="agentAlertsPanel">View all alerts →</button></div>`
        : `<div class="dropdown-empty">You're all caught up.</div>`;
  }

  function renderAll() {
    renderInsightList("insightList", { limit: 3 });
    renderInsightList("insightListFull", { filter: insightFilter });
    renderPinnedList();
    renderRecentList();
    renderDashboardGrid();
    renderStoryboardGrid();
    renderAgentList();
    renderGuidanceList();
    renderAlertsDropdown();
    document.getElementById("openAnomaliesValue").textContent = String(
      INSIGHTS.filter((i) => !i.dismissed && !i.deployed).length
    );
  }

  /* ============================================================
   * Insight filter tabs (Insights view)
   * ============================================================ */

  document.getElementById("insightFilterTabs").addEventListener("click", (e) => {
    const btn = e.target.closest(".filter-tab");
    if (!btn) return;
    insightFilter = btn.dataset.filter;
    document.querySelectorAll("#insightFilterTabs .filter-tab").forEach((t) => t.classList.toggle("active", t === btn));
    renderInsightList("insightListFull", { filter: insightFilter });
  });

  /* ============================================================
   * Storyboard modal
   * ============================================================ */

  function openStoryboardModal(id) {
    const sb = STORYBOARDS.find((s) => s.id === id);
    if (!sb) return;
    const insight = INSIGHTS.find((i) => i.id === sb.insightId);
    const funnelHtml = sb.steps
      .map(
        (s) => `
      <div class="funnel-row">
        <span class="funnel-label">${s.name}</span>
        <div class="funnel-track"><div class="funnel-fill" style="width:${s.pct}%"></div></div>
        <span class="funnel-pct">${s.pct}%</span>
      </div>
    `
      )
      .join("");

    openModal({
      title: sb.title,
      bodyHtml: `
        <p><strong>Flow:</strong> ${sb.flow}</p>
        <div class="funnel">${funnelHtml}</div>
        ${insight ? `<p>Related insight: <strong>${insight.title}</strong></p>` : ""}
      `,
      actionsHtml: insight
        ? `<button class="pill-btn" type="button" data-action="goto-insight" data-id="${insight.id}">View related insight</button>
           <button class="pill-btn primary" type="button" id="modalCloseBtn2">Close</button>`
        : `<button class="pill-btn primary" type="button" id="modalCloseBtn2">Close</button>`,
    });
    const closeBtn2 = document.getElementById("modalCloseBtn2");
    if (closeBtn2) closeBtn2.addEventListener("click", closeModal);
  }

  /* ============================================================
   * Dashboard preview modal
   * ============================================================ */

  function openDashboardModal(id) {
    const d = DASHBOARDS.find((x) => x.id === id);
    if (!d) return;

    if (d.generated) {
      openModal({
        title: d.title,
        bodyHtml: `
          <p><strong>Generated by</strong> ${d.author} · ${d.updated}</p>
          <div id="dashboardGenMount"></div>
        `,
        actionsHtml: `<button class="pill-btn primary" type="button" id="modalCloseBtn2">Close</button>`,
      });
      document.getElementById("modalCloseBtn2").addEventListener("click", closeModal);
      mountGeneratedComponent(document.getElementById("dashboardGenMount"), d.spec);
      return;
    }

    const commentsHtml =
      d.comments > 0
        ? Array.from({ length: d.comments })
            .map(
              (_, idx) => `
        <div class="modal-comment">
          <p>${["Nice catch — let's ship this to the wider team.", "Can we break this out by segment too?", "Pinning this for the QBR."][idx % 3]}</p>
          <p class="comment-meta">${d.author} · ${idx + 1}d ago</p>
        </div>
      `
            )
            .join("")
        : `<p>No comments yet.</p>`;

    openModal({
      title: d.title,
      bodyHtml: `
        <p><strong>Owner:</strong> ${d.author} · ${d.updated}</p>
        ${miniChart(d.bars)}
        ${commentsHtml}
      `,
      actionsHtml: `<button class="pill-btn primary" type="button" id="modalCloseBtn2">Close</button>`,
    });
    document.getElementById("modalCloseBtn2").addEventListener("click", closeModal);
  }

  /* ============================================================
   * Agent alert modal
   * ============================================================ */

  function openAlertModal(id) {
    const a = AGENT_ALERTS.find((x) => x.id === id);
    if (!a) return;
    const evidenceHtml = a.evidence
      ? `
      <div class="evidence-block">
        <p class="evidence-label">Auto-compiled evidence</p>
        ${renderTrendChart(a.evidence.points, { width: 440, height: 64 })}
        <p class="evidence-note">${a.evidence.note}</p>
      </div>
    `
      : "";
    openModal({
      title: "Agent alert",
      bodyHtml: `
        <p><strong>"${a.prompt}"</strong></p>
        <p><strong>Monitoring logic:</strong> ${a.logic}</p>
        <p><strong>Recommended remediation:</strong> ${a.remediation}</p>
        <p><strong>Status:</strong> ${a.active ? a.statusLabel : "Paused"}</p>
        ${evidenceHtml}
      `,
      actionsHtml: `
        <button class="pill-btn" type="button" data-action="toggle-alert" data-id="${a.id}">${a.active ? "Pause alert" : "Resume alert"}</button>
        <button class="pill-btn primary" type="button" id="modalCloseBtn2">Close</button>
      `,
    });
    document.getElementById("modalCloseBtn2").addEventListener("click", closeModal);
  }

  /* ============================================================
   * Pin-a-metric modal
   * ============================================================ */

  function openPinMetricModal() {
    openModal({
      title: "Pin a metric",
      bodyHtml: `
        <label>Metric name
          <input type="text" id="pinNameInput" placeholder="e.g. Support team · Weekly active users" />
        </label>
        <label>Alert threshold (optional)
          <input type="text" id="pinThresholdInput" placeholder="e.g. Alert if it drops below 500" />
        </label>
      `,
      actionsHtml: `
        <button class="pill-btn" type="button" id="pinCancelBtn">Cancel</button>
        <button class="pill-btn primary" type="button" id="pinSaveBtn">Pin metric</button>
      `,
    });
    document.getElementById("pinCancelBtn").addEventListener("click", closeModal);
    document.getElementById("pinSaveBtn").addEventListener("click", () => {
      const name = document.getElementById("pinNameInput").value.trim();
      const threshold = document.getElementById("pinThresholdInput").value.trim();
      if (!name) {
        showToast("Give the metric a name first.");
        return;
      }
      PINNED.unshift({
        id: `p${Date.now()}`,
        name,
        meta: threshold || "No threshold set yet",
        points: "0,16 13,15 26,17 40,13 53,14 66,11 80,12",
        status: "good",
        statusLabel: "New",
        pinned: true,
      });
      renderAll();
      closeModal();
      showToast(`Pinned "${name}" to your watchlist.`);
    });
  }

  /* ============================================================
   * Deploy-guidance confirm modal
   * ============================================================ */

  function openDeployModal(insightId) {
    const insight = INSIGHTS.find((i) => i.id === insightId);
    if (!insight) return;
    openModal({
      title: "Deploy guidance",
      bodyHtml: `<p>${insight.primaryLabel} for <strong>${insight.flow}</strong>?</p><p>${insight.action}</p>`,
      actionsHtml: `
        <button class="pill-btn" type="button" id="deployCancelBtn">Cancel</button>
        <button class="pill-btn primary" type="button" id="deployConfirmBtn">Confirm &amp; deploy</button>
      `,
    });
    document.getElementById("deployCancelBtn").addEventListener("click", closeModal);
    document.getElementById("deployConfirmBtn").addEventListener("click", () => {
      insight.deployed = true;
      const existingGuidance = GUIDANCE.find((g) => g.flow === insight.flow);
      if (existingGuidance) {
        existingGuidance.status = "published";
      } else {
        GUIDANCE.unshift({
          id: `g${Date.now()}`,
          title: insight.action,
          flow: insight.flow,
          status: "published",
        });
      }
      renderAll();
      closeModal();
      showToast(`Guidance deployed to ${insight.flow}.`);
    });
  }

  /* ============================================================
   * Global click delegation — covers every view + header + modal
   * ============================================================ */

  document.addEventListener("click", (e) => {
    const dropdownWrap = e.target.closest(".dropdown-wrap");
    if (!dropdownWrap) closeDropdowns();

    const navTarget = e.target.closest("[data-nav]");
    if (navTarget) {
      location.hash = `#${navTarget.dataset.nav}`;
      const scrollId = navTarget.dataset.scroll;
      if (scrollId) {
        setTimeout(() => {
          const el = document.getElementById(scrollId);
          if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
        }, 50);
      }
      closeDropdowns();
      return;
    }

    const actionEl = e.target.closest("[data-action]");
    if (!actionEl) return;
    const { action, id } = actionEl.dataset;
    closeDropdowns();

    switch (action) {
      case "dismiss-insight": {
        const insight = INSIGHTS.find((i) => i.id === id);
        if (insight) insight.dismissed = true;
        renderAll();
        showToast("Insight dismissed.");
        break;
      }
      case "deploy-insight":
        openDeployModal(id);
        break;
      case "open-storyboard":
        openStoryboardModal(id);
        break;
      case "goto-insight": {
        closeModal();
        location.hash = "#insights";
        showToast("Jumped to the related insight.");
        break;
      }
      case "toggle-pin": {
        const item = PINNED.find((p) => p.id === id);
        if (item) item.pinned = !item.pinned;
        renderAll();
        break;
      }
      case "preview-dashboard":
        openDashboardModal(id);
        break;
      case "open-alert":
        openAlertModal(id);
        break;
      case "toggle-alert": {
        const alert = AGENT_ALERTS.find((a) => a.id === id);
        if (alert) alert.active = !alert.active;
        renderAll();
        closeModal();
        showToast(alert.active ? "Alert resumed." : "Alert paused.");
        break;
      }
      case "toggle-guidance": {
        const g = GUIDANCE.find((x) => x.id === id);
        if (g) g.status = g.status === "published" ? "draft" : "published";
        renderAll();
        showToast(g.status === "published" ? "Guidance published." : "Guidance moved to draft.");
        break;
      }
      case "ask-pin": {
        if (!askState) break;
        const summary = summarizeForPin(askState.spec);
        PINNED.unshift({
          id: `p-ask-${Date.now()}`,
          name: summary.name,
          meta: "Pinned from an Ask Whatfix AI answer",
          points: TREND_POINTS[summary.trend],
          status: summary.status,
          statusLabel: summary.statusLabel,
          pinned: true,
        });
        renderAll();
        showToast(`Pinned "${summary.name}" to your watchlist.`);
        break;
      }
      case "ask-build-dashboard": {
        if (!askState) break;
        const title = askState.rawQuery.length > 60 ? `${askState.rawQuery.slice(0, 57)}...` : askState.rawQuery;
        DASHBOARDS.unshift({
          id: `d-ask-${Date.now()}`,
          title,
          author: "Whatfix AI",
          updated: "just now",
          comments: 0,
          generated: true,
          spec: askState.spec,
        });
        renderAll();
        showToast("Dashboard created from the generated answer.");
        location.hash = "#dashboards";
        break;
      }
      case "ask-activate-alert": {
        if (!askState) break;
        const { prompt, logic, remediation } = askState.spec.data;
        AGENT_ALERTS.unshift({
          id: `a-ask-${Date.now()}`,
          prompt,
          meta: "just activated",
          status: "good",
          statusLabel: "New",
          active: true,
          logic,
          remediation,
        });
        renderAll();
        const mount = document.getElementById("genComponents");
        if (mount) mount.innerHTML = renderAlertHTML(askState.spec.data, true);
        showToast("Alert activated — find it under Agent alerts.");
        break;
      }
      default:
        break;
    }
  });

  /* ============================================================
   * Header: alerts dropdown, avatar dropdown
   * ============================================================ */

  const alertsBtn = document.getElementById("alertsBtn");
  const alertsPanel = document.getElementById("alertsPanel");
  const avatarBtn = document.getElementById("avatarBtn");
  const avatarPanel = document.getElementById("avatarPanel");

  function toggleDropdown(btn, panel) {
    const isHidden = panel.classList.contains("hidden");
    closeDropdowns();
    if (isHidden) {
      panel.classList.remove("hidden");
      btn.setAttribute("aria-expanded", "true");
    }
  }

  alertsBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    toggleDropdown(alertsBtn, alertsPanel);
  });

  avatarBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    toggleDropdown(avatarBtn, avatarPanel);
  });

  avatarPanel.addEventListener("click", (e) => {
    const item = e.target.closest(".dropdown-item");
    if (!item) return;
    closeDropdowns();
    showToast("Not wired up in this prototype yet.");
  });

  /* ============================================================
   * Ask Whatfix AI
   * ============================================================ */

  const askForm = document.getElementById("askAiForm");
  const askInput = document.getElementById("askAiInput");
  const askResponse = document.getElementById("askAiResponse");
  const askChips = document.getElementById("askAiChips");
  const agentModeToggle = document.getElementById("agentModeToggle");

  // ---- Datasets the generated components are composed from ----
  const REGION_COMPARISON_DATA = {
    entities: [
      { id: "NA", label: "North America", colorVar: "--series-1" },
      { id: "EU", label: "Europe", colorVar: "--series-2" },
      { id: "APAC", label: "APAC", colorVar: "--series-3" },
    ],
    periods: {
      "this-quarter": { label: "This quarter", values: { NA: 81, EU: 74, APAC: 58 } },
      "last-quarter": { label: "Last quarter", values: { NA: 77, EU: 70, APAC: 63 } },
    },
    unit: "%",
  };

  const CHECKOUT_FUNNEL_DATA = {
    flow: "Checkout flow · EU",
    steps: [
      { name: "Start checkout", pct: 100 },
      { name: "Enter payment details", pct: 89 },
      { name: "3-D Secure redirect", pct: 80 },
      { name: "Authentication success", pct: 71 },
      { name: "Order confirmed", pct: 70 },
    ],
  };

  const HEALTH_STAT_DATA = {
    tiles: [
      { label: "Weekly active users", value: "4,812", delta: "▲ 8.4% vs last week", good: true },
      { label: "Adoption rate · Core flows", value: "76.2%", delta: "▲ 2.1 pts vs last week", good: true },
    ],
  };

  function defaultStatData(query) {
    return { tiles: [{ label: `Overall adoption trend for "${query}"`, value: "76.2%", delta: "▲ 2.1 pts vs last week", good: true }] };
  }

  // ---- Query → response spec. This is the "generative" part: the
  // shape of the UI is chosen per query, not one fixed template. ----
  function buildIntentSpec(rawQuery, agentMode) {
    const q = rawQuery.trim().toLowerCase();

    if (agentMode) {
      return {
        type: "alert",
        headline: "Alert configured",
        narrative: `I'll turn that into a live monitor instead of a one-off answer.`,
        data: {
          prompt: rawQuery,
          logic: `Watches the metric implied by "${rawQuery}" on a rolling daily window and compares it against its own trailing baseline.`,
          remediation: "Notify you here and suggest a remediation nudge the moment it crosses the threshold.",
        },
      };
    }

    if (q.includes("compare") && (q.includes("region") || q.includes("regions"))) {
      return {
        type: "comparison",
        headline: "Dashboard ready",
        narrative:
          "North America and Europe are trending up this quarter; APAC is the one lagging, pulled down by the Bulk Export decline. Use the controls below to slice by period or region.",
        data: REGION_COMPARISON_DATA,
      };
    }

    if (q.includes("struggl") || q.includes("drop") || q.includes("checkout")) {
      return {
        type: "funnel",
        headline: "Answer",
        narrative:
          "Users are dropping off most between payment entry and 3-D Secure authentication. The reworded tooltip on Step 3 already lifted completion 12% WoW — Authentication is the next place to intervene.",
        data: CHECKOUT_FUNNEL_DATA,
      };
    }

    if (q.includes("healthy") || (q.includes("adoption") && q.includes("week"))) {
      return {
        type: "stat",
        headline: "Answer",
        narrative:
          "Yes — overall adoption is up WoW across both headline metrics. APAC's Bulk Export flow is the one soft spot worth a closer look.",
        data: HEALTH_STAT_DATA,
      };
    }

    if (q.includes("notify me") || q.includes("alert me") || q.includes("tell me when")) {
      return {
        type: "alert",
        headline: "Alert created",
        narrative: "Got it — I'll monitor this and suggest a remediation nudge if it fires.",
        data: {
          prompt: rawQuery,
          logic: `Monitors the condition in "${rawQuery}" on a rolling window and fires once it's sustained for the stated period.`,
          remediation: "Send a nudge to the relevant team and flag the flow owner for follow-up.",
        },
      };
    }

    return {
      type: "default",
      headline: "Answer",
      narrative: `Here's what I found for "${rawQuery}": adoption trends look broadly healthy this week, with one flow (Bulk Export, APAC) worth a closer look.`,
      data: defaultStatData(rawQuery),
    };
  }

  function followupsForSpec(spec) {
    switch (spec.type) {
      case "comparison":
        return ["Why is APAC behind?", "Add EMEA breakdown", "Pin recommended metrics"];
      case "funnel":
        return ["Show the Onboarding funnel too", "Compare to last quarter", "Which guidance fixed Step 3?"];
      case "alert":
        return ["Adjust the threshold", "Show similar alerts"];
      case "stat":
        return ["Why is Bulk Export down in APAC?", "Show this by region"];
      default:
        return ["Build a dashboard from this", "Set an alert for this"];
    }
  }

  let askState = null;

  function renderResponse(query) {
    const spec = buildIntentSpec(query, agentModeToggle.checked);
    askState = { spec, rawQuery: query };

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // Phase 1 — skeleton. The response "streams in" rather than
    // popping in whole, same as a real generated UI resolving.
    askResponse.innerHTML = `
      <div class="ask-ai-response-header">✦ Thinking…</div>
      <div class="gen-skel-line w-60" style="margin-bottom:8px;"></div>
      <div class="gen-skel-line w-40" style="margin-bottom:14px;"></div>
      <div class="gen-skel-block"></div>
    `;
    askResponse.classList.remove("hidden");

    setTimeout(
      () => {
        if (!askState || askState.rawQuery !== query) return; // a newer query superseded this one
        const actionsHtml =
          spec.type === "alert"
            ? ""
            : `
          <div class="ask-ai-actions">
            <button type="button" class="pill-btn primary small" data-action="ask-pin">Pin this</button>
            <button type="button" class="pill-btn small" data-action="ask-build-dashboard">Build dashboard</button>
          </div>
        `;

        askResponse.innerHTML = `
          <div class="ask-ai-response-header">✦ ${spec.headline}</div>
          <p class="gen-narrative">${spec.narrative}</p>
          <div id="genComponents" class="gen-components"></div>
          <div class="ask-ai-followups">
            ${followupsForSpec(spec)
              .map((f) => `<button type="button" class="chip">${f}</button>`)
              .join("")}
          </div>
          ${actionsHtml}
        `;

        const mount = document.getElementById("genComponents");
        if (spec.type === "alert") {
          mount.innerHTML = renderAlertHTML(spec.data, false);
        } else {
          mountGeneratedComponent(mount, spec);
        }
      },
      reduceMotion ? 0 : 480
    );
  }

  askForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const query = askInput.value.trim();
    if (!query) return;
    renderResponse(query);
  });

  askChips.addEventListener("click", (e) => {
    const chip = e.target.closest(".chip");
    if (!chip) return;
    const prompt = chip.dataset.prompt;
    askInput.value = prompt;
    renderResponse(prompt);
  });

  askResponse.addEventListener("click", (e) => {
    const chip = e.target.closest(".chip");
    if (!chip || chip.closest("[data-control]")) return;
    askInput.value = chip.textContent;
    renderResponse(chip.textContent);
  });

  /* ============================================================
   * Misc buttons
   * ============================================================ */

  document.getElementById("pinMetricBtn").addEventListener("click", openPinMetricModal);

  document.getElementById("createAlertBtn").addEventListener("click", () => {
    location.hash = "#overview";
    agentModeToggle.checked = true;
    askInput.placeholder = "e.g. Notify me if EU adoption drops below 60%";
    setTimeout(() => {
      askInput.scrollIntoView({ behavior: "smooth", block: "center" });
      askInput.focus();
    }, 50);
  });

  document.getElementById("newDashboardBtn").addEventListener("click", () => {
    location.hash = "#overview";
    setTimeout(() => {
      askInput.placeholder = "e.g. Build a dashboard comparing this month vs last";
      askInput.scrollIntoView({ behavior: "smooth", block: "center" });
      askInput.focus();
    }, 50);
  });

  const refreshBtn = document.getElementById("refreshBriefBtn");
  refreshBtn.addEventListener("click", () => {
    refreshBtn.textContent = "↻ Refreshing…";
    refreshBtn.disabled = true;
    setTimeout(() => {
      refreshBtn.textContent = "↻ Refresh";
      refreshBtn.disabled = false;
      showToast("Brief refreshed — no new changes since last check.");
    }, 800);
  });

  /* ============================================================
   * Boot
   * ============================================================ */

  renderAll();
  route();
})();
