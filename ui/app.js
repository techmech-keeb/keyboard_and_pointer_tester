// =============================================================
// Techmech keys INPUT LAB — main logic
// Offline, framework-free. Runs standalone in a browser or
// inside the kiosk host (WebView2), which forwards blocked keys
// (Win, Alt+Tab, ...) via window.chrome.webview messages.
// =============================================================
"use strict";

const $ = (id) => document.getElementById(id);
let BOARD = DEFAULT_BOARD;

// ---------- tunables ----------
const TRAIL_MS = 2800;          // trail fade time
const RIPPLE_MS = 750;
const CHEVRON_MS = 620;
const IDLE_RESET_MS = 75000;    // auto reset for the next visitor
const MAX_DPR = 1.5;            // battery-friendly rendering in kiosk display
const URL_KIOSK_DISPLAY = new URLSearchParams(window.location.search).get("kiosk") === "1";
const FREE_TEXT_MAX = 3000;
const FX_PALETTE = {
  buttons: { L: "#3fd9ff", M: "#ffb454", R: "#ff3b30" },
  chevron: "63,217,255",
  cursorHalo: "255,80,66",
  compass: {
    ring: "255,255,255",
    needleStart: "255,59,48",
    needle: "#ff5a4c",
    hub: "#ff3b30",
  },
  trail: {
    hueStart: 195,
    hueEnd: 0,
    glow: "95%, 62%",
    core: "95%, 65%",
  },
  rippleLabelFont: (size) => `700 ${size}px 'Segoe UI', 'Yu Gothic UI', sans-serif`,
};

function refreshFxPalette() {
  const css = getComputedStyle(document.documentElement);
  const read = (name, fallback) => css.getPropertyValue(name).trim() || fallback;
  FX_PALETTE.buttons.L = read("--fx-btn-l", "#3fd9ff");
  FX_PALETTE.buttons.M = read("--fx-btn-m", "#ffb454");
  FX_PALETTE.buttons.R = read("--fx-btn-r", "#ff3b30");
  FX_PALETTE.chevron = read("--fx-scroll-rgb", "63,217,255");
  FX_PALETTE.cursorHalo = read("--fx-halo-rgb", "255,80,66");
  FX_PALETTE.trail.hueStart = Number(read("--fx-trail-hue-start", "195"));
  FX_PALETTE.trail.hueEnd = Number(read("--fx-trail-hue-end", "0"));
  FX_PALETTE.trail.fixedRgb = css.getPropertyValue("--fx-trail-fixed-rgb").trim();
  FX_PALETTE.compass.ring = read("--fx-compass-rgb", "255,255,255");
  FX_PALETTE.compass.needleStart = read("--fx-compass-needle-start-rgb", "255,59,48");
  FX_PALETTE.compass.needle = read("--fx-compass-needle", "#ff5a4c");
  FX_PALETTE.compass.hub = read("--fx-compass-hub", "#ff3b30");
  for (const button of BTN) button.color = FX_PALETTE.buttons[button.name];
}

// Japanese (IME) free-input tab. Ships OFF so an exhibition machine has
// zero IME/candidate-window risk out of the box; the whole IME surface is
// confined to this one tab. Staff can flip it per-machine from the staff
// menu (persisted in localStorage) with no rebuild — see jp-input below.
const JP_INPUT_DEFAULT = false;
const DEFAULT_BOARD_KEY = "olsk60.defaultBoard";
const AUTO_LAYER_SIM_KEY = "olsk60.autoLayerSim";
const AUTO_LAYER_SIM_DEFAULT = { on: true, delay: 800 };

// ---------- state ----------
const S = {
  keyCount: 0,
  clicks: { L: 0, M: 0, R: 0 },
  distPx: 0,
  scrollTotal: 0,
  speed: 0,                     // px/s smoothed
  vx: 0, vy: 0,                 // smoothed velocity px/ms
  lastPointer: null,            // {x,y,t}
  lastInput: performance.now(),
  attract: URL_KIOSK_DISPLAY,
  attractMove: 0,
  freeMode: false,
  kiosk: URL_KIOSK_DISPLAY,
  hostCanResize: false,
};

function kioskDisplayEnabled() {
  return S.kiosk || URL_KIOSK_DISPLAY;
}

function applyKioskDisplay(enabled) {
  document.body.classList.toggle("kiosk", enabled);
  if (enabled) attractShow();
  else attractHide();
}


// =============================================================
// Keyboard rendering
// =============================================================
const keyboardEl = $("keyboard");
const keyEls = new Map();       // code -> [element,...]
const matrixEls = new Map();    // "row,col" -> element
const heatCounts = new Map();   // id -> count

// (re)build a keycap face; parts = {label, shift, small, dim} overrides
// the static legend from layout.js (used by the Vial live keymap).
function renderCap(el, k, parts) {
  const label = parts ? parts.label : k.label;
  const shift = parts ? parts.shift : k.shift;
  const heat = el.querySelector(".keycap")?.style.getPropertyValue("--heat");

  const cap = document.createElement("div");
  cap.className = "keycap";
  if (heat) cap.style.setProperty("--heat", heat);
  if (shift) {
    const sub = document.createElement("span");
    sub.className = "sub";
    sub.textContent = shift;
    cap.appendChild(sub);
  }
  const main = document.createElement("span");
  main.textContent = label;
  cap.appendChild(main);
  if (k.win) {
    const lock = document.createElement("span");
    lock.className = "lock";
    lock.textContent = "🔒";
    cap.appendChild(lock);
  }
  el.classList.toggle("small", (parts ? !!parts.small : k.label.length > 2));
  el.querySelector(".keycap")?.remove();
  el.appendChild(cap);
}

function buildKeyboard() {
  for (const k of BOARD.keys) {
    const el = document.createElement("div");
    el.className = "key";
    if (k.layer) el.classList.add("layer");
    if (k.win) el.classList.add("win");
    if (k.homing) el.classList.add("homing");
    el.style.left = `calc(var(--u) * ${k.x})`;
    el.style.top = `calc(var(--u) * ${k.y})`;
    el.style.width = `calc(var(--u) * ${k.w})`;
    el.style.height = `calc(var(--u) * ${k.h || 1})`;
    el.dataset.id = k.id || k.code;
    el._key = k;
    renderCap(el, k);
    keyboardEl.appendChild(el);

    if (!keyEls.has(k.code)) keyEls.set(k.code, []);
    keyEls.get(k.code).push(el);
    if (k.m) matrixEls.set(k.m[0] + "," + k.m[1], el);
  }

  const pointings = BOARD.pointing ? (Array.isArray(BOARD.pointing) ? BOARD.pointing : [BOARD.pointing]) : [];
  for (const [i, pointing] of pointings.entries()) {
    const tp = document.createElement("div");
    tp.id = i === 0 ? "trackpoint" : "trackpoint-" + i;
    tp.className = "pointing" + (pointing.shape === "pad" ? " pad" : "");
    tp.style.left = `calc(var(--u) * ${pointing.x})`;
    tp.style.top = `calc(var(--u) * ${pointing.y})`;
    tp.style.width = `calc(var(--u) * ${pointing.w || 0.72})`;
    tp.style.height = `calc(var(--u) * ${pointing.h || 0.72})`;
    if (pointing.image) {
      const image = document.createElement("img");
      image.src = pointing.image;
      image.alt = pointing.type || "pointing device";
      tp.appendChild(image);
    } else if (pointing.shape !== "pad") {
      tp.innerHTML = `<div id="tpRing"></div><div id="tpCap"></div>`;
    }
    keyboardEl.appendChild(tp);
  }
}

function fitKeyboard() {
  const wrap = $("kbWrap");
  const u = Math.min(
    64,
    Math.floor(wrap.clientWidth / BOARD.unitsWide),
    Math.floor(window.innerHeight * 0.48 / BOARD.unitsHigh),
  );
  document.documentElement.style.setProperty("--u", u + "px");
}

function applyBoard(profile) {
  if (!profile || profile === BOARD) return;
  autoLayerSimCancel();
  BOARD = profile;
  keyboardEl.innerHTML = "";
  keyEls.clear();
  matrixEls.clear();
  buildKeyboard();
  buildCodeChars();
  keyboardEl.style.width = `calc(var(--u) * ${BOARD.unitsWide})`;
  keyboardEl.style.height = `calc(var(--u) * ${BOARD.unitsHigh})`;
  fitKeyboard();
  const pointings = BOARD.pointing ? (Array.isArray(BOARD.pointing) ? BOARD.pointing : [BOARD.pointing]) : [];
  const pointingLabel = pointings.length ? " + " + pointings.map((pointing) =>
    pointing.type === "trackpoint" ? "トラックポイント" : pointing.type || "ポインティング").join("・") : "";
  $("kbProfileLabel").textContent = BOARD.keys.length + "キー" + pointingLabel;
  practiceInit();
  if (VS) {
    VS.rows = BOARD.matrix ? BOARD.matrix.rows : 0;
    VS.cols = BOARD.matrix ? BOARD.matrix.cols : 0;
    VS.custom = BOARD.customKeycodes || [];
  }
  if (window.tourEngine) tourEngine.updateGuideButton();
  applyAutoLayerSimControls();
}

