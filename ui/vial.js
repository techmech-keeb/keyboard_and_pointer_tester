// =============================================================
// Vial / VIA protocol over Raw HID (usage page 0xFF60, usage 0x61)
//
// Uses only standard Vial protocol features so it keeps working
// after a future move from vial-qmk to RMK+Vial:
//   0x01       via get_protocol_version
//   0x02 0x03  via get_keyboard_value / switch_matrix_state
//   0x11/0x12  via dynamic_keymap layer count / buffer
//   0xFE 0x00  vial_get_keyboard_id (protocol + UID)
//   0xFE 0x01/0x02 vial_get_size / vial_get_def (XZ-compressed vial.json)
//   0xFE 0x05..0x07 vial unlock status / start / poll
//
// Two transports, one protocol implementation:
//   KioskHidTransport — kiosk host (C#) owns the HID handle and is a
//     dumb pipe via the existing WebView2 postMessage bridge
//   WebHidTransport   — browser-standalone via WebHID
// All exchanges are lockstep: one 32-byte request, one 32-byte reply.
// =============================================================
"use strict";

const VIAL_EP_SIZE = 32;

// ---------------- kiosk host transport ----------------
class KioskHidTransport {
  static available() {
    return !!(window.chrome && window.chrome.webview);
  }

  constructor() {
    this._seq = 1;
    this._pending = new Map(); // seq -> {resolve, reject, timer}
    this.ondisconnect = null;
    window.chrome.webview.addEventListener("message", (ev) => {
      const d = ev.data;
      if (!d || d.type !== "vialhid") return;
      if (d.op === "closed") {
        this._failAll("device closed");
        if (this.ondisconnect) this.ondisconnect();
        return;
      }
      const p = this._pending.get(d.seq);
      if (!p) return; // stale reply after timeout — drop
      this._pending.delete(d.seq);
      clearTimeout(p.timer);
      if (d.ok) p.resolve(d);
      else p.reject(new Error(d.error || "hid error"));
    });
  }

  _post(msg, timeoutMs) {
    const seq = this._seq++;
    msg.type = "vialhid";
    msg.seq = seq;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this._pending.delete(seq);
        reject(new Error("hid timeout: " + msg.op));
      }, timeoutMs || 1500);
      this._pending.set(seq, { resolve, reject, timer });
      window.chrome.webview.postMessage(msg);
    });
  }

  _failAll(reason) {
    for (const [, p] of this._pending) {
      clearTimeout(p.timer);
      p.reject(new Error(reason));
    }
    this._pending.clear();
  }

  // Opens the index-th raw-HID interface (usage page FF60). The caller
  // probes it with vial_get_keyboard_id and advances index if needed.
  async open(index) {
    const r = await this._post({ op: "open", index: index || 0 }, 3000);
    this.vendorId = r.vendorId;
    this.productId = r.productId;
    return { product: r.product || "", count: r.count || 0 };
  }

  async send(bytes) {
    const r = await this._post({ op: "send", data: Array.from(bytes) }, 1500);
    return Uint8Array.from(r.data);
  }

  // XZ decompression is done host-side (no XZ decoder in the browser)
  async xz(bytes) {
    const r = await this._post({ op: "xz", data: Array.from(bytes) }, 8000);
    return r.text;
  }

  close() {
    this._post({ op: "close" }, 1000).catch(() => {});
    this._failAll("closed");
  }
}

// ---------------- WebHID transport (browser standalone) ----------------
class WebHidTransport {
  static available() {
    return !!navigator.hid;
  }

  static FILTER = { usagePage: 0xFF60, usage: 0x61 };

  constructor(device) {
    this._dev = device;
    this._waiter = null; // single in-flight request
    this.ondisconnect = null;
    device.oninputreport = (ev) => {
      if (!this._waiter) return; // unsolicited/stale report — drop
      const w = this._waiter;
      this._waiter = null;
      clearTimeout(w.timer);
      w.resolve(new Uint8Array(ev.data.buffer, ev.data.byteOffset, ev.data.byteLength).slice(0, VIAL_EP_SIZE));
    };
    this._onHidDisconnect = (ev) => {
      if (ev.device === this._dev && this.ondisconnect) this.ondisconnect();
    };
    navigator.hid.addEventListener("disconnect", this._onHidDisconnect);
  }

  /** already-granted device, no user gesture needed */
  static async openGranted() {
    const devs = await navigator.hid.getDevices();
    return WebHidTransport._openFirst(devs);
  }

  /** requires a user gesture (badge click) */
  static async requestDevice() {
    const devs = await navigator.hid.requestDevice({ filters: [WebHidTransport.FILTER] });
    return WebHidTransport._openFirst(devs);
  }

  static async _openFirst(devs) {
    for (const d of devs) {
      const ok = d.collections.some(
        (c) => c.usagePage === WebHidTransport.FILTER.usagePage && c.usage === WebHidTransport.FILTER.usage);
      if (!ok) continue;
      if (!d.opened) await d.open();
      return new WebHidTransport(d);
    }
    return null;
  }

  get product() { return this._dev.productName || ""; }
  get vendorId() { return this._dev.vendorId; }
  get productId() { return this._dev.productId; }

