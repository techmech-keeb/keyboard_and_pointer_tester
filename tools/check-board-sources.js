// SPDX-FileCopyrightText: 2025-2026 Techmech keys
// SPDX-License-Identifier: Apache-2.0
// ボードプロファイル（ui/layouts/*.js）が、正本リポジトリの値と一致しているか調べる。
//
// TIL は public、正本の qmk-config / rmk-config は private なので、正本を
// この repo へ取り込む（submodule 等）ことはしない。このスクリプトは実行時に
// 渡されたローカルパスを読むだけで、private の中身は一切書き出さない
// （出力は「一致」か、値ではなく差の所在）。
//
// 使い方:
//   node tools/check-board-sources.js                       # ../qmk-config, ../rmk-config を見る
//   node tools/check-board-sources.js --rmk ~/src/rmk-config # 片方だけ指定
//   TIL_QMK_CONFIG=... TIL_RMK_CONFIG=... node tools/check-board-sources.js
//
// 正本が手元に無ければ「未確認」として skip し、終了コード 0 で終わる。
// 差分が 1 件でもあれば 1 を返す。CI では実行しない（正本が無いため）。
"use strict";
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.join(__dirname, "..");

// --- 引数と既定パス -----------------------------------------------------
function argValue(name) {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : null;
}
const sources = {
  qmk: argValue("--qmk") || process.env.TIL_QMK_CONFIG || path.join(root, "..", "qmk-config"),
  rmk: argValue("--rmk") || process.env.TIL_RMK_CONFIG || path.join(root, "..", "rmk-config"),
};

// --- 正本の読み取り -----------------------------------------------------
// 各プロファイルが、どのファイルの何を正本にしているか。ui/layouts/olsk60.js
// 冒頭の出典コメントと同じ対応を、ここでは機械が読める形で持つ。
const SPECS = [
  {
    id: "olsk60v2-qmk",
    source: "qmk",
    vialJson: "techmechkeys/olsk60/keymaps/vial/vial.json",
    uid: { file: "techmechkeys/olsk60/keymaps/vial/config.h", pattern: /VIAL_KEYBOARD_UID\s*\{([^}]*)\}/ },
    matrix: { file: "techmechkeys/olsk60/keyboard.json", from: "keyboard.json" },
  },
  {
    id: "olsk60v2-rmk",
    source: "rmk",
    vialJson: "keyboards/olsk60/vial.json",
    uid: { file: "keyboards/olsk60/build.rs", pattern: /keyboard_id:\s*Vec<u8>\s*=\s*vec!\[([^\]]*)\]/ },
    matrix: { from: "vial.json" },
  },
];

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

function parseUid(text, pattern) {
  const m = pattern.exec(text);
  if (!m) return null;
  const bytes = m[1].split(",").map((v) => Number(v.trim())).filter((v) => Number.isInteger(v));
  return bytes.length === 8 ? bytes : null;
}

// keyboard.json は matrix_pins の本数が matrix 次元になる。
function matrixFromKeyboardJson(def) {
  const pins = def.matrix_pins || {};
  if (!Array.isArray(pins.rows) || !Array.isArray(pins.cols)) return null;
  return { rows: pins.rows.length, cols: pins.cols.length };
}

// --- プロファイルの読み取り ---------------------------------------------
// ui/ はモジュールを持たない素のスクリプトなので、vm の同一コンテキストで読む。
function loadProfiles() {
  const ctx = vm.createContext({ console });
  for (const file of ["ui/boards.js", "ui/layouts/olsk60.js"]) {
    vm.runInContext(fs.readFileSync(path.join(root, file), "utf8"), ctx, { filename: file });
  }
  return vm.runInContext("BOARDS", ctx);
}

// --- 比較 ---------------------------------------------------------------
// 値そのものは出さず、「どこが違うか」だけを出す。private の内容を
// 端末やログへ書き出さないため。
const diffs = [];
const notes = [];

function compare(id, what, ours, theirs) {
  const same = JSON.stringify(ours) === JSON.stringify(theirs);
  if (!same) diffs.push({ id, what });
  return same;
}

