const state = {
  mode: "side",
  zoom: 1,
  slider: 50,
  showDesign: true,
  sidebarOpen: true,
  theme: localStorage.getItem("ui-compare-theme") || "dark",
  annotations: [],
  design: { img: null, name: "" },
  development: { img: null, name: "" },
};

const dom = {
  body: document.body,
  modeButtons: Array.from(document.querySelectorAll(".mode-btn")),
  themeToggle: document.getElementById("themeToggle"),
  zoomValue: document.getElementById("zoomValue"),
  zoomInBtn: document.getElementById("zoomInBtn"),
  zoomOutBtn: document.getElementById("zoomOutBtn"),
  zoomResetBtn: document.getElementById("zoomResetBtn"),
  annotationsToggle: document.getElementById("annotationsToggle"),
  collapseSidebarBtn: document.getElementById("collapseSidebarBtn"),
  openBtn: document.getElementById("openBtn"),
  emptyState: document.getElementById("emptyState"),
  compareStage: document.getElementById("compareStage"),
  sideView: document.getElementById("sideView"),
  sliderView: document.getElementById("sliderView"),
  toggleView: document.getElementById("toggleView"),
  diffView: document.getElementById("diffView"),
  sliderInput: document.getElementById("sliderInput"),
  sliderDivider: document.getElementById("sliderDivider"),
  sliderTopCanvas: document.getElementById("sliderTopCanvas"),
  toggleSwapBtn: document.getElementById("toggleSwapBtn"),
  annotationLayer: document.getElementById("annotationLayer"),
  annotationSidebar: document.getElementById("annotationSidebar"),
  annotationList: document.getElementById("annotationList"),
  annotationCount: document.getElementById("annotationCount"),
  statusText: document.getElementById("statusText"),
  designInput: document.getElementById("designInput"),
  devInput: document.getElementById("devInput"),
  designDrop: document.getElementById("designDrop"),
  devDrop: document.getElementById("devDrop"),
  designCanvas: document.getElementById("designCanvas"),
  devCanvas: document.getElementById("devCanvas"),
  sliderBaseCanvas: document.getElementById("sliderBaseCanvas"),
  toggleCanvas: document.getElementById("toggleCanvas"),
  diffCanvas: document.getElementById("diffCanvas"),
};

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function setTheme(theme) {
  state.theme = theme;
  if (theme === "light") {
    dom.body.classList.add("light");
    dom.themeToggle.textContent = "◐";
  } else {
    dom.body.classList.remove("light");
    dom.themeToggle.textContent = "☼";
  }
  localStorage.setItem("ui-compare-theme", theme);
}

function createImageFromFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = reader.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

async function applyImage(file, type) {
  if (!file || !file.type.startsWith("image/")) {
    return;
  }

  try {
    const img = await createImageFromFile(file);
    if (type === "design") {
      state.design = { img, name: file.name };
    } else {
      state.development = { img, name: file.name };
    }
    render();
  } catch (error) {
    window.alert("Unable to load image file.");
  }
}

function setCanvasImage(canvas, image, zoom) {
  const width = Math.max(1, Math.round(image.naturalWidth * zoom));
  const height = Math.max(1, Math.round(image.naturalHeight * zoom));
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, width, height);
  ctx.drawImage(image, 0, 0, width, height);
}

function setOverlayCanvas(canvas, image, width, height) {
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, width, height);
  ctx.drawImage(image, 0, 0, width, height);
}

function getOverlaySize() {
  const width = Math.max(state.design.img.naturalWidth, state.development.img.naturalWidth);
  const height = Math.max(state.design.img.naturalHeight, state.development.img.naturalHeight);
  return {
    width: Math.max(1, Math.round(width * state.zoom)),
    height: Math.max(1, Math.round(height * state.zoom)),
  };
}

