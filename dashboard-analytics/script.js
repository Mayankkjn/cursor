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
    <p class="assistant-text">Please answer few question to know more about the dashboard</p>
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
    dom.canvas.innerHTML = [
      widgetTemplate("Feature adoption"),
      widgetTemplate("Overall usage"),
      widgetTemplate("Content performance"),
    ].join("");

    const buildingRow = document.getElementById("buildingRow");
    if (buildingRow) {
      buildingRow.innerHTML = `
        <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2.4">
          <path d="M4 12.5 9.5 18 20 6" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
        Your dashboard is ready
      `;
    }
    const skeletonBars = document.getElementById("skeletonBars");
    if (skeletonBars) skeletonBars.remove();

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
  dom.canvas.insertAdjacentHTML("beforeend", widgetTemplate("New insight"));
  showToast("New insight added");
});

dom.addTextBtn.addEventListener("click", () => {
  setMode("result");
  showResultStage("canvas");
  dom.canvas.insertAdjacentHTML(
    "beforeend",
    `<div class="widget text-widget"><textarea placeholder="Add a note or heading..."></textarea></div>`,
  );
  showToast("Text block added");
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
