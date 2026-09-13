// SPDX-FileCopyrightText: 2025-2026 Techmech keys
// SPDX-License-Identifier: Apache-2.0
// Wheel arithmetic shared by the exhibition UI and dependency-free Node tests.
// No board, DOM, animation, or device-identity assumptions belong here.
"use strict";

const ScrollInput = (() => {
  function pixels(delta, mode, lineHeight, pageHeight) {
    if (!Number.isFinite(delta)) return 0;
    const unit = mode === 0 ? 1 : mode === 1 ? lineHeight : mode === 2 ? pageHeight : 0;
    const value = delta * unit;
    return Number.isFinite(value) ? value : 0;
  }

  function telemetry(e) {
    const axes = [];
    if (Number.isFinite(e.wheelDeltaX) && e.wheelDeltaX !== 0) axes.push(Math.abs(e.wheelDeltaX));
    if (Number.isFinite(e.wheelDeltaY) && e.wheelDeltaY !== 0) axes.push(Math.abs(e.wheelDeltaY));
    if (!axes.length && Number.isFinite(e.wheelDelta) && e.wheelDelta !== 0) axes.push(Math.abs(e.wheelDelta));
    if (!axes.length) return { notches: null, highResolution: false };
    return {
      notches: axes.reduce((sum, value) => sum + value / 120, 0),
      highResolution: axes.some((value) => value < 119.5),
    };
  }

  function create() {
    const state = { position: 0, max: 0, signed: 0, absolute: 0, applied: 0, clipped: 0 };
    return {
      state,
      bounds(max) {
        state.max = Number.isFinite(max) ? Math.max(0, max) : 0;
        state.position = Math.min(state.position, state.max);
      },
      push(delta) {
        if (!Number.isFinite(delta)) return 0;
        const previous = state.position;
        // Clamp each input in arrival order: at the top, [-10, +5] ends at 5.
        const requested = previous + delta;
        state.position = Math.min(state.max, Math.max(0, requested));
        const moved = state.position - previous;
        state.signed += delta;
        state.absolute += Math.abs(delta);
        state.applied += moved;
        state.clipped += requested - state.position;
        return moved;
      },
      reset() {
        for (const key of ["position", "signed", "absolute", "applied", "clipped"]) state[key] = 0;
      },
    };
  }
  return { pixels, telemetry, create };
})();

if (typeof module !== "undefined" && module.exports) module.exports = ScrollInput;
