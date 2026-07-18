// =============================================================
// Guide tour engine for connected Vial boards (classic script)
// =============================================================
"use strict";

const tourEngine = (() => {
  const QK_KB_MODERN = 0x7E00;
  const QK_KB_LEGACY = 0x5F80;
  const MO_MODERN = 0x5220;
  const MO_LEGACY = 0x5100;
  const TOUR_IDLE_MS = 90000;

  const registry = new Map();
  const state = {
    running: false,
    menuOpen: false,
    tour: null,
    stepIndex: -1,
    resolvedSteps: [],
    targetEl: null,
    pressed: new Set(),
    prevPressed: new Set(),
    anyCount: 0,
    idleTimer: 0,
  };

  const els = {};

  function $(id) { return document.getElementById(id); }
  function protocolModern() { return typeof VS === "undefined" || !VS.dev || VS.dev.vialProtocol === undefined || VS.dev.vialProtocol >= 6; }
  function customBase() { return protocolModern() ? QK_KB_MODERN : QK_KB_LEGACY; }
  function moBase() { return protocolModern() ? MO_MODERN : MO_LEGACY; }
  function boardId() { return typeof BOARD === "undefined" ? "" : BOARD.id; }

  function registerTours(id, tours) {
    registry.set(id, Array.isArray(tours) ? tours : []);
    updateGuideButton();
  }

  function getToursFor(id) {
    return registry.get(id) || [];
  }

  function hasAvailableTours() {
    return !!(typeof VS !== "undefined" && VS.connected && VS.unlocked && getToursFor(boardId()).length);
  }

  function init() {
    els.button = $("guideBtn");
    els.menu = $("tourMenu");
    els.list = $("tourList");
    els.close = $("tourCloseBtn");
    els.overlay = $("tourOverlay");
    els.title = $("tourStepTitle");
    els.body = $("tourStepBody");
    els.dots = $("tourDots");
    els.next = $("tourNextBtn");
    els.stop = $("tourStopBtn");
    if (!els.button) return;
    els.button.addEventListener("click", openMenu);
    els.close.addEventListener("click", closeMenu);
    els.menu.addEventListener("click", (e) => { if (e.target === els.menu) closeMenu(); });
    els.next.addEventListener("click", nextStep);
    els.stop.addEventListener("click", () => stop("manual"));
    updateGuideButton();
  }

  function updateGuideButton() {
    if (!els.button) return;
    const show = hasAvailableTours();
    els.button.hidden = !show;
    if (!show) {
      closeMenu();
      if (state.running) stop("unavailable");
    }
  }

  function openMenu() {
    if (!hasAvailableTours()) return;
    state.menuOpen = true;
    els.list.replaceChildren();
    for (const tour of getToursFor(boardId())) {
      const item = document.createElement("button");
      item.type = "button";
      item.className = "tour-menu-item";
      item.innerHTML = `<b></b><span></span>`;
      item.querySelector("b").textContent = tour.title;
      item.querySelector("span").textContent = tour.description || "";
      item.addEventListener("click", () => start(tour.id));
      els.list.appendChild(item);
    }
    els.menu.hidden = false;
  }

  function closeMenu() {
    state.menuOpen = false;
    if (els.menu) els.menu.hidden = true;
  }

  function keycodeForTarget(target) {
    if (!target) return null;
    if (typeof target.mo === "number") return moBase() + target.mo;
    if (target.custom) {
      const idx = (VS.custom || []).indexOf(target.custom);
      return idx < 0 ? null : customBase() + idx;
    }
    return null;
  }

  function resolveTarget(target) {
    const kc = keycodeForTarget(target);
    if (kc === null || !VS.keymap) return null;
    for (let l = 0; l < VS.keymap.length; l++) {
      for (let r = 0; r < VS.keymap[l].length; r++) {
        for (let c = 0; c < VS.keymap[l][r].length; c++) {
          if (VS.keymap[l][r][c] === kc) return { layer: l, row: r, col: c, key: r + "," + c };
        }
      }
    }
    return null;
  }

  function stepIsRunnable(step) {
    if (!step.target) return true;
    return !!resolveTarget(step.target);
  }

  function resolveStep(step) {
    return Object.assign({}, step, { resolvedTarget: step.target ? resolveTarget(step.target) : null });
  }

  function start(id) {
    const tour = getToursFor(boardId()).find((t) => t.id === id);
    if (!tour || !hasAvailableTours()) return;
    closeMenu();
    clearHighlight();
    state.running = true;
    state.tour = tour;
    state.resolvedSteps = (tour.steps || []).filter(stepIsRunnable).map(resolveStep);
    state.stepIndex = -1;
    state.pressed = new Set();
    state.prevPressed = new Set();
    state.anyCount = 0;
    els.overlay.hidden = false;
    nextStep();
  }

  function stop() {
    state.running = false;
    state.tour = null;
    state.stepIndex = -1;
    state.resolvedSteps = [];
    clearTimeout(state.idleTimer);
    clearHighlight();
    if (els.overlay) els.overlay.hidden = true;
    if (typeof VS !== "undefined" && VS.connected && VS.keymap && typeof applyLayerView === "function") {
      VS.viewLayer = typeof vialEffectiveLayer === "function" ? vialEffectiveLayer() : 0;
      applyLayerView();
    }
    updateGuideButton();
  }

  function bumpIdle() {
    clearTimeout(state.idleTimer);
    if (state.running) state.idleTimer = setTimeout(() => stop("idle"), TOUR_IDLE_MS);
  }

  function nextStep() {
    if (!state.running) return;
    clearHighlight();
    state.stepIndex++;
    state.anyCount = 0;
    if (state.stepIndex >= state.resolvedSteps.length) { stop("done"); return; }
    showStep();
    bumpIdle();
  }

  function showStep() {
    const step = state.resolvedSteps[state.stepIndex];
    const card = document.querySelector(".tour-card");
    if (card) card.classList.remove("top");
    els.title.textContent = step.title || state.tour.title;
    els.body.textContent = step.body || "";
    els.dots.replaceChildren();
    for (let i = 0; i < state.resolvedSteps.length; i++) {
      const dot = document.createElement("i");
      dot.className = i === state.stepIndex ? "active" : "";
      els.dots.appendChild(dot);
    }
    if (step.resolvedTarget) {
      if (VS.viewLayer !== step.resolvedTarget.layer) {
        VS.viewLayer = step.resolvedTarget.layer;
        if (typeof applyLayerView === "function") applyLayerView();
      }
      const el = typeof matrixEls !== "undefined" && matrixEls.get(step.resolvedTarget.key);
      if (el) {
        state.targetEl = el;
        el.classList.add("tour-target");
        const rect = el.getBoundingClientRect();
        const centerY = rect.top + rect.height / 2;
        if (card) card.classList.toggle("top", centerY > window.innerHeight / 2);
      }
    }
  }

  function clearHighlight() {
    if (state.targetEl) state.targetEl.classList.remove("tour-target");
    state.targetEl = null;
  }

  function isPressed(target) {
    const resolved = resolveTarget(target);
    return !!(resolved && state.pressed.has(resolved.key));
  }

  function checkCurrent(edgeKey) {
    if (!state.running) return;
    bumpIdle();
    const step = state.resolvedSteps[state.stepIndex];
    if (!step) return;
    const cond = step.cond || { type: "next" };
    const targetKey = step.resolvedTarget && step.resolvedTarget.key;
    if (cond.type === "hold" && targetKey && state.pressed.has(targetKey)) nextStep();
    if (cond.type === "press" && targetKey && edgeKey === targetKey) {
      if (!cond.while || isPressed(cond.while)) nextStep();
    }
  }

  function onMatrixState(pressedKeys, layer) {
    if (!state.running) return;
    state.prevPressed = state.pressed;
    state.pressed = new Set((pressedKeys || []).map((k) => Array.isArray(k) ? k[0] + "," + k[1] : String(k)));
    for (const key of state.pressed) {
      if (!state.prevPressed.has(key)) checkCurrent(key);
    }
    checkCurrent(null);
  }

  function onPointerSpeed(speed) {
    if (!state.running) return;
    const step = state.resolvedSteps[state.stepIndex];
    if (step && step.cond && step.cond.type === "pointerSpeed" && speed >= (step.cond.threshold || 0)) {
      bumpIdle();
      nextStep();
    }
  }

  function onAnyKey() {
    if (!state.running) return;
    const step = state.resolvedSteps[state.stepIndex];
    if (!step || !step.cond || step.cond.type !== "anyKeys") return;
    bumpIdle();
    state.anyCount++;
    if (state.anyCount >= (step.cond.count || 1)) nextStep();
  }

  return { registerTours, getToursFor, init, updateGuideButton, openMenu, start, stop, onMatrixState, onPointerSpeed, onAnyKey, isRunning: () => state.running };
})();

window.tourEngine = tourEngine;
document.addEventListener("DOMContentLoaded", () => tourEngine.init());
