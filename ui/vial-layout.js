// SPDX-FileCopyrightText: 2025-2026 Techmech keys
// SPDX-License-Identifier: Apache-2.0
// Vial の物理レイアウト情報を、DOM や端末に依存せず解釈する。
//  - layout options: VIA GetKeyboardValue(LayoutOptions) が返す u32 と
//    vial.json の layouts.labels から「どの選択肢が選ばれているか」を取り出す
//  - KLE: vial.json の layouts.keymap（KLE 生データ）を歩いて、各キーの位置・
//    寸法・マトリクス座標・layout option の条件・エンコーダ印を取り出す
//  - 選択済みの option でキー集合を絞る
//
// bit の詰め方と KLE ラベルの読み方は vial-gui（editor/layout_editor.py /
// protocol/keyboard_comm.py。GPL-2.0）と kle-serial（MIT）の deserialize に
// 揃えてある。ここでは仕様（入出力の形）だけを写し、コードは独自に書いている。
"use strict";

const VialLayout = (() => {
  // vial.json の labels 1 項目が占める bit 数。文字列は on/off の 1 bit、
  // 配列は [名前, 選択肢...] で ceil(log2(選択肢数)) bit（vial-gui は
  // (選択肢数-1).bit_length() で同じ値になる）。
  function bitsFor(label) {
    if (!Array.isArray(label)) return 1;
    const n = Math.max(0, label.length - 1);
    let bits = 0;
    for (let v = n - 1; v > 0; v >>= 1) bits++;
    return bits;
  }

  // labels[0] が最上位側、labels[末尾] が最下位 bit。VIA は「後ろの項目ほど
  // 下位」に詰めるので、末尾から順に下位 bit を取り出す。
  function decodeOptions(labels, value) {
    const out = new Array(labels.length).fill(0);
    let v = Number(value) >>> 0;
    for (let i = labels.length - 1; i >= 0; i--) {
      const bits = bitsFor(labels[i]);
      out[i] = v & ((1 << bits) - 1);
      v >>>= bits;
    }
    return out;
  }

  function encodeOptions(labels, choices) {
    let v = 0;
    for (let i = 0; i < labels.length; i++) {
      const bits = bitsFor(labels[i]);
      v = ((v << bits) | (Number(choices[i]) & ((1 << bits) - 1))) >>> 0;
    }
    return v;
  }

  // KLE の凡例は 1 つの文字列を "\n" で 12 区画に分けたもので、区画の並びは
  // キーの a (align) で変わる。kle-serial の labelMap と同じ表。-1 は捨てる。
  const LABEL_MAP = [
    [0, 6, 2, 8, 9, 11, 3, 5, 1, 4, 7, 10],
    [1, 7, -1, -1, 9, 11, 4, -1, -1, -1, -1, 10],
    [3, -1, 5, -1, 9, 11, -1, -1, 4, -1, -1, 10],
    [4, -1, -1, -1, 9, 11, -1, -1, -1, -1, -1, 10],
    [0, 6, 2, 8, 10, -1, 3, 5, 1, 4, 7, -1],
    [1, 7, -1, -1, 10, -1, 4, -1, -1, -1, -1, -1],
    [3, -1, 5, -1, 10, -1, -1, -1, 4, -1, -1, -1],
    [4, -1, -1, -1, 10, -1, -1, -1, -1, -1, -1, -1],
  ];

  function splitLabels(text, align) {
    const map = LABEL_MAP[align] || LABEL_MAP[4];
    const out = new Array(12).fill("");
    const parts = String(text).split("\n");
    for (let i = 0; i < parts.length && i < 12; i++) {
      if (map[i] >= 0) out[map[i]] = parts[i];
    }
    return out;
  }

  function pair(text) {
    const m = /^\s*(-?\d+)\s*,\s*(-?\d+)\s*$/.exec(text || "");
    return m ? [Number(m[1]), Number(m[2])] : null;
  }

  // KLE の行配列を歩く。x/y は現在位置への加算、w/h はそのキーだけ、
  // 行末で y += 1・x は回転原点 rx に戻る。r/rx/ry はそのまま持ち出す。
  function parseKle(rows) {
    const keys = [];
    const cur = { x: 0, y: 0, w: 1, h: 1, r: 0, rx: 0, ry: 0, a: 4, d: false };
    for (const row of Array.isArray(rows) ? rows : []) {
      if (!Array.isArray(row)) continue; // 先頭のメタデータ等
      for (const item of row) {
        if (item && typeof item === "object") {
          if (typeof item.r === "number") cur.r = item.r;
          if (typeof item.rx === "number") { cur.rx = item.rx; cur.x = item.rx; }
          if (typeof item.ry === "number") { cur.ry = item.ry; cur.y = item.ry; }
          if (typeof item.a === "number") cur.a = item.a;
          if (typeof item.x === "number") cur.x += item.x;
          if (typeof item.y === "number") cur.y += item.y;
          if (typeof item.w === "number") cur.w = item.w;
          if (typeof item.h === "number") cur.h = item.h;
          if (typeof item.d === "boolean") cur.d = item.d;
          continue;
        }
        if (typeof item !== "string") continue; // 数値や null は KLE に無い
        const labels = splitLabels(item, cur.a);
        const key = {
          x: cur.x, y: cur.y, w: cur.w, h: cur.h, r: cur.r, rx: cur.rx, ry: cur.ry,
          decal: cur.d, row: null, col: null, encoder: null, option: null,
        };
        const q = pair(labels[8]);
        if (q) key.option = { index: q[0], choice: q[1] };
        if (labels[4] === "e") {
          const e = pair(labels[0]);
          if (e) key.encoder = { index: e[0], direction: e[1] };
        } else {
          const rc = pair(labels[0]);
          if (rc) { key.row = rc[0]; key.col = rc[1]; }
        }
        keys.push(key);
        cur.x += cur.w;
        cur.w = 1; cur.h = 1; cur.d = false;
      }
      cur.y += 1;
      cur.x = cur.rx;
    }
    return keys;
  }

  // 選択済み option に合うキーだけを残す（条件の無いキーは常に残す）。
  function selectLayout(keys, choices) {
    const picked = keys.filter((k) => !k.option || choices[k.option.index] === k.option.choice);
    return {
      keys: picked.filter((k) => k.row !== null && !k.encoder),
      encoders: picked.filter((k) => k.encoder),
    };
  }

  // 端末の選択済みレイアウトを、ボードプロファイルの鍵に重ねる。位置・寸法は
  // 端末側、刻印や KeyboardEvent.code はプロファイル側（同じ matrix 座標の
  // キーがあれば）を使う。プロファイルに無い座標は matrix だけの合成キーにする。
  function composeOverlay(profileKeys, selected) {
    const byPos = new Map();
    for (const k of profileKeys || []) if (k.m) byPos.set(k.m[0] + "," + k.m[1], k);
    const keys = (selected.keys || []).map((d) => {
      const base = byPos.get(d.row + "," + d.col);
      const merged = base ? Object.assign({}, base) : {
        code: "__m" + d.row + "_" + d.col, label: "", m: [d.row, d.col], device: true,
      };
      merged.x = d.x; merged.y = d.y; merged.w = d.w; merged.h = d.h;
      return merged;
    });
    const encoders = (selected.encoders || []).map((e) => ({
      index: e.encoder.index, direction: e.encoder.direction, x: e.x, y: e.y, w: e.w, h: e.h,
    }));
    const all = keys.concat(encoders);
    return {
      keys, encoders,
      unitsWide: all.reduce((m, k) => Math.max(m, k.x + k.w), 0),
      unitsHigh: all.reduce((m, k) => Math.max(m, k.y + k.h), 0),
    };
  }

  // labels と選択値から、スタッフ画面向けの短い説明を作る。
  function describe(labels, choices) {
    return labels.map((label, i) => {
      if (Array.isArray(label)) return label[0] + ": " + (label[1 + choices[i]] || "?");
      return label + ": " + (choices[i] ? "あり" : "なし");
    });
  }

  return { bitsFor, decodeOptions, encodeOptions, parseKle, selectLayout, composeOverlay, describe };
})();

if (typeof module !== "undefined" && module.exports) module.exports = VialLayout;
