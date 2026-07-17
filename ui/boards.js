// =============================================================
// Board profile registry
// =============================================================
"use strict";

const BOARDS = [];
let DEFAULT_BOARD = null;

function registerBoard(profile) {
  BOARDS.push(profile);
  if (!DEFAULT_BOARD) DEFAULT_BOARD = profile;
}

function findBoard(uid, vendorId, productId) {
  if (uid && uid.length === 8) {
    for (const profile of BOARDS) {
      const expected = profile.match && profile.match.uid;
      if (expected && expected.length === 8 && expected.every((byte, i) => byte === uid[i])) {
        return profile;
      }
    }
  }
  for (const profile of BOARDS) {
    const usb = profile.match && profile.match.usb;
    if (usb && usb.vendorId === vendorId && usb.productId === productId) return profile;
  }
  return null;
}
