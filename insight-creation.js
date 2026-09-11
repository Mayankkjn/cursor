const dom = {
  trendSetupHead: document.getElementById("trendSetupHead"),
  trendSetupBody: document.getElementById("trendSetupBody"),
  addEventBtn: document.getElementById("addEventBtn"),
  eventList: document.getElementById("eventList"),
  metricSelect: document.getElementById("metricSelect").querySelector("select"),
  userTypeSelect: document.getElementById("userTypeSelect").querySelector("select"),
  addUserFilterBtn: document.getElementById("addUserFilterBtn"),
  addCompletionTimeBtn: document.getElementById("addCompletionTimeBtn"),
  emptyState: document.getElementById("emptyState"),
  chartPreview: document.getElementById("chartPreview"),
  chartTitle: document.getElementById("chartTitle"),
  chartSub: document.getElementById("chartSub"),
  createUsingAiBtn: document.getElementById("createUsingAiBtn"),
  closeBtn: document.getElementById("closeBtn"),
  saveBtn: document.getElementById("saveBtn"),

  aiPanel: document.getElementById("aiPanel"),
  aiToggleBtn: document.getElementById("aiToggleBtn"),
  aiCloseBtn: document.getElementById("aiCloseBtn"),
  aiExpandBtn: document.getElementById("aiExpandBtn"),
  aiHero: document.getElementById("aiHero"),
  chatThread: document.getElementById("chatThread"),
  promptList: document.getElementById("promptList"),
  aiInput: document.getElementById("aiInput"),
  aiSendBtn: document.getElementById("aiSendBtn"),
  composerBox: document.getElementById("composerBox"),
};

const state = {
  events: [],
  aiPanelOpen: true,
};

/* ---------- Trend Setup collapse ---------- */
dom.trendSetupHead.addEventListener("click", (event) => {
  if (event.target.closest(".ic-info")) return;
  const collapsed = dom.trendSetupHead.classList.toggle("collapsed");
  dom.trendSetupBody.style.display = collapsed ? "none" : "";
});

/* ---------- Event list ---------- */
function renderEvents() {
  dom.eventList.innerHTML = state.events
    .map(
      (name, index) => `
      <span class="ic-event-chip" data-index="${index}">
        ${name}
        <button type="button" aria-label="Remove ${name}">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M6 6l12 12M18 6 6 18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
        </button>
      </span>`,
    )
    .join("");
  updatePreviewState();
}

function addEvent(name) {
  const label = name && name.trim() ? name.trim() : `Event ${state.events.length + 1}`;
  state.events.push(label);
  renderEvents();
}

dom.addEventBtn.addEventListener("click", () => {
  const name = window.prompt("Event name", "Page Viewed");
  if (name === null) return;
  addEvent(name);
});

dom.eventList.addEventListener("click", (event) => {
  const chip = event.target.closest(".ic-event-chip");
  if (!chip) return;
  const index = Number(chip.dataset.index);
  state.events.splice(index, 1);
  renderEvents();
});

dom.addUserFilterBtn.addEventListener("click", () => {
  window.alert("User filter builder would open here.");
});

dom.addCompletionTimeBtn.addEventListener("click", () => {
  window.alert("Completion time picker would open here.");
});

/* ---------- Empty state <-> chart preview ---------- */
function updatePreviewState() {
  const hasEvents = state.events.length > 0;
  dom.emptyState.classList.toggle("hidden", hasEvents);
  dom.chartPreview.classList.toggle("hidden", !hasEvents);
  if (hasEvents) {
    dom.chartTitle.textContent = `Trend of ${dom.metricSelect.value}`;
    dom.chartSub.textContent = `Tracking ${state.events.join(", ")} over the last 30 days`;
  }
}

dom.metricSelect.addEventListener("change", updatePreviewState);

dom.createUsingAiBtn.addEventListener("click", () => {
  openAiPanel();
  dom.aiInput.focus();
});

