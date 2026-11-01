// KbSettings (ui/kb-settings.js) の値の表と符号化が、rmk-config
// docs/host_settings_protocol.md と一致していることを固定する。
// 番号 0x02〜0x07 の意味は線路の版で違う（版 1 = 基本速度 / 加速 / 減速、
// 版 2 = 微速の倍率 / 最高倍率 / 加速の幅）。
const { test } = require("node:test");
const assert = require("node:assert/strict");
const K = require("../ui/kb-settings.js");

const COMMON = [
  [0x08, "u8", 0, 1], [0x09, "u16", 100, 2000], [0x0A, "u8", 0, 1], [0x0B, "u8", 0, 1], [0x0C, "u8", 0, 1],
  [0x0D, "u8", 0, 1],
];
const EXPECTED = {
  1: [
    [0x01, "u8", 0, 4], [0x02, "i16", 64, 2048], [0x03, "i16", 16, 256], [0x04, "i16", 32, 512],
    [0x05, "i16", 64, 2048], [0x06, "i16", 16, 256], [0x07, "i16", 32, 512], ...COMMON,
  ],
  // ファーム logic/src/speed.rs の FINE_GAIN / TOP_GAIN / RAMP の MIN..=MAX。
  2: [
    [0x01, "u8", 0, 4], [0x02, "i16", 128, 768], [0x03, "i16", 256, 4096], [0x04, "i16", 100, 1000],
    [0x05, "i16", 128, 768], [0x06, "i16", 256, 4096], [0x07, "i16", 100, 1000], ...COMMON,
  ],
};

function bounds(e) {
  if (e.kind === "range") return [e.min, e.max];
  const vals = e.options ? e.options.map((o) => o[1]) : [0, 1];
  return [Math.min(...vals), Math.max(...vals)];
}

for (const version of [1, 2]) {
  test(`version ${version} table matches the firmware protocol (ids, types, ranges)`, () => {
    const t = K.tableFor(version);
    assert.ok(t, `table for ${version}`);
    assert.equal(t.version, version);
    const expected = EXPECTED[version];
    assert.equal(t.values.length, expected.length);
    for (const [id, type, min, max] of expected) {
      const e = t.byId[id];
      assert.ok(e, `id ${id}`);
      assert.equal(e.type, type, `type of ${id}`);
      assert.deepEqual(bounds(e), [min, max], `range of ${id}`);
      if (e.kind === "range") {
        assert.equal((e.max - e.min) % e.step, 0, `max of ${id} is on the step grid`);
      }
    }
    const ids = t.values.map((v) => v.id);
    assert.deepEqual(ids, [...ids].sort((a, b) => a - b), "ids are in table order");
    assert.equal(new Set(ids).size, ids.length, "ids are unique");
    assert.equal(new Set(t.values.map((v) => v.key)).size, ids.length, "keys are unique");
  });
}

test("known versions and unknown versions", () => {
  assert.deepEqual(K.PROTOCOL_VERSIONS, [1, 2]);
  assert.equal(K.LATEST_PROTOCOL_VERSION, 2);
  assert.equal(K.tableFor(0), null);
  assert.equal(K.tableFor(3), null, "a newer firmware is not read with an old table");
  assert.equal(K.tableFor(null), null);
  assert.equal(K.CHANNEL, 0x10);
});

test("version 2 steps match the firmware's L2 up/down steps", () => {
  const t = K.tableFor(2);
  // logic/src/adjust.rs: 微速 ±32 (0.125 倍)・最高 ±128 (0.5 倍)・加速の幅 ±50。
  assert.equal(t.byKey.custom4FineGain.step, 32);
  assert.equal(t.byKey.custom4TopGain.step, 128);
  assert.equal(t.byKey.custom4Ramp.step, 50);
  // 出荷時の調整枠の値 (FACTORY_PROFILES[3] / [4]) が刻みに乗っている。
  for (const [key, raw] of [["custom4FineGain", 192], ["custom4TopGain", 512], ["custom4Ramp", 500],
    ["custom5FineGain", 384], ["custom5TopGain", 2048], ["custom5Ramp", 300]]) {
    assert.equal(K.clamp(t.byKey[key], raw), raw, key);
  }
  // 版 1 にだけある「古いファームの上限」の案内は版 2 に持ち込まない。
  assert.ok(t.values.every((v) => v.olderFirmwareMax === undefined));
  assert.equal(K.tableFor(1).byKey.custom4Base.olderFirmwareMax, 1536);
});

