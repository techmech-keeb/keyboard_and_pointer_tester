// SPDX-FileCopyrightText: 2025-2026 Techmech keys
// SPDX-License-Identifier: Apache-2.0
"use strict";
const { test } = require("node:test");
const assert = require("node:assert/strict");
const vm = require("node:vm");
const fs = require("node:fs");
const path = require("node:path");

// ui/vial.js と ui/keycodes.js は素のスクリプトなので vm で読む。
// vm の realm で作られたオブジェクトは prototype が違うので、比較前にこちら側へ写す。
const plain = (o) => (o && typeof o === "object" ? { ...o } : o);

function loadScript(name, ctx) {
  vm.runInContext(fs.readFileSync(path.join(__dirname, "..", "ui", name), "utf8"), ctx, { filename: "ui/" + name });
}

// RMK 版 OLSK60 の設定キー: TD(0) = ホールド MO(2) / タップ後ホールド MO(3)。
// 端末の応答は固定 rev の rmk/src/host/via/vial.rs DynamicVialMorseGet の並び
// （r[0] 戻り値、r[1..] tap / hold / double_tap / hold_after_tap の LE u16、r[9..11] term）。
test("VialDevice.readTapDance decodes a Vial tap dance entry (RMK morse)", async () => {
  const ctx = vm.createContext({ console, Uint8Array, setTimeout, clearTimeout });
  loadScript("vial.js", ctx);
  const VialDevice = vm.runInContext("VialDevice", ctx);
  const sent = [];
  const dev = new VialDevice({
    async send(buf) {
      sent.push(Array.from(buf.slice(0, 4)));
      const r = new Uint8Array(32);
      // 戻り値 0、tap = KC_NO、hold = MO(2) 0x5222、double = KC_NO、tap_hold = MO(3) 0x5223、term = 250
      r.set([0x00, 0x00, 0x00, 0x22, 0x52, 0x00, 0x00, 0x23, 0x52, 0xFA, 0x00]);
      return r;
    },
  });
  assert.deepEqual(plain(await dev.readTapDance(0)), { tap: 0, hold: 0x5222, doubleTap: 0, tapHold: 0x5223, term: 250 });
  assert.deepEqual(sent, [[0xFE, 0x0D, 0x01, 0x00]]);
});

test("VialDevice.readTapDance returns null when the firmware reports an error", async () => {
  const ctx = vm.createContext({ console, Uint8Array, setTimeout, clearTimeout });
  loadScript("vial.js", ctx);
  const VialDevice = vm.runInContext("VialDevice", ctx);
  const dev = new VialDevice({ async send() { const r = new Uint8Array(32); r[0] = 1; return r; } });
  assert.equal(await dev.readTapDance(7), null);
});

test("keycodes describe TD(n) with its index so the app can look the entry up", () => {
  const ctx = vm.createContext({ console });
  loadScript("keycodes.js", ctx);
  const VialKeycodes = vm.runInContext("VialKeycodes", ctx);
  assert.deepEqual(plain(VialKeycodes.describe(0x5700)), { kind: "other", text: "TD0", td: 0 });
  assert.equal(VialKeycodes.describe(0x5703, { protocol: 5 }).td, 3);
  // ホールド側の MO(2) は層キーとして読める（app.js が層の模擬に使う）
  assert.equal(VialKeycodes.describe(0x5222).kind, "layer");
  assert.equal(VialKeycodes.describe(0x5222).layer, 2);
});