function checkKle(id, ourKle, theirKle) {
  // KLE は生の配列のまま比べる（parseKle を通すと差の位置が分かりにくくなる）。
  if (JSON.stringify(ourKle) === JSON.stringify(theirKle)) return true;
  // 行単位まで絞って報告する。
  const rows = Math.max(ourKle.length, theirKle.length);
  const bad = [];
  for (let i = 0; i < rows; i++) {
    if (JSON.stringify(ourKle[i]) !== JSON.stringify(theirKle[i])) bad.push(i);
  }
  diffs.push({ id, what: `layouts.keymap（行 ${bad.join(", ")}）` });
  return false;
}

function checkProfile(profile, spec) {
  const base = sources[spec.source];
  if (!fs.existsSync(base)) {
    notes.push(`${profile.id}: 正本が見つからないので未確認（${spec.source} = ${base}）`);
    return;
  }
  const vialPath = path.join(base, spec.vialJson);
  if (!fs.existsSync(vialPath)) {
    notes.push(`${profile.id}: ${spec.vialJson} が無いので未確認`);
    return;
  }
  const vial = readJson(vialPath);
  const results = [];

  // UID
  const uidFile = path.join(base, spec.uid.file);
  if (fs.existsSync(uidFile)) {
    const theirs = parseUid(fs.readFileSync(uidFile, "utf8"), spec.uid.pattern);
    if (!theirs) {
      notes.push(`${profile.id}: ${spec.uid.file} から UID を読めなかった（書式が変わった可能性）`);
    } else {
      results.push(["UID", compare(profile.id, "Vial UID", profile.match.uid, theirs)]);
    }
  } else {
    notes.push(`${profile.id}: ${spec.uid.file} が無いので UID は未確認`);
  }

  // VID / PID
  const usb = { vendorId: Number(vial.vendorId), productId: Number(vial.productId) };
  results.push(["VID/PID", compare(profile.id, "VID/PID", profile.match.usb, usb)]);

  // matrix 次元
  let theirMatrix = null;
  if (spec.matrix.from === "vial.json") {
    theirMatrix = vial.matrix || null;
  } else {
    const kbFile = path.join(base, spec.matrix.file);
    if (fs.existsSync(kbFile)) theirMatrix = matrixFromKeyboardJson(readJson(kbFile));
  }
  if (theirMatrix) {
    results.push(["matrix", compare(profile.id, "matrix 次元", profile.matrix, theirMatrix)]);
  } else {
    notes.push(`${profile.id}: matrix 次元を読めなかったので未確認`);
  }

  // customKeycodes（端末が返す shortName を、app.js と同じ空白正規化で比べる）
  const theirCustom = (vial.customKeycodes || [])
    .map((k) => String((k && (k.shortName || k.name)) || "").replace(/\s+/g, " ").trim());
  results.push(["customKeycodes", compare(profile.id, "customKeycodes", profile.customKeycodes, theirCustom)]);

  // layouts.labels
  results.push(["labels", compare(profile.id, "layouts.labels", profile.layoutLabels, vial.layouts.labels)]);

  // layouts.keymap（KLE）
  results.push(["KLE", checkKle(profile.id, profile.layoutKeymap, vial.layouts.keymap)]);

  const line = results.map(([name, ok]) => `${name} ${ok ? "一致" : "差分"}`).join(" / ");
  console.log(`${profile.id}: ${line}`);
}

// --- 実行 ---------------------------------------------------------------
const boards = loadProfiles();
console.log("正本との突合（qmk-config / rmk-config はローカルパスから読むだけで、内容は書き出さない）");
console.log(`  qmk-config: ${sources.qmk}${fs.existsSync(sources.qmk) ? "" : "（無し）"}`);
console.log(`  rmk-config: ${sources.rmk}${fs.existsSync(sources.rmk) ? "" : "（無し）"}`);
console.log("");

for (const spec of SPECS) {
  const profile = boards.find((b) => b.id === spec.id);
  if (!profile) {
    diffs.push({ id: spec.id, what: "プロファイルが登録されていない" });
    continue;
  }
  checkProfile(profile, spec);
}

if (notes.length) {
  console.log("");
  for (const n of notes) console.log(`  ${n}`);
}

console.log("");
if (diffs.length === 0) {
  console.log(notes.length ? "差分なし（未確認の項目あり）" : "差分なし");
  process.exit(0);
}
console.log(`差分 ${diffs.length} 件:`);
for (const d of diffs) console.log(`  ${d.id}: ${d.what}`);
console.log("");
console.log("ui/layouts/olsk60.js を正本に合わせてください（ファイル冒頭の出典コメントを参照）。");
process.exit(1);
