const state = {
  mode: "side",
  zoom: 1,
  slider: 50,
  showDesign: true,
  autoAnalyzing: false,
  sidebarOpen: true,
  theme: localStorage.getItem("ui-compare-theme") || "dark",
  annotations: [],
  analysis: {
    score: null,
    headline: "Run Auto Analyze to generate summary insights.",
    highlights: ["Auto analysis calls out missing elements and major visual differences."],
  },
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
  autoAnalyzeBtn: document.getElementById("autoAnalyzeBtn"),
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
  summaryScore: document.getElementById("summaryScore"),
  summaryHeadline: document.getElementById("summaryHeadline"),
  summaryHighlights: document.getElementById("summaryHighlights"),
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

function hasBothImages() {
  return Boolean(state.design.img && state.development.img);
}

const NAMED_COLORS = [
  { name: "Black", rgb: [20, 20, 20] },
  { name: "White", rgb: [245, 245, 245] },
  { name: "Gray", rgb: [128, 128, 128] },
  { name: "Red", rgb: [220, 40, 45] },
  { name: "Orange", rgb: [240, 130, 35] },
  { name: "Yellow", rgb: [240, 210, 60] },
  { name: "Green", rgb: [45, 165, 70] },
  { name: "Teal", rgb: [20, 160, 160] },
  { name: "Cyan", rgb: [30, 200, 220] },
  { name: "Blue", rgb: [40, 105, 225] },
  { name: "Purple", rgb: [130, 70, 210] },
  { name: "Pink", rgb: [235, 90, 150] },
  { name: "Brown", rgb: [125, 90, 55] },
];

function rgbDistance(a, b) {
  return Math.hypot(a.r - b.r, a.g - b.g, a.b - b.b);
}

function rgbToColorName(rgb) {
  let best = NAMED_COLORS[0];
  let bestDistance = Number.POSITIVE_INFINITY;
  for (const color of NAMED_COLORS) {
    const distance = Math.hypot(rgb.r - color.rgb[0], rgb.g - color.rgb[1], rgb.b - color.rgb[2]);
    if (distance < bestDistance) {
      bestDistance = distance;
      best = color;
    }
  }
  return best.name;
}

function describeRegion(x, y) {
  if (y < 0.18) {
    return "header area";
  }
  if (y > 0.82) {
    return "footer area";
  }
  if (x < 0.33) {
    return "left section";
  }
  if (x > 0.67) {
    return "right section";
  }
  return "center section";
}

function escapeHtml(text) {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
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
    state.annotations = [];
    state.analysis = {
      score: null,
      headline: "Run Auto Analyze to generate summary insights.",
      highlights: ["Auto analysis calls out missing elements and major visual differences."],
    };
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

function analyzeDifferenceHotspots() {
  if (!hasBothImages()) {
    return {
      hotspots: [],
      score: null,
      headline: "Upload both images to run analysis.",
      highlights: ["Auto analysis compares structure and major color mismatches."],
    };
  }

  const naturalWidth = Math.max(state.design.img.naturalWidth, state.development.img.naturalWidth);
  const naturalHeight = Math.max(state.design.img.naturalHeight, state.development.img.naturalHeight);
  const maxDimension = 900;
  const scale = Math.min(1, maxDimension / Math.max(naturalWidth, naturalHeight));
  const analysisWidth = Math.max(1, Math.round(naturalWidth * scale));
  const analysisHeight = Math.max(1, Math.round(naturalHeight * scale));

  const sourceA = document.createElement("canvas");
  const sourceB = document.createElement("canvas");
  sourceA.width = analysisWidth;
  sourceA.height = analysisHeight;
  sourceB.width = analysisWidth;
  sourceB.height = analysisHeight;
  sourceA.getContext("2d").drawImage(state.design.img, 0, 0, analysisWidth, analysisHeight);
  sourceB.getContext("2d").drawImage(state.development.img, 0, 0, analysisWidth, analysisHeight);

  const imageA = sourceA.getContext("2d").getImageData(0, 0, analysisWidth, analysisHeight);
  const imageB = sourceB.getContext("2d").getImageData(0, 0, analysisWidth, analysisHeight);

  const cols = clamp(Math.round(analysisWidth / 130), 4, 10);
  const rows = clamp(Math.round(analysisHeight / 130), 4, 10);
  const cellWidth = analysisWidth / cols;
  const cellHeight = analysisHeight / rows;
  const changedPixelThreshold = 20;
  const hotspots = [];
  let globalDiffSum = 0;
  let globalChangedPixels = 0;
  let globalPixels = 0;

  for (let row = 0; row < rows; row += 1) {
    const startY = Math.floor(row * cellHeight);
    const endY = row === rows - 1 ? analysisHeight : Math.floor((row + 1) * cellHeight);
    for (let col = 0; col < cols; col += 1) {
      const startX = Math.floor(col * cellWidth);
      const endX = col === cols - 1 ? analysisWidth : Math.floor((col + 1) * cellWidth);
      let sumScore = 0;
      let changedPixels = 0;
      let pixels = 0;
      let sumAR = 0;
      let sumAG = 0;
      let sumAB = 0;
      let sumBR = 0;
      let sumBG = 0;
      let sumBB = 0;
      let sumGrayA = 0;
      let sumGrayASq = 0;
      let sumGrayB = 0;
      let sumGrayBSq = 0;

      for (let y = startY; y < endY; y += 1) {
        for (let x = startX; x < endX; x += 1) {
          const idx = (y * analysisWidth + x) * 4;
          const aR = imageA.data[idx];
          const aG = imageA.data[idx + 1];
          const aB = imageA.data[idx + 2];
          const bR = imageB.data[idx];
          const bG = imageB.data[idx + 1];
          const bB = imageB.data[idx + 2];
          const rDiff = Math.abs(aR - bR);
          const gDiff = Math.abs(aG - bG);
          const bDiff = Math.abs(aB - bB);
          const score = (rDiff + gDiff + bDiff) / 3;

          sumAR += aR;
          sumAG += aG;
          sumAB += aB;
          sumBR += bR;
          sumBG += bG;
          sumBB += bB;
          const grayA = 0.299 * aR + 0.587 * aG + 0.114 * aB;
          const grayB = 0.299 * bR + 0.587 * bG + 0.114 * bB;
          sumGrayA += grayA;
          sumGrayASq += grayA * grayA;
          sumGrayB += grayB;
          sumGrayBSq += grayB * grayB;

          sumScore += score;
          if (score > changedPixelThreshold) {
            changedPixels += 1;
          }
          pixels += 1;
        }
      }

      const averageDiff = pixels > 0 ? sumScore / pixels : 0;
      const changedCoverage = pixels > 0 ? changedPixels / pixels : 0;
      const meanA = {
        r: sumAR / Math.max(1, pixels),
        g: sumAG / Math.max(1, pixels),
        b: sumAB / Math.max(1, pixels),
      };
      const meanB = {
        r: sumBR / Math.max(1, pixels),
        g: sumBG / Math.max(1, pixels),
        b: sumBB / Math.max(1, pixels),
      };
      const meanGrayA = sumGrayA / Math.max(1, pixels);
      const meanGrayB = sumGrayB / Math.max(1, pixels);
      const stdA = Math.sqrt(Math.max(0, sumGrayASq / Math.max(1, pixels) - meanGrayA * meanGrayA));
      const stdB = Math.sqrt(Math.max(0, sumGrayBSq / Math.max(1, pixels) - meanGrayB * meanGrayB));
      const colorDiff = rgbDistance(meanA, meanB);
      const colorSignificant = colorDiff > 48 && changedCoverage > 0.06 && averageDiff > 16;
      const missingInDevelopment = changedCoverage > 0.14 && stdA > stdB * 1.6 && stdB < 24;
      const missingInDesign = changedCoverage > 0.14 && stdB > stdA * 1.6 && stdA < 24;
      const weightedScore =
        averageDiff * (0.5 + changedCoverage * 1.5) +
        (colorSignificant ? 10 : 0) +
        (missingInDevelopment || missingInDesign ? 18 : 0);

      globalDiffSum += sumScore;
      globalChangedPixels += changedPixels;
      globalPixels += pixels;

      if (averageDiff > 12 && changedCoverage > 0.035) {
        hotspots.push({
          x: (startX + endX) / 2 / analysisWidth,
          y: (startY + endY) / 2 / analysisHeight,
          score: weightedScore,
          averageDiff,
          changedCoverage,
          meanA,
          meanB,
          colorNameA: rgbToColorName(meanA),
          colorNameB: rgbToColorName(meanB),
          colorSignificant,
          missingInDevelopment,
          missingInDesign,
          location: describeRegion((startX + endX) / 2 / analysisWidth, (startY + endY) / 2 / analysisHeight),
        });
      }
    }
  }

  hotspots.sort((a, b) => b.score - a.score);
  const selected = [];
  const minDistance = 0.17;
  const maxHotspots = 5;

  for (const candidate of hotspots) {
    const tooClose = selected.some(
      (item) => Math.hypot(item.x - candidate.x, item.y - candidate.y) < minDistance,
    );
    if (!tooClose) {
      selected.push(candidate);
    }
    if (selected.length >= maxHotspots) {
      break;
    }
  }

  const globalAverageDiff = globalPixels > 0 ? globalDiffSum / globalPixels : 0;
  const globalChangedCoverage = globalPixels > 0 ? globalChangedPixels / globalPixels : 0;
  const score = clamp(
    Math.round(100 - globalChangedCoverage * 75 - (globalAverageDiff / 255) * 45 - selected.length * 2.5),
    0,
    100,
  );
  const missingInDevelopmentCount = selected.filter((item) => item.missingInDevelopment).length;
  const missingInDesignCount = selected.filter((item) => item.missingInDesign).length;
  const colorMismatchCount = selected.filter((item) => item.colorSignificant).length;
  const headline =
    score >= 90
      ? "Excellent UI match. Only small visual differences detected."
      : score >= 78
        ? "Good UI match with a few noticeable differences."
        : score >= 60
          ? "Partial UI match. Several visual inconsistencies need attention."
          : "Low UI match. Multiple high-impact differences were found.";
  const highlights = [];
  if (selected.length === 0) {
    highlights.push("No major mismatch hotspots were detected.");
  } else {
    highlights.push(`Detected ${selected.length} high-impact mismatch region(s).`);
  }
  if (missingInDevelopmentCount > 0) {
    highlights.push(`Potential missing elements in Development: ${missingInDevelopmentCount}.`);
  }
  if (missingInDesignCount > 0) {
    highlights.push(`Potential extra elements in Development not present in Design: ${missingInDesignCount}.`);
  }
  if (colorMismatchCount > 0) {
    highlights.push(`Major color mismatches called out with color names: ${colorMismatchCount}.`);
  }
  highlights.push("Minor color variance from screenshot/display resolution was ignored.");

  return { hotspots: selected, score, headline, highlights };
}

function buildAutoAnnotations(hotspots) {
  if (hotspots.length === 0) {
    return [
      {
        id: crypto.randomUUID(),
        mode: "auto",
        source: "auto",
        text: "No major visual mismatches detected after ignoring minor color variance.",
        x: 0.5,
        y: 0.5,
      },
    ];
  }

  const annotations = [];
  hotspots.forEach((hotspot) => {
    const detailPrefix = hotspot.missingInDevelopment
      ? `Possible missing element in Development at the ${hotspot.location}.`
      : hotspot.missingInDesign
        ? `Possible extra element in Development at the ${hotspot.location}.`
        : `Element mismatch in the ${hotspot.location}.`;
    const colorDetails = hotspot.colorSignificant
      ? ` Color differs clearly: Design is ${hotspot.colorNameA} vs Development ${hotspot.colorNameB}.`
      : "";
    const message =
      detailPrefix +
      colorDetails +
      " This ignores minor color shifts likely caused by screenshot/display differences.";

    if (state.mode === "side") {
      const y = 0.08 + hotspot.y * 0.84;
      const leftX = 0.06 + hotspot.x * 0.38;
      const rightX = 0.56 + hotspot.x * 0.38;
      annotations.push({
        id: crypto.randomUUID(),
        mode: "auto",
        source: "auto",
        text: `Design panel: ${message}`,
        x: leftX,
        y,
      });
      annotations.push({
        id: crypto.randomUUID(),
        mode: "auto",
        source: "auto",
        text: `Development panel: ${message}`,
        x: rightX,
        y,
      });
      return;
    }

    annotations.push({
      id: crypto.randomUUID(),
      mode: "auto",
      source: "auto",
      text: message,
      x: 0.08 + hotspot.x * 0.84,
      y: 0.08 + hotspot.y * 0.84,
    });
  });

  return annotations.slice(0, 12);
}

async function runAutoAnalyze() {
  if (!hasBothImages()) {
    window.alert("Upload both Design and Development images before running Auto Analyze.");
    return;
  }

  try {
    state.autoAnalyzing = true;
    renderControls();
    await new Promise((resolve) => window.requestAnimationFrame(resolve));

    const analysisResult = analyzeDifferenceHotspots();
    state.annotations = buildAutoAnnotations(analysisResult.hotspots);
    state.analysis = {
      score: analysisResult.score,
      headline: analysisResult.headline,
      highlights: analysisResult.highlights,
    };
    state.sidebarOpen = true;
    render();
  } finally {
    state.autoAnalyzing = false;
    renderControls();
  }
}

function renderViews() {
  const imagesReady = hasBothImages();
  dom.emptyState.classList.toggle("hidden", imagesReady);
  dom.compareStage.classList.toggle("hidden", !imagesReady);

  if (!imagesReady) {
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
      (item, index) => {
        const typeLabel = item.source === "auto" ? "auto-analyze" : item.mode;
        return `
      <article class="annotation-item">
        <header>
          <span>#${index + 1} • ${escapeHtml(typeLabel)}</span>
          <button class="annotation-delete" data-id="${item.id}" type="button">✕</button>
        </header>
        <p>${escapeHtml(item.text)}</p>
      </article>
    `;
      },
    )
    .join("");

  dom.annotationLayer.innerHTML = state.annotations
    .map(
      (item, index) =>
        `<span class="annotation-dot" style="left:${item.x * 100}%;top:${item.y * 100}%;">${index + 1}</span>`,
    )
    .join("");
}

function renderSummary() {
  dom.summaryScore.textContent = state.analysis.score === null ? "--" : `${state.analysis.score}/100`;
  dom.summaryHeadline.textContent = state.analysis.headline;
  dom.summaryHighlights.innerHTML = state.analysis.highlights
    .map((item) => `<li>${escapeHtml(item)}</li>`)
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

  const canAnalyze = hasBothImages() && !state.autoAnalyzing;
  dom.autoAnalyzeBtn.disabled = !canAnalyze;
  dom.autoAnalyzeBtn.classList.toggle("muted", !canAnalyze);
  dom.autoAnalyzeBtn.textContent = state.autoAnalyzing ? "Analyzing..." : "Auto Analyze";
}

function render() {
  renderControls();
  renderViews();
  renderAnnotations();
  renderSummary();
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
    source: "manual",
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

dom.autoAnalyzeBtn.addEventListener("click", () => {
  void runAutoAnalyze();
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

dom.compareStage.addEventListener("click", handleCompareClick);

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
