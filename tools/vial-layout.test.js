"use strict";
const { test } = require("node:test");
const assert = require("node:assert/strict");
const { bitsFor, decodeOptions, encodeOptions, parseKle, selectLayout, composeOverlay, describe } = require("../ui/vial-layout.js");

// 正本: rmk-config keyboards/olsk60/vial.json の layouts（labels / keymap）。
// QMK 版（qmk-config keymaps/vial/vial.json）との差はエンコーダのプッシュ位置
// 5,13 → 5,12 だけで、labels と option の付け方は同じ。
const OLSK60_LABELS = [["Spacebar", "5-Split Space", "3-Split Space", "6.25U Space"], "RotaryEncoder"];

// rmk-config keyboards/olsk60/vial.json の layouts.keymap（KLE 生データ）
const OLSK60_KEYMAP = [
    [{"x": 0.75, "c": "#777777"}, "0,0\n\n`", {"c": "#cccccc"}, "0,1", "0,2", "0,3", "0,4", "0,5", {"x": 0.75}, "0,6", "0,7", "0,8", "0,9", "0,10", {"c": "#aaaaaa", "w": 2}, "0,11"],
    [{"x": 0.15, "w": 1.5}, "1,0", {"x": 0.1, "c": "#cccccc"}, "1,1", "1,2", "1,3", "1,4", "1,5", {"x": 0.75}, "1,6", "1,7", "1,8", "1,9", "1,10", "1,11", {"w": 1.5}, "1,12"],
    [{"c": "#aaaaaa", "w": 1.75}, "2,0", {"c": "#cccccc"}, "2,1", "2,2", "2,3", "2,4", "2,5", {"x": 0.75}, "2,6", "2,7", "2,8", "2,9", "2,10", {"c": "#777777", "w": 2.25}, "2,11"],
    [{"c": "#aaaaaa", "w": 1.75}, "3,0", {"c": "#cccccc"}, "3,1", "3,2", "3,3", "3,4", "3,5", {"x": 0.75}, "3,6", "3,7", "3,8", "3,9", "3,10", {"c": "#777777"}, "3,11", {"c": "#aaaaaa", "w": 1.25}, "3,12"],
    [{"x": 0.5, "w": 1.25}, "4,0", {"w": 1.25}, "4,1", {"x": 7.5, "c": "#aaaaaa"}, "4,9", {"c": "#777777"}, "4,10", "4,11\n\n\n1,0", "4,12"],
    [{"y": -1, "x": 3, "w": 1.5, "c": "#aaaaaa"}, "4,2\n\n\n0,0", {"c": "#cccccc", "w": 1}, "4,3\n\n\n0,0", {"w": 1}, "4,4\n\n\n0,0", {"w": 1.25}, "4,5\n\n\n0,0", {"w": 1}, "4,6\n\n\n0,0", {"w": 1.75}, "4,7\n\n\n0,0"],
    [{"y": -1, "x": 3, "w": 1.25, "c": "#aaaaaa"}, "4,2\n\n\n0,1", {"c": "#cccccc", "w": 2.25}, "4,4\n\n\n0,1", {"c": "#aaaaaa", "w": 1.25}, "4,5\n\n\n0,1", {"c": "#cccccc", "w": 2.75}, "4,7\n\n\n0,1"],
    [{"y": -1, "x": 3, "w": 1.25, "c": "#aaaaaa"}, "4,2\n\n\n0,2", {"c": "#cccccc", "w": 6.25}, "4,5\n\n\n0,2"],
    [{"y": -1, "x": 12.5, "c": "#777777"}, "5,12\n\n\n1,1"],
    [{"y": 0.25, "x": 12.5, "c": "#cccccc"}, "0,0\n\n\n1,1\n\n\n\n\n\ne", "0,1\n\n\n1,1\n\n\n\n\n\ne"],
];

