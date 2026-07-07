// =============================================================
// OLSK60 INPUT LAB — main logic
// Offline, framework-free. Runs standalone in a browser or
// inside the kiosk host (WebView2), which forwards blocked keys
// (Win, Alt+Tab, ...) via window.chrome.webview messages.
// =============================================================
"use strict";

const $ = (id) => document.getElementById(id);

// ---------- tunables ----------
const TRAIL_MS = 2800;          // trail fade time
const RIPPLE_MS = 750;
const CHEVRON_MS = 620;
const IDLE_RESET_MS = 75000;    // auto reset for the next visitor
const MAX_DPR = 1.5;            // battery-friendly rendering
const FREE_TEXT_MAX = 3000;

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
  attract: true,
  attractMove: 0,
  freeMode: false,
  kiosk: false,
};

// =============================================================
// Keyboard rendering
// =============================================================
const keyboardEl = $("keyboard");
const keyEls = new Map();       // code -> [element,...]
const heatCounts = new Map();   // id -> count

function buildKeyboard() {
  for (const k of OLSK60.keys) {
    const el = document.createElement("div");
    el.className = "key";
    if (k.label.length > 2) el.classList.add("small");
    if (k.layer) el.classList.add("layer");
    if (k.win) el.classList.add("win");
    if (k.homing) el.classList.add("homing");
    el.style.left = `calc(var(--u) * ${k.x})`;
    el.style.top = `calc(var(--u) * ${k.y})`;
    el.style.width = `calc(var(--u) * ${k.w})`;
    el.style.height = "var(--u)";
    el.dataset.id = k.id || k.code;

    const cap = document.createElement("div");
    cap.className = "keycap";
    if (k.shift) {
      const sub = document.createElement("span");
      sub.className = "sub";
      sub.textContent = k.shift;
      cap.appendChild(sub);
    }
    const main = document.createElement("span");
    main.textContent = k.label;
    cap.appendChild(main);
    if (k.win) {
      const lock = document.createElement("span");
      lock.className = "lock";
      lock.textContent = "🔒";
      cap.appendChild(lock);
    }
    el.appendChild(cap);
    keyboardEl.appendChild(el);

    if (!keyEls.has(k.code)) keyEls.set(k.code, []);
    keyEls.get(k.code).push(el);
  }

  // trackpoint dome in the center channel
  const tp = document.createElement("div");
  tp.id = "trackpoint";
  tp.style.left = `calc(var(--u) * ${OLSK60.trackpoint.x})`;
  tp.style.top = `calc(var(--u) * ${OLSK60.trackpoint.y})`;
  tp.innerHTML = `<div id="tpRing"></div><div id="tpCap"></div>`;
  keyboardEl.appendChild(tp);
}

function fitKeyboard() {
  const wrap = $("kbWrap");
  const u = Math.min(64, Math.floor(wrap.clientWidth / OLSK60.unitsWide));
  document.documentElement.style.setProperty("--u", u + "px");
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
for (const k of OLSK60.keys) {
  if (k.label.length === 1) CODE_CHAR[k.code] = k.label.toLowerCase();
}
CODE_CHAR.Space = " ";

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
  const k = OLSK60.keys.find((k) => k.code === code);
  if (k && k.shift) return k.shift;
  return base.toUpperCase();
}

