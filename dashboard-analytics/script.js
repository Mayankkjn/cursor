const dom = {
  title: document.getElementById("dashboardTitle"),
  desc: document.getElementById("dashboardDesc"),
  closeBtn: document.getElementById("closeBtn"),
  saveBtn: document.getElementById("saveBtn"),
  content: document.querySelector(".content"),
  builder: document.getElementById("builder"),
  canvas: document.getElementById("canvas"),
  generatingState: document.getElementById("generatingState"),
  promptForm: document.getElementById("promptForm"),
  promptInput: document.getElementById("promptInput"),
  suggestions: document.getElementById("suggestions"),
  moreChip: document.getElementById("moreChip"),
  existingInsightBtn: document.getElementById("existingInsightBtn"),
  newInsightBtn: document.getElementById("newInsightBtn"),
  addTextBtn: document.getElementById("addTextBtn"),
  toast: document.getElementById("toast"),

  builderHeading: document.getElementById("builderHeading"),
  builderActions: document.getElementById("builderActions"),
  conversationHeading: document.getElementById("conversationHeading"),
  conversationActions: document.getElementById("conversationActions"),
  conversationTitle: document.getElementById("conversationTitle"),
  backBtn: document.getElementById("backBtn"),
  renameBtn: document.getElementById("renameBtn"),
  shareBtn: document.getElementById("shareBtn"),
  moreBtn: document.getElementById("moreBtn"),

  conversation: document.getElementById("conversation"),
  chatLog: document.getElementById("chatLog"),
  chatForm: document.getElementById("chatForm"),
  chatInput: document.getElementById("chatInput"),
  chatSendBtn: document.getElementById("chatSendBtn"),

  copilotToggle: document.getElementById("copilotToggle"),
  copilotPanel: document.getElementById("copilotPanel"),
  copilotLog: document.getElementById("copilotLog"),
  copilotForm: document.getElementById("copilotForm"),
  copilotInput: document.getElementById("copilotInput"),
  copilotCloseBtn: document.getElementById("copilotCloseBtn"),
  copilotExpandBtn: document.getElementById("copilotExpandBtn"),
  copilotMoreBtn: document.getElementById("copilotMoreBtn"),
  copilotAttachBtn: document.getElementById("copilotAttachBtn"),
};

const extraSuggestions = ["Compare usage across segments", "Understand where users drop off", "Track flow completion rates"];

const QUESTIONS = [
  {
    title: "What is your goal?",
    summaryLabel: "Selected goal",
    options: [
      { key: "A", label: "To track usage and find areas of improvement" },
      { key: "B", label: "To collect data for quarterly review" },
      { key: "C", label: "Mention any other goal...", freeText: true },
    ],
  },
  {
    title: "Who is this dashboard for?",
    summaryLabel: "Audience",
    options: [
      { key: "A", label: "Product & growth team" },
      { key: "B", label: "Leadership & executives" },
      { key: "C", label: "Mention who else this is for...", freeText: true },
    ],
  },
  {
    title: "What time range should it cover?",
    summaryLabel: "Date range",
    options: [
      { key: "A", label: "Last 30 days" },
      { key: "B", label: "Last quarter" },
      { key: "C", label: "Mention a custom range...", freeText: true },
    ],
  },
];

const conversation = {
  promptText: "",
  questionIndex: 0,
  answers: [],
};

let toastTimer = null;
function showToast(message) {
  dom.toast.textContent = message;
  dom.toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => dom.toast.classList.remove("show"), 2200);
}

function widgetTemplate(label) {
  const bars = Array.from({ length: 8 }, () => `<span style="height:${20 + Math.random() * 80}%"></span>`).join("");
  return `
    <div class="widget">
      <h3>${label}</h3>
      <div class="widget-value">${(Math.random() * 90 + 10).toFixed(1)}%</div>
      <div class="widget-bars">${bars}</div>
    </div>
  `;
}