/* ---------- Close / Save ---------- */
dom.closeBtn.addEventListener("click", () => {
  if (window.confirm("Discard this insight and go back?")) {
    window.history.length > 1 ? window.history.back() : window.location.reload();
  }
});

dom.saveBtn.addEventListener("click", () => {
  const original = dom.saveBtn.textContent;
  dom.saveBtn.textContent = "Saved";
  dom.saveBtn.disabled = true;
  setTimeout(() => {
    dom.saveBtn.textContent = original;
    dom.saveBtn.disabled = false;
  }, 1200);
});

/* ---------- AI panel open / close / expand ---------- */
function openAiPanel() {
  state.aiPanelOpen = true;
  dom.aiPanel.classList.remove("hidden-panel");
}

function closeAiPanel() {
  state.aiPanelOpen = false;
  dom.aiPanel.classList.add("hidden-panel");
}

dom.aiToggleBtn.addEventListener("click", () => {
  state.aiPanelOpen ? closeAiPanel() : openAiPanel();
});

dom.aiCloseBtn.addEventListener("click", closeAiPanel);

dom.aiExpandBtn.addEventListener("click", () => {
  dom.aiPanel.classList.toggle("expanded");
});

/* ---------- Chat ---------- */
function scrollChatToBottom() {
  const aiBody = dom.chatThread.parentElement;
  aiBody.scrollTop = aiBody.scrollHeight;
}

function addUserMessage(text) {
  dom.aiHero.classList.add("hidden");
  dom.chatThread.classList.remove("hidden");
  const row = document.createElement("div");
  row.className = "ic-msg ic-msg-user";
  row.innerHTML = `<div class="ic-msg-bubble">${escapeHtml(text)}</div>`;
  dom.chatThread.appendChild(row);
  scrollChatToBottom();
}

function addAiMessage(html) {
  const row = document.createElement("div");
  row.className = "ic-msg ic-msg-ai";
  row.innerHTML = `
    <div class="ic-msg-avatar">
      <svg width="13" height="13" viewBox="0 0 24 24" fill="url(#gAvatar)"><defs><linearGradient id="gAvatar" x1="0" y1="0" x2="24" y2="24"><stop offset="0" stop-color="#FF7A3D"/><stop offset="1" stop-color="#FF3D77"/></linearGradient></defs><path d="M12 2.5 14 9l6.5 2-6.5 2-2 6.5-2-6.5-6.5-2L10 9l2-6.5Z"/></svg>
    </div>
    <div class="ic-msg-bubble">${html}</div>
  `;
  dom.chatThread.appendChild(row);
  scrollChatToBottom();
  return row.querySelector(".ic-msg-bubble");
}