  send(bytes) {
    if (this._waiter) return Promise.reject(new Error("hid busy"));
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this._waiter = null;
        reject(new Error("hid timeout"));
      }, 1500);
      this._waiter = { resolve, timer };
      this._dev.sendReport(0, Uint8Array.from(bytes)).catch((e) => {
        this._waiter = null;
        clearTimeout(timer);
        reject(e);
      });
    });
  }

  async xz() { return null; } // no XZ decoder in the browser — caller falls back

  close() {
    navigator.hid.removeEventListener("disconnect", this._onHidDisconnect);
    try { this._dev.close(); } catch (_) { /* ignore */ }
  }
}

// ---------------- protocol ----------------
class VialDevice {
  constructor(transport) {
    this.t = transport;
    this.viaProtocol = 0;
    this.vialProtocol = 0;
    this.uid = null;        // Uint8Array(8)
    this.layers = 0;
    this.definition = null; // parsed vial.json (kiosk path only)
  }

  async cmd(bytes) {
    const buf = new Uint8Array(VIAL_EP_SIZE);
    buf.set(bytes.slice(0, VIAL_EP_SIZE));
    return this.t.send(buf);
  }

  // --- identification -------------------------------------------
  async readViaProtocol() {
    const r = await this.cmd([0x01]);
    this.viaProtocol = (r[1] << 8) | r[2];
    return this.viaProtocol;
  }

  async readVialInfo() {
    const r = await this.cmd([0xFE, 0x00]);
    this.vialProtocol = r[0] | (r[1] << 8) | (r[2] << 16) | (r[3] << 24);
    this.uid = r.slice(4, 12);
    // A non-Vial VIA board answers id_unhandled (byte0 = 0xFF -> 255);
    // a real Vial board replies a small protocol version (currently 6).
    return this.vialProtocol > 0 && this.vialProtocol <= 0x40;
  }

  // --- keyboard definition (vial.json, XZ) -----------------------
  async readDefinition() {
    const szr = await this.cmd([0xFE, 0x01]);
    const size = szr[0] | (szr[1] << 8) | (szr[2] << 16) | (szr[3] << 24);
    if (!size || size > 512 * 1024) return null;
    const raw = new Uint8Array(size);
    const pages = Math.ceil(size / VIAL_EP_SIZE);
    for (let p = 0; p < pages; p++) {
      const r = await this.cmd([0xFE, 0x02, p & 0xFF, (p >> 8) & 0xFF]);
      raw.set(r.slice(0, Math.min(VIAL_EP_SIZE, size - p * VIAL_EP_SIZE)), p * VIAL_EP_SIZE);
    }
    const text = await this.t.xz(raw);
    if (!text) return null;
    try {
      this.definition = JSON.parse(text);
      return this.definition;
    } catch (_) {
      return null;
    }
  }

  // --- dynamic keymap --------------------------------------------
  async readLayerCount() {
    const r = await this.cmd([0x11]);
    this.layers = r[1];
    return this.layers;
  }

  /** returns keymap[layer][row][col] = 16bit keycode (big-endian on wire) */
  async readKeymap(layers, rows, cols) {
    const bytesPerLayer = rows * cols * 2;
    const total = layers * bytesPerLayer;
    const buf = new Uint8Array(total);
    for (let off = 0; off < total; off += 28) {
      const size = Math.min(28, total - off);
      const r = await this.cmd([0x12, (off >> 8) & 0xFF, off & 0xFF, size]);
      buf.set(r.slice(4, 4 + size), off);
    }
    const keymap = [];
    let i = 0;
    for (let l = 0; l < layers; l++) {
      const rowsArr = [];
      for (let row = 0; row < rows; row++) {
        const colsArr = [];
        for (let col = 0; col < cols; col++) {
          colsArr.push((buf[i] << 8) | buf[i + 1]);
          i += 2;
        }
        rowsArr.push(colsArr);
      }
      keymap.push(rowsArr);
    }
    return keymap;
  }

  // --- unlock ------------------------------------------------------
  /** { unlocked, inProgress, keys: [[row,col],...] } */
  async readUnlockStatus() {
    const r = await this.cmd([0xFE, 0x05]);
    const keys = [];
    for (let i = 2; i + 1 < VIAL_EP_SIZE; i += 2) {
      if (r[i] === 0xFF || r[i + 1] === 0xFF) break;
      keys.push([r[i], r[i + 1]]);
    }
    return { unlocked: !!r[0], inProgress: !!r[1], keys };
  }

  async unlockStart() {
    await this.cmd([0xFE, 0x06]);
  }

  /** { unlocked, inProgress, counter } — counter counts 50 -> 0 while held */
  async unlockPoll() {
    const r = await this.cmd([0xFE, 0x07]);
    return { unlocked: !!r[0], inProgress: !!r[1], counter: r[2] };
  }

  // --- matrix tester -----------------------------------------------
  // Requires Vial unlock. Returns one bitmask per row (bit col = pressed),
  // or null while the board is locked (firmware echoes the request).
  async readMatrix(rows, cols) {
    const r = await this.cmd([0x02, 0x03]);
    const bytesPerRow = Math.ceil(cols / 8);
    // Locked firmware skips the handler and echoes the request buffer:
    // everything after [0x02, 0x03] stays zero — indistinguishable from
    // "no key pressed", so lock state must be tracked via unlock status.
    const out = new Array(rows).fill(0);
    let i = 2; // data starts after [cmd, keyboard_value_id]
    for (let row = 0; row < rows; row++) {
      let v = 0;
      for (let b = 0; b < bytesPerRow; b++) v = (v << 8) | r[i++]; // big-endian
      out[row] = v;
    }
    return out;
  }
}