const TREND_ICON_SVG = `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4 16 10 10l4 4 6-7" stroke-linecap="round" stroke-linejoin="round" /><path d="M15 7h5v5" stroke-linecap="round" stroke-linejoin="round" /></svg>`;
const INFO_ICON_SVG = `<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="1.6"><circle cx="12" cy="12" r="9" /><path d="M12 11v5.5M12 8v.01" stroke-linecap="round" /></svg>`;
const KEBAB_ICON_SVG = `<svg viewBox="0 0 24 24" width="13" height="13" fill="currentColor"><circle cx="12" cy="5.5" r="1.5" /><circle cx="12" cy="12" r="1.5" /><circle cx="12" cy="18.5" r="1.5" /></svg>`;

function randomInt(min, max) {
  return Math.floor(min + Math.random() * (max - min + 1));
}

function randomSeries(points, min, max) {
  return Array.from({ length: points }, () => randomInt(min, max));
}

function lineChartSVG(series, xLabels) {
  const width = 460;
  const height = 150;
  const padLeft = 26;
  const padRight = 8;
  const padTop = 8;
  const padBottom = 20;
  const plotWidth = width - padLeft - padRight;
  const plotHeight = height - padTop - padBottom;
  const maxVal = 100;

  const toPath = (data) =>
    data
      .map((value, index) => {
        const x = padLeft + (index / (data.length - 1)) * plotWidth;
        const y = padTop + plotHeight - (value / maxVal) * plotHeight;
        return `${index === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(" ");

  const gridLines = [0, 50, 100]
    .map((value) => {
      const y = padTop + plotHeight - (value / maxVal) * plotHeight;
      return `
        <line x1="${padLeft}" x2="${width - padRight}" y1="${y.toFixed(1)}" y2="${y.toFixed(1)}" stroke="var(--border)" stroke-width="1" />
        <text x="${padLeft - 8}" y="${(y + 3.5).toFixed(1)}" font-size="10" fill="currentColor" text-anchor="end">${value}</text>
      `;
    })
    .join("");

  const xTicks = xLabels
    .map((label, index) => {
      const x = padLeft + (index / (xLabels.length - 1)) * plotWidth;
      const anchor = index === 0 ? "start" : index === xLabels.length - 1 ? "end" : "middle";
      return `<text x="${x.toFixed(1)}" y="${height - 3}" font-size="10" fill="currentColor" text-anchor="${anchor}">${label}</text>`;
    })
    .join("");

  const paths = series
    .map((s) => `<path d="${toPath(s.data)}" fill="none" stroke="${s.color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />`)
    .join("");

  return `<svg class="trend-chart" viewBox="0 0 ${width} ${height}" role="img" aria-label="Trend chart">${gridLines}${paths}${xTicks}</svg>`;
}

function widgetHeaderHtml(title) {
  return `
    <div class="widget-card-header">
      <span class="widget-icon">${TREND_ICON_SVG}</span>
      <h3>${title}</h3>
      <span class="widget-card-actions">
        <button type="button" class="widget-icon-btn" aria-label="Info">${INFO_ICON_SVG}</button>
        <button type="button" class="widget-icon-btn" aria-label="More options">${KEBAB_ICON_SVG}</button>
      </span>
    </div>
  `;
}

function statCardTemplate({ title, legendColor, legendLabel, value }) {
  return `
    <div class="widget stat-card">
      ${widgetHeaderHtml(title)}
      <p class="widget-subtitle">Last 30 days &bull; Measured weekly</p>
      <div class="widget-legend"><span class="legend-dot" style="background:${legendColor}"></span>${legendLabel}</div>
      <div class="widget-big-number">${value}</div>
      <div class="widget-caption">Total events</div>
    </div>
  `;
}

function chartCardTemplate({ title, stats, series, xLabels }) {
  const statsHtml = stats
    .map(
      (s) => `
        <div class="chart-stat">
          <span class="chart-stat-value">${s.value}</span>
          <span class="chart-stat-change ${s.trend}">${s.trend === "up" ? "↗" : "↘"} ${s.change}%</span>
          <span class="chart-stat-label">${s.label}</span>
        </div>
      `,
    )
    .join("");

  const legendHtml = series
    .map((s) => `<span><span class="legend-dot" style="background:${s.color}"></span>${s.name}</span>`)
    .join("");

  return `
    <div class="widget chart-card">
      ${widgetHeaderHtml(title)}
      <p class="widget-subtitle">Last 30 days &bull; Measured weekly</p>
      <div class="chart-stats-row">${statsHtml}</div>
      ${lineChartSVG(series, xLabels)}
      <div class="chart-legend-row">${legendHtml}</div>
    </div>
  `;
}

function buildDashboardData(promptText) {
  const text = promptText.toLowerCase();
  let noun;
  if (text.includes("adopt") || text.includes("feature")) noun = "feature";
  else if (text.includes("usage") || text.includes("product")) noun = "session";
  else if (text.includes("content") || text.includes("performance")) noun = "content view";
  else noun = "action";
  const Noun = noun.charAt(0).toUpperCase() + noun.slice(1);
  const changeUp = () => (Math.random() * 15 + 5).toFixed(2);
  const changeDown = () => (Math.random() * 6 + 1).toFixed(2);
  const xLabels = ["Day 1", "Day 10", "Day 20", "Day 30"];

  return {
    sectionTitle: `${Noun} start vs completion trend`,
    sectionSubtitle: `This section shows how ${noun}s have been initiated and completed by various user roles within your product`,
    xLabels,
    statCards: [
      { title: `Total ${noun}s started`, legendColor: "#3b82f6", legendLabel: `${Noun}-Start`, value: randomInt(280, 420) },
      { title: `Total ${noun}s completed`, legendColor: "#f97316", legendLabel: `${Noun}-Finish`, value: randomInt(150, 280) },
      { title: `Total ${noun}s overdue`, legendColor: "#eab308", legendLabel: `Overdue ${Noun}`, value: randomInt(40, 140) },
    ],
    chartCards: [
      {
        title: `${Noun} completion trend`,
        stats: [
          { value: randomInt(700, 1100), trend: "up", change: changeUp(), label: "Total events" },
          { value: randomInt(80, 150), trend: "down", change: changeDown(), label: "Monthly avg" },
        ],
        series: [{ name: `${Noun} initiated`, color: "#3b82f6", data: randomSeries(10, 20, 95) }],
      },
      {
        title: `${Noun} trend - started vs completed`,
        stats: [
          { value: randomInt(400, 650), trend: "up", change: changeUp(), label: "Total events" },
          { value: randomInt(80, 150), trend: "down", change: changeDown(), label: "Monthly avg" },
        ],
        series: [
          { name: `${Noun}-Start`, color: "#3b82f6", data: randomSeries(10, 20, 95) },
          { name: `${Noun}-Finish`, color: "#f97316", data: randomSeries(10, 15, 85) },
        ],
      },
      {
        title: `${Noun} completed by persona`,
        stats: [
          { value: randomInt(400, 650), trend: "up", change: changeUp(), label: "Total events" },
          { value: randomInt(80, 150), trend: "down", change: changeDown(), label: "Monthly avg" },
        ],
        series: [{ name: `${Noun} completed`, color: "#3b82f6", data: randomSeries(10, 20, 95) }],
      },
    ],
  };
}

function renderGeneratedDashboard(promptText) {
  const data = buildDashboardData(promptText);

  const toolbarHtml = `
    <div class="dashboard-toolbar">
      <button type="button" class="toolbar-dropdown">
        Daily
        <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2"><path d="m6 9 6 6 6-6" stroke-linecap="round" stroke-linejoin="round" /></svg>
      </button>
      <div class="segmented">
        <button type="button" class="seg-btn" data-range="default">Default</button>
        <button type="button" class="seg-btn" data-range="7d">7D</button>
        <button type="button" class="seg-btn active" data-range="30d">30D</button>
        <button type="button" class="seg-btn" data-range="90d">90D</button>
      </div>
      <button type="button" class="toolbar-date">
        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.7"><rect x="3.5" y="4.5" width="17" height="16" rx="2" /><path d="M3.5 9.5h17M8 3v3M16 3v3" stroke-linecap="round" /></svg>
        <span id="dateRangeLabel">Last 30 days</span>
      </button>
      <button type="button" class="toolbar-filter">
        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M4 5h16l-6 7.5V19l-4 2v-8.5Z" stroke-linejoin="round" /></svg>
        Filter
      </button>
    </div>
  `;

  const headerHtml = `
    <div class="dashboard-section-header">
      <h3>${data.sectionTitle}</h3>
      <p>${data.sectionSubtitle}</p>
    </div>
  `;

  const statRowHtml = `<div class="stat-row">${data.statCards.map(statCardTemplate).join("")}</div>`;
  const chartRowHtml = `<div class="chart-row">${data.chartCards
    .map((card) => chartCardTemplate({ ...card, xLabels: data.xLabels }))
    .join("")}</div>`;

  dom.canvas.innerHTML = toolbarHtml + headerHtml + statRowHtml + chartRowHtml;
}

function ensureManualRow() {
  let row = document.getElementById("manualRow");
  if (!row) {
    row = document.createElement("div");
    row.id = "manualRow";
    row.className = "stat-row";
    dom.canvas.appendChild(row);
  }
  return row;
}

function assistantLineHtml(text) {
  return `
    <div class="assistant-line">
      <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M12 2.5c.7 2.9 1.4 4.4 2.4 5.5 1.1 1 2.6 1.7 5.1 2.3-2.5.6-4 1.3-5.1 2.3-1 1.1-1.7 2.6-2.4 5.4-.7-2.8-1.4-4.3-2.4-5.4-1.1-1-2.6-1.7-5.1-2.3 2.5-.6 4-1.3 5.1-2.3 1-1.1 1.7-2.6 2.4-5.5Z" /></svg>
      <p>${text}</p>
    </div>
  `;
}

function dashboardCardHtml(name) {
  return `
    <div class="dashboard-card">
      <span class="dc-icon">
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3.5" y="3.5" width="7" height="7" rx="1.2" /><rect x="13.5" y="3.5" width="7" height="7" rx="1.2" /><rect x="3.5" y="13.5" width="7" height="7" rx="1.2" /><rect x="13.5" y="13.5" width="7" height="7" rx="1.2" /></svg>
      </span>
      <span class="dc-text"><strong>${name}</strong><span>Dashboard</span></span>
    </div>
  `;
}

const FOLLOWUP_REPLIES = {
  "Summarise this dashboard":
    "Adoption is trending up about 12% week over week, with a dip over weekends and steady completion rates across teams.",
  "Breakdown by countries":
    "Top usage comes from the US, India, and the UK, together accounting for over 60% of tracked events this period.",
};

function digFurtherHtml() {
  const chips = Object.keys(FOLLOWUP_REPLIES)
    .map(
      (text) => `
        <button type="button" class="dig-chip" data-followup="${text}">
          ${text}
          <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2"><path d="M7 17 17 7M9 7h8v8" stroke-linecap="round" stroke-linejoin="round" /></svg>
        </button>
      `,
    )
    .join("");
  return `
    <div class="dig-further-label">
      <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M6 3.5h9l3.5 3.5V19a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4.5a1 1 0 0 1 1-1Z" stroke-linejoin="round" /><path d="M8 10h8M8 13.5h8M8 17h5" stroke-linecap="round" /></svg>
      Want to dig further?
    </div>
    ${chips}
  `;
}

function setMode(mode) {
  dom.builder.classList.toggle("hidden", mode !== "builder");
  dom.conversation.classList.toggle("hidden", mode !== "conversation");
  if (mode !== "result") {
    dom.generatingState.classList.add("hidden");
    dom.canvas.classList.add("hidden");
  }

  dom.builderHeading.classList.toggle("hidden", mode === "conversation");
  dom.builderActions.classList.toggle("hidden", mode === "conversation");
  dom.conversationHeading.classList.toggle("hidden", mode !== "conversation");
  dom.conversationActions.classList.toggle("hidden", mode !== "conversation");

  dom.content.classList.toggle("mode-conversation", mode === "conversation");
  dom.content.classList.toggle("mode-canvas", mode === "result");
}

function showResultStage(stage) {
  dom.generatingState.classList.toggle("hidden", stage !== "generating");
  dom.canvas.classList.toggle("hidden", stage !== "canvas");
}

function openCopilotPanel() {
  dom.copilotPanel.classList.add("open");
}

function closeCopilotPanel() {
  dom.copilotPanel.classList.remove("open", "wide");
}

function deriveTitle(promptText) {
  const text = promptText.toLowerCase();
  if (text.includes("adopt") || text.includes("feature")) return "Create new feature adoption trend";
  if (text.includes("usage") || text.includes("product")) return "Create new product usage trend";
  if (text.includes("content") || text.includes("performance")) return "Create new content performance trend";
  return "Create new opportunity trend";
}

function deriveDashboardName(promptText) {
  const text = promptText.toLowerCase();
  if (text.includes("adopt") || text.includes("feature")) return "Feature adoption dashboard";
  if (text.includes("usage") || text.includes("product")) return "Product usage dashboard";
  if (text.includes("content") || text.includes("performance")) return "Content performance dashboard";
  return "New dashboard";
}

function appendToLog(html) {
  dom.chatLog.insertAdjacentHTML("beforeend", html);
  dom.chatLog.scrollTop = dom.chatLog.scrollHeight;
}

function appendUserBubble(text) {
  appendToLog(`<div class="chat-bubble-user"><span>${text}</span></div>`);
}

function appendAssistantIntro() {
  appendToLog(`
    <div class="assistant-block">
      <button class="thinking-row" type="button" data-toggle-thinking>
        <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
          <path d="M12 2.5c.7 2.9 1.4 4.4 2.4 5.5 1.1 1 2.6 1.7 5.1 2.3-2.5.6-4 1.3-5.1 2.3-1 1.1-1.7 2.6-2.4 5.4-.7-2.8-1.4-4.3-2.4-5.4-1.1-1-2.6-1.7-5.1-2.3 2.5-.6 4-1.3 5.1-2.3 1-1.1 1.7-2.6 2.4-5.5Z" />
        </svg>
        Show thinking
        <svg class="chevron" viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2">
          <path d="m6 9 6 6 6-6" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
      </button>
      <p class="thinking-detail hidden">Analyzing your prompt to identify relevant metrics, data sources, and the audience for this dashboard...</p>
      <p class="assistant-text">Please answer few question to know more about the dashboard</p>
    </div>
  `);
}

function currentQuestion() {
  return QUESTIONS[conversation.questionIndex];
}

function isAnswerValid(answer) {
  return Boolean(answer && answer.label && answer.label.trim());
}

function renderQuestionOptions() {
  const question = currentQuestion();
  const answer = conversation.answers[conversation.questionIndex];

  const optionsHtml = question.options
    .map((option) => {
      const selected = answer && answer.key === option.key;
      if (option.freeText) {
        const value = selected ? answer.label : "";
        return `
          <label class="q-option q-option-text ${selected ? "selected" : ""}" data-key="${option.key}">
            <span class="q-badge">${option.key}</span>
            <input type="text" placeholder="${option.label}" value="${value}" />
          </label>
        `;
      }
      return `
        <button type="button" class="q-option ${selected ? "selected" : ""}" data-key="${option.key}">
          <span class="q-badge">${option.key}</span>
          <span>${option.label}</span>
        </button>
      `;
    })
    .join("");

  document.getElementById("questionOptions").innerHTML = optionsHtml;
  updateContinueState();
}

function updateContinueState() {
  const answer = conversation.answers[conversation.questionIndex];
  document.getElementById("continueBtn").disabled = !isAnswerValid(answer);
  document.getElementById("qPrev").disabled = conversation.questionIndex === 0;
}

function renderQuestionCard() {
  const question = currentQuestion();
  const existing = document.getElementById("questionCard");
  if (existing) existing.remove();

  appendToLog(`
    <div class="question-card" id="questionCard">
      <div class="question-card-header">
        <span class="q-icon">
          <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="1.6">
            <path d="M6 3.5h9l3.5 3.5V19a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4.5a1 1 0 0 1 1-1Z" stroke-linejoin="round" />
            <path d="M8 10h8M8 13.5h8M8 17h5" stroke-linecap="round" />
          </svg>
        </span>
        <h3 id="questionTitle">${question.title}</h3>
        <div class="q-pager">
          <button id="qPrev" class="q-pager-btn" type="button" aria-label="Previous question">
            <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.2">
              <path d="m6 15 6-6 6 6" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
          </button>
          <span id="qCount">${conversation.questionIndex + 1} of ${QUESTIONS.length}</span>
          <button id="qNext" class="q-pager-btn" type="button" aria-label="Next question">
            <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.2">
              <path d="m6 9 6 6 6-6" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
          </button>
        </div>
      </div>
      <div class="question-options" id="questionOptions"></div>
      <div class="question-card-footer">
        <button id="continueBtn" class="btn btn-primary" type="button">Continue</button>
      </div>
    </div>
  `);

  renderQuestionOptions();
  dom.chatLog.scrollTop = dom.chatLog.scrollHeight;
}

function selectOption(key, label) {
  conversation.answers[conversation.questionIndex] = { key, label };
  renderQuestionOptions();
}

function advanceQuestion() {
  const answer = conversation.answers[conversation.questionIndex];
  if (!isAnswerValid(answer)) {
    return;
  }
  if (conversation.questionIndex < QUESTIONS.length - 1) {
    conversation.questionIndex += 1;
    renderQuestionCard();
  } else {
    finishConversation();
  }
}

function buildSummaryHtml() {
  const items = QUESTIONS.map((question, index) => {
    const answer = conversation.answers[index];
    return `<li>${question.summaryLabel}: <strong>${answer.label}</strong></li>`;
  }).join("");
  return `<div class="summary-card"><ol>${items}</ol></div>`;
}

function finishConversation() {
  const dashboardName = deriveDashboardName(conversation.promptText);

  // Dock the conversation into the "Ask Whatfix AI" copilot panel so the
  // dashboard workspace is free to show generation progress.
  dom.copilotLog.innerHTML = `
    <div class="chat-bubble-user"><span>${conversation.promptText}</span></div>
    ${assistantLineHtml("Please answer few question to know more about the dashboard")}
    ${buildSummaryHtml()}
    <div class="building-row" id="buildingRow">
      <svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor">
        <path d="M12 2.5c.7 2.9 1.4 4.4 2.4 5.5 1.1 1 2.6 1.7 5.1 2.3-2.5.6-4 1.3-5.1 2.3-1 1.1-1.7 2.6-2.4 5.4-.7-2.8-1.4-4.3-2.4-5.4-1.1-1-2.6-1.7-5.1-2.3 2.5-.6 4-1.3 5.1-2.3 1-1.1 1.7-2.6 2.4-5.5Z" />
      </svg>
      Building your dashboard...
    </div>
    <div class="skeleton-bars" id="skeletonBars">
      <div class="skeleton-bar"></div>
      <div class="skeleton-bar"></div>
      <div class="skeleton-bar"></div>
    </div>
  `;

  dom.title.textContent = dashboardName;
  if (!dom.desc.textContent.trim()) {
    dom.desc.textContent = conversation.promptText;
  }

  setMode("result");
  showResultStage("generating");
  openCopilotPanel();

  setTimeout(() => {
    showResultStage("canvas");
    renderGeneratedDashboard(conversation.promptText);

    const buildingRow = document.getElementById("buildingRow");
    if (buildingRow) buildingRow.remove();
    const skeletonBars = document.getElementById("skeletonBars");
    if (skeletonBars) skeletonBars.remove();

    dom.copilotLog.insertAdjacentHTML(
      "beforeend",
      assistantLineHtml("Your dashboard has been generated.") + dashboardCardHtml(dashboardName) + digFurtherHtml(),
    );
    dom.copilotLog.scrollTop = dom.copilotLog.scrollHeight;

    showToast("Dashboard generated from your prompt");
  }, 1400);
}

function startConversation(promptText) {
  conversation.promptText = promptText;
  conversation.questionIndex = 0;
  conversation.answers = [];

  dom.conversationTitle.textContent = deriveTitle(promptText);
  dom.chatLog.innerHTML = "";
  dom.chatForm.classList.remove("hidden");
  document.querySelector(".chat-disclaimer").classList.remove("hidden");
  dom.chatInput.value = "";
  closeCopilotPanel();
  dom.copilotLog.innerHTML = "";

  setMode("conversation");
  appendUserBubble(promptText);
  appendAssistantIntro();
  renderQuestionCard();
}

dom.promptForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const value = dom.promptInput.value.trim();
  if (!value) return;
  startConversation(value);
});