test("frames carry [cmd, channel, id, payload] with little-endian payloads", () => {
  const v1 = K.tableFor(1);
  const v2 = K.tableFor(2);
  assert.deepEqual(K.getFrame(0x09), [0x08, 0x10, 0x09]);
  assert.deepEqual(K.setFrame(v2.byKey.amlDelayMs, 1500), [0x07, 0x10, 0x09, 0xDC, 0x05]);
  assert.deepEqual(K.setFrame(v1.byKey.custom4Base, 640), [0x07, 0x10, 0x02, 0x80, 0x02]);
  assert.deepEqual(K.setFrame(v2.byKey.custom4TopGain, 4096), [0x07, 0x10, 0x03, 0x00, 0x10]);
  assert.deepEqual(K.setFrame(v2.byKey.custom5Ramp, 300), [0x07, 0x10, 0x07, 0x2C, 0x01]);
  assert.deepEqual(K.setFrame(v2.byKey.speedLevel, 4), [0x07, 0x10, 0x01, 0x04]);
  assert.deepEqual(K.saveFrame(), [0x09, 0x10, 0x00]);
  assert.deepEqual(K.protocolFrame(), [0x08, 0x10, 0x00]);
});

test("replies decode by width and sign, and unhandled is detected", () => {
  const reply = (bytes) => { const r = new Uint8Array(32); r.set(bytes); return r; };
  const t = K.tableFor(2);
  assert.deepEqual(K.parseReply(reply([0x08, 0x10, 0x09, 0xDC, 0x05]), t.byId[0x09]), { unhandled: false, id: 0x09, value: 1500 });
  assert.deepEqual(K.parseReply(reply([0x08, 0x10, 0x02, 0xFB, 0xFF]), t.byId[0x02]), { unhandled: false, id: 0x02, value: -5 });
  assert.deepEqual(K.parseReply(reply([0x08, 0x10, 0x03, 0x00, 0x10]), t.byId[0x03]), { unhandled: false, id: 0x03, value: 4096 });
  assert.deepEqual(K.parseReply(reply([0x08, 0x10, 0x01, 0x03]), t.byId[0x01]), { unhandled: false, id: 0x01, value: 3 });
  assert.deepEqual(K.parseReply(reply([0x08, 0x10, 0x01, 0x03])), { unhandled: false, id: 0x01, value: 3 }, "no entry = one byte");
  assert.deepEqual(K.parseReply(reply([0xFF, 0x10, 0x09])), { unhandled: true });
  assert.deepEqual(K.parseReply(reply([0x08, 0x02, 0x09])), { unhandled: true }, "other channel");
  assert.equal(K.parseProtocol(reply([0x08, 0x10, 0x00, 0x01])), 1);
  assert.equal(K.parseProtocol(reply([0x08, 0x10, 0x00, 0x02])), 2);
  assert.equal(K.parseProtocol(reply([0xFF, 0x10, 0x00, 0x01])), null);
});

test("clamp keeps UI input inside range and on the step grid", () => {
  const v1 = K.tableFor(1);
  const v2 = K.tableFor(2);
  const d = v2.byKey.amlDelayMs;
  assert.equal(K.clamp(d, 95), 100);
  assert.equal(K.clamp(d, 2500), 2000);
  assert.equal(K.clamp(d, 1234), 1230);
  assert.equal(K.clamp(v1.byKey.custom4Base, 650), 640);
  assert.equal(K.clamp(v2.byKey.custom4FineGain, 100), 128);
  assert.equal(K.clamp(v2.byKey.custom4FineGain, 200), 192);
  assert.equal(K.clamp(v2.byKey.custom4TopGain, 5000), 4096);
  assert.equal(K.clamp(v2.byKey.custom4Ramp, 420), 400);
  assert.equal(K.clamp(v2.byKey.amlEnabled, 2), 1);
  assert.equal(K.clamp(v2.byKey.soundMode, 7), 0);
  assert.equal(K.clamp(v2.byKey.speedLevel, "4"), 4);
});

test("display units: gains are shown as multiples, the rest as raw values", () => {
  const t = K.tableFor(2);
  const fine = t.byKey.custom4FineGain;
  const top = t.byKey.custom4TopGain;
  const ramp = t.byKey.custom4Ramp;
  assert.equal(K.toDisplay(fine, 192), 0.75);
  assert.equal(K.toDisplay(fine, fine.step), 0.125, "one step = 0.125x");
  assert.equal(K.toDisplay(top, top.step), 0.5, "one step = 0.5x");
  assert.equal(K.fromDisplay(fine, "1.5"), 384);
  assert.equal(K.fromDisplay(top, 16), 4096);
  assert.equal(K.toDisplay(ramp, 400), 400);
  assert.equal(K.fromDisplay(ramp, "400"), 400);
  assert.equal(K.format(fine, 384), "1.5 倍");
  assert.equal(K.format(top, 512), "2 倍");
  assert.equal(K.format(ramp, 400), "400 count/秒");
  assert.equal(K.format(t.byKey.amlDelayMs, 800), "800");
  // 表示値を往復しても生の値に戻る。
  for (let raw = fine.min; raw <= fine.max; raw += fine.step) {
    assert.equal(K.fromDisplay(fine, K.toDisplay(fine, raw)), raw);
  }
});
