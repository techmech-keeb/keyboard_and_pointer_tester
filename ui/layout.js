// =============================================================
// OLSK60 v2 physical layout
// Source: official KLE data (gist 641df3ee125afe1bd4ef41c9a0cded7d)
// Coordinates are in key units (1u). x,y = top-left, w = width.
// =============================================================
"use strict";

const OLSK60 = {
  name: "OLSK60 v2",
  unitsWide: 15,
  unitsHigh: 5,
  // Trackpoint stick sits in the 0.75u center channel at home-row height.
  trackpoint: { x: 7.125, y: 2.5 },
  keys: [
    // ---- Row 0 -------------------------------------------------
    { code: "Escape",       x: 0.75,  y: 0, w: 1,    label: "Esc" },
    { code: "Digit1",       x: 1.75,  y: 0, w: 1,    label: "1", shift: "!" },
    { code: "Digit2",       x: 2.75,  y: 0, w: 1,    label: "2", shift: "@" },
    { code: "Digit3",       x: 3.75,  y: 0, w: 1,    label: "3", shift: "#" },
    { code: "Digit4",       x: 4.75,  y: 0, w: 1,    label: "4", shift: "$" },
    { code: "Digit5",       x: 5.75,  y: 0, w: 1,    label: "5", shift: "%" },
    { code: "Digit6",       x: 7.5,   y: 0, w: 1,    label: "6", shift: "^" },
    { code: "Digit7",       x: 8.5,   y: 0, w: 1,    label: "7", shift: "&" },
    { code: "Digit8",       x: 9.5,   y: 0, w: 1,    label: "8", shift: "*" },
    { code: "Digit9",       x: 10.5,  y: 0, w: 1,    label: "9", shift: "(" },
    { code: "Digit0",       x: 11.5,  y: 0, w: 1,    label: "0", shift: ")" },
    { code: "Backspace",    x: 12.5,  y: 0, w: 2,    label: "Backspace" },
    // ---- Row 1 -------------------------------------------------
    { code: "Tab",          x: 0.15,  y: 1, w: 1.5,  label: "Tab" },
    { code: "KeyQ",         x: 1.75,  y: 1, w: 1,    label: "Q" },
    { code: "KeyW",         x: 2.75,  y: 1, w: 1,    label: "W" },
    { code: "KeyE",         x: 3.75,  y: 1, w: 1,    label: "E" },
    { code: "KeyR",         x: 4.75,  y: 1, w: 1,    label: "R" },
    { code: "KeyT",         x: 5.75,  y: 1, w: 1,    label: "T" },
    { code: "KeyY",         x: 7.5,   y: 1, w: 1,    label: "Y" },
    { code: "KeyU",         x: 8.5,   y: 1, w: 1,    label: "U" },
    { code: "KeyI",         x: 9.5,   y: 1, w: 1,    label: "I" },
    { code: "KeyO",         x: 10.5,  y: 1, w: 1,    label: "O" },
    { code: "KeyP",         x: 11.5,  y: 1, w: 1,    label: "P" },
    { code: "BracketLeft",  x: 12.5,  y: 1, w: 1,    label: "[", shift: "{" },
    { code: "Backslash",    x: 13.5,  y: 1, w: 1.5,  label: "\\", shift: "|" },
    // ---- Row 2 -------------------------------------------------
    { code: "ControlLeft",  x: 0,     y: 2, w: 1.75, label: "Ctrl", id: "ControlLeft-home" },
    { code: "KeyA",         x: 1.75,  y: 2, w: 1,    label: "A" },
    { code: "KeyS",         x: 2.75,  y: 2, w: 1,    label: "S" },
    { code: "KeyD",         x: 3.75,  y: 2, w: 1,    label: "D" },
    { code: "KeyF",         x: 4.75,  y: 2, w: 1,    label: "F", homing: true },
    { code: "KeyG",         x: 5.75,  y: 2, w: 1,    label: "G" },
    { code: "KeyH",         x: 7.5,   y: 2, w: 1,    label: "H" },
    { code: "KeyJ",         x: 8.5,   y: 2, w: 1,    label: "J", homing: true },
    { code: "KeyK",         x: 9.5,   y: 2, w: 1,    label: "K" },
    { code: "KeyL",         x: 10.5,  y: 2, w: 1,    label: "L" },
    { code: "Semicolon",    x: 11.5,  y: 2, w: 1,    label: ";", shift: ":" },
    { code: "Enter",        x: 12.5,  y: 2, w: 2.25, label: "Enter" },
    // ---- Row 3 -------------------------------------------------
    { code: "ShiftLeft",    x: 0,     y: 3, w: 1.75, label: "Shift" },
    { code: "KeyZ",         x: 1.75,  y: 3, w: 1,    label: "Z" },
    { code: "KeyX",         x: 2.75,  y: 3, w: 1,    label: "X" },
    { code: "KeyC",         x: 3.75,  y: 3, w: 1,    label: "C" },
    { code: "KeyV",         x: 4.75,  y: 3, w: 1,    label: "V" },
    { code: "KeyB",         x: 5.75,  y: 3, w: 1,    label: "B" },
    { code: "KeyN",         x: 7.5,   y: 3, w: 1,    label: "N" },
    { code: "KeyM",         x: 8.5,   y: 3, w: 1,    label: "M" },
    { code: "Comma",        x: 9.5,   y: 3, w: 1,    label: ",", shift: "<" },
    { code: "Period",       x: 10.5,  y: 3, w: 1,    label: ".", shift: ">" },
    { code: "Slash",        x: 11.5,  y: 3, w: 1,    label: "/", shift: "?" },
    { code: "ArrowUp",      x: 12.5,  y: 3, w: 1,    label: "↑" },
    { code: "ShiftRight",   x: 13.5,  y: 3, w: 1.25, label: "Shift" },
    // ---- Row 4 -------------------------------------------------
    { code: "ControlLeft",  x: 0.5,   y: 4, w: 1.25, label: "Ctrl", id: "ControlLeft-bottom" },
    { code: "MetaLeft",     x: 1.75,  y: 4, w: 1.25, label: "Win", win: true },
    { code: "AltLeft",      x: 3.0,   y: 4, w: 1.25, label: "Alt" },
    { code: "Space",        x: 4.25,  y: 4, w: 2.25, label: "Space" },
    { code: "__Fn1",        x: 6.5,   y: 4, w: 1.25, label: "Fn1", layer: true },
    { code: "Delete",       x: 7.75,  y: 4, w: 2.75, label: "Delete" },
    { code: "__Fn2",        x: 10.5,  y: 4, w: 1,    label: "Fn2", layer: true },
    { code: "ArrowLeft",    x: 11.5,  y: 4, w: 1,    label: "←" },
    { code: "ArrowDown",    x: 12.5,  y: 4, w: 1,    label: "↓" },
    { code: "ArrowRight",   x: 13.5,  y: 4, w: 1,    label: "→" },
  ],
};

// Typing-practice phrases. Kept short so a visitor finishes one in ~10s.
const PRACTICE_PHRASES = [
  "hello olsk60",
  "red dot in the middle",
  "sixty keys one stick",
  "the quick brown fox jumps over the lazy dog",
  "type without leaving home row",
  "click and scroll with the stick",
  "jisaku keyboard tanoshii",
  "pack my box with five dozen liquor jugs",
  "trackpoint is the answer",
  "home row heroes never reach for a mouse",
];