test("bit width per label follows vial-gui: bool = 1, N choices = ceil(log2 N)", () => {
  assert.equal(bitsFor("RotaryEncoder"), 1);
  assert.equal(bitsFor(["Spacebar", "a", "b", "c"]), 2);
  assert.equal(bitsFor(["X", "a", "b"]), 1);
  assert.equal(bitsFor(["X", "a", "b", "c", "d"]), 2);
  assert.equal(bitsFor(["X", "a", "b", "c", "d", "e"]), 3);
});

test("the last label sits in the low bits, the first in the high bits", () => {
  // [Spacebar 2 bit][RotaryEncoder 1 bit]
  assert.deepEqual(decodeOptions(OLSK60_LABELS, 0b000), [0, 0]);
  assert.deepEqual(decodeOptions(OLSK60_LABELS, 0b001), [0, 1]);
  assert.deepEqual(decodeOptions(OLSK60_LABELS, 0b010), [1, 0]);
  assert.deepEqual(decodeOptions(OLSK60_LABELS, 0b011), [1, 1]);
  assert.deepEqual(decodeOptions(OLSK60_LABELS, 0b101), [2, 1]);
  for (const v of [0, 1, 2, 3, 4, 5]) assert.equal(encodeOptions(OLSK60_LABELS, decodeOptions(OLSK60_LABELS, v)), v);
  // 未使用の上位 bit は無視する
  assert.deepEqual(decodeOptions(OLSK60_LABELS, 0xFFFFFFF8 | 0b011), [1, 1]);
});

test("KLE walk yields the expected OLSK60 geometry", () => {
  const keys = parseKle(OLSK60_KEYMAP);
  const at = (row, col, choice) => keys.find((k) => k.row === row && k.col === col &&
    (choice === undefined ? !k.option : k.option && k.option.choice === choice));
  // 共通キー: ui/layouts/olsk60.js と同じ x / w
  assert.deepEqual([at(0, 0).x, at(0, 0).w], [0.75, 1]);
  assert.deepEqual([at(1, 0).x, at(1, 0).w], [0.15, 1.5]);
  assert.deepEqual([at(2, 11).x, at(2, 11).w], [12.5, 2.25]);
  assert.deepEqual([at(3, 12).x, at(3, 12).w], [13.5, 1.25]);
  // 3-Split の Space: {y:-1, x:3} で行を戻してから並ぶ
  assert.deepEqual([at(4, 4, 1).x, at(4, 4, 1).y, at(4, 4, 1).w], [4.25, 4, 2.25]);
  assert.deepEqual([at(4, 7, 1).x, at(4, 7, 1).w], [7.75, 2.75]);
  // 6.25U の Space
  assert.deepEqual([at(4, 5, 2).x, at(4, 5, 2).w], [4.25, 6.25]);
  // w は次のキーで 1 に戻る
  assert.equal(at(0, 1).w, 1);
});

test("layout qualifiers and encoder marks are read from the KLE legend slots", () => {
  const keys = parseKle(OLSK60_KEYMAP);
  const arrowDown = keys.find((k) => k.row === 4 && k.col === 11);
  assert.deepEqual(arrowDown.option, { index: 1, choice: 0 });
  const push = keys.find((k) => k.row === 5 && k.col === 12);
  assert.deepEqual(push.option, { index: 1, choice: 1 });
  const encoders = keys.filter((k) => k.encoder);
  assert.equal(encoders.length, 2);
  assert.deepEqual(encoders.map((k) => k.encoder), [{ index: 0, direction: 0 }, { index: 0, direction: 1 }]);
  assert.ok(encoders.every((k) => k.row === null && k.option && k.option.index === 1 && k.option.choice === 1));
});

