// =============================================================
// OLSK60 v2 board profile
// Source: official KLE data (gist 641df3ee125afe1bd4ef41c9a0cded7d)
// =============================================================
"use strict";

const OLSK60_PROFILE = {
  id: "olsk60v2",
  name: "OLSK60 v2",
  match: {
    uid: [0xC4, 0x37, 0xB8, 0x91, 0x73, 0x93, 0x22, 0xAD],
    usb: { vendorId: 0x746D, productId: 0x0102 },
  },
  unitsWide: 15,
  unitsHigh: 5,
  // Trackpoint stick sits in the 0.75u center channel at home-row height.
  pointing: { type: "trackpoint", x: 7.125, y: 2.5, image: null },
  // Electrical matrix (qmk-config techmechkeys/olsk60 keyboard.json).
  // Used as the fallback when the vial.json definition cannot be pulled
  // from the device (browser WebHID mode has no XZ decoder).
  matrix: { rows: 6, cols: 14 },
  // Vial customKeycodes short names, in QK_KB_0.. order (vial.json).
  // Fallback for when the on-device definition is unavailable.
  customKeycodes: [
    "Precision", "Balanced", "Fast", "CustPrec", "CustFast",
    "Spd+", "Spd-", "Acc+", "Acc-", "Dec+", "Dec-",
    "Snd", "SndMode", "Oct+", "Oct-",
    "AL 150ms", "AL 400ms", "AL 800ms", "AL Toggle", "Scroll",
  ],
  // m: [row, col] — bottom row follows the 3-split-space layout option
  // of vial.json ([4,3]/[4,6] are unused in this physical variant).
  keys: [
    // ---- Row 0 -------------------------------------------------
    { code: "Escape",       x: 0.75,  y: 0, w: 1,    label: "Esc", m: [0, 0] },
    { code: "Digit1",       x: 1.75,  y: 0, w: 1,    label: "1", shift: "!", m: [0, 1] },
    { code: "Digit2",       x: 2.75,  y: 0, w: 1,    label: "2", shift: "@", m: [0, 2] },
    { code: "Digit3",       x: 3.75,  y: 0, w: 1,    label: "3", shift: "#", m: [0, 3] },
    { code: "Digit4",       x: 4.75,  y: 0, w: 1,    label: "4", shift: "$", m: [0, 4] },
    { code: "Digit5",       x: 5.75,  y: 0, w: 1,    label: "5", shift: "%", m: [0, 5] },
    { code: "Digit6",       x: 7.5,   y: 0, w: 1,    label: "6", shift: "^", m: [0, 6] },
    { code: "Digit7",       x: 8.5,   y: 0, w: 1,    label: "7", shift: "&", m: [0, 7] },
    { code: "Digit8",       x: 9.5,   y: 0, w: 1,    label: "8", shift: "*", m: [0, 8] },
    { code: "Digit9",       x: 10.5,  y: 0, w: 1,    label: "9", shift: "(", m: [0, 9] },
    { code: "Digit0",       x: 11.5,  y: 0, w: 1,    label: "0", shift: ")", m: [0, 10] },
    { code: "Backspace",    x: 12.5,  y: 0, w: 2,    label: "Backspace", m: [0, 11] },
    // ---- Row 1 -------------------------------------------------
    { code: "Tab",          x: 0.15,  y: 1, w: 1.5,  label: "Tab", m: [1, 0] },
    { code: "KeyQ",         x: 1.75,  y: 1, w: 1,    label: "Q", m: [1, 1] },
    { code: "KeyW",         x: 2.75,  y: 1, w: 1,    label: "W", m: [1, 2] },
    { code: "KeyE",         x: 3.75,  y: 1, w: 1,    label: "E", m: [1, 3] },
    { code: "KeyR",         x: 4.75,  y: 1, w: 1,    label: "R", m: [1, 4] },
    { code: "KeyT",         x: 5.75,  y: 1, w: 1,    label: "T", m: [1, 5] },
    { code: "KeyY",         x: 7.5,   y: 1, w: 1,    label: "Y", m: [1, 6] },
    { code: "KeyU",         x: 8.5,   y: 1, w: 1,    label: "U", m: [1, 7] },
    { code: "KeyI",         x: 9.5,   y: 1, w: 1,    label: "I", m: [1, 8] },
    { code: "KeyO",         x: 10.5,  y: 1, w: 1,    label: "O", m: [1, 9] },
    { code: "KeyP",         x: 11.5,  y: 1, w: 1,    label: "P", m: [1, 10] },
    { code: "BracketLeft",  x: 12.5,  y: 1, w: 1,    label: "[", shift: "{", m: [1, 11] },
    { code: "Backslash",    x: 13.5,  y: 1, w: 1.5,  label: "\\", shift: "|", m: [1, 12] },
    // ---- Row 2 -------------------------------------------------
    { code: "ControlLeft",  x: 0,     y: 2, w: 1.75, label: "Ctrl", id: "ControlLeft-home", m: [2, 0] },
    { code: "KeyA",         x: 1.75,  y: 2, w: 1,    label: "A", m: [2, 1] },
    { code: "KeyS",         x: 2.75,  y: 2, w: 1,    label: "S", m: [2, 2] },
    { code: "KeyD",         x: 3.75,  y: 2, w: 1,    label: "D", m: [2, 3] },
    { code: "KeyF",         x: 4.75,  y: 2, w: 1,    label: "F", homing: true, m: [2, 4] },
    { code: "KeyG",         x: 5.75,  y: 2, w: 1,    label: "G", m: [2, 5] },
    { code: "KeyH",         x: 7.5,   y: 2, w: 1,    label: "H", m: [2, 6] },
    { code: "KeyJ",         x: 8.5,   y: 2, w: 1,    label: "J", homing: true, m: [2, 7] },
    { code: "KeyK",         x: 9.5,   y: 2, w: 1,    label: "K", m: [2, 8] },
    { code: "KeyL",         x: 10.5,  y: 2, w: 1,    label: "L", m: [2, 9] },
    { code: "Semicolon",    x: 11.5,  y: 2, w: 1,    label: ";", shift: ":", m: [2, 10] },
    { code: "Enter",        x: 12.5,  y: 2, w: 2.25, label: "Enter", m: [2, 11] },
    // ---- Row 3 -------------------------------------------------
    { code: "ShiftLeft",    x: 0,     y: 3, w: 1.75, label: "Shift", m: [3, 0] },
    { code: "KeyZ",         x: 1.75,  y: 3, w: 1,    label: "Z", m: [3, 1] },
    { code: "KeyX",         x: 2.75,  y: 3, w: 1,    label: "X", m: [3, 2] },
    { code: "KeyC",         x: 3.75,  y: 3, w: 1,    label: "C", m: [3, 3] },
    { code: "KeyV",         x: 4.75,  y: 3, w: 1,    label: "V", m: [3, 4] },
    { code: "KeyB",         x: 5.75,  y: 3, w: 1,    label: "B", m: [3, 5] },
    { code: "KeyN",         x: 7.5,   y: 3, w: 1,    label: "N", m: [3, 6] },
    { code: "KeyM",         x: 8.5,   y: 3, w: 1,    label: "M", m: [3, 7] },
    { code: "Comma",        x: 9.5,   y: 3, w: 1,    label: ",", shift: "<", m: [3, 8] },
    { code: "Period",       x: 10.5,  y: 3, w: 1,    label: ".", shift: ">", m: [3, 9] },
    { code: "Slash",        x: 11.5,  y: 3, w: 1,    label: "/", shift: "?", m: [3, 10] },
    { code: "ArrowUp",      x: 12.5,  y: 3, w: 1,    label: "↑", m: [3, 11] },
    { code: "ShiftRight",   x: 13.5,  y: 3, w: 1.25, label: "Shift", m: [3, 12] },
    // ---- Row 4 -------------------------------------------------
    { code: "ControlLeft",  x: 0.5,   y: 4, w: 1.25, label: "Ctrl", id: "ControlLeft-bottom", m: [4, 0] },
    { code: "MetaLeft",     x: 1.75,  y: 4, w: 1.25, label: "Win", win: true, m: [4, 1] },
    { code: "AltLeft",      x: 3.0,   y: 4, w: 1.25, label: "Alt", m: [4, 2] },
    { code: "Space",        x: 4.25,  y: 4, w: 2.25, label: "Space", m: [4, 4] },
    { code: "__Fn1",        x: 6.5,   y: 4, w: 1.25, label: "Fn1", layer: true, m: [4, 5] },
    { code: "Delete",       x: 7.75,  y: 4, w: 2.75, label: "Delete", m: [4, 7] },
    { code: "__Fn2",        x: 10.5,  y: 4, w: 1,    label: "Fn2", layer: true, m: [4, 9] },
    { code: "ArrowLeft",    x: 11.5,  y: 4, w: 1,    label: "←", m: [4, 10] },
    { code: "ArrowDown",    x: 12.5,  y: 4, w: 1,    label: "↓", m: [4, 11] },
    { code: "ArrowRight",   x: 13.5,  y: 4, w: 1,    label: "→", m: [4, 12] },
  ],
  phrases: [
    "hello olsk60",
    "red dot in the middle",
    "sixty keys one stick",
    "trackpoint is the answer",
    "tap the red dot to move the cursor",
    "point click and scroll with one stick",
  ],
};

registerBoard(OLSK60_PROFILE);
