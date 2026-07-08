// =============================================================
// QMK/Vial keycode -> display label conversion
// Number scheme is selected by the Vial protocol version reported
// by the firmware (vial_get_keyboard_id):
//   - protocol >= 6 : modern QMK keycodes (vial-qmk / QMK 0.22+)
//   - protocol <  6 : legacy QMK keycodes (old vial-qmk)
// A future RMK+Vial firmware is expected to speak protocol >= 6;
// only this table needs to change if its numbering ever differs.
// Source of truth: vial-gui keycodes_v5.py / keycodes_v6.py.
// =============================================================
"use strict";

const VialKeycodes = (() => {

  // ---- basic (HID) range 0x00..0xFF: [label, shiftLabel?] ----
  const BASIC = {
    0x00: [""],            // KC_NO
    0x01: ["▽"],           // KC_TRNS (handled separately, label as fallback)
    0x28: ["Enter"], 0x29: ["Esc"], 0x2A: ["Bksp"], 0x2B: ["Tab"], 0x2C: ["Space"],
    0x2D: ["-", "_"], 0x2E: ["=", "+"], 0x2F: ["[", "{"], 0x30: ["]", "}"],
    0x31: ["\\", "|"], 0x32: ["#", "~"], 0x33: [";", ":"], 0x34: ["'", "\""],
    0x35: ["`", "~"], 0x36: [",", "<"], 0x37: [".", ">"], 0x38: ["/", "?"],
    0x39: ["Caps"],
    0x46: ["PrtSc"], 0x47: ["ScrLk"], 0x48: ["Pause"],
    0x49: ["Ins"], 0x4A: ["Home"], 0x4B: ["PgUp"], 0x4C: ["Del"],
    0x4D: ["End"], 0x4E: ["PgDn"],
    0x4F: ["→"], 0x50: ["←"], 0x51: ["↓"], 0x52: ["↑"],
    0x53: ["NumLk"], 0x54: ["P/"], 0x55: ["P*"], 0x56: ["P-"], 0x57: ["P+"],
    0x58: ["PEnt"], 0x63: ["P."], 0x64: ["\\", "|"], 0x65: ["Menu"], 0x67: ["P="],
    0x85: ["P,"],
    0x87: ["INT1"], 0x88: ["かな"], 0x89: ["¥"], 0x8A: ["変換"], 0x8B: ["無変換"],
    0x90: ["LANG1"], 0x91: ["LANG2"], 0x92: ["LANG3"], 0x93: ["LANG4"], 0x94: ["LANG5"],
    0xA5: ["Power"], 0xA6: ["Sleep"], 0xA7: ["Wake"],
    0xA8: ["Mute"], 0xA9: ["Vol+"], 0xAA: ["Vol-"],
    0xAB: ["⏭"], 0xAC: ["⏮"], 0xAD: ["⏹"], 0xAE: ["⏯"], 0xAF: ["MSel"], 0xB0: ["Eject"],
    0xB1: ["Mail"], 0xB2: ["Calc"], 0xB3: ["MyPC"], 0xB4: ["WWW⌕"], 0xB5: ["WWW⌂"],
    0xB6: ["WWW←"], 0xB7: ["WWW→"], 0xB8: ["Stop"], 0xB9: ["Reload"], 0xBA: ["Fav"],
    0xBB: ["⏩"], 0xBC: ["⏪"], 0xBD: ["Bri+"], 0xBE: ["Bri-"],
    0xE0: ["Ctrl"], 0xE1: ["Shift"], 0xE2: ["Alt"], 0xE3: ["Win"],
    0xE4: ["Ctrl"], 0xE5: ["Shift"], 0xE6: ["Alt"], 0xE7: ["Win"],
  };
  // letters
  for (let i = 0; i < 26; i++) BASIC[0x04 + i] = [String.fromCharCode(65 + i)];
  // digits 1-9,0
  const DIGIT_SHIFT = ["!", "@", "#", "$", "%", "^", "&", "*", "(", ")"];
  for (let i = 0; i < 10; i++) BASIC[0x1E + i] = ["1234567890"[i], DIGIT_SHIFT[i]];
  // F1-F12 / F13-F24
  for (let i = 0; i < 12; i++) BASIC[0x3A + i] = ["F" + (i + 1)];
  for (let i = 0; i < 12; i++) BASIC[0x68 + i] = ["F" + (i + 13)];
  // keypad 1-9,0
  for (let i = 0; i < 10; i++) BASIC[0x59 + i] = ["P" + "1234567890"[i]];

  // mouse keys: modern QMK sits in 0xCD..0xDF, legacy in 0xF0..0xFF
  const MOUSE = {
    up: ["M↑"], down: ["M↓"], left: ["M←"], right: ["M→"],
    b1: ["Mouse1"], b2: ["Mouse2"], b3: ["Mouse3"], b4: ["Mouse4"], b5: ["Mouse5"],
    wu: ["Wh↑"], wd: ["Wh↓"], wl: ["Wh←"], wr: ["Wh→"],
    a0: ["Acc0"], a1: ["Acc1"], a2: ["Acc2"],
  };
  const BASIC_V6 = Object.assign({}, BASIC, {
    0xCD: MOUSE.up, 0xCE: MOUSE.down, 0xCF: MOUSE.left, 0xD0: MOUSE.right,
    0xD1: MOUSE.b1, 0xD2: MOUSE.b2, 0xD3: MOUSE.b3, 0xD4: MOUSE.b4, 0xD5: MOUSE.b5,
    0xD9: MOUSE.wu, 0xDA: MOUSE.wd, 0xDB: MOUSE.wl, 0xDC: MOUSE.wr,
    0xDD: MOUSE.a0, 0xDE: MOUSE.a1, 0xDF: MOUSE.a2,
  });
  const BASIC_V5 = Object.assign({}, BASIC, {
    0xF0: MOUSE.up, 0xF1: MOUSE.down, 0xF2: MOUSE.left, 0xF3: MOUSE.right,
    0xF4: MOUSE.b1, 0xF5: MOUSE.b2, 0xF6: MOUSE.b3, 0xF7: MOUSE.b4, 0xF8: MOUSE.b5,
    0xF9: MOUSE.wu, 0xFA: MOUSE.wd, 0xFB: MOUSE.wl, 0xFC: MOUSE.wr,
    0xFD: MOUSE.a0, 0xFE: MOUSE.a1, 0xFF: MOUSE.a2,
  });

  const MOD_NAMES = { 1: "Ctl", 2: "Sft", 4: "Alt", 8: "Win" };
  function modText(mods /* 5bit: bit4 = right-hand */) {
    const right = (mods & 0x10) !== 0;
    const parts = [];
    for (const bit of [1, 2, 4, 8]) if (mods & bit) parts.push(MOD_NAMES[bit]);
    if (parts.length === 4) return right ? "RHypr" : "Hypr";
    if (parts.length === 3 && !(mods & 8)) return right ? "RMeh" : "Meh";
    return (right ? "R" : "") + parts.join("+");
  }

  // ---- quantum ranges per protocol version ----------------------
  // Each entry: [lo, hi, decode(kc)]
  function layerRes(hold, n) { return { kind: "layer", hold, layer: n, text: hold.toUpperCase() + "(" + n + ")" }; }

  function decodeModern(kc, basic) {
    if (kc >= 0x0100 && kc <= 0x1FFF)      // mods applied: e.g. LSFT(kc)
      return { kind: "mods", text: basicLabel(kc & 0xFF, basic), sub: modText((kc >> 8) & 0x1F) };
    if (kc >= 0x2000 && kc <= 0x3FFF)      // mod-tap
      return { kind: "modtap", text: basicLabel(kc & 0xFF, basic), sub: modText((kc >> 8) & 0x1F) + "/hold" };
    if (kc >= 0x4000 && kc <= 0x4FFF) {    // layer-tap
      const n = (kc >> 8) & 0xF;
      return { kind: "layer", hold: "lt", layer: n, text: basicLabel(kc & 0xFF, basic), sub: "L" + n + "/hold" };
    }
    if (kc >= 0x5000 && kc <= 0x51FF) {    // layer-mod
      const n = (kc >> 5) & 0xF;
      return Object.assign(layerRes("lm", n), { sub: modText(kc & 0x1F) });
    }
    if (kc >= 0x5200 && kc <= 0x521F) return layerRes("to", kc & 0x1F);
    if (kc >= 0x5220 && kc <= 0x523F) return layerRes("mo", kc & 0x1F);
    if (kc >= 0x5240 && kc <= 0x525F) return layerRes("df", kc & 0x1F);
    if (kc >= 0x5260 && kc <= 0x527F) return layerRes("tg", kc & 0x1F);
    if (kc >= 0x5280 && kc <= 0x529F) return layerRes("osl", kc & 0x1F);
    if (kc >= 0x52A0 && kc <= 0x52BF) return { kind: "other", text: "OSM", sub: modText(kc & 0x1F) };
    if (kc >= 0x52C0 && kc <= 0x52DF) return layerRes("tt", kc & 0x1F);
    if (kc >= 0x52E0 && kc <= 0x52FF) return layerRes("df", kc & 0x1F); // PDF(n)
    if (kc >= 0x5700 && kc <= 0x57FF) return { kind: "other", text: "TD" + (kc & 0xFF) };
    if (kc >= 0x7700 && kc <= 0x777F) return { kind: "macro", text: "M" + (kc & 0x7F) };
    if (kc === 0x7C00) return { kind: "other", text: "Boot" };
    if (kc === 0x7C01) return { kind: "other", text: "Reboot" }; // QK_REBOOT
    if (kc === 0x7C03) return { kind: "other", text: "EEClr" };  // QK_CLEAR_EEPROM
    if (kc === 0x7C16) return { kind: "other", text: "Esc`" };   // QK_GRAVE_ESCAPE
    if (kc >= 0x7E00 && kc <= 0x7FFF) return { kind: "custom", index: kc - 0x7E00 };
    return null;
  }

  function decodeLegacy(kc, basic) {
    if (kc >= 0x0100 && kc <= 0x1FFF)
      return { kind: "mods", text: basicLabel(kc & 0xFF, basic), sub: modText((kc >> 8) & 0x1F) };
    if (kc >= 0x4000 && kc <= 0x4FFF) {
      const n = (kc >> 8) & 0xF;
      return { kind: "layer", hold: "lt", layer: n, text: basicLabel(kc & 0xFF, basic), sub: "L" + n + "/hold" };
    }
    if (kc >= 0x5000 && kc <= 0x50FF) return layerRes("to", kc & 0x0F);
    if (kc >= 0x5100 && kc <= 0x51FF) return layerRes("mo", kc & 0xFF);
    if (kc >= 0x5200 && kc <= 0x52FF) return layerRes("df", kc & 0xFF);
    if (kc >= 0x5300 && kc <= 0x53FF) return layerRes("tg", kc & 0xFF);
    if (kc >= 0x5400 && kc <= 0x54FF) return layerRes("osl", kc & 0xFF);
    if (kc >= 0x5500 && kc <= 0x55FF) return { kind: "other", text: "OSM", sub: modText(kc & 0x1F) };
    if (kc >= 0x5700 && kc <= 0x57FF) return { kind: "other", text: "TD" + (kc & 0xFF) };
    if (kc >= 0x5800 && kc <= 0x58FF) return layerRes("tt", kc & 0xFF);
    if (kc >= 0x5900 && kc <= 0x59FF) return Object.assign(layerRes("lm", (kc >> 4) & 0xF), { sub: modText(kc & 0xF) });
    if (kc === 0x5C00) return { kind: "other", text: "Boot" };
    if (kc >= 0x5F80 && kc <= 0x5FBF) return { kind: "custom", index: kc - 0x5F80 };
    if (kc >= 0x6000 && kc <= 0x7FFF)
      return { kind: "modtap", text: basicLabel(kc & 0xFF, basic), sub: modText((kc >> 8) & 0x1F) + "/hold" };
    return null;
  }

  function basicLabel(kc, basic) {
    const e = basic[kc];
    return e ? e[0] : "0x" + kc.toString(16).toUpperCase().padStart(2, "0");
  }

  /**
   * kc: 16bit keycode
   * opts: { protocol: vial protocol version (default 6),
   *         customKeycodes: array of short names for QK_KB_n / USERnn }
   * returns { kind, text, sub?, shift?, layer?, hold? }
   *   kind: none | trns | basic | mods | modtap | layer | macro | custom | other | raw
   */
  function describe(kc, opts) {
    opts = opts || {};
    const modern = (opts.protocol === undefined || opts.protocol >= 6);
    const basic = modern ? BASIC_V6 : BASIC_V5;

    if (kc === 0x0000) return { kind: "none", text: "" };
    if (kc === 0x0001) return { kind: "trns", text: "▽" };
    if (kc <= 0xFF) {
      const e = basic[kc];
      if (e) return { kind: "basic", text: e[0], shift: e[1] };
      return { kind: "raw", text: "0x" + kc.toString(16).toUpperCase().padStart(2, "0") };
    }
    const r = (modern ? decodeModern : decodeLegacy)(kc, basic);
    if (r) {
      if (r.kind === "custom") {
        const names = opts.customKeycodes || [];
        r.text = names[r.index] || "USER" + String(r.index).padStart(2, "0");
      }
      return r;
    }
    return { kind: "raw", text: "0x" + kc.toString(16).toUpperCase().padStart(4, "0") };
  }

  return { describe };
})();
