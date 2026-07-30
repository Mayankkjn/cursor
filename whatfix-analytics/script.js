(() => {
  const root = document.documentElement;
  const themeToggle = document.getElementById("themeToggle");

  const applyTheme = (theme) => {
    root.setAttribute("data-theme", theme);
    themeToggle.textContent = theme === "dark" ? "☀" : "☾";
    localStorage.setItem("wf-analytics-theme", theme);
  };

  const storedTheme = localStorage.getItem("wf-analytics-theme");
  if (storedTheme) applyTheme(storedTheme);

  themeToggle.addEventListener("click", () => {
    const current = root.getAttribute("data-theme") === "dark" ? "dark" : "light";
    applyTheme(current === "dark" ? "light" : "dark");
  });

  // Ask Whatfix AI
  const askForm = document.getElementById("askAiForm");
  const askInput = document.getElementById("askAiInput");
  const askResponse = document.getElementById("askAiResponse");
  const askChips = document.getElementById("askAiChips");
  const agentModeToggle = document.getElementById("agentModeToggle");

  const canned = {
    "is adoption healthy this week?": {
      label: "Answer",
      body: "Yes — overall adoption is up 2.1 pts WoW to 76.2%. Checkout and New Invoice Creation are driving the gain; APAC's Bulk Export flow is the one soft spot, down 18%.",
      followups: ["Why is Bulk Export down in APAC?", "Show this by region", "Pin this metric"],
    },
    "where are users struggling in the checkout flow?": {
      label: "Answer",
      body: "Users are dropping off most at Step 3 (payment details) and Step 4 in Onboarding. Step 3 improved after the tooltip reword on Jul 24 — completion is up 12% WoW.",
      followups: ["Show the drop-off funnel", "Compare to last quarter", "View storyboard"],
    },
    "notify me if sales stops using flow x for 3 days": {
      label: "Alert created",
      body: "Got it — I'll monitor Flow X usage for the Sales team and notify you if it goes 3 consecutive days without activity. I'll also suggest a remediation nudge if it fires.",
      followups: ["Adjust the threshold", "Add an email notification", "Show similar alerts"],
    },
    "compare adoption between regions this quarter": {
      label: "Dashboard ready",
      body: "I've built a region-comparison dashboard for this quarter — NA and EU are trending up, APAC is flat due to the Bulk Export decline. Recommended pins are queued below.",
      followups: ["Swap bar chart for trend line", "Add EMEA breakdown", "Pin recommended metrics"],
    },
  };

  const defaultResponse = (q) => ({
    label: "Answer",
    body: `Here's what I found for "${q}": adoption trends look broadly healthy this week, with one flow (Bulk Export, APAC) worth a closer look. I can build a dashboard or set an alert for this if you'd like.`,
    followups: ["Build a dashboard from this", "Set an alert", "Show the underlying data"],
  });

  function renderResponse(query) {
    const key = query.trim().toLowerCase();
    const agentMode = agentModeToggle.checked;
    const result = canned[key] || defaultResponse(query);
    const label = agentMode && !canned[key] ? "Alert configured" : result.label;

    askResponse.innerHTML = `
      <div class="ask-ai-response-header">✦ ${label}</div>
      <p>${result.body}</p>
      <div class="ask-ai-followups">
        ${result.followups.map((f) => `<button type="button" class="chip">${f}</button>`).join("")}
      </div>
      <div class="ask-ai-actions">
        <button type="button" class="pill-btn primary small">Pin this</button>
        <button type="button" class="pill-btn small">Build dashboard</button>
      </div>
    `;
    askResponse.classList.remove("hidden");
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
    if (!chip) return;
    askInput.value = chip.textContent;
    renderResponse(chip.textContent);
  });

  // Dismiss auto-surfaced insight cards
  document.getElementById("insightList").addEventListener("click", (e) => {
    const btn = e.target.closest(".dismiss-btn");
    if (!btn) return;
    const card = btn.closest(".insight-card");
    card.classList.add("dismissed");
  });

  // Pin / unpin toggle
  document.getElementById("pinnedList").addEventListener("click", (e) => {
    const btn = e.target.closest(".pin-toggle");
    if (!btn) return;
    const isPinned = btn.classList.toggle("pinned");
    btn.setAttribute("aria-label", isPinned ? "Unpin metric" : "Pin metric");
    const row = btn.closest(".pinned-row");
    row.style.opacity = isPinned ? "1" : "0.5";
  });

  // Refresh smart brief (visual affordance only)
  const refreshBtn = document.getElementById("refreshBriefBtn");
  refreshBtn.addEventListener("click", () => {
    refreshBtn.textContent = "↻ Refreshing…";
    setTimeout(() => {
      refreshBtn.textContent = "↻ Refresh";
    }, 900);
  });

  // Create alert shortcut focuses the Ask AI bar in agent mode
  document.getElementById("createAlertBtn").addEventListener("click", () => {
    agentModeToggle.checked = true;
    askInput.focus();
    askInput.placeholder = "e.g. Notify me if EU adoption drops below 60%";
  });

  document.getElementById("pinMetricBtn").addEventListener("click", () => {
    askInput.focus();
    askInput.placeholder = "e.g. Pin weekly active users for the Support team";
  });
})();