function drawDiff() {
  const { width, height } = getOverlaySize();
  const sourceA = document.createElement("canvas");
  const sourceB = document.createElement("canvas");
  sourceA.width = width;
  sourceA.height = height;
  sourceB.width = width;
  sourceB.height = height;
  sourceA.getContext("2d").drawImage(state.design.img, 0, 0, width, height);
  sourceB.getContext("2d").drawImage(state.development.img, 0, 0, width, height);

  const imageA = sourceA.getContext("2d").getImageData(0, 0, width, height);
  const imageB = sourceB.getContext("2d").getImageData(0, 0, width, height);
  const out = new ImageData(width, height);
  const threshold = 18;

  for (let i = 0; i < out.data.length; i += 4) {
    const rDiff = Math.abs(imageA.data[i] - imageB.data[i]);
    const gDiff = Math.abs(imageA.data[i + 1] - imageB.data[i + 1]);
    const bDiff = Math.abs(imageA.data[i + 2] - imageB.data[i + 2]);
    const score = (rDiff + gDiff + bDiff) / 3;

    if (score > threshold) {
      out.data[i] = 255;
      out.data[i + 1] = 70;
      out.data[i + 2] = 70;
      out.data[i + 3] = 220;
    } else {
      const gray = Math.round((imageB.data[i] + imageB.data[i + 1] + imageB.data[i + 2]) / 3);
      out.data[i] = gray;
      out.data[i + 1] = gray;
      out.data[i + 2] = gray;
      out.data[i + 3] = 180;
    }
  }

  dom.diffCanvas.width = width;
  dom.diffCanvas.height = height;
  dom.diffCanvas.getContext("2d").putImageData(out, 0, 0);
}

function renderViews() {
  const hasBothImages = state.design.img && state.development.img;
  dom.emptyState.classList.toggle("hidden", hasBothImages);
  dom.compareStage.classList.toggle("hidden", !hasBothImages);

  if (!hasBothImages) {
    const loaded = [state.design.img ? "Design loaded" : "", state.development.img ? "Development loaded" : ""]
      .filter(Boolean)
      .join(" • ");
    dom.statusText.textContent = loaded || "Upload design and development images to begin comparing.";
    return;
  }

  setCanvasImage(dom.designCanvas, state.design.img, state.zoom);
  setCanvasImage(dom.devCanvas, state.development.img, state.zoom);

  const { width, height } = getOverlaySize();
  setOverlayCanvas(dom.sliderBaseCanvas, state.development.img, width, height);
  setOverlayCanvas(dom.sliderTopCanvas, state.design.img, width, height);
  setOverlayCanvas(
    dom.toggleCanvas,
    state.showDesign ? state.design.img : state.development.img,
    width,
    height,
  );
  drawDiff();

  const sliderLeft = `${state.slider}%`;
  dom.sliderTopCanvas.style.clipPath = `inset(0 ${100 - state.slider}% 0 0)`;
  dom.sliderDivider.style.left = sliderLeft;
  dom.sliderInput.value = String(state.slider);

  const modeMap = {
    side: dom.sideView,
    slider: dom.sliderView,
    toggle: dom.toggleView,
    diff: dom.diffView,
  };

  Object.entries(modeMap).forEach(([key, view]) => {
    view.classList.toggle("hidden", key !== state.mode);
  });

  dom.toggleSwapBtn.classList.toggle("hidden", state.mode !== "toggle");
  dom.toggleSwapBtn.textContent = state.showDesign ? "Show Development" : "Show Design";

  dom.statusText.textContent =
    `${state.design.name || "Design"} (${state.design.img.naturalWidth}×${state.design.img.naturalHeight}) • ` +
    `${state.development.name || "Development"} (${state.development.img.naturalWidth}×${state.development.img.naturalHeight})`;
}

function renderAnnotations() {
  dom.annotationCount.textContent = `${state.annotations.length} annotation${state.annotations.length === 1 ? "" : "s"}`;

  if (state.annotations.length === 0) {
    dom.annotationList.innerHTML = `
      <div class="empty-annotations">
        <p>No annotations yet</p>
        <p class="hint">Click on the comparison to add notes</p>
      </div>
    `;
    dom.annotationLayer.innerHTML = "";
    return;
  }

  dom.annotationList.innerHTML = state.annotations
    .map(
      (item, index) => `
      <article class="annotation-item">
        <header>
          <span>#${index + 1} • ${item.mode}</span>
          <button class="annotation-delete" data-id="${item.id}" type="button">✕</button>
        </header>
        <p>${item.text}</p>
      </article>
    `,
    )
    .join("");

  dom.annotationLayer.innerHTML = state.annotations
    .map(
      (item, index) =>
        `<span class="annotation-dot" style="left:${item.x * 100}%;top:${item.y * 100}%;">${index + 1}</span>`,
    )
    .join("");
}

