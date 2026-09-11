const dom = {
  title: document.getElementById("dashboardTitle"),
  desc: document.getElementById("dashboardDesc"),
  closeBtn: document.getElementById("closeBtn"),
  saveBtn: document.getElementById("saveBtn"),
  builder: document.getElementById("builder"),
  canvas: document.getElementById("canvas"),
  promptForm: document.getElementById("promptForm"),
  promptInput: document.getElementById("promptInput"),
  suggestions: document.getElementById("suggestions"),
  moreChip: document.getElementById("moreChip"),
  existingInsightBtn: document.getElementById("existingInsightBtn"),
  newInsightBtn: document.getElementById("newInsightBtn"),
  addTextBtn: document.getElementById("addTextBtn"),
  toast: document.getElementById("toast"),
};

const extraSuggestions = ["Compare usage across segments", "Understand where users drop off", "Track flow completion rates"];

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

function enterCanvasMode() {
  dom.builder.classList.add("hidden");
  dom.canvas.classList.remove("hidden");
}

function generateFromPrompt(promptText) {
  enterCanvasMode();
  dom.canvas.innerHTML = [widgetTemplate("Feature adoption"), widgetTemplate("Overall usage"), widgetTemplate("Content performance")].join("");
  if (!dom.desc.textContent.trim()) {
    dom.desc.textContent = promptText;
  }
  showToast("Dashboard generated from your prompt");
}

dom.promptForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const value = dom.promptInput.value.trim();
  if (!value) {
    return;
  }
  generateFromPrompt(value);
});

dom.suggestions.addEventListener("click", (event) => {
  const chip = event.target.closest(".chip");
  if (!chip || chip === dom.moreChip) {
    return;
  }
  const promptText = chip.dataset.prompt;
  dom.promptInput.value = promptText;
  generateFromPrompt(promptText);
});

dom.moreChip.addEventListener("click", () => {
  const alreadyExpanded = dom.moreChip.dataset.expanded === "true";
  if (alreadyExpanded) {
    return;
  }
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

dom.existingInsightBtn.addEventListener("click", () => {
  showToast("Select an existing insight to add it here");
});

dom.newInsightBtn.addEventListener("click", () => {
  enterCanvasMode();
  dom.canvas.insertAdjacentHTML("beforeend", widgetTemplate("New insight"));
  showToast("New insight added");
});

dom.addTextBtn.addEventListener("click", () => {
  enterCanvasMode();
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
  if (dom.canvas.classList.contains("hidden")) {
    return;
  }
  if (window.confirm("Discard this dashboard and return to the empty state?")) {
    dom.canvas.classList.add("hidden");
    dom.canvas.innerHTML = "";
    dom.builder.classList.remove("hidden");
    dom.promptInput.value = "";
  }
});

[dom.title, dom.desc].forEach((el) => {
  el.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      el.blur();
    }
  });
});