dom.suggestions.addEventListener("click", (event) => {
  const chip = event.target.closest(".chip");
  if (!chip || chip === dom.moreChip) return;
  startConversation(chip.dataset.prompt);
});

dom.moreChip.addEventListener("click", () => {
  if (dom.moreChip.dataset.expanded === "true") return;
  dom.moreChip.dataset.expanded = "true";
  extraSuggestions.forEach((text) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "chip";
    button.dataset.prompt = text;
    button.innerHTML = `${text}
      <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M7 17 17 7M9 7h8v8" stroke-linecap="round" stroke-linejoin="round" />
      </svg>`;
    dom.moreChip.insertAdjacentElement("beforebegin", button);
  });
  dom.moreChip.remove();
});

dom.chatLog.addEventListener("click", (event) => {
  const thinkingRow = event.target.closest("[data-toggle-thinking]");
  if (thinkingRow) {
    thinkingRow.classList.toggle("expanded");
    thinkingRow.nextElementSibling.classList.toggle("hidden");
    return;
  }

  const option = event.target.closest(".q-option:not(.q-option-text)");
  if (option) {
    selectOption(option.dataset.key, currentQuestion().options.find((o) => o.key === option.dataset.key).label);
    return;
  }

  if (event.target.id === "continueBtn" || event.target.closest("#continueBtn")) {
    advanceQuestion();
    return;
  }

  if (event.target.id === "qNext" || event.target.closest("#qNext")) {
    advanceQuestion();
    return;
  }

  if (event.target.id === "qPrev" || event.target.closest("#qPrev")) {
    if (conversation.questionIndex > 0) {
      conversation.questionIndex -= 1;
      renderQuestionCard();
    }
  }
});

