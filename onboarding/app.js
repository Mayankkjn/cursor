const TOTAL_SCREENS = 20;

const state = {
  current: 1,
  name: "Alex",
  autoAdvanceTimer: null,
};

const AUTO_ADVANCE_SCREENS = { 13: 1800, 18: 1800 };

const dom = {
  screens: Array.from(document.querySelectorAll(".screen")),
  prevBtn: document.getElementById("prevBtn"),
  restartBtn: document.getElementById("restartBtn"),
  progressDots: document.getElementById("progressDots"),
  screenCounter: document.getElementById("screenCounter"),
  phoneScreen: document.getElementById("phoneScreen"),
  nameInput: document.getElementById("nameInput"),
  greetName: document.getElementById("greetName"),
};

function buildDots() {
  dom.progressDots.innerHTML = "";
  for (let i = 1; i <= TOTAL_SCREENS; i += 1) {
    const dot = document.createElement("span");
    dot.dataset.index = String(i);
    dom.progressDots.appendChild(dot);
  }
}

function goTo(index) {
  const clamped = Math.min(TOTAL_SCREENS, Math.max(1, index));
  state.current = clamped;

  dom.screens.forEach((screen) => {
    const isActive = Number(screen.dataset.screen) === clamped;
    screen.classList.toggle("active", isActive);
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

  if (clamped === 18) {
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
  if (dom.nameInput) {
    dom.nameInput.value = "";
  }
  if (dom.greetName) {
    dom.greetName.textContent = "Alex";
  }
  goTo(1);
}

function bindNextButtons() {
  document.querySelectorAll(".next-btn").forEach((btn) => {
    btn.addEventListener("click", (event) => {
      event.preventDefault();
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
    if (dom.greetName) {
      dom.greetName.textContent = state.name;
    }
  });
}

function bindOtpBoxes() {
  const boxes = Array.from(document.querySelectorAll(".otp-box"));
  boxes.forEach((box, i) => {
    box.addEventListener("input", () => {
      box.value = box.value.replace(/[^0-9]/g, "").slice(0, 1);
      if (box.value && boxes[i + 1]) {
        boxes[i + 1].focus();
      }
    });
    box.addEventListener("keydown", (event) => {
      if (event.key === "Backspace" && !box.value && boxes[i - 1]) {
        boxes[i - 1].focus();
      }
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

buildDots();
bindNextButtons();
bindBackButtons();
bindNameCapture();
bindOtpBoxes();
bindKeypads();

dom.prevBtn.addEventListener("click", prev);
dom.restartBtn.addEventListener("click", restart);

document.addEventListener("keydown", (event) => {
  if (event.key === "ArrowRight") next();
  if (event.key === "ArrowLeft") prev();
});

goTo(1);