test("selecting options keeps common keys and only the matching variant", () => {
  const keys = parseKle(OLSK60_KEYMAP);
  const cols = (sel) => sel.keys.filter((k) => k.row === 4).map((k) => k.col).sort((a, b) => a - b);

  const fiveNoEnc = selectLayout(keys, decodeOptions(OLSK60_LABELS, 0));
  assert.deepEqual(cols(fiveNoEnc), [0, 1, 2, 3, 4, 5, 6, 7, 9, 10, 11, 12]);
  assert.equal(fiveNoEnc.encoders.length, 0);
  assert.ok(!fiveNoEnc.keys.some((k) => k.row === 5));

  const threeEnc = selectLayout(keys, decodeOptions(OLSK60_LABELS, 0b011));
  assert.deepEqual(cols(threeEnc), [0, 1, 2, 4, 5, 7, 9, 10, 12]);
  assert.ok(threeEnc.keys.some((k) => k.row === 5 && k.col === 12));
  assert.equal(threeEnc.encoders.length, 2);

  const wideNoEnc = selectLayout(keys, decodeOptions(OLSK60_LABELS, 0b100));
  assert.deepEqual(cols(wideNoEnc), [0, 1, 2, 5, 9, 10, 11, 12]);
  // 共通キー（条件なし）は常に残る
  for (const sel of [fiveNoEnc, threeEnc, wideNoEnc]) {
    assert.equal(sel.keys.filter((k) => k.row <= 3).length, 12 + 13 + 12 + 13);
  }
});

test("describe() renders the choice names for the staff readout", () => {
  assert.deepEqual(describe(OLSK60_LABELS, [1, 0]), ["Spacebar: 3-Split Space", "RotaryEncoder: なし"]);
  assert.deepEqual(describe(OLSK60_LABELS, [2, 1]), ["Spacebar: 6.25U Space", "RotaryEncoder: あり"]);
});

test("malformed input degrades to nothing rather than throwing", () => {
  assert.deepEqual(parseKle(null), []);
  assert.deepEqual(parseKle([{ name: "meta" }, ["0,0", 42, null, "not-a-key"]]).map((k) => k.row), [0, null]);
  assert.deepEqual(decodeOptions([], 123), []);
});

test("VialDevice.readLayoutOptions decodes the big-endian u32 after [cmd, value id]", async () => {
  // ui/vial.js は素のスクリプトなので vm で読み、偽のトランスポートを渡す。
  const vm = require("node:vm");
  const fs = require("node:fs");
  const path = require("node:path");
  const ctx = vm.createContext({ console, Uint8Array, setTimeout, clearTimeout });
  vm.runInContext(fs.readFileSync(path.join(__dirname, "..", "ui", "vial.js"), "utf8"), ctx, { filename: "ui/vial.js" });
  const VialDevice = vm.runInContext("VialDevice", ctx);
  const sent = [];
  const dev = new VialDevice({
    async send(buf) {
      sent.push(Array.from(buf.slice(0, 2)));
      const r = new Uint8Array(32);
      r.set([0x02, 0x02, 0x00, 0x00, 0x00, 0x03]); // 0b011 = Spacebar 1 (3-Split) / RotaryEncoder あり
      return r;
    },
  });
  assert.equal(await dev.readLayoutOptions(), 3);
  assert.deepEqual(sent, [[0x02, 0x02]]);
  assert.deepEqual(decodeOptions(OLSK60_LABELS, 3), [1, 1]);
});

// ボードプロファイル（素のスクリプト）を vm で読み、合成を検査する。
function loadProfiles() {
  const vm = require("node:vm");
  const fs = require("node:fs");
  const path = require("node:path");
  const ctx = vm.createContext({ console });
  for (const f of ["ui/boards.js", "ui/layouts/olsk60.js"]) {
    vm.runInContext(fs.readFileSync(path.join(__dirname, "..", f), "utf8"), ctx, { filename: f });
  }
  return vm.runInContext("BOARDS", ctx);
}

