// SPDX-FileCopyrightText: 2025-2026 Techmech keys
// SPDX-License-Identifier: Apache-2.0
// ボードプロファイルとガイドツアーの整合を、ブラウザ無しで検査する。
// ui/ はモジュールを持たない素のスクリプトなので、node:vm の同一コンテキストで
// 読み込んでから、そこに現れた変数と関数を取り出して検査する。
"use strict";
const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.join(__dirname, "..");
const tours = new Map();
const ctx = vm.createContext({
  console,
  // tours.js の代わり。registerTours の呼び出しだけを受け取る。
  tourEngine: {
    registerTours: (id, list) => tours.set(id, list),
    updateGuideButton: () => {},
  },
});
for (const file of [
  "ui/boards.js",
  "ui/layouts/olsk60.js",
  "ui/layouts/olsk60-qmk.tours.js",
  "ui/layouts/olsk60-rmk.tours.js",
]) {
  vm.runInContext(fs.readFileSync(path.join(root, file), "utf8"), ctx, { filename: file });
}
const { findBoard, BOARDS } = vm.runInContext("({ findBoard, BOARDS })", ctx);
const byId = (id) => BOARDS.find((b) => b.id === id);

// 正本: qmk-config keymaps/vial/config.h / rmk-config keyboards/olsk60/build.rs
const QMK_UID = [0xC4, 0x37, 0xB8, 0x91, 0x73, 0x93, 0x22, 0xAD];
const RMK_UID = [0x1E, 0xEB, 0xCB, 0x50, 0x9F, 0x6B, 0x94, 0xEE];
const VID = 0x746D;
const PID = 0x0102;

test("the two OLSK60 firmwares are told apart by their Vial UID", () => {
  assert.equal(findBoard(QMK_UID, VID, PID).id, "olsk60v2-qmk");
  assert.equal(findBoard(RMK_UID, VID, PID).id, "olsk60v2-rmk");
});

test("without a UID the shared VID/PID falls back to the production firmware", () => {
  // 両版は同じ VID/PID なので、UID が無い経路では登録順の先頭に落ちる。
  assert.equal(findBoard(null, VID, PID).id, "olsk60v2-qmk");
  assert.equal(BOARDS[0].id, "olsk60v2-qmk");
});

test("each profile carries its own matrix and custom keycode list", () => {
  // vm コンテキストのオブジェクトは realm が違うので、値だけを比べる。
  assert.equal(byId("olsk60v2-qmk").matrix.rows, 6);
  assert.equal(byId("olsk60v2-qmk").matrix.cols, 14);
  assert.equal(byId("olsk60v2-rmk").matrix.rows, 6);
  assert.equal(byId("olsk60v2-rmk").matrix.cols, 13);
  assert.equal(byId("olsk60v2-qmk").customKeycodes.length, 20);
  assert.equal(byId("olsk60v2-rmk").customKeycodes.length, 23);
});

test("both profiles render the same physical layout", () => {
  const qmk = byId("olsk60v2-qmk");
  const rmk = byId("olsk60v2-rmk");
  assert.equal(qmk.keys, rmk.keys); // 同じ配列を共有している
  assert.equal(qmk.unitsWide, rmk.unitsWide);
  assert.equal(qmk.unitsHigh, rmk.unitsHigh);
});

test("custom keycode names are already in the normalized form app.js produces", () => {
  // 端末から読んだ shortName は空白 1 個へ正規化される。予備リストが別の形
  // だと、経路によってツアーの対象が解決できたりできなかったりする。
  for (const id of ["olsk60v2-qmk", "olsk60v2-rmk"]) {
    for (const name of byId(id).customKeycodes) {
      assert.equal(name, name.replace(/\s+/g, " ").trim(), `${id}: ${JSON.stringify(name)}`);
    }
  }
});

test("every tour targets a custom keycode its own firmware actually has", () => {
  // 2026-09 の分割前は、RMK 機に QMK 版の名前 (Precision 等) を当てていたため
  // 対象が見つからずステップが成立しなかった。その退行を止める。
  for (const id of ["olsk60v2-qmk", "olsk60v2-rmk"]) {
    const names = byId(id).customKeycodes;
    const list = tours.get(id);
    assert.ok(list && list.length, `${id} にツアーが登録されていない`);
    for (const tour of list) {
      for (const step of tour.steps) {
        const wanted = step.target && step.target.custom;
        if (!wanted) continue;
        assert.ok(names.includes(wanted), `${id} / ${tour.id}: ${wanted} が customKeycodes に無い`);
      }
    }
  }
});

test("custom layer keys name custom keycodes the RMK firmware really has", () => {
  const rmk = byId("olsk60v2-rmk");
  for (const [name, layer] of Object.entries(rmk.customLayerKeys)) {
    assert.ok(rmk.customKeycodes.includes(name), name + " が customKeycodes に無い");
    assert.ok(Number.isInteger(layer) && layer >= 1 && layer <= 3, name);
  }
  assert.equal(byId("olsk60v2-qmk").customLayerKeys, undefined); // QMK 版の Scroll は層を持たない
  assert.equal(byId("olsk60v2-qmk").layoutLabels, byId("olsk60v2-rmk").layoutLabels);
});