// =============================================================
// Key input handling (real events + kiosk hook bridge)
// =============================================================
const OSD_LABEL = {
  Space: "␣", Enter: "⏎", Backspace: "⌫", Tab: "⇥", Escape: "Esc",
  Delete: "Del", ArrowUp: "↑", ArrowDown: "↓", ArrowLeft: "←", ArrowRight: "→",
  ShiftLeft: "Shift", ShiftRight: "Shift", ControlLeft: "Ctrl", ControlRight: "Ctrl",
  AltLeft: "Alt", AltRight: "Alt", MetaLeft: "Win", MetaRight: "Win",
  ContextMenu: "Menu", CapsLock: "Caps",
};

// code -> char, for practice matching while a Japanese IME is active
const CODE_CHAR = {};
function buildCodeChars() {
  for (const code of Object.keys(CODE_CHAR)) delete CODE_CHAR[code];
  for (const k of BOARD.keys) {
    if (k.label.length === 1) CODE_CHAR[k.code] = k.label.toLowerCase();
  }
  CODE_CHAR.Space = " ";
}
buildCodeChars();

const osdEl = $("keyOsd");
let osdTimer = 0;

function showOsd(text) {
  osdEl.textContent = text;
  osdEl.classList.remove("pop");
  void osdEl.offsetWidth;
  osdEl.classList.add("pop");
  clearTimeout(osdTimer);
  osdTimer = setTimeout(() => osdEl.classList.remove("pop"), 600);
}

function keyVisualDown(code) {
  const els = keyEls.get(code);
  if (!els) return;
  for (const el of els) {
    el.classList.add("down");
    const id = el.dataset.id;
    const n = (heatCounts.get(id) || 0) + 1;
    heatCounts.set(id, n);
    el.querySelector(".keycap").style.setProperty("--heat", Math.min(n / 25, 1).toFixed(2));
  }
}
function keyVisualUp(code) {
  const els = keyEls.get(code);
  if (!els) return;
  for (const el of els) el.classList.remove("down");
}

function registerKeyDown(code, key, repeat) {
  if (repeat) return;
  keyVisualDown(code);
  S.keyCount++;
  $("keyCount").textContent = S.keyCount;
  const printable = key && key.length === 1 && key !== " " ? key : null;
  $("lastKey").textContent = printable || OSD_LABEL[code] || key || code;
  $("lastKey").title = code;
  showOsd(printable || OSD_LABEL[code] || key || code);
  missionDone("type");
}

document.addEventListener("keydown", (e) => {
  touchInput();
  if (!e.repeat) registerKeyDown(e.code, e.key, false);
  else keyVisualDown(e.code); // keep lit while held
  if (!e.repeat && window.tourEngine) tourEngine.onAnyKey();

  // staff menu: Escape closes it and is consumed
  const staffOpen = !$("staffMenu").hidden;
  if (staffOpen) {
    if (e.code === "Escape" && !e.repeat) $("staffMenu").hidden = true;
  }
  // typing practice (IME-independent via code fallback)
  else if (!S.freeMode && !e.ctrlKey && !e.altKey && !e.metaKey) {
    if (e.code === "Escape" && !e.repeat) practiceNext();
    else if (e.code === "Backspace") practiceBackspace();
    else {
      let ch = e.key && e.key.length === 1 ? e.key : null;
      if (!ch && (e.key === "Process" || e.key === "Unidentified")) {
        const base = CODE_CHAR[e.code];
        if (base) ch = e.shiftKey ? shiftedChar(e.code, base) : base;
      }
      if (ch) practiceChar(ch);
    }
  }

  // keep the kiosk page inert: swallow browser default actions,
  // but let the hidden textarea receive real typing in free mode
  const toTextarea = S.freeMode && e.target === hiddenInput;
  if (!toTextarea || e.code === "Tab") {
    e.preventDefault();
    if (toTextarea && e.code === "Tab") insertText("\t");
  }
}, true);

document.addEventListener("keyup", (e) => {
  keyVisualUp(e.code);
}, true);

function shiftedChar(code, base) {
  const k = BOARD.keys.find((k) => k.code === code);
  if (k && k.shift) return k.shift;
  return base.toUpperCase();
}

// ---------- kiosk host bridge ----------
if (window.chrome && window.chrome.webview) {
  window.chrome.webview.addEventListener("message", (ev) => {
    const d = ev.data;
    if (!d) return;
    if (d.type === "host") {
      S.kiosk = !!d.kiosk;
      S.hostCanResize = !!d.canResize;
      if (d.version) setAppVersion(d.version);
      applyKioskDisplay(kioskDisplayEnabled());
      applyWindowSizeControls();
      const b = $("hostBadge");
      if (d.kiosk) {
        b.textContent = "KIOSK MODE";
        b.classList.add("kiosk");
      } else {
        b.textContent = "APP MODE";
        b.classList.remove("kiosk");
      }
    } else if (d.type === "key") {
      touchInput();
      if (d.down) registerKeyDown(d.code, d.key, !!d.repeat);
      else keyVisualUp(d.code);
    }
  });
  // announce ourselves; host replies with {type:'host'}
  window.chrome.webview.postMessage({ type: "ready" });
}

// =============================================================
// Pointer: trail canvas, ripples, scroll chevrons
// =============================================================
const canvas = $("trailCanvas");
const ctx = canvas.getContext("2d");
let cw = 0, ch = 0, dpr = 1;