test("the profile KLE matches the canonical vial.json, QMK differing only at the encoder push", () => {
  const boards = loadProfiles();
  const rmk = boards.find((b) => b.id === "olsk60v2-rmk");
  const qmk = boards.find((b) => b.id === "olsk60v2-qmk");
  assert.deepEqual(JSON.parse(JSON.stringify(rmk.layoutKeymap)), OLSK60_KEYMAP);
  assert.deepEqual(JSON.parse(JSON.stringify(rmk.layoutLabels)), OLSK60_LABELS);
  const pushOf = (b) => parseKle(b.layoutKeymap).filter((k) => k.row === 5).map((k) => k.col);
  assert.deepEqual(pushOf(rmk), [12]);
  assert.deepEqual(pushOf(qmk), [13]);
});

test("composeOverlay keeps profile legends but takes geometry from the device", () => {
  const rmk = loadProfiles().find((b) => b.id === "olsk60v2-rmk");
  const parsed = parseKle(OLSK60_KEYMAP);
  const at = (o, r, c) => o.keys.find((k) => k.m && k.m[0] === r && k.m[1] === c);

  // Holy: 5-Split・エンコーダ無し = 0
  const five = composeOverlay(rmk.keys, selectLayout(parsed, decodeOptions(OLSK60_LABELS, 0)));
  assert.equal(five.keys.length, 62);
  assert.equal(five.encoders.length, 0);
  assert.deepEqual([five.unitsWide, five.unitsHigh], [15, 5]);
  assert.equal(at(five, 4, 11).code, "ArrowDown");            // プロファイルの刻印を継承
  assert.equal(at(five, 4, 3).code, "__m4_3");                 // プロファイルに無い座標は合成
  assert.deepEqual([at(five, 4, 4).code, at(five, 4, 4).w], ["Space", 1]); // 寸法は端末側
  assert.equal(at(five, 5, 12), undefined);

  // 5-Split・エンコーダ有り = 1
  const enc = composeOverlay(rmk.keys, selectLayout(parsed, decodeOptions(OLSK60_LABELS, 1)));
  assert.equal(enc.keys.length, 62);
  assert.equal(at(enc, 4, 11), undefined);
  assert.deepEqual([at(enc, 5, 12).x, at(enc, 5, 12).y], [12.5, 4]);
  assert.deepEqual(enc.encoders.map((e) => [e.index, e.direction, e.x, e.y]), [[0, 0, 12.5, 5.25], [0, 1, 13.5, 5.25]]);
  assert.deepEqual([enc.unitsWide, enc.unitsHigh], [15, 6.25]);

  // 3-Split・エンコーダ無し = 2 はプロファイルの既定配置。
  const three = composeOverlay(rmk.keys, selectLayout(parsed, decodeOptions(OLSK60_LABELS, 2)));
  assert.equal(three.keys.length, rmk.keys.length);
  for (const k of rmk.keys) {
    const d = at(three, k.m[0], k.m[1]);
    assert.equal(d.code, k.code);
  }
  assert.equal(rmk.defaultLayoutOptions, 2);
  assert.ok(rmk.keys.every((k) => !("x" in k) && !("y" in k) && !("w" in k) && !("h" in k)));
  assert.deepEqual([at(three, 4, 4).x, at(three, 4, 4).y, at(three, 4, 4).w], [4.25, 4, 2.25]);
});

test("composeOverlay builds an unlabeled layout without a product profile", () => {
  const selected = selectLayout(parseKle([
    [{ a: 4 }, "0,0", { x: 0.25, w: 1.5 }, "0,1"],
    [{ y: 0.25 }, "1,0"],
  ]), []);
  const overlay = composeOverlay([], selected);

  assert.deepEqual(overlay.keys.map((k) => ({ code: k.code, label: k.label, m: k.m, x: k.x, y: k.y, w: k.w })), [
    { code: "__m0_0", label: "", m: [0, 0], x: 0, y: 0, w: 1 },
    { code: "__m0_1", label: "", m: [0, 1], x: 1.25, y: 0, w: 1.5 },
    { code: "__m1_0", label: "", m: [1, 0], x: 0, y: 1.25, w: 1 },
  ]);
  assert.deepEqual([overlay.unitsWide, overlay.unitsHigh], [2.75, 2.25]);
});
