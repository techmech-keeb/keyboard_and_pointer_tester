// KbSettings (ui/kb-settings.js) の値の表と符号化が、rmk-config
// docs/host_settings_protocol.md と一致していることを固定する。
const { test } = require("node:test");
const assert = require("node:assert/strict");
const K = require("../ui/kb-settings.js");

test("value table matches the firmware protocol (ids, types, ranges)", () => {
  const expected = [
    [0x01, "u8", 0, 4], [0x02, "i16", 64, 1024], [0x03, "i16", 16, 256], [0x04, "i16", 32, 512],
    [0x05, "i16", 64, 1024], [0x06, "i16", 16, 256], [0x07, "i16", 32, 512],
    [0x08, "u8", 0, 1], [0x09, "u16", 100, 2000], [0x0A, "u8", 0, 1], [0x0B, "u8", 0, 1], [0x0C, "u8", 0, 1],
    [0x0D, "u8", 0, 1],
  ];
  assert.equal(K.VALUES.length, expected.length);
  for (const [id, type, min, max] of expected) {
    const e = K.byId[id];
    assert.ok(e, `id ${id}`);
    assert.equal(e.type, type, `type of ${id}`);
    const lo = e.kind === "range" ? e.min : Math.min(...(e.options ? e.options.map((o) => o[1]) : [0]));
    const hi = e.kind === "range" ? e.max : Math.max(...(e.options ? e.options.map((o) => o[1]) : [1]));
    assert.equal(lo, min, `min of ${id}`);
    assert.equal(hi, max, `max of ${id}`);
  }
  const ids = K.VALUES.map((v) => v.id);
  assert.deepEqual(ids, [...ids].sort((a, b) => a - b), "ids are in table order");
  assert.equal(new Set(ids).size, ids.length, "ids are unique");
  assert.equal(K.CHANNEL, 0x10);
  assert.equal(K.PROTOCOL_VERSION, 1);
});

test("frames carry [cmd, channel, id, payload] with little-endian payloads", () => {
  assert.deepEqual(K.getFrame(0x09), [0x08, 0x10, 0x09]);
  assert.deepEqual(K.setFrame(K.byKey.amlDelayMs, 1500), [0x07, 0x10, 0x09, 0xDC, 0x05]);
  assert.deepEqual(K.setFrame(K.byKey.custom4Base, 640), [0x07, 0x10, 0x02, 0x80, 0x02]);
  assert.deepEqual(K.setFrame(K.byKey.speedLevel, 4), [0x07, 0x10, 0x01, 0x04]);
  assert.deepEqual(K.saveFrame(), [0x09, 0x10, 0x00]);
  assert.deepEqual(K.protocolFrame(), [0x08, 0x10, 0x00]);
});

test("replies decode by width and sign, and unhandled is detected", () => {
  const reply = (bytes) => { const r = new Uint8Array(32); r.set(bytes); return r; };
  assert.deepEqual(K.parseReply(reply([0x08, 0x10, 0x09, 0xDC, 0x05])), { unhandled: false, id: 0x09, value: 1500 });
  assert.deepEqual(K.parseReply(reply([0x08, 0x10, 0x02, 0xFB, 0xFF])), { unhandled: false, id: 0x02, value: -5 });
  assert.deepEqual(K.parseReply(reply([0x08, 0x10, 0x01, 0x03])), { unhandled: false, id: 0x01, value: 3 });
  assert.deepEqual(K.parseReply(reply([0xFF, 0x10, 0x09])), { unhandled: true });
  assert.deepEqual(K.parseReply(reply([0x08, 0x02, 0x09])), { unhandled: true }, "other channel");
  assert.equal(K.parseProtocol(reply([0x08, 0x10, 0x00, 0x01])), 1);
  assert.equal(K.parseProtocol(reply([0xFF, 0x10, 0x00, 0x01])), null);
});

test("clamp keeps UI input inside range and on the step grid", () => {
  const d = K.byKey.amlDelayMs;
  assert.equal(K.clamp(d, 95), 100);
  assert.equal(K.clamp(d, 2500), 2000);
  assert.equal(K.clamp(d, 1234), 1230);
  assert.equal(K.clamp(K.byKey.custom4Base, 650), 640);
  assert.equal(K.clamp(K.byKey.amlEnabled, 2), 1);
  assert.equal(K.clamp(K.byKey.soundMode, 7), 0);
  assert.equal(K.clamp(K.byKey.speedLevel, "4"), 4);
});