dom.chatLog.addEventListener("input", (event) => {
  const input = event.target.closest(".q-option-text input");
  if (!input) return;
  const key = input.closest(".q-option-text").dataset.key;
  conversation.answers[conversation.questionIndex] = { key, label: input.value };
  updateContinueState();
  input.closest(".q-option-text").classList.toggle("selected", input.value.trim().length > 0);
});

dom.chatForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const value = dom.chatInput.value.trim();
  if (!value) return;
  appendUserBubble(value);
  const freeTextOption = currentQuestion().options.find((o) => o.freeText);
  conversation.answers[conversation.questionIndex] = { key: freeTextOption.key, label: value };
  dom.chatInput.value = "";
  advanceQuestion();
});

dom.backBtn.addEventListener("click", () => {
  setMode("builder");
  dom.canvas.innerHTML = "";
  dom.chatLog.innerHTML = "";
  dom.promptInput.value = "";
  closeCopilotPanel();
  dom.copilotLog.innerHTML = "";
});

dom.renameBtn.addEventListener("click", () => {
  dom.conversationTitle.focus();
});

dom.shareBtn.addEventListener("click", () => {
  showToast("Link copied to clipboard");
});

dom.moreBtn.addEventListener("click", () => {
  showToast("More options coming soon");
});

