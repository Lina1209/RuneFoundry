(() => {
  "use strict";
  const $ = (id) => document.getElementById(id);
  const alphabets = {
    latin: "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split(""),
    cyrillic: "АБВГДЕЁЖЗИЙКЛМНОПРСТУФХЦЧШЩЪЫЬЭЮЯ".split(""),
    digits: "0123456789".split("")
  };
  const state = { glyphs: {}, active: "A", alphabet: "latin" };
  const pad = $("pad");
  const ctx = pad.getContext("2d");
  let drawing = false, currentStroke = [];

  function strokes() { return state.glyphs[state.active] || []; }
  function drawBackground() {
    ctx.fillStyle = "#f2eee6"; ctx.fillRect(0, 0, 640, 640);
    ctx.strokeStyle = "#ded8cc"; ctx.lineWidth = 1; ctx.setLineDash([6, 9]);
    ctx.beginPath(); ctx.moveTo(320, 24); ctx.lineTo(320, 616);
    ctx.moveTo(24, 320); ctx.lineTo(616, 320); ctx.stroke(); ctx.setLineDash([]);
    ctx.strokeStyle = "#e1dbd0"; ctx.setLineWidth = 1;
    ctx.strokeRect(48, 48, 544, 544);
  }
  function drawPath(list, width) {
    ctx.strokeStyle = "#28222e"; ctx.lineWidth = width;
    ctx.lineCap = "round"; ctx.lineJoin = "round";
    list.forEach(path => {
      if (!path || path.length < 2) return;
      ctx.beginPath(); ctx.moveTo(path[0][0], path[0][1]);
      path.slice(1).forEach(point => ctx.lineTo(point[0], point[1]));
      ctx.stroke();
    });
  }
  function redraw() {
    drawBackground();
    const all = [...strokes()];
    if (currentStroke.length) all.push(currentStroke);
    drawPath(all, Number($("strokeWidth").value) || 5);
    updateProperties();
  }
  function pointerPosition(event) {
    const rect = pad.getBoundingClientRect();
    return [
      Math.max(0, Math.min(640, (event.clientX - rect.left) * 640 / rect.width)),
      Math.max(0, Math.min(640, (event.clientY - rect.top) * 640 / rect.height))
    ];
  }
  pad.addEventListener("pointerdown", event => {
    drawing = true; currentStroke = [pointerPosition(event)];
    pad.setPointerCapture(event.pointerId); redraw();
  });
  pad.addEventListener("pointermove", event => {
    if (!drawing) return;
    currentStroke.push(pointerPosition(event)); redraw();
  });
  function finishStroke() {
    if (!drawing) return;
    drawing = false;
    if (currentStroke.length > 1) {
      state.glyphs[state.active] ||= [];
      state.glyphs[state.active].push(currentStroke);
    }
    currentStroke = []; redraw(); renderGrid();
  }
  pad.addEventListener("pointerup", finishStroke);
  pad.addEventListener("pointercancel", finishStroke);
  pad.addEventListener("lostpointercapture", finishStroke);

  function updateProperties() {
    $("currentGlyph").textContent = state.active;
    $("propSymbol").textContent = state.active;
    $("propStrokes").textContent = strokes().length;
    $("propStatus").textContent = strokes().length ? "Есть рисунок" : "Пустой";
    $("widthValue").textContent = $("strokeWidth").value;
  }
  function selectGlyph(character) {
    state.active = character || "A";
    $("glyphName").value = state.active;
    redraw(); renderGrid();
  }
  function renderGrid() {
    const grid = $("glyphGrid");
    if (!grid) return;
    grid.innerHTML = "";
    const chars = alphabets[state.alphabet];
    chars.forEach(character => {
      const count = (state.glyphs[character] || []).length;
      const button = document.createElement("button");
      button.className = "glyph-cell" + (count ? " done" : "") + (character === state.active ? " selected" : "");
      const strong = document.createElement("strong"); strong.textContent = character;
      const small = document.createElement("small"); small.textContent = count ? `${count} штрих.` : "• пусто";
      button.append(strong, small);
      button.addEventListener("click", () => {
        selectGlyph(character);
        navigate("glyph");
      });
      grid.appendChild(button);
    });
    const filled = Object.keys(state.glyphs).filter(key => (state.glyphs[key] || []).length).length;
    $("mappingCount").textContent = `${filled} символов заполнено`;
  }

  function navigate(view) {
    const target = document.getElementById(`view-${view}`);
    if (!target) return;
    document.querySelectorAll(".view").forEach(section => section.classList.toggle("active", section === target));
    document.querySelectorAll(".nav-link[data-view]").forEach(link => link.classList.toggle("active", link.dataset.view === view));
    $("crumbCurrent").textContent = target.dataset.title || "Обзор";
    document.getElementById("sidebar").classList.remove("open");
    history.replaceState(null, "", `#${view}`);
    window.scrollTo({top: 0, behavior: "smooth"});
  }
  document.querySelectorAll("[data-go]").forEach(button => button.addEventListener("click", () => navigate(button.dataset.go)));
  document.querySelectorAll(".nav-link[data-view]").forEach(link => link.addEventListener("click", event => {
    event.preventDefault(); navigate(link.dataset.view);
  }));
  $("menuBtn").addEventListener("click", () => $("sidebar").classList.toggle("open"));

  $("glyphName").addEventListener("change", event => selectGlyph(event.target.value.trim().slice(0, 8) || "A"));
  $("strokeWidth").addEventListener("input", redraw);
  $("undoBtn").addEventListener("click", () => { strokes().pop(); redraw(); renderGrid(); });
  $("clearBtn").addEventListener("click", () => { state.glyphs[state.active] = []; redraw(); renderGrid(); });

  $("alphabetTabs").addEventListener("click", event => {
    const tab = event.target.closest("[data-alphabet]");
    if (!tab) return;
    state.alphabet = tab.dataset.alphabet;
    document.querySelectorAll(".tab").forEach(item => item.classList.toggle("active", item === tab));
    renderGrid();
  });

  $("sampleText").addEventListener("input", () => $("previewText").textContent = $("sampleText").value);
  $("insertAlphabet").addEventListener("click", () => {
    $("sampleText").value = alphabets[state.alphabet].join("");
    $("previewText").textContent = $("sampleText").value;
  });

  function download(blob, filename) {
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url; anchor.download = filename;
    document.body.appendChild(anchor); anchor.click(); anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  $("saveBtn").addEventListener("click", () => {
    const payload = { app: "RuneFoundry", version: 2, savedAt: new Date().toISOString(), glyphs: state.glyphs };
    download(new Blob([JSON.stringify(payload, null, 2)], {type: "application/json"}), "runefoundry-project.json");
  });
  $("loadFile").addEventListener("change", async event => {
    const file = event.target.files && event.target.files[0];
    if (!file) return;
    try {
      const data = JSON.parse(await file.text());
      if (!data.glyphs || typeof data.glyphs !== "object") throw new Error("Invalid project");
      state.glyphs = data.glyphs;
      const first = Object.keys(state.glyphs).find(key => Array.isArray(state.glyphs[key])) || "A";
      selectGlyph(first); renderGrid();
      alert("Проект загружен.");
    } catch (error) {
      alert("Не удалось загрузить проект. Проверь, что выбран JSON-файл RuneFoundry.");
    }
    event.target.value = "";
  });
  $("exportBtn").addEventListener("click", () => {
    const paths = strokes();
    const width = Number($("strokeWidth").value) || 5;
    const pathMarkup = paths.filter(path => path.length > 1).map(path => {
      const commands = path.map((point, index) => `${index ? "L" : "M"} ${point[0].toFixed(1)} ${point[1].toFixed(1)}`).join(" ");
      return `<path d="${commands}" fill="none" stroke="#28222e" stroke-width="${width}" stroke-linecap="round" stroke-linejoin="round"/>`;
    }).join("");
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640"><title>Rune ${state.active}</title>${pathMarkup}</svg>`;
    download(new Blob([svg], {type: "image/svg+xml"}), `rune-${state.active}.svg`);
  });

  const initial = location.hash.replace("#", "");
  if (initial && document.getElementById(`view-${initial}`)) navigate(initial);
  renderGrid(); redraw();
  if ("serviceWorker" in navigator && location.protocol.startsWith("http")) {
    window.addEventListener("load", () => navigator.serviceWorker.register("./sw.js").catch(() => {}));
  }
})();
