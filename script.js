const state = {
  currentPage: 0,
  totalPages: 0,
};

const dom = {
  cardsTrack: document.getElementById("cardsTrack"),
  prevBtn: document.getElementById("prevBtn"),
  nextBtn: document.getElementById("nextBtn"),
  queryInput: document.getElementById("queryInput"),
  submitBtn: document.getElementById("submitBtn"),
  cards: document.querySelectorAll(".example-card"),
  sidebarIcons: document.querySelectorAll(".sidebar-icon:not(.logo-icon)"),
};

function init() {
  const pages = dom.cardsTrack.querySelectorAll(".cards-page");
  state.totalPages = pages.length;
  updateCarousel();
  bindEvents();
}

function updateCarousel() {
  const offset = state.currentPage * -100;
  dom.cardsTrack.style.transform = `translateX(${offset}%)`;
  dom.prevBtn.style.opacity = state.currentPage === 0 ? "0.4" : "1";
  dom.prevBtn.style.pointerEvents = state.currentPage === 0 ? "none" : "auto";
  dom.nextBtn.style.opacity = state.currentPage >= state.totalPages - 1 ? "0.4" : "1";
  dom.nextBtn.style.pointerEvents = state.currentPage >= state.totalPages - 1 ? "none" : "auto";
}

function goToPage(page) {
  state.currentPage = Math.max(0, Math.min(page, state.totalPages - 1));
  updateCarousel();
}

function handleCardClick(event) {
  const card = event.currentTarget;
  const query = card.dataset.query;
  if (query) {
    dom.queryInput.value = query;
    dom.queryInput.focus();
  }
}

function handleSubmit() {
  const query = dom.queryInput.value.trim();
  if (!query) return;
  dom.queryInput.value = "";
}

function handleSidebarClick(event) {
  const icon = event.currentTarget;
  dom.sidebarIcons.forEach((btn) => btn.classList.remove("active"));
  icon.classList.add("active");
}

function bindEvents() {
  dom.prevBtn.addEventListener("click", () => goToPage(state.currentPage - 1));
  dom.nextBtn.addEventListener("click", () => goToPage(state.currentPage + 1));

  dom.cards.forEach((card) => card.addEventListener("click", handleCardClick));

  dom.submitBtn.addEventListener("click", handleSubmit);
  dom.queryInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") handleSubmit();
  });

  dom.sidebarIcons.forEach((icon) => {
    icon.addEventListener("click", handleSidebarClick);
  });
}

init();
