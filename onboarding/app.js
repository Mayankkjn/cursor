const TOTAL_SCREENS = 31;

const state = {
  current: 1,
  name: "Alex",
  together: "alone",
  selectedAsset: null,
  autoAdvanceTimer: null,
};

const AUTO_ADVANCE_SCREENS = { 19: 2600, 25: 1800 };

const dom = {
  screens: Array.from(document.querySelectorAll(".screen")),
  prevBtn: document.getElementById("prevBtn"),
  restartBtn: document.getElementById("restartBtn"),
  progressDots: document.getElementById("progressDots"),
  screenCounter: document.getElementById("screenCounter"),
  phoneScreen: document.getElementById("phoneScreen"),
  nameInput: document.getElementById("nameInput"),
  greetName1: document.getElementById("greetName1"),
  greetName2: document.getElementById("greetName2"),
};

function buildDots() {
  dom.progressDots.innerHTML = "";
  for (let i = 1; i <= TOTAL_SCREENS; i += 1) {
    const dot = document.createElement("span");
    dot.dataset.index = String(i);
    dom.progressDots.appendChild(dot);
  }
}

function restartStaggerAnimations(screen) {
  screen.querySelectorAll(".word-cascade li, .stagger-list li, .celebrate-line, .reveal-text").forEach((el) => {
    el.style.animation = "none";
    // eslint-disable-next-line no-unused-expressions
    el.offsetHeight;
    el.style.animation = "";
  });
}

function syncReviewScreen() {
  const income = document.getElementById("incomeAmount");
  const expense = document.getElementById("expenseAmount");
  const reviewIncome = document.getElementById("reviewIncome");
  const reviewExpense = document.getElementById("reviewExpense");
  if (income && reviewIncome) reviewIncome.textContent = income.textContent;
  if (expense && reviewExpense) reviewExpense.textContent = expense.textContent;
}

function goTo(index) {
  const clamped = Math.min(TOTAL_SCREENS, Math.max(1, index));
  state.current = clamped;

  dom.screens.forEach((screen) => {
    const isActive = Number(screen.dataset.screen) === clamped;
    screen.classList.toggle("active", isActive);
    if (isActive) restartStaggerAnimations(screen);
  });

  Array.from(dom.progressDots.children).forEach((dot) => {
    dot.classList.toggle("active", Number(dot.dataset.index) === clamped);
  });

  dom.screenCounter.textContent = `${clamped} / ${TOTAL_SCREENS}`;
  dom.prevBtn.disabled = clamped === 1;
  dom.phoneScreen.scrollTop = 0;

  if (state.autoAdvanceTimer) {
    window.clearTimeout(state.autoAdvanceTimer);
    state.autoAdvanceTimer = null;
  }

  if (clamped === 24) {
    syncReviewScreen();
  }

  if (clamped === 25) {
    animateCalcProgress();
  }

  if (AUTO_ADVANCE_SCREENS[clamped]) {
    state.autoAdvanceTimer = window.setTimeout(() => {
      if (state.current === clamped) {
        next();
      }
    }, AUTO_ADVANCE_SCREENS[clamped]);
  }
}

function next() {
  goTo(state.current + 1);
}

function prev() {
  goTo(state.current - 1);
}

function restart() {
  state.name = "Alex";
  state.together = "alone";
  state.selectedAsset = null;
  if (dom.nameInput) dom.nameInput.value = "";
  if (dom.greetName1) dom.greetName1.textContent = "Alex";
  if (dom.greetName2) dom.greetName2.textContent = "Alex";
  document.querySelectorAll(".chip.selected, .pill.selected").forEach((el) => el.classList.remove("selected"));
  document.querySelectorAll(".slide-connect.connected").forEach((el) => {
    el.classList.remove("connected");
    el.querySelector(".slide-label").textContent = "Slide to connect";
  });
  goTo(1);
}

function bindNextButtons() {
  document.querySelectorAll(".next-btn").forEach((btn) => {
    btn.addEventListener("click", (event) => {
      event.preventDefault();
      if (btn.dataset.choice) {
        state.together = btn.dataset.choice;
      }
      next();
    });
  });
}

function bindBackButtons() {
  document.querySelectorAll(".btn-back").forEach((btn) => {
    btn.addEventListener("click", (event) => {
      event.preventDefault();
      prev();
    });
  });
}

function bindNameCapture() {
  if (!dom.nameInput) return;
  dom.nameInput.addEventListener("input", () => {
    const value = dom.nameInput.value.trim();
    state.name = value || "Alex";
    if (dom.greetName1) dom.greetName1.textContent = state.name;
    if (dom.greetName2) dom.greetName2.textContent = state.name;
  });
}

function bindOtpBoxes() {
  const boxes = Array.from(document.querySelectorAll(".otp-box"));
  boxes.forEach((box, i) => {
    box.addEventListener("input", () => {
      box.value = box.value.replace(/[^0-9]/g, "").slice(0, 1);
      if (box.value && boxes[i + 1]) boxes[i + 1].focus();
    });
    box.addEventListener("keydown", (event) => {
      if (event.key === "Backspace" && !box.value && boxes[i - 1]) boxes[i - 1].focus();
    });
  });
}