function resizeCanvas() {
  dpr = kioskDisplayEnabled() ? Math.min(window.devicePixelRatio || 1, MAX_DPR) : (window.devicePixelRatio || 1);
  cw = window.innerWidth;
  ch = window.innerHeight;
  canvas.width = Math.round(cw * dpr);
  canvas.height = Math.round(ch * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

const trail = [];    // {x,y,t,break}
const ripples = [];  // {x,y,t,color,label}
const chevrons = []; // {x,y,t,dir}

const BTN = [
  { name: "L", label: "左クリック", color: FX_PALETTE.buttons.L },
  { name: "M", label: "中クリック", color: FX_PALETTE.buttons.M },
  { name: "R", label: "右クリック", color: FX_PALETTE.buttons.R },
];

const INPUT_FEED_MAX = 30;
const INPUT_FEED_GROUP_MS = 400;
let lastInputFeed = null;

function addInputFeed(type, label) {
  const now = performance.now();
  const feed = $("inputFeed");
  if (lastInputFeed && lastInputFeed.type === type && now - lastInputFeed.time <= INPUT_FEED_GROUP_MS) {
    lastInputFeed.count++;
    lastInputFeed.el.querySelector("b").textContent = "×" + lastInputFeed.count;
    lastInputFeed.time = now;
    return;
  }

  const item = document.createElement("div");
  item.className = "input-feed-item " + type;
  const name = document.createElement("span");
  const count = document.createElement("b");
  name.textContent = label;
  count.textContent = "×1";
  item.append(name, count);
  feed.prepend(item);
  while (feed.children.length > INPUT_FEED_MAX) feed.lastElementChild.remove();
  lastInputFeed = { type, time: now, count: 1, el: item };
}

function clearInputFeed() {
  $("inputFeed").replaceChildren();
  lastInputFeed = null;
}

let rafId = 0, rafOn = false;
function wake() {
  if (!rafOn) { rafOn = true; rafId = requestAnimationFrame(frame); }
}

function frame(now) {
  ctx.clearRect(0, 0, cw, ch);

  // ---- trail ----
  while (trail.length && now - trail[0].t > TRAIL_MS) trail.shift();
  for (let i = 1; i < trail.length; i++) {
    const a = trail[i - 1], b = trail[i];
    if (b.break) continue;
    const age = (now - b.t) / TRAIL_MS;
    const alpha = Math.max(0, 1 - age);
    const dt = Math.max(b.t - a.t, 1);
    const v = Math.hypot(b.x - a.x, b.y - a.y) / dt; // px/ms
    const hue = FX_PALETTE.trail.hueStart - Math.min(v / 2.2, 1) *
      (FX_PALETTE.trail.hueStart - FX_PALETTE.trail.hueEnd); // cyan -> red
    const fixedRgb = FX_PALETTE.trail.fixedRgb;
    const w = 2 + Math.min(v * 1.5, 4);
    // soft glow pass + core pass
    ctx.lineCap = "round";
    ctx.strokeStyle = fixedRgb ? `rgba(${fixedRgb}, ${(alpha * 0.16).toFixed(3)})` :
      `hsla(${hue}, ${FX_PALETTE.trail.glow}, ${(alpha * 0.16).toFixed(3)})`;
    ctx.lineWidth = w * 3.2;
    ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
    ctx.strokeStyle = fixedRgb ? `rgba(${fixedRgb}, ${(alpha * 0.85).toFixed(3)})` :
      `hsla(${hue}, ${FX_PALETTE.trail.core}, ${(alpha * 0.85).toFixed(3)})`;
    ctx.lineWidth = w;
    ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
  }

  // ---- cursor halo ----
  if (S.lastPointer && now - S.lastPointer.t < 1600) {
    const p = S.lastPointer;
    const a = 1 - (now - p.t) / 1600;
    const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, 26);
    g.addColorStop(0, `rgba(${FX_PALETTE.cursorHalo},${0.5 * a})`);
    g.addColorStop(1, `rgba(${FX_PALETTE.cursorHalo},0)`);
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(p.x, p.y, 26, 0, Math.PI * 2); ctx.fill();
  }

  // ---- click ripples ----
  const rippleMaxRadius = Math.max(70, 0.08 * Math.min(cw, ch));
  const fxScale = rippleMaxRadius / 70;
  for (let i = ripples.length - 1; i >= 0; i--) {
    const r = ripples[i];
    const k = (now - r.t) / RIPPLE_MS;
    if (k >= 1) { ripples.splice(i, 1); continue; }
    const rad = 12 + k * (rippleMaxRadius - 12);
    ctx.fillStyle = hexA(r.color, (1 - k) * 0.18);
    ctx.beginPath(); ctx.arc(r.x, r.y, rad, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = hexA(r.color, (1 - k) * 0.9);
    ctx.lineWidth = (2.5 * (1 - k) + 0.5) * fxScale;
    ctx.beginPath(); ctx.arc(r.x, r.y, rad, 0, Math.PI * 2); ctx.stroke();
    if (k < 0.8) {
      ctx.fillStyle = hexA(r.color, (1 - k / 0.8) * 0.95);
      ctx.font = FX_PALETTE.rippleLabelFont(13 * fxScale);
      ctx.textAlign = "center";
      ctx.fillText(r.label, r.x, r.y - rad - 8);
    }
  }

  // ---- scroll chevrons ----
  for (let i = chevrons.length - 1; i >= 0; i--) {
    const c = chevrons[i];
    const k = (now - c.t) / CHEVRON_MS;
    if (k >= 1) { chevrons.splice(i, 1); continue; }
    const y = c.y + c.dir * k * 46 * fxScale;
    ctx.strokeStyle = `rgba(${FX_PALETTE.chevron},${(1 - k) * 0.95})`;
    ctx.lineWidth = 3 * fxScale;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(c.x - 9 * fxScale, y + c.dir * 7 * fxScale);
    ctx.lineTo(c.x, y);
    ctx.lineTo(c.x + 9 * fxScale, y + c.dir * 7 * fxScale);
    ctx.stroke();
  }

  // ---- decay speed & trackpoint tilt ----
  S.vx *= 0.86; S.vy *= 0.86;
  S.speed = Math.hypot(S.vx, S.vy) * 1000;
  if (S.speed < 8) { S.speed = 0; S.vx = 0; S.vy = 0; }
  updatePointerReadouts();
  if (window.tourEngine) tourEngine.onPointerSpeed(S.speed);
  drawCompass();
  updateTrackpointTilt();

  const busy = trail.length > 1 || ripples.length || chevrons.length ||
    S.speed > 0 || (S.lastPointer && now - S.lastPointer.t < 1700);
  if (busy) { rafId = requestAnimationFrame(frame); }
  else { rafOn = false; ctx.clearRect(0, 0, cw, ch); drawCompass(); }
}

function hexA(hex, a) {
  const r = parseInt(hex.slice(1, 3), 16), g = parseInt(hex.slice(3, 5), 16), b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${a.toFixed(3)})`;
}

// ---------- pointer events ----------
document.addEventListener("pointermove", (e) => {
  const now = performance.now();
  const pts = e.getCoalescedEvents ? e.getCoalescedEvents() : [e];
  let moved = 0;
  for (const p of pts) {
    const prev = S.lastPointer;
    const cur = { x: p.clientX, y: p.clientY, t: now };
    if (prev) {
      const d = Math.hypot(cur.x - prev.x, cur.y - prev.y);
      moved += d;
      if (d > 2) {
        trail.push({ x: cur.x, y: cur.y, t: now, break: d > 180 });
        if (trail.length > 900) trail.shift();
      }
      const dt = Math.max(now - prev.t, 4);
      const k = 0.25;
      S.vx += ((cur.x - prev.x) / dt - S.vx) * k;
      S.vy += ((cur.y - prev.y) / dt - S.vy) * k;
    } else {
      trail.push({ x: cur.x, y: cur.y, t: now, break: true });
    }
    S.lastPointer = cur;
  }
  if (moved > 0) {
    autoLayerSimPointerInput();
    S.distPx += moved;
    if (S.attract) {
      S.attractMove += moved;
      if (S.attractMove > 26) touchInput();
    } else {
      touchInput();
    }
    S.moveMission = (S.moveMission || 0) + moved;
    if (S.moveMission > 250) missionDone("move");
  }
  wake();
}, { passive: true });

document.addEventListener("pointerdown", (e) => {
  touchInput();
  autoLayerSimPointerInput();
  const idx = e.button === 1 ? 1 : e.button === 2 ? 2 : 0;
  const b = BTN[idx];
  S.clicks[b.name]++;
  const pill = $("pill-" + b.name);
  pill.querySelector("b").textContent = S.clicks[b.name];
  pill.classList.add("active");
  addInputFeed("click-" + b.name, b.label);
  ripples.push({ x: e.clientX, y: e.clientY, t: performance.now(), color: b.color, label: e.pointerType === "touch" ? "タッチ" : b.label });
  missionDone("click");
  wake();
});
document.addEventListener("pointerup", (e) => {
  const idx = e.button === 1 ? 1 : e.button === 2 ? 2 : 0;
  $("pill-" + BTN[idx].name).classList.remove("active");
});

// ---------- wheel / scroll ----------
let scrollTimer = 0;
document.addEventListener("wheel", (e) => {
  e.preventDefault();
  touchInput();
  autoLayerSimPointerInput();
  const amt = Math.abs(e.deltaY) + Math.abs(e.deltaX);
  S.scrollTotal += amt;
  $("numScroll").textContent = Math.round(S.scrollTotal).toLocaleString();

  const dir = e.deltaY === 0 ? 0 : e.deltaY > 0 ? 1 : -1;
  if (dir !== 0) {
    $("scrollUp").classList.toggle("hot", dir < 0);
    $("scrollDown").classList.toggle("hot", dir > 0);
    const fill = $("scrollBarFill");
    fill.classList.remove("up", "down");
    void fill.offsetWidth;
    fill.classList.add(dir < 0 ? "up" : "down");
    const n = performance.now();
    const rippleMaxRadius = Math.max(70, 0.08 * Math.min(cw, ch));
    const fxScale = rippleMaxRadius / 70;
    for (let i = 0; i < 3; i++) {
      chevrons.push({ x: e.clientX, y: e.clientY - 20 + i * 12 * fxScale * dir, t: n, dir });
    }
    while (chevrons.length > 60) chevrons.shift();
    const ring = $("tpRing");
    ring.classList.remove("pulse");
    void ring.offsetWidth;
    ring.classList.add("pulse");
    addInputFeed(dir < 0 ? "scroll-up" : "scroll-down", dir < 0 ? "スクロール ↑" : "スクロール ↓");
  }
  clearTimeout(scrollTimer);
  scrollTimer = setTimeout(() => {
    $("scrollUp").classList.remove("hot");
    $("scrollDown").classList.remove("hot");
    $("scrollBarFill").classList.remove("up", "down");
  }, 320);
  missionDone("scroll");
  wake();
}, { passive: false });

// ---------- readouts ----------
function updatePointerReadouts() {
  $("numSpeed").textContent = Math.round(S.speed).toLocaleString();
  const meters = (S.distPx / 96) * 0.0254;
  $("numDist").innerHTML = meters.toFixed(1) + "<i> m</i>";
}

function updateTrackpointTilt() {
  const cap = $("tpCap");
  if (!cap) return;
  const max = 7;
  const tx = Math.max(-max, Math.min(max, S.vx * 9));
  const ty = Math.max(-max, Math.min(max, S.vy * 9));
  cap.style.transform = `translate(${tx.toFixed(1)}px, ${ty.toFixed(1)}px)`;
  cap.style.setProperty("--tp-glow", Math.min(S.speed / 1600, 1).toFixed(2));
}

// ---------- compass ----------
const compass = $("compass");
const cctx = compass.getContext("2d");
function sizeCompass() {
  const d = Math.min(window.devicePixelRatio || 1, 2);
  compass.width = Math.round(150 * d);
  compass.height = Math.round(150 * d);
  compass.style.width = "150px";
  compass.style.height = "150px";
  cctx.setTransform(d, 0, 0, d, 0, 0);
}
function drawCompass() {
  const w = 150, cx = w / 2, cy = w / 2;
  cctx.clearRect(0, 0, w, w);
  // rings + ticks
  cctx.strokeStyle = `rgba(${FX_PALETTE.compass.ring},0.12)`;
  cctx.lineWidth = 1;
  for (const r of [24, 44, 64]) {
    cctx.beginPath(); cctx.arc(cx, cy, r, 0, Math.PI * 2); cctx.stroke();
  }
  for (let a = 0; a < 12; a++) {
    const ang = (a * Math.PI) / 6;
    cctx.beginPath();
    cctx.moveTo(cx + Math.cos(ang) * 58, cy + Math.sin(ang) * 58);
    cctx.lineTo(cx + Math.cos(ang) * 64, cy + Math.sin(ang) * 64);
    cctx.stroke();
  }
  // needle
  if (S.speed > 0) {
    const ang = Math.atan2(S.vy, S.vx);
    const len = 12 + Math.min(S.speed / 2400, 1) * 50;
    const g = cctx.createLinearGradient(cx, cy, cx + Math.cos(ang) * len, cy + Math.sin(ang) * len);
    g.addColorStop(0, `rgba(${FX_PALETTE.compass.needleStart},0.15)`);
    g.addColorStop(1, FX_PALETTE.compass.needle);
    cctx.strokeStyle = g;
    cctx.lineWidth = 4;
    cctx.lineCap = "round";
    cctx.beginPath();
    cctx.moveTo(cx, cy);
    cctx.lineTo(cx + Math.cos(ang) * len, cy + Math.sin(ang) * len);
    cctx.stroke();
    // arrow head
    cctx.fillStyle = FX_PALETTE.compass.needle;
    cctx.save();
    cctx.translate(cx + Math.cos(ang) * len, cy + Math.sin(ang) * len);
    cctx.rotate(ang);
    cctx.beginPath();
    cctx.moveTo(6, 0); cctx.lineTo(-3, -4.5); cctx.lineTo(-3, 4.5);
    cctx.closePath(); cctx.fill();
    cctx.restore();
  }
  // hub
  cctx.fillStyle = FX_PALETTE.compass.hub;
  cctx.beginPath(); cctx.arc(cx, cy, 4.5, 0, Math.PI * 2); cctx.fill();
}

// =============================================================
// Typing practice
// =============================================================
const phraseLine = $("phraseLine");
let phrases = [], phraseIdx = 0, phrase = "", spans = [], pos = 0;
let phraseStart = 0, correctTotal = 0, errorTotal = 0, clears = 0;
let nextTimer = 0;

function shuffle(a) {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function practiceInit() {
  phrases = shuffle(PRACTICE_PHRASES.concat(BOARD.phrases || []));
  phraseIdx = -1;
  correctTotal = 0; errorTotal = 0; clears = 0;
  $("statClears").textContent = "0";
  $("statAcc").innerHTML = "100<i>%</i>";
  $("statWpm").textContent = "0";
  practiceNext();
}

function practiceNext() {
  clearTimeout(nextTimer);
  phraseIdx = (phraseIdx + 1) % phrases.length;
  phrase = phrases[phraseIdx];
  pos = 0;
  phraseStart = 0;
  phraseLine.innerHTML = "";
  spans = [];
  for (const ch of phrase) {
    const sp = document.createElement("span");
    sp.textContent = ch;
    phraseLine.appendChild(sp);
    spans.push(sp);
  }
  updateCaret();
}

function updateCaret() {
  spans.forEach((sp, i) => sp.classList.toggle("cur", i === pos));
}

function practiceChar(ch) {
  if (pos >= phrase.length) return;
  if (!phraseStart) phraseStart = performance.now();
  const sp = spans[pos];
  if (ch === phrase[pos]) {
    sp.classList.remove("cur", "shake");
    sp.classList.add("ok");
    if (sp.dataset.err) sp.classList.add("was-ng");
    pos++;
    correctTotal++;
    updateCaret();
    updatePracticeStats();
    if (pos === phrase.length) practiceComplete();
  } else {
    errorTotal++;
    sp.dataset.err = "1";
    sp.classList.remove("shake");
    void sp.offsetWidth;
    sp.classList.add("shake");
    updatePracticeStats();
  }
}

function practiceBackspace() {
  if (pos > 0 && pos <= phrase.length) {
    pos--;
    const sp = spans[pos];
    sp.classList.remove("ok", "was-ng");
    correctTotal = Math.max(0, correctTotal - 1);
    updateCaret();
  }
}

function updatePracticeStats() {
  if (phraseStart && pos > 0) {
    const min = (performance.now() - phraseStart) / 60000;
    if (min > 0.005) $("statWpm").textContent = Math.round(pos / 5 / min);
  }
  const total = correctTotal + errorTotal;
  const acc = total ? Math.round((correctTotal / total) * 100) : 100;
  $("statAcc").innerHTML = acc + "<i>%</i>";
}

function practiceComplete() {
  clears++;
  $("statClears").textContent = clears;
  const flash = $("clearFlash");
  flash.classList.add("show");
  nextTimer = setTimeout(() => {
    flash.classList.remove("show");
    practiceNext();
  }, 900);
}

// =============================================================
// Free typing (IME-aware)
// =============================================================
const hiddenInput = $("hiddenInput");
const freeDisplay = $("freeDisplay");
let composing = false, compText = "";

function insertText(t) {
  hiddenInput.value += t;
  renderFree();
}

hiddenInput.addEventListener("input", () => {
  if (hiddenInput.value.length > FREE_TEXT_MAX) {
    hiddenInput.value = hiddenInput.value.slice(-FREE_TEXT_MAX);
  }
  renderFree();
});
hiddenInput.addEventListener("compositionstart", () => { composing = true; compText = ""; renderFree(); });
hiddenInput.addEventListener("compositionupdate", (e) => { compText = e.data || ""; renderFree(); });
hiddenInput.addEventListener("compositionend", () => { composing = false; compText = ""; renderFree(); });
hiddenInput.addEventListener("blur", () => {
  if (S.freeMode) setTimeout(() => { if (S.freeMode) hiddenInput.focus({ preventScroll: true }); }, 40);
});

function escapeHtml(s) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function renderFree() {
  const v = hiddenInput.value;
  if (!v && !composing) {
    freeDisplay.innerHTML = `<span id="freeEmpty">ここに入力した文字が表示されます</span>`;
    return;
  }
  let html;
  if (composing && compText && v.endsWith(compText)) {
    const head = v.slice(0, v.length - compText.length);
    html = escapeHtml(head) + `<span class="comp">${escapeHtml(compText)}</span>`;
  } else {
    html = escapeHtml(v);
  }
  freeDisplay.innerHTML = html + `<span class="caret"></span>`;
  freeDisplay.scrollTop = freeDisplay.scrollHeight;
}

// ---------- mode tabs ----------
function setMode(free) {
  if (free && !jpInputEnabled()) free = false; // guard: no free tab when JP off
  S.freeMode = free;
  $("tabFree").classList.toggle("active", free);
  $("tabPractice").classList.toggle("active", !free);
  $("freeView").hidden = !free;
  $("practiceView").hidden = free;
  if (free) hiddenInput.focus({ preventScroll: true });
  else hiddenInput.blur();
}
$("tabPractice").addEventListener("click", () => setMode(false));
$("tabFree").addEventListener("click", () => setMode(true));

// ---------- Japanese (IME) free-input toggle ----------
// The entire IME/candidate-window surface lives in the free-input tab.
// Turning this off hides the tab and never focuses the textarea, so the
// kiosk has no editable field for the OS IME to attach to — the risk is
// removed structurally, and practice mode (IME-inert) is untouched.
const JP_INPUT_KEY = "olsk60.jpInput";

function jpInputEnabled() {
  try {
    const v = localStorage.getItem(JP_INPUT_KEY);
    if (v === "1") return true;
    if (v === "0") return false;
  } catch (_) { /* localStorage blocked (e.g. file://) — fall through */ }
  return JP_INPUT_DEFAULT;
}

function applyJpInput() {
  const on = jpInputEnabled();
  $("tabFree").hidden = !on;
  if (!on && S.freeMode) setMode(false); // leave free view if it was open
  const btn = $("jpToggleBtn");
  if (btn) btn.textContent = "日本語入力: " + (on ? "オン" : "オフ");
}

function setJpInput(on) {
  try { localStorage.setItem(JP_INPUT_KEY, on ? "1" : "0"); } catch (_) { /* ignore */ }
  applyJpInput();
}

$("jpToggleBtn").addEventListener("click", () => setJpInput(!jpInputEnabled()));

function autoLayerSimProfile() {
  if (!BOARD || !BOARD.autoLayerSim) return null;
  const sim = BOARD.autoLayerSim;
  if (!Number.isInteger(sim.layer) || !Array.isArray(sim.delays) || !sim.delays.length) return null;
  return sim;
}

function autoLayerSimSaved() {
  const profile = autoLayerSimProfile();
  const fallbackDelay = profile ? profile.defaultDelay : AUTO_LAYER_SIM_DEFAULT.delay;
  const fallback = { on: AUTO_LAYER_SIM_DEFAULT.on, delay: fallbackDelay };
  try {
    const raw = localStorage.getItem(AUTO_LAYER_SIM_KEY);
    if (!raw) return fallback;
    const saved = JSON.parse(raw);
    const delay = profile && profile.delays.includes(saved.delay) ? saved.delay : fallback.delay;
    return { on: saved.on !== false, delay };
  } catch (_) {
    return fallback;
  }
}

function setAutoLayerSimConfig(next) {
  const profile = autoLayerSimProfile();
  const current = autoLayerSimSaved();
  const delay = profile && profile.delays.includes(next.delay) ? next.delay : current.delay;
  const config = { on: next.on !== false, delay };
  try { localStorage.setItem(AUTO_LAYER_SIM_KEY, JSON.stringify(config)); } catch (_) { /* ignore */ }
  applyAutoLayerSimControls();
  if (!config.on) autoLayerSimCancel();
}

function applyAutoLayerSimControls() {
  const profile = autoLayerSimProfile();
  const config = autoLayerSimSaved();
  const toggle = $("autoLayerSimToggleBtn");
  const select = $("autoLayerSimDelaySelect");
  if (!toggle || !select) return;
  const enabled = !!profile;
  toggle.disabled = !enabled;
  select.disabled = !enabled;
  toggle.textContent = "オートレイヤー表示シミュレーション: " + (enabled && config.on ? "オン" : "オフ");
  select.innerHTML = "";
  const delays = profile ? profile.delays : [AUTO_LAYER_SIM_DEFAULT.delay];
  for (const delay of delays) {
    const option = document.createElement("option");
    option.value = String(delay);
    option.textContent = delay + "ms";
    select.appendChild(option);
  }
  select.value = String(config.delay);
}

$("autoLayerSimToggleBtn").addEventListener("click", () => {
  const config = autoLayerSimSaved();
  setAutoLayerSimConfig({ on: !config.on, delay: config.delay });
});

$("autoLayerSimDelaySelect").addEventListener("change", (event) => {
  const config = autoLayerSimSaved();
  setAutoLayerSimConfig({ on: config.on, delay: Number(event.target.value) });
});

function savedDefaultBoard() {
  try {
    const id = localStorage.getItem(DEFAULT_BOARD_KEY);
    return BOARDS.find((profile) => profile.id === id) || DEFAULT_BOARD;
  } catch (_) { return DEFAULT_BOARD; }
}

function applyDefaultBoardSelect() {
  const select = $("defaultBoardSelect");
  select.innerHTML = "";
  for (const profile of BOARDS) {
    const option = document.createElement("option");
    option.value = profile.id;
    option.textContent = profile.name;
    select.appendChild(option);
  }
  select.value = savedDefaultBoard().id;
}

$("defaultBoardSelect").addEventListener("change", (event) => {
  const profile = BOARDS.find((board) => board.id === event.target.value);
  if (!profile) return;
  try { localStorage.setItem(DEFAULT_BOARD_KEY, profile.id); } catch (_) { /* ignore */ }
  applyBoard(profile);
});

// clicking anywhere in free mode keeps the textarea focused
document.addEventListener("pointerup", () => {
  if (S.freeMode) setTimeout(() => hiddenInput.focus({ preventScroll: true }), 0);
});

// =============================================================
// Missions
// =============================================================
const missions = { type: false, move: false, click: false, scroll: false };
let missionBannerTimer = 0;

function missionDone(name) {
  if (missions[name] || S.attract) return;
  missions[name] = true;
  const li = $("m-" + name);
  li.classList.add("done", "flash");
  setTimeout(() => li.classList.remove("flash"), 550);
  if (Object.values(missions).every(Boolean)) {
    const d = $("missionDone");
    d.classList.add("show");
    clearTimeout(missionBannerTimer);
    missionBannerTimer = setTimeout(() => d.classList.remove("show"), 2600);
  }
}

function missionsReset() {
  for (const k of Object.keys(missions)) missions[k] = false;
  S.moveMission = 0;
  document.querySelectorAll("#missions li").forEach((li) => li.classList.remove("done", "flash"));
  $("missionDone").classList.remove("show");
}

// =============================================================
// Attract / idle / reset
// =============================================================
function attractShow() {
  S.attract = true;
  S.attractMove = 0;
  $("attract").classList.remove("hidden");
}
function attractHide() {
  S.attract = false;
  $("attract").classList.add("hidden");
}

function touchInput() {
  S.lastInput = performance.now();
  if (S.attract) attractHide();
}

setInterval(() => {
  if (kioskDisplayEnabled() && !S.attract && !(window.tourEngine && tourEngine.isRunning()) && performance.now() - S.lastInput > IDLE_RESET_MS) {
    resetAll(true);
  }
}, 5000);

function resetAll(showAttract) {
  // counters
  S.keyCount = 0; S.distPx = 0; S.scrollTotal = 0;
  S.clicks = { L: 0, M: 0, R: 0 };
  S.vx = 0; S.vy = 0; S.speed = 0; S.lastPointer = null; S.moveMission = 0;
  $("keyCount").textContent = "0";
  $("lastKey").textContent = "—";
  $("numScroll").textContent = "0";
  clearInputFeed();
  updatePointerReadouts();
  for (const n of ["L", "M", "R"]) {
    const pill = $("pill-" + n);
    pill.querySelector("b").textContent = "0";
    pill.classList.remove("active");
  }
  // canvas
  trail.length = 0; ripples.length = 0; chevrons.length = 0;
  ctx.clearRect(0, 0, cw, ch);
  drawCompass();
  // keyboard heat
  heatCounts.clear();
  document.querySelectorAll(".keycap").forEach((k) => k.style.removeProperty("--heat"));
  document.querySelectorAll(".key.down").forEach((k) => k.classList.remove("down"));
  // typing
  hiddenInput.value = ""; composing = false; compText = "";
  renderFree();
  practiceInit();
  setMode(false);
  // missions
  missionsReset();
  $("staffMenu").hidden = true;
  vialOnIdleReset();
  if (showAttract && kioskDisplayEnabled()) attractShow();
  else attractHide();
}

$("resetBtn").addEventListener("click", (e) => {
  e.stopPropagation();
  resetAll(kioskDisplayEnabled());
});

// =============================================================
// Global guards + boot
// =============================================================
document.addEventListener("contextmenu", (e) => e.preventDefault());
document.addEventListener("selectstart", (e) => {
  if (e.target !== hiddenInput) e.preventDefault();
});
document.addEventListener("dragstart", (e) => e.preventDefault());

// staff exit hatch: tap/click the logo 5 times within 2.5 seconds
let brandTaps = [];
document.querySelector(".brand").addEventListener("pointerdown", () => {
  const now = performance.now();
  brandTaps = brandTaps.filter((t) => now - t < 2500);
  brandTaps.push(now);
  if (brandTaps.length >= 5) {
    brandTaps = [];
    $("staffMenu").hidden = false;
  }
});

function applyWindowSizeControls() {
  const group = $("windowSizeControls");
  if (group) group.hidden = !S.hostCanResize || kioskDisplayEnabled();
}

document.querySelectorAll("[data-window-size]").forEach((btn) => {
  btn.addEventListener("click", () => {
    if (!S.hostCanResize || kioskDisplayEnabled() || !(window.chrome && window.chrome.webview)) return;
    const [w, h] = btn.dataset.windowSize.split("x").map((v) => Number(v));
    window.chrome.webview.postMessage({ op: "resize", w, h });
  });
});
$("staffCancelBtn").addEventListener("click", () => { $("staffMenu").hidden = true; });
$("staffExitBtn").addEventListener("click", () => {
  if (window.chrome && window.chrome.webview) {
    window.chrome.webview.postMessage({ type: "exit" });
  } else {
    window.close(); // browser mode: best effort
    $("staffMenu").hidden = true;
  }
});

// if the window ever loses focus (browser mode), don't leave keys stuck lit
window.addEventListener("blur", () => {
  document.querySelectorAll(".key.down").forEach((k) => k.classList.remove("down"));
  for (const n of ["L", "M", "R"]) $("pill-" + n).classList.remove("active");
});

window.addEventListener("resize", () => { resizeCanvas(); sizeCompass(); fitKeyboard(); drawCompass(); });

// =============================================================
// Vial integration
// Reads the live keymap over Raw HID (kiosk host bridge or WebHID)
// and paints real legends per layer. When the board is unlocked,
// the Vial matrix tester is polled (~30 Hz) so every physical key —
// including MO/LT keys that emit no HID output — lights up, and the
// displayed layer follows MO/LT/TG/TO presses.
// While locked: degraded mode = legends + manual layer tabs only.
// =============================================================
let VS = {
  transport: null,
  dev: null,
  deviceName: "",
  mode: "none",          // none | kiosk | webhid
  connected: false,
  unlocked: false,
  unlocking: false,
  rows: BOARD.matrix.rows,
  cols: BOARD.matrix.cols,
  layers: 0,
  keymap: null,          // [layer][row][col] -> keycode
  custom: BOARD.customKeycodes,
  viewLayer: 0,
  // live layer-state approximation (QMK semantics, simplified)
  defaultLayer: 0,
  toggleMask: 0,
  momentary: new Map(),  // "r,c" -> layer held via MO/LT/TT
  matrixPrev: [],
  pollTimer: 0,
  pollErrors: 0,
  retryTimer: 0,
  unlockTimer: 0,
  unlockKeys: [],
  lastError: "",   // shown in the staff menu for on-site diagnosis
  lastSwitch: "",
  candidates: [],
};

const SELECTED_DEVICE_UID_KEY = "olsk60.selectedDeviceUid";

const vialBadge = $("vialBadge");
const layerTabsEl = $("layerTabs");
const KB_CAPTION_STATIC = $("kbCaption").textContent;

function applyDeviceName() {
  const el = $("kbDeviceName");
  const name = VS.connected ? VS.deviceName : "";
  el.hidden = !name;
  el.textContent = name ? "接続中: " + name : "";
}

function vialBadgeSet(cls, text) {
  vialBadge.hidden = false;
  vialBadge.className = "badge " + (cls || "");
  vialBadge.textContent = text;
}

function vialDescribe(kc) {
  return VialKeycodes.describe(kc, { protocol: VS.dev ? VS.dev.vialProtocol : 6, customKeycodes: VS.custom });
}

// ---------- legends ----------
// Display rule: KC_TRNS inherits the legend of the highest lower layer
// (numeric walk — approximation of QMK's active-layer fallthrough).
function vialDisplayKeycode(layer, r, c) {
  for (let l = layer; l >= 0; l--) {
    const kc = VS.keymap[l][r][c];
    if (kc !== 0x0001) return { kc, from: l };
    if (l === 0) return { kc: 0x0001, from: 0 };
  }
  return { kc: 0x0000, from: 0 };
}

function applyLayerView() {
  if (!VS.connected || !VS.keymap) return;
  const layer = VS.viewLayer;
  for (const [pos, el] of matrixEls) {
    const [r, c] = pos.split(",").map(Number);
    const { kc, from } = vialDisplayKeycode(layer, r, c);
    const d = vialDescribe(kc);
    const label = d.text || (d.kind === "none" ? "" : d.text);
    renderCap(el, el._key, {
      label,
      shift: d.sub || d.shift || "",
      small: label.length > 2,
    });
    el.classList.toggle("vial-inherit", from !== layer && layer > 0);
    el.classList.toggle("vial-none", d.kind === "none");
    el.classList.toggle("layer", d.kind === "layer");
  }
  for (const b of layerTabsEl.children) {
    b.classList.toggle("active", Number(b.dataset.layer) === layer);
  }
}

const AUTO_LAYER_SIM = {
  active: false,
  baseLayer: 0,
  deadline: 0,
  timer: 0,
};

function autoLayerSimBlocked() {
  return VS.momentary.size > 0 || (window.tourEngine && tourEngine.isRunning());
}

function autoLayerSimAvailable() {
  const profile = autoLayerSimProfile();
  if (!profile || !VS.connected || !VS.keymap) return false;
  const config = autoLayerSimSaved();
  return config.on && profile.layer < VS.layers;
}

function autoLayerSimCancel() {
  clearTimeout(AUTO_LAYER_SIM.timer);
  AUTO_LAYER_SIM.timer = 0;
  AUTO_LAYER_SIM.deadline = 0;
  AUTO_LAYER_SIM.active = false;
}

function autoLayerSimSchedule() {
  clearTimeout(AUTO_LAYER_SIM.timer);
  const wait = Math.max(0, AUTO_LAYER_SIM.deadline - performance.now());
  AUTO_LAYER_SIM.timer = setTimeout(autoLayerSimExpire, wait);
}

function autoLayerSimExpire() {
  AUTO_LAYER_SIM.timer = 0;
  if (!AUTO_LAYER_SIM.active) return;
  if (!autoLayerSimAvailable()) {
    autoLayerSimCancel();
    return;
  }
  if (autoLayerSimBlocked()) {
    AUTO_LAYER_SIM.deadline = performance.now() + 50;
    autoLayerSimSchedule();
    return;
  }
  if (performance.now() < AUTO_LAYER_SIM.deadline) {
    autoLayerSimSchedule();
    return;
  }
  VS.viewLayer = Math.max(0, Math.min(AUTO_LAYER_SIM.baseLayer, VS.layers - 1));
  autoLayerSimCancel();
  applyLayerView();
}

function autoLayerSimPointerInput() {
  if (!autoLayerSimAvailable() || autoLayerSimBlocked()) return;
  const profile = autoLayerSimProfile();
  const config = autoLayerSimSaved();
  if (!AUTO_LAYER_SIM.active) {
    AUTO_LAYER_SIM.active = true;
    AUTO_LAYER_SIM.baseLayer = VS.viewLayer;
    if (VS.viewLayer !== profile.layer) {
      VS.viewLayer = profile.layer;
      applyLayerView();
    }
  }
  AUTO_LAYER_SIM.deadline = performance.now() + config.delay;
  autoLayerSimSchedule();
}

function vialRestoreStatic() {
  for (const [, el] of matrixEls) {
    renderCap(el, el._key);
    el.classList.remove("vial-inherit", "vial-none", "unlock-target");
    el.classList.toggle("layer", !!el._key.layer);
  }
  layerTabsEl.hidden = true;
  layerTabsEl.innerHTML = "";
  $("kbCaption").textContent = KB_CAPTION_STATIC;
}

function buildLayerTabs() {
  layerTabsEl.innerHTML = "";
  for (let i = 0; i < VS.layers; i++) {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "tab layer-tab";
    b.textContent = "L" + i;
    b.dataset.layer = i;
    b.addEventListener("click", () => {
      autoLayerSimCancel();
      VS.viewLayer = i;
      applyLayerView();
    });
    layerTabsEl.appendChild(b);
  }
  layerTabsEl.hidden = false;
}

// ---------- live layer state (matrix tester) ----------
function vialEffectiveLayer() {
  let mask = 1 | (1 << VS.defaultLayer) | VS.toggleMask;
  for (const [, l] of VS.momentary) mask |= 1 << l;
  mask &= (1 << VS.layers) - 1 || 1;
  return 31 - Math.clz32(mask);
}

// behavior rule: resolve KC_TRNS through the currently active layer
// stack, highest active layer first (QMK fallthrough approximation)
function vialResolveKeycode(r, c) {
  let mask = 1 | (1 << VS.defaultLayer) | VS.toggleMask;
  for (const [, l] of VS.momentary) mask |= 1 << l;
  for (let l = VS.layers - 1; l >= 0; l--) {
    if (!(mask & (1 << l))) continue;
    const kc = VS.keymap[l][r][c];
    if (kc !== 0x0001) return kc;
  }
  return 0x0000;
}

function vialMatrixEdge(r, c, down) {
  const pos = r + "," + c;
  const el = matrixEls.get(pos);
  if (el) el.classList.toggle("down", down);

  if (down) {
    const d = vialDescribe(vialResolveKeycode(r, c));
    if (d.kind === "layer" && typeof d.layer === "number") {
      switch (d.hold) {
        case "mo": case "lt": case "tt": case "lm":
          autoLayerSimCancel();
          VS.momentary.set(pos, d.layer);
          break;
        case "tg":
          VS.toggleMask ^= 1 << d.layer;
          break;
        case "to": // TO(n): all layers off, n on
          VS.toggleMask = d.layer === 0 ? 0 : 1 << d.layer;
          VS.momentary.clear();
          break;
        case "df":
          VS.defaultLayer = d.layer;
          break;
        // osl: ignored (one-shot state not tracked in this approximation)
      }
    }
  } else {
    VS.momentary.delete(pos);
  }

  const eff = vialEffectiveLayer();
  if (eff !== VS.viewLayer) {
    VS.viewLayer = eff;
    applyLayerView();
  }
}

function vialHandleMatrix(state) {
  let any = false;
  const pressedKeys = [];
  for (let r = 0; r < VS.rows; r++) {
    const prev = VS.matrixPrev[r] || 0;
    const cur = state[r];
    for (let c = 0; c < VS.cols; c++) {
      if (cur & (1 << c)) pressedKeys.push([r, c]);
    }
    const diff = prev ^ cur;
    if (!diff) continue;
    // bit c of the reconstructed row value = matrix column c
    for (let c = 0; c < VS.cols; c++) {
      if (diff & (1 << c)) {
        vialMatrixEdge(r, c, !!(cur & (1 << c)));
        any = true;
      }
    }
    VS.matrixPrev[r] = cur;
  }
  if (window.tourEngine) tourEngine.onMatrixState(pressedKeys, vialEffectiveLayer());
  if (any) touchInput();
}

function vialStartPolling() {
  clearTimeout(VS.pollTimer);
  VS.matrixPrev = new Array(VS.rows).fill(0);
  const tick = async () => {
    if (!VS.connected || !VS.unlocked || VS.unlocking) return;
    if (!document.hidden) {
      try {
        const state = await VS.dev.readMatrix(VS.rows, VS.cols);
        vialHandleMatrix(state);
        VS.pollErrors = 0;
      } catch (e) {
        if (++VS.pollErrors > 5) {
          vialDisconnect("matrix poll failed");
          return;
        }
      }
    }
    VS.pollTimer = setTimeout(tick, 33); // ~30 Hz
  };
  VS.pollTimer = setTimeout(tick, 33);
}

// ---------- connection ----------
async function vialOnConnected() {
  const dev = VS.dev;
  const profile = findBoard(dev.uid, VS.transport.vendorId, VS.transport.productId);
  if (profile && profile !== BOARD) applyBoard(profile);

  // firmware-embedded vial.json (XZ) — kiosk host decompresses it.
  // Browser/WebHID mode has no XZ decoder: fall back to layout.js data.
  // The device is untrusted input: sanity-clamp everything it claims,
  // otherwise a hostile board could make us allocate/poll absurd sizes.
  let def = null;
  try {
    def = await dev.readDefinition();
    const dim = (v) => Number.isInteger(v) && v >= 1 && v <= 32;
    if (def && def.matrix && dim(def.matrix.rows) && dim(def.matrix.cols)) {
      VS.rows = def.matrix.rows;
      VS.cols = def.matrix.cols;
    }
    if (def && Array.isArray(def.customKeycodes)) {
      VS.custom = def.customKeycodes.slice(0, 64)
        .map((k) => String((k && (k.shortName || k.name)) || ""));
    }
  } catch (_) { /* definition is optional */ }

  VS.layers = Math.max(1, Math.min(await dev.readLayerCount(), 16));
  VS.keymap = await dev.readKeymap(VS.layers, VS.rows, VS.cols);

  let unlocked = false;
  try {
    const st = await dev.readUnlockStatus();
    unlocked = st.unlocked;
    VS.unlockKeys = st.keys;
  } catch (_) { /* older firmware — treat as locked */ }

  VS.connected = true;
  VS.deviceName = (def && def.name) || VS.transport.product || "";
  applyDeviceName();
  VS.unlocked = unlocked;
  VS.viewLayer = 0;
  VS.defaultLayer = 0;
  VS.toggleMask = 0;
  VS.momentary.clear();
  autoLayerSimCancel();

  buildLayerTabs();
  applyLayerView();
  vialStaffRefresh();
  if (window.tourEngine) tourEngine.updateGuideButton();

  if (VS.unlocked) {
    vialBadgeSet("vial-live", "VIAL LIVE");
    $("kbCaption").textContent =
      "Vial接続中：実際のキーマップを表示 ・ 物理押下を検出（MO/LTキーも光ります） ・ レイヤーは自動追従します";
    vialStartPolling();
  } else {
    vialBadgeSet("vial-locked", "VIAL 接続（ロック中）");
    $("kbCaption").textContent =
      "Vial接続中：実際のキーマップを表示 ・ レイヤーはタブで切替（マトリクス検出はunlock後に有効）";
  }
}

function vialDisconnect(reason, scheduleRetry = true) {
  clearTimeout(VS.pollTimer);
  clearInterval(VS.unlockTimer);
  autoLayerSimCancel();
  if (VS.transport) {
    try { VS.transport.close(); } catch (_) { /* ignore */ }
  }
  VS.transport = null;
  VS.dev = null;
  VS.connected = false;
  VS.deviceName = "";
  applyDeviceName();
  VS.unlocked = false;
  VS.unlocking = false;
  VS.keymap = null;
  vialRestoreStatic();
  vialStaffRefresh();
  if (window.tourEngine) tourEngine.updateGuideButton();
  vialBadgeSet("", "VIAL 未接続");
  if (scheduleRetry) vialScheduleRetry();
}

function vialScheduleRetry() {
  clearTimeout(VS.retryTimer);
  VS.retryTimer = setTimeout(() => {
    if (!VS.connected) vialConnect();
  }, 3000);
}

function vialUidHex(uid) {
  return uid ? Array.from(uid, (v) => v.toString(16).padStart(2, "0")).join("") : "";
}

function pickPreferredCandidate(candidates, savedUidHex) {
  return candidates.find((candidate) => savedUidHex && candidate.uidHex === savedUidHex) || candidates[0] || null;
}
window.pickPreferredCandidate = pickPreferredCandidate;

function vialCandidateLabel(uid, vendorId, productId, product) {
  const profile = findBoard(uid, vendorId, productId);
  if (profile) return profile.name;
  if (product) return product;
  if (Number.isInteger(vendorId) && Number.isInteger(productId)) {
    return vendorId.toString(16).padStart(4, "0") + ":" + productId.toString(16).padStart(4, "0");
  }
  return vialUidHex(uid).slice(0, 8) || "不明なデバイス";
}

async function scanVialDevices() {
  const candidates = [];
  if (VS.mode === "kiosk") {
    // Keep one bridge listener for the retry loop; open(index) replaces its HID handle.
    const t = (VS.kioskTransport ||= new KioskHidTransport());
    t.ondisconnect = null;
    let first;
    try { first = await t.open(0); } catch (_) { first = null; }
    const count = first ? Math.max(first.count, 1) : 0;
    for (let index = 0; index < count; index++) {
      try {
        const opened = index === 0 ? first : await t.open(index);
        const dev = new VialDevice(t);
        if (!(await dev.readVialInfo())) continue;
        const uid = dev.uid || null;
        candidates.push({ uid, uidHex: vialUidHex(uid), vendorId: t.vendorId, productId: t.productId,
          product: opened.product || "", label: vialCandidateLabel(uid, t.vendorId, t.productId, opened.product), index });
      } catch (_) { /* a removed or non-Vial interface is not a candidate */ }
    }
    // open(index) owns only one host handle; leave the final probe open so
    // connectToCandidate can replace it without racing an async bridge close.
    if (!candidates.length) t.close();
  } else if (VS.mode === "webhid") {
    const devices = await navigator.hid.getDevices();
    for (const device of devices) {
      let t = null;
      try {
        // The current device is already probed; do not close it during a refresh.
        if (VS.connected && VS.transport && VS.transport._dev === device) {
          const uid = VS.dev.uid || null;
          candidates.push({ uid, uidHex: vialUidHex(uid), vendorId: device.vendorId, productId: device.productId,
            product: device.productName || "", label: vialCandidateLabel(uid, device.vendorId, device.productId, device.productName), device });
          continue;
        }
        t = await WebHidTransport.openDevice(device);
        if (!t) continue;
        const dev = new VialDevice(t);
        if (!(await dev.readVialInfo())) continue;
        const uid = dev.uid || null;
        candidates.push({ uid, uidHex: vialUidHex(uid), vendorId: device.vendorId, productId: device.productId,
          product: device.productName || "", label: vialCandidateLabel(uid, device.vendorId, device.productId, device.productName), device });
      } catch (_) { /* skip devices which cannot be opened or probed */ }
      finally { if (t) t.close(); }
    }
  }
  VS.candidates = candidates;
  return candidates;
}

function savedSelectedDeviceUid() {
  try { return localStorage.getItem(SELECTED_DEVICE_UID_KEY) || ""; } catch (_) { return ""; }
}

function vialSoftTeardown() {
  clearTimeout(VS.pollTimer);
  clearInterval(VS.unlockTimer);
  autoLayerSimCancel();
  const oldTransport = VS.transport;
  if (oldTransport) oldTransport.ondisconnect = null;
  VS.connected = false;
  VS.dev = null;
  VS.unlocked = false;
  VS.unlocking = false;
  VS.keymap = null;
  return oldTransport;
}

async function connectToCandidate(candidate) {
  if (!candidate) return false;
  const oldTransport = vialSoftTeardown();

  const candidateIndex = candidate.index ?? VS.candidates.indexOf(candidate);
  const candidateName = candidate.product || candidate.label;
  const candidateUid = candidate.uidHex ? candidate.uidHex.slice(0, 8) : "UIDなし";
  const switchTarget = "#" + candidateIndex + " " + candidateName + " (" + candidateUid + ")";
  let t = null;
  let lastProbeError = null;
  try {
    if (VS.mode === "webhid" && oldTransport) oldTransport.close();
    let dev = null;
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        if (VS.mode === "kiosk") {
          t = (VS.kioskTransport ||= new KioskHidTransport());
          t.ondisconnect = null;
          const opened = await t.open(candidate.index);
          t.product = opened.product;
        } else {
          t = await WebHidTransport.openDevice(candidate.device);
        }
        if (!t) throw new Error("選択デバイスを開けません");
        dev = new VialDevice(t);
        if (await dev.readVialInfo()) break;
        throw new Error("選択デバイスからVial応答なし");
      } catch (e) {
        lastProbeError = e;
        if (VS.mode === "webhid" && t) t.close();
        t = null;
        if (attempt === 0) await new Promise((resolve) => setTimeout(resolve, 120));
      }
    }
    if (!t || !dev) throw lastProbeError || new Error("選択デバイスからVial応答なし");
    VS.transport = t;
    t.ondisconnect = () => vialDisconnect("device removed");
    VS.dev = dev;
    VS.lastError = "";
    await vialOnConnected();
    if (candidate.uidHex) {
      try { localStorage.setItem(SELECTED_DEVICE_UID_KEY, candidate.uidHex); } catch (_) { /* ignore */ }
    }
    VS.lastSwitch = "切替OK " + switchTarget;
    vialStaffRefresh();
    return true;
  } catch (e) {
    if (VS.mode === "webhid" && t) { try { t.close(); } catch (_) { /* ignore */ } }
    VS.transport = null;
    VS.dev = null;
    VS.deviceName = "";
    VS.lastError = (e && e.message) || String(e);
    VS.lastSwitch = "切替NG " + switchTarget + ": " + VS.lastError;
    vialRestoreStatic();
    applyDeviceName();
    vialStaffRefresh();
    vialScheduleRetry();
    return false;
  }
}

async function vialConnect() {
  if (VS.connected) return;
  try {
    const candidates = await scanVialDevices();
    const candidate = pickPreferredCandidate(candidates, savedSelectedDeviceUid());
    if (!candidate) {
      VS.lastError = VS.mode === "webhid" ? "許可済みデバイスなし（バッジをクリックして選択）" : "デバイスは見つかったがVial応答なし";
      vialStaffRefresh();
      vialScheduleRetry();
      return;
    }
    await connectToCandidate(candidate);
  } catch (e) {
    VS.lastError = (e && e.message) || String(e);
    vialStaffRefresh();
    vialScheduleRetry();
  }
}

function vialInit() {
  if (KioskHidTransport.available()) {
    VS.mode = "kiosk";
    vialBadgeSet("", "VIAL 未接続");
    vialConnect();
  } else if (WebHidTransport.available()) {
    VS.mode = "webhid";
    vialBadgeSet("vial-click", "VIAL 接続（クリック）");
    // WebHID needs a user gesture the first time; afterwards the
    // permission persists and vialConnect() picks the device up.
    vialBadge.addEventListener("click", async () => {
      if (VS.connected) return;
      try {
        const requested = await navigator.hid.requestDevice({ filters: [WebHidTransport.FILTER] });
        const candidates = await scanVialDevices();
        const candidate = candidates.find((item) => item.device === requested[0]) ||
          pickPreferredCandidate(candidates, savedSelectedDeviceUid());
        if (candidate) await connectToCandidate(candidate);
      } catch (_) { /* user cancelled or device error */ }
    });
    vialConnect(); // auto-reconnect to an already-granted device
  }
  // neither → badge stays hidden, static layout only
}

// ---------- staff menu: unlock wizard ----------
function vialStaffRefresh() {
  const line = $("staffVialStatus");
  const btn = $("unlockBtn");
  const controls = $("vialDeviceControls");
  const select = $("vialDeviceSelect");
  const add = $("vialAddDeviceBtn");
  controls.hidden = VS.candidates.length === 0;
  add.hidden = VS.mode !== "webhid";
  select.innerHTML = "";
  for (let i = 0; i < VS.candidates.length; i++) {
    const candidate = VS.candidates[i];
    const option = document.createElement("option");
    option.value = String(i);
    option.textContent = candidate.label + (candidate.uidHex ? " (" + candidate.uidHex.slice(0, 8) + ")" : "");
    option.selected = !!(VS.dev && candidate.uidHex && candidate.uidHex === vialUidHex(VS.dev.uid));
    select.appendChild(option);
  }
  let diag = $("vialDeviceDiag");
  if (!diag) {
    diag = document.createElement("div");
    diag.id = "vialDeviceDiag";
    diag.className = "staff-note";
    controls.after(diag);
  }
  diag.innerHTML = "";
  const connectedUid = VS.dev ? vialUidHex(VS.dev.uid) : "";
  if (!VS.candidates.length) {
    diag.textContent = "検出候補: なし";
  } else {
    for (let i = 0; i < VS.candidates.length; i++) {
      const candidate = VS.candidates[i];
      const row = document.createElement("span");
      const uid = candidate.uidHex ? candidate.uidHex.slice(0, 8) : "UIDなし";
      row.textContent = "#" + (candidate.index ?? i) + " " + (candidate.product || candidate.label) + " (" + uid + ")" +
        (connectedUid && candidate.uidHex === connectedUid ? " ● 接続中" : "");
      diag.appendChild(row);
      diag.appendChild(document.createElement("br"));
    }
  }
  if (VS.lastSwitch) {
    const result = document.createElement("span");
    result.textContent = VS.lastSwitch;
    diag.appendChild(result);
  }
  if (!VS.connected) {
    line.textContent = "未接続（静的レイアウト表示中）" +
      (VS.lastError ? " ／ 直近の失敗: " + VS.lastError : "");
    btn.hidden = true;
  } else if (VS.unlocked) {
    line.textContent = "接続中・unlock済み（マトリクス検出が有効です）";
    btn.hidden = true;
  } else {
    line.textContent = "接続中・ロック中（キーマップ表示のみ）";
    btn.hidden = false;
  }
  $("unlockWizard").hidden = true;
}

$("vialDeviceSelect").addEventListener("change", async (event) => {
  const candidate = VS.candidates[Number(event.target.value)];
  if (!candidate) return;
  await connectToCandidate(candidate);
});

$("vialRescanBtn").addEventListener("click", async () => {
  if (VS.mode === "kiosk" && VS.connected) vialSoftTeardown();
  await vialConnect();
  if (VS.connected && VS.mode === "webhid") await scanVialDevices();
  vialStaffRefresh();
});

$("vialAddDeviceBtn").addEventListener("click", async () => {
  if (VS.mode !== "webhid") return;
  try {
    await navigator.hid.requestDevice({ filters: [WebHidTransport.FILTER] });
    if (!VS.connected) await vialConnect();
    else await scanVialDevices();
  } catch (_) { /* user cancelled or device error */ }
  vialStaffRefresh();
});

function vialUnlockCleanup() {
  clearInterval(VS.unlockTimer);
  VS.unlocking = false;
  for (const [, el] of matrixEls) el.classList.remove("unlock-target");
  $("unlockWizard").hidden = true;
}

async function vialUnlockStart() {
  if (!VS.connected || VS.unlocked || VS.unlocking) return;
  try {
    const st = await VS.dev.readUnlockStatus();
    VS.unlockKeys = st.keys;
  } catch (_) { /* keep whatever we had */ }

  // highlight the combo keys on the on-screen keyboard
  const names = [];
  for (const [r, c] of VS.unlockKeys) {
    const el = matrixEls.get(r + "," + c);
    if (el) {
      el.classList.add("unlock-target");
      names.push(el.querySelector(".keycap")?.textContent || `(${r},${c})`);
    } else {
      names.push(`(${r},${c})`);
    }
  }
  $("unlockHint").textContent =
    "光っているキー（" + (names.join(" と ") || "unlockキー") + "）を数秒間、同時に押し続けてください";
  $("unlockWizard").hidden = false;
  $("unlockBtn").hidden = true;
  $("unlockBarFill").style.width = "0%";

  VS.unlocking = true;
  try {
    await VS.dev.unlockStart();
  } catch (_) { vialUnlockCleanup(); vialStaffRefresh(); return; }

  // firmware decrements a 50 -> 0 counter while the combo is held;
  // unlock_poll must be called repeatedly to drive it.
  VS.unlockTimer = setInterval(async () => {
    try {
      const p = await VS.dev.unlockPoll();
      const pct = Math.round((1 - p.counter / 50) * 100);
      $("unlockBarFill").style.width = Math.max(0, Math.min(100, pct)) + "%";
      if (p.unlocked) {
        vialUnlockCleanup();
        VS.unlocked = true;
        vialStaffRefresh();
        vialBadgeSet("vial-live", "VIAL LIVE");
        $("kbCaption").textContent =
          "Vial接続中：実際のキーマップを表示 ・ 物理押下を検出（MO/LTキーも光ります） ・ レイヤーは自動追従します";
        vialStartPolling();
        if (window.tourEngine) tourEngine.updateGuideButton();
      }
    } catch (_) { /* keep polling; unplug is caught by ondisconnect */ }
  }, 150);
}

$("unlockBtn").addEventListener("click", vialUnlockStart);
$("unlockCancelBtn").addEventListener("click", () => {
  // no cancel command exists in the Vial protocol: the firmware stays in
  // "unlock in progress" (most commands blocked) until the combo is
  // completed or the board is re-plugged. We just stop driving it.
  vialUnlockCleanup();
  vialStaffRefresh();
  $("staffVialStatus").textContent =
    "unlock未完了：再開するか、キーボードを挿し直してください";
});

// idle reset: drop back to the base layer view for the next visitor
function vialOnIdleReset() {
  if (!VS.connected) return;
  autoLayerSimCancel();
  VS.deviceName = "";
  applyDeviceName();
  VS.toggleMask = 0;
  VS.momentary.clear();
  VS.viewLayer = vialEffectiveLayer();
  applyLayerView();
  vialUnlockCleanup();
  vialStaffRefresh();
}

// =============================================================
// App version (shown small in the staff menu for on-site support).
// The kiosk host sends the exe version via the host hello; browser /
// dev builds fall back to "dev".
// =============================================================
let appVersion = "";
function setAppVersion(v) {
  appVersion = v || "";
  const el = $("appVersion");
  if (el) el.textContent = "Techmech keys INPUT LAB " + (appVersion || "dev");
}

applyKioskDisplay(kioskDisplayEnabled());
refreshFxPalette();
applyDefaultBoardSelect();
const initialBoard = savedDefaultBoard();
BOARD = null;
applyBoard(initialBoard);
resizeCanvas();
sizeCompass();
drawCompass();
practiceInit();
renderFree();
updatePointerReadouts();
applyJpInput();
setAppVersion(""); // browser/dev fallback; kiosk host overrides via host hello
vialInit();