dom.existingInsightBtn.addEventListener("click", () => {
  showToast("Select an existing insight to add it here");
});

dom.newInsightBtn.addEventListener("click", () => {
  setMode("result");
  showResultStage("canvas");
  ensureManualRow().insertAdjacentHTML("beforeend", widgetTemplate("New insight"));
  showToast("New insight added");
});

dom.addTextBtn.addEventListener("click", () => {
  setMode("result");
  showResultStage("canvas");
  ensureManualRow().insertAdjacentHTML(
    "beforeend",
    `<div class="widget text-widget"><textarea placeholder="Add a note or heading..."></textarea></div>`,
  );
  showToast("Text block added");
});

dom.canvas.addEventListener("click", (event) => {
  const seg = event.target.closest(".seg-btn");
  if (seg) {
    seg.parentElement.querySelectorAll(".seg-btn").forEach((btn) => btn.classList.remove("active"));
    seg.classList.add("active");
    const labelMap = { default: "Custom range", "7d": "Last 7 days", "30d": "Last 30 days", "90d": "Last 90 days" };
    const label = document.getElementById("dateRangeLabel");
    if (label) label.textContent = labelMap[seg.dataset.range] || "Last 30 days";
    return;
  }

  if (event.target.closest(".toolbar-date, .toolbar-filter, .toolbar-dropdown, .widget-icon-btn")) {
    showToast("Coming soon");
  }
});