function renderControls() {
  dom.modeButtons.forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.mode === state.mode);
  });
  dom.zoomValue.textContent = `${Math.round(state.zoom * 100)}%`;
  dom.annotationSidebar.classList.toggle("hidden-sidebar", !state.sidebarOpen);
  dom.annotationsToggle.classList.toggle("active", state.sidebarOpen);
  dom.collapseSidebarBtn.textContent = state.sidebarOpen ? "⟩" : "⟨";
}

function render() {
  renderControls();
  renderViews();
  renderAnnotations();
}

function handleCompareClick(event) {
  if (!(state.design.img && state.development.img)) {
    return;
  }
  if (event.target.closest("#toggleSwapBtn") || event.target.closest("#sliderInput")) {
    return;
  }
  const rect = dom.compareStage.getBoundingClientRect();
  const x = clamp((event.clientX - rect.left) / rect.width, 0, 1);
  const y = clamp((event.clientY - rect.top) / rect.height, 0, 1);
  const note = window.prompt("Add annotation:");

  if (!note || !note.trim()) {
    return;
  }

  state.annotations.push({
    id: crypto.randomUUID(),
    mode: state.mode,
    text: note.trim(),
    x,
    y,
  });
  renderAnnotations();
}

function bindUpload(inputElement, type, dropElement) {
  inputElement.addEventListener("change", async (event) => {
    const [file] = event.target.files || [];
    await applyImage(file, type);
    inputElement.value = "";
  });

  ["dragenter", "dragover"].forEach((evtName) => {
    dropElement.addEventListener(evtName, (event) => {
      event.preventDefault();
      dropElement.style.filter = "brightness(1.15)";
    });
  });

  ["dragleave", "drop"].forEach((evtName) => {
    dropElement.addEventListener(evtName, (event) => {
      event.preventDefault();
      dropElement.style.filter = "";
    });
  });

  dropElement.addEventListener("drop", async (event) => {
    const [file] = event.dataTransfer.files || [];
    await applyImage(file, type);
  });
}

dom.modeButtons.forEach((button) => {
  button.addEventListener("click", () => {
    state.mode = button.dataset.mode;
    render();
  });
});

dom.sliderInput.addEventListener("input", (event) => {
  state.slider = clamp(Number(event.target.value), 0, 100);
  renderViews();
});

dom.toggleSwapBtn.addEventListener("click", () => {
  state.showDesign = !state.showDesign;
  renderViews();
});

dom.zoomInBtn.addEventListener("click", () => {
  state.zoom = clamp(state.zoom + 0.1, 0.2, 3);
  render();
});

dom.zoomOutBtn.addEventListener("click", () => {
  state.zoom = clamp(state.zoom - 0.1, 0.2, 3);
  render();
});

dom.zoomResetBtn.addEventListener("click", () => {
  state.zoom = 1;
  render();
});

dom.themeToggle.addEventListener("click", () => {
  setTheme(state.theme === "dark" ? "light" : "dark");
});

dom.annotationsToggle.addEventListener("click", () => {
  state.sidebarOpen = !state.sidebarOpen;
  renderControls();
});

dom.collapseSidebarBtn.addEventListener("click", () => {
  state.sidebarOpen = !state.sidebarOpen;
  renderControls();
});

dom.annotationList.addEventListener("click", (event) => {
  const button = event.target.closest(".annotation-delete");
  if (!button) {
    return;
  }
  state.annotations = state.annotations.filter((item) => item.id !== button.dataset.id);
  renderAnnotations();
});

dom.compareStage.addEventListener("dblclick", handleCompareClick);

dom.openBtn.addEventListener("click", () => {
  if (!state.design.img) {
    dom.designInput.click();
    return;
  }
  if (!state.development.img) {
    dom.devInput.click();
    return;
  }
  if (window.confirm("Replace design image?\nPress Cancel to replace development image.")) {
    dom.designInput.click();
  } else {
    dom.devInput.click();
  }
});

bindUpload(dom.designInput, "design", dom.designDrop);
bindUpload(dom.devInput, "development", dom.devDrop);
window.addEventListener("resize", renderAnnotations);

setTheme(state.theme);
render();