function formatCurrency(digits) {
  const numeric = digits.replace(/[^0-9]/g, "") || "0";
  const trimmed = String(Number(numeric));
  return `₹${Number(trimmed).toLocaleString("en-IN")}`;
}

function bindKeypads() {
  document.querySelectorAll(".keypad").forEach((keypad) => {
    const targetId = keypad.dataset.target;
    const target = document.getElementById(targetId);
    if (!target) return;

    let raw = (target.textContent || "").replace(/[^0-9]/g, "");

    keypad.querySelectorAll("button").forEach((key) => {
      key.addEventListener("click", () => {
        if (key.dataset.action === "back") {
          raw = raw.slice(0, -1);
        } else if (key.textContent === ".") {
          // amounts are whole rupees in this prototype; ignore decimal key
        } else {
          if (raw.length >= 9) return;
          raw += key.textContent;
        }
        target.textContent = formatCurrency(raw);
      });
    });
  });
}

function animateCalcProgress() {
  const bar = document.getElementById("calcProgress");
  if (!bar) return;
  bar.style.width = "20%";
  window.setTimeout(() => {
    bar.style.width = "100%";
  }, 150);
}

function bindPanWhy() {
  const btn = document.getElementById("panWhyBtn");
  const text = document.getElementById("panWhyText");
  if (!btn || !text) return;
  btn.addEventListener("click", () => {
    text.hidden = !text.hidden;
  });
}

function bindSlideConnect() {
  document.querySelectorAll(".slide-connect").forEach((btn) => {
    btn.addEventListener("click", () => {
      const connected = btn.classList.toggle("connected");
      btn.querySelector(".slide-label").textContent = connected ? "Connected ✓" : "Slide to connect";
    });
  });
}

function bindAssetFlow() {
  const addAssetBtn = document.getElementById("addAssetBtn");
  const nothingElseBtn = document.getElementById("nothingElseBtn");
  const assetContinueBtn = document.getElementById("assetContinueBtn");
  const picker = document.getElementById("assetTypePicker");

  if (addAssetBtn) {
    addAssetBtn.addEventListener("click", () => goTo(17));
  }
  if (nothingElseBtn) {
    nothingElseBtn.addEventListener("click", () => goTo(19));
  }
  if (picker) {
    picker.querySelectorAll(".chip").forEach((chip) => {
      chip.addEventListener("click", () => {
        picker.querySelectorAll(".chip").forEach((c) => c.classList.remove("selected"));
        chip.classList.add("selected");
        state.selectedAsset = chip.dataset.asset;
      });
    });
  }
  if (assetContinueBtn) {
    assetContinueBtn.addEventListener("click", () => {
      goTo(state.selectedAsset === "inheritance" ? 18 : 19);
    });
  }
}

function bindPills() {
  document.querySelectorAll(".pill-row").forEach((row) => {
    row.querySelectorAll(".pill").forEach((pill) => {
      pill.addEventListener("click", () => {
        row.querySelectorAll(".pill").forEach((p) => p.classList.remove("selected"));
        pill.classList.add("selected");
      });
    });
  });
}

function computeFireAge(income, expense, invest) {
  const delta = ((invest - 50000) / 10000) * -0.6 + ((expense - 80000) / 10000) * 0.5 + ((income - 150000) / 10000) * -0.2;
  return Math.min(60, Math.max(30, Math.round(48 + delta)));
}

function bindFireSliders() {
  const income = document.getElementById("sliderIncome");
  const expense = document.getElementById("sliderExpense");
  const invest = document.getElementById("sliderInvest");
  if (!income || !expense || !invest) return;

  const incomeVal = document.getElementById("sliderIncomeVal");
  const expenseVal = document.getElementById("sliderExpenseVal");
  const investVal = document.getElementById("sliderInvestVal");
  const ageArrow = document.getElementById("fireAgeArrow");
  const ageTo = document.getElementById("fireAgeTo");

  function update() {
    incomeVal.textContent = formatCurrency(income.value);
    expenseVal.textContent = formatCurrency(expense.value);
    investVal.textContent = formatCurrency(invest.value);

    const age = computeFireAge(Number(income.value), Number(expense.value), Number(invest.value));
    if (age === 48) {
      ageArrow.hidden = true;
    } else {
      ageArrow.hidden = false;
      ageTo.textContent = String(age);
    }
  }

  [income, expense, invest].forEach((slider) => slider.addEventListener("input", update));
  update();
}

buildDots();
bindNextButtons();
bindBackButtons();
bindNameCapture();
bindOtpBoxes();
bindKeypads();
bindPanWhy();
bindSlideConnect();
bindAssetFlow();
bindPills();
bindFireSliders();

dom.prevBtn.addEventListener("click", prev);
dom.restartBtn.addEventListener("click", restart);

document.addEventListener("keydown", (event) => {
  if (event.key === "ArrowRight") next();
  if (event.key === "ArrowLeft") prev();
});

goTo(1);