dom.copilotLog.addEventListener("click", (event) => {
  const chip = event.target.closest(".dig-chip");
  if (!chip) return;
  const question = chip.dataset.followup;
  dom.copilotLog.insertAdjacentHTML(
    "beforeend",
    `<div class="chat-bubble-user"><span>${question}</span></div>${assistantLineHtml(FOLLOWUP_REPLIES[question] || "Let me look into that.")}`,
  );
  dom.copilotLog.scrollTop = dom.copilotLog.scrollHeight;
});

dom.saveBtn.addEventListener("click", () => {
  showToast("Dashboard saved");
});

dom.closeBtn.addEventListener("click", () => {
  showToast("Draft discarded");
});

dom.copilotToggle.addEventListener("click", () => {
  dom.copilotPanel.classList.toggle("open");
});

dom.copilotCloseBtn.addEventListener("click", () => {
  closeCopilotPanel();
});

dom.copilotExpandBtn.addEventListener("click", () => {
  dom.copilotPanel.classList.toggle("wide");
});

dom.copilotMoreBtn.addEventListener("click", () => {
  showToast("More options coming soon");
});

dom.copilotAttachBtn.addEventListener("click", () => {
  showToast("Attachments coming soon");
});

dom.copilotForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const value = dom.copilotInput.value.trim();
  if (!value) return;
  dom.copilotLog.insertAdjacentHTML(
    "beforeend",
    `<div class="chat-bubble-user"><span>${value}</span></div><p class="assistant-text">Got it — I'll factor that into the dashboard.</p>`,
  );
  dom.copilotLog.scrollTop = dom.copilotLog.scrollHeight;
  dom.copilotInput.value = "";
});

[dom.title, dom.desc, dom.conversationTitle].forEach((el) => {
  el.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      el.blur();
    }
  });
});