// ---------- kiosk host bridge ----------
if (window.chrome && window.chrome.webview) {
  window.chrome.webview.addEventListener("message", (ev) => {
    const d = ev.data;
    if (!d) return;
    if (d.type === "host") {
      S.kiosk = true;
      document.body.classList.add("kiosk");
      const b = $("hostBadge");
      b.textContent = "KIOSK MODE";
      b.classList.add("kiosk");
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
  dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
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
  { name: "L", label: "左クリック", color: "#3fd9ff" },
  { name: "M", label: "中クリック", color: "#ffb454" },
  { name: "R", label: "右クリック", color: "#ff3b30" },
];

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
    const hue = 195 - Math.min(v / 2.2, 1) * 195;    // cyan -> red
    const w = 2 + Math.min(v * 1.5, 4);
    // soft glow pass + core pass
    ctx.lineCap = "round";
    ctx.strokeStyle = `hsla(${hue}, 95%, 62%, ${(alpha * 0.16).toFixed(3)})`;
    ctx.lineWidth = w * 3.2;
    ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
    ctx.strokeStyle = `hsla(${hue}, 95%, 65%, ${(alpha * 0.85).toFixed(3)})`;
    ctx.lineWidth = w;
    ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
  }

  // ---- cursor halo ----
  if (S.lastPointer && now - S.lastPointer.t < 1600) {
    const p = S.lastPointer;
    const a = 1 - (now - p.t) / 1600;
    const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, 26);
    g.addColorStop(0, `rgba(255,80,66,${0.5 * a})`);
    g.addColorStop(1, "rgba(255,80,66,0)");
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(p.x, p.y, 26, 0, Math.PI * 2); ctx.fill();
  }

  // ---- click ripples ----
  for (let i = ripples.length - 1; i >= 0; i--) {
    const r = ripples[i];
    const k = (now - r.t) / RIPPLE_MS;
    if (k >= 1) { ripples.splice(i, 1); continue; }
    const rad = 12 + k * 58;
    ctx.strokeStyle = hexA(r.color, (1 - k) * 0.9);
    ctx.lineWidth = 2.5 * (1 - k) + 0.5;
    ctx.beginPath(); ctx.arc(r.x, r.y, rad, 0, Math.PI * 2); ctx.stroke();
    if (k < 0.8) {
      ctx.fillStyle = hexA(r.color, (1 - k / 0.8) * 0.95);
      ctx.font = "700 13px 'Segoe UI', 'Yu Gothic UI', sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(r.label, r.x, r.y - rad - 8);
    }
  }

  // ---- scroll chevrons ----
  for (let i = chevrons.length - 1; i >= 0; i--) {
    const c = chevrons[i];
    const k = (now - c.t) / CHEVRON_MS;
    if (k >= 1) { chevrons.splice(i, 1); continue; }
    const y = c.y + c.dir * k * 46;
    ctx.strokeStyle = `rgba(63,217,255,${(1 - k) * 0.95})`;
    ctx.lineWidth = 3;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(c.x - 9, y + c.dir * 7);
    ctx.lineTo(c.x, y);
    ctx.lineTo(c.x + 9, y + c.dir * 7);
    ctx.stroke();
  }

  // ---- decay speed & trackpoint tilt ----
  S.vx *= 0.86; S.vy *= 0.86;
  S.speed = Math.hypot(S.vx, S.vy) * 1000;
  if (S.speed < 8) { S.speed = 0; S.vx = 0; S.vy = 0; }
  updatePointerReadouts();
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
  const idx = e.button === 1 ? 1 : e.button === 2 ? 2 : 0;
  const b = BTN[idx];
  S.clicks[b.name]++;
  const pill = $("pill-" + b.name);
  pill.querySelector("b").textContent = S.clicks[b.name];
  pill.classList.add("active");
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
    if (S.lastPointer) {
      const n = performance.now();
      for (let i = 0; i < 3; i++) chevrons.push({ x: S.lastPointer.x, y: S.lastPointer.y - 20 - i * 14 * -dir, t: n + i * 70, dir });
    }
    const ring = $("tpRing");
    ring.classList.remove("pulse");
    void ring.offsetWidth;
    ring.classList.add("pulse");
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
  cctx.strokeStyle = "rgba(255,255,255,0.12)";
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
    g.addColorStop(0, "rgba(255,59,48,0.15)");
    g.addColorStop(1, "#ff5a4c");
    cctx.strokeStyle = g;
    cctx.lineWidth = 4;
    cctx.lineCap = "round";
    cctx.beginPath();
    cctx.moveTo(cx, cy);
    cctx.lineTo(cx + Math.cos(ang) * len, cy + Math.sin(ang) * len);
    cctx.stroke();
    // arrow head
    cctx.fillStyle = "#ff5a4c";
    cctx.save();
    cctx.translate(cx + Math.cos(ang) * len, cy + Math.sin(ang) * len);
    cctx.rotate(ang);
    cctx.beginPath();
    cctx.moveTo(6, 0); cctx.lineTo(-3, -4.5); cctx.lineTo(-3, 4.5);
    cctx.closePath(); cctx.fill();
    cctx.restore();
  }
  // hub
  cctx.fillStyle = "#ff3b30";
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
  phrases = shuffle(PRACTICE_PHRASES.slice());
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
const attractEl = $("attract");

function attractShow() {
  S.attract = true;
  S.attractMove = 0;
  attractEl.classList.remove("hidden");
}
function attractHide() {
  S.attract = false;
  attractEl.classList.add("hidden");
}

function touchInput() {
  S.lastInput = performance.now();
  if (S.attract) attractHide();
}

setInterval(() => {
  if (!S.attract && performance.now() - S.lastInput > IDLE_RESET_MS) {
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
  if (showAttract) attractShow();
}

$("resetBtn").addEventListener("click", (e) => {
  e.stopPropagation();
  resetAll(true);
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

buildKeyboard();
fitKeyboard();
resizeCanvas();
sizeCompass();
drawCompass();
practiceInit();
renderFree();
updatePointerReadouts();