function addTypingIndicator() {
  const row = document.createElement("div");
  row.className = "ic-msg ic-msg-ai";
  row.innerHTML = `
    <div class="ic-msg-avatar">
      <svg width="13" height="13" viewBox="0 0 24 24" fill="url(#gAvatar2)"><defs><linearGradient id="gAvatar2" x1="0" y1="0" x2="24" y2="24"><stop offset="0" stop-color="#FF7A3D"/><stop offset="1" stop-color="#FF3D77"/></linearGradient></defs><path d="M12 2.5 14 9l6.5 2-6.5 2-2 6.5-2-6.5-6.5-2L10 9l2-6.5Z"/></svg>
    </div>
    <div class="ic-msg-bubble"><span class="ic-typing"><span></span><span></span><span></span></span></div>
  `;
  dom.chatThread.appendChild(row);
  scrollChatToBottom();
  return row;
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

const KNOWLEDGE_RESPONSES = [
  {
    match: /how to create an insight/i,
    reply: `<p>To create an insight:</p>
      <ul>
        <li>Pick a <strong>Metric</strong> (e.g. Unique users)</li>
        <li>Add one or more <strong>Events</strong> to track</li>
        <li>Choose a <strong>User Type</strong> to scope the audience</li>
        <li>Optionally add a User Filter or completion time window</li>
      </ul>
      <p>Or just tell me what you want to analyze and I'll set it up for you.</p>`,
  },
  {
    match: /when should i use trend insight/i,
    reply: `<p>Use a <strong>Trend insight</strong> when you want to see how a metric (like unique users or event count) changes over time for a specific event — great for spotting adoption trends, drop-offs, or the impact of a release.</p>`,
  },
];

function buildInsightFromPrompt(promptText) {
  const metricGuess = /session/i.test(promptText)
    ? "Sessions"
    : /event/i.test(promptText)
      ? "Total events"
      : "Unique users";
  dom.metricSelect.value = metricGuess;

  if (state.events.length === 0) {
    addEvent("Page Viewed");
  }

  const userTypeGuess = /new user/i.test(promptText)
    ? "New users"
    : /returning/i.test(promptText)
      ? "Returning users"
      : "All users";
  dom.userTypeSelect.value = userTypeGuess;

  flashCard();
  return { metric: metricGuess, event: state.events[state.events.length - 1], userType: userTypeGuess };
}

function flashCard() {
  const card = dom.trendSetupBody.closest(".ic-card");
  card.style.transition = "box-shadow 0.3s ease";
  card.style.boxShadow = "0 0 0 3px rgba(255,90,31,0.35)";
  setTimeout(() => {
    card.style.boxShadow = "none";
  }, 900);
}

function respondTo(promptText) {
  const typingRow = addTypingIndicator();
  const known = KNOWLEDGE_RESPONSES.find((item) => item.match.test(promptText));

  setTimeout(() => {
    typingRow.remove();

    if (known) {
      addAiMessage(known.reply);
      return;
    }

    const built = buildInsightFromPrompt(promptText);
    const bubble = addAiMessage(
      `<p>Got it — I've set up a trend insight for <strong>${built.metric}</strong> tracking <strong>${built.event}</strong>, scoped to <strong>${built.userType}</strong>.</p>
       <p>You can adjust any field on the left, or ask me to refine it further.</p>`,
    );
    const chip = document.createElement("span");
    chip.className = "ic-applied-chip";
    chip.innerHTML = `<svg width="11" height="11" viewBox="0 0 24 24" fill="none"><path d="m5 13 4 4 10-10" stroke="#1f8a4c" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg> Applied to Trend Setup`;
    bubble.appendChild(chip);
  }, 900);
}

function sendMessage(text) {
  const value = (text || "").trim();
  if (!value) return;
  openAiPanel();
  addUserMessage(value);
  respondTo(value);
  dom.aiInput.value = "";
  autoSizeInput();
}

dom.promptList.addEventListener("click", (event) => {
  const btn = event.target.closest(".ic-prompt");
  if (!btn) return;
  sendMessage(btn.dataset.prompt);
});

dom.aiSendBtn.addEventListener("click", () => sendMessage(dom.aiInput.value));

dom.aiInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter" && !event.shiftKey) {
    event.preventDefault();
    sendMessage(dom.aiInput.value);
  }
});

function autoSizeInput() {
  dom.aiInput.style.height = "auto";
  dom.aiInput.style.height = `${Math.min(dom.aiInput.scrollHeight, 120)}px`;
}

dom.aiInput.addEventListener("input", autoSizeInput);

/* ---------- Title placeholder ---------- */
function bindPlaceholder(el) {
  const placeholder = el.dataset.placeholder;
  if (!placeholder) return;
  el.addEventListener("focus", () => {
    if (el.textContent === placeholder) el.textContent = "";
  });
  el.addEventListener("blur", () => {
    if (!el.textContent.trim()) el.textContent = placeholder;
  });
}

bindPlaceholder(document.getElementById("insightSubtitle"));

updatePreviewState();
