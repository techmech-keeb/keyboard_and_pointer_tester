// SPDX-FileCopyrightText: 2025-2026 Techmech keys
// SPDX-License-Identifier: Apache-2.0
// A focus-free vertical reading surface. Input arithmetic is independent of DOM.
"use strict";

const ScrollLab = (() => {
  const byId = (id) => document.getElementById(id);
  const viewport = byId("scrollViewport");
  const content = byId("scrollContent");
  const motion = ScrollInput.create();
  let lineHeight = 24, pageHeight = 1, pageWidth = 1, chapterOffsets = [];
  let dirty = true, frameNumber = 0, lastRendered = -1;
  let pending = null;
  const debug = { enabled: false, records: new Array(4096), cursor: 0, count: 0, events: 0, start: 0, last: null };

  function record(value) {
    if (!debug.enabled) return;
    debug.records[debug.cursor] = value;
    debug.cursor = (debug.cursor + 1) % debug.records.length;
    debug.count = Math.min(debug.count + 1, debug.records.length);
  }

  function measure() {
    // A resize/theme switch changes geometry only; it never rescales pixel input.
    pageHeight = Math.max(1, viewport.clientHeight);
    pageWidth = Math.max(1, viewport.clientWidth);
    content.style.setProperty("--scroll-page", pageHeight + "px");
    lineHeight = parseFloat(getComputedStyle(content.querySelector(".scroll-chapter > p:not(.chapter-lead)")).lineHeight) || 24;
    const oldMax = motion.state.max;
    const wasAtEnd = oldMax > 0 && motion.state.position >= oldMax;
    motion.bounds(viewport.scrollHeight - pageHeight);
    if (wasAtEnd) motion.state.position = motion.state.max;
    chapterOffsets = Array.from(content.querySelectorAll(".scroll-chapter"), (el) => el.offsetTop);
    lastRendered = -1; // Progress also changes when only the viewport bounds change.
    dirty = true;
    if (typeof wake === "function") wake();
  }

  function receive(e) {
    // Read deltaMode before delta values for browsers with compatibility getters.
    const mode = e.deltaMode;
    const dy = ScrollInput.pixels(e.deltaY, mode, lineHeight, pageHeight);
    const dx = ScrollInput.pixels(e.deltaX, mode, lineHeight, pageWidth);
    const sample = ScrollInput.telemetry(e);
    if (!dx && !dy) return { dx, dy, sample };
    motion.push(dy);
    if (!pending) pending = { signed: 0, absolute: 0, up: 0, down: 0, upNotches: 0, downNotches: 0, events: 0, x: 0, y: 0, dir: 0 };
    pending.signed += dy;
    pending.absolute += Math.abs(dy) + Math.abs(dx);
    pending.events++;
    pending.x = e.clientX;
    pending.y = e.clientY;
    if (dy !== 0) {
      const key = dy < 0 ? "up" : "down";
      pending[key] += Math.abs(dy);
      pending[key + "Notches"] += sample.notches || 0;
      pending.dir = Math.sign(dy);
    }
    dirty = true;
    if (debug.enabled) {
      debug.events++;
      debug.last = { deltaY: e.deltaY, deltaMode: mode, wheelDeltaY: Number.isFinite(e.wheelDeltaY) ? e.wheelDeltaY : null };
      record({ type: "wheel", t: performance.now(), ...debug.last, position: motion.state.position, frame: frameNumber });
    }
    return { dx, dy, sample };
  }

  function flush(now) {
    if (!dirty) return null;
    dirty = false;
    frameNumber++;
    const position = motion.state.position;
    if (position !== lastRendered) {
      viewport.scrollTop = position;
      lastRendered = position;
      const progress = motion.state.max ? position / motion.state.max : 0;
      const percent = position >= motion.state.max && motion.state.max > 0 ? 100 : Math.floor(progress * 100);
      byId("scrollPercent").innerHTML = percent + "<span>%</span>";
      byId("scrollProgressFill").style.transform = "scaleY(" + progress + ")";
      byId("scrollPositionText").textContent = position.toFixed(1) + " px";
      byId("scrollEdge").textContent = position <= 0 ? "START" : position >= motion.state.max ? "END" : "";
    }
    let chapter = 1;
    for (let i = 0; i < chapterOffsets.length; i++) {
      if (chapterOffsets[i] <= position + pageHeight * .53) chapter = i + 1;
    }
    byId("scrollChapter").textContent = String(chapter).padStart(2, "0") + " / " + SCROLL_CHAPTERS.length;
    if (debug.enabled) record({ type: "render", t: now, frame: frameNumber, position });
    const batch = pending;
    pending = null;
    return batch;
  }

  function reset() {
    motion.reset();
    pending = null;
    lastRendered = -1;
    dirty = true;
    debugClear();
    flush(performance.now());
  }

  function debugClear() {
    debug.records.fill(undefined);
    debug.cursor = 0; debug.count = 0; debug.events = 0;
    debug.start = performance.now(); debug.last = null;
    renderDebug();
  }

  function renderDebug() {
    const duration = Math.max((performance.now() - debug.start) / 1000, .001);
    const last = debug.last;
    byId("scrollDebugReadout").textContent =
      (debug.enabled ? "観測中" : "観測停止中") + " / " + debug.events + " events / " + (debug.events / duration).toFixed(1) + " Hz（開始後平均）\n" +
      (last ? "deltaY=" + last.deltaY + "  deltaMode=" + last.deltaMode + "  wheelDeltaY=" + (last.wheelDeltaY ?? "なし") + "\n" : "") +
      "logical=" + motion.state.position.toFixed(4) + "  scrollTop=" + viewport.scrollTop.toFixed(4) + "\n" +
      "入力=" + motion.state.signed.toFixed(4) + "  移動=" + motion.state.applied.toFixed(4) + "  端で制限=" + motion.state.clipped.toFixed(4);
  }

  buildScrollContent(content);
  viewport.addEventListener("scroll", () => {
    // Observation only. Never feed browser-rounded scrollTop back into arithmetic.
    record({ type: "scroll", t: performance.now(), frame: frameNumber, scrollTop: viewport.scrollTop });
  }, { passive: true });
  byId("scrollDebugToggle").addEventListener("click", () => {
    debug.enabled = !debug.enabled;
    if (debug.enabled) debugClear();
    byId("scrollDebugToggle").textContent = debug.enabled ? "観測を停止" : "観測を開始";
    renderDebug();
  });
  byId("scrollDebugClear").addEventListener("click", debugClear);
  setInterval(() => { if (!byId("staffMenu").hidden && byId("scrollDiagnostics").open) renderDebug(); }, 250);

  // Exposed for temporary staff observation and fixtures; no network or disk writes.
  return {
    receive, flush, reset, measure,
    get dirty() { return dirty; },
    get state() { return { ...motion.state, lineHeight, pageHeight }; },
    records() {
      const start = (debug.cursor - debug.count + debug.records.length) % debug.records.length;
      return Array.from({ length: debug.count }, (_, i) => debug.records[(start + i) % debug.records.length]);
    },
  };
})();
