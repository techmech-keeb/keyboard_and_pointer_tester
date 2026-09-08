"use strict";
const { test } = require("node:test");
const assert = require("node:assert/strict");
const { pixels, telemetry, create } = require("../ui/scroll-input.js");

test("pixel, line and page keep fractional input and sign", () => {
  assert.equal(pixels(.125, 0, 24, 200), .125);
  assert.equal(pixels(-.5, 1, 24, 200), -12);
  assert.equal(pixels(.125, 2, 24, 200), 25);
  assert.equal(pixels(NaN, 0, 24, 200), 0);
  assert.equal(pixels(Infinity, 0, 24, 200), 0);
  assert.equal(pixels(4, 99, 24, 200), 0);
});

test("high frequency fractions conserve input independently of render grouping", () => {
  const m = create(); m.bounds(100000);
  for (let i = 0; i < 10000; i++) m.push(.1);
  assert.ok(Math.abs(m.state.position - 1000) < 1e-7);
  assert.ok(Math.abs(m.state.signed - m.state.applied - m.state.clipped) < 1e-7);
  assert.equal(m.state.clipped, 0);
  for (let i = 0; i < 10000; i++) m.push(-.1);
  assert.ok(m.state.position < 1e-7);
  assert.ok(Math.abs(m.state.absolute - 2000) < 1e-7);
});

test("edge reversal follows arrival order with no accumulated overscroll debt", () => {
  const m = create(); m.bounds(100);
  m.push(-10); m.push(5);
  assert.equal(m.state.position, 5);
  assert.equal(m.state.signed, -5);
  assert.equal(m.state.clipped, -10);
  m.push(1000); m.push(-.25);
  assert.equal(m.state.position, 99.75);
  assert.equal(m.state.signed, m.state.applied + m.state.clipped);
});

test("reset clears all input accounting, retaining only current bounds", () => {
  const m = create(); m.bounds(400); m.push(1000); m.push(-.125); m.reset();
  assert.deepEqual(m.state, { position: 0, max: 400, signed: 0, absolute: 0, applied: 0, clipped: 0 });
  m.push(.25); assert.equal(m.state.position, .25);
  m.bounds(0); assert.equal(m.state.position, 0);
});

test("ordinary detents and scaled/coalesced values are not labelled sub-detent", () => {
  for (const value of [120, -120, 240, 180, 119.99997, 119.5]) {
    const t = telemetry({ wheelDeltaY: value });
    assert.equal(t.highResolution, false, String(value));
    assert.equal(t.notches, Math.abs(value) / 120);
  }
});

test("sub-detent telemetry is optional, axis-aware and independent of pixel motion", () => {
  for (const value of [10, -10, 40]) assert.equal(telemetry({ wheelDeltaY: value }).highResolution, true);
  assert.equal(telemetry({ wheelDeltaX: 10, wheelDeltaY: 120, wheelDelta: 120 }).notches, 1 + 10 / 120);
  assert.equal(telemetry({ wheelDelta: -40 }).notches, 1 / 3);
  assert.deepEqual(telemetry({ deltaY: .01 }), { notches: null, highResolution: false });
  assert.deepEqual(telemetry({ wheelDeltaX: 0, wheelDeltaY: NaN, wheelDelta: 0 }), { notches: null, highResolution: false });
});
