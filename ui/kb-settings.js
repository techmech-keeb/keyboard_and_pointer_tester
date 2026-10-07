// OLSK60 (RMK 版) の設定を VIA custom value で読み書きするための値の表と符号化。
// 線路の正本は rmk-config docs/host_settings_protocol.md（チャネル 0x10・番号・型・範囲）。
// 番号の意味は再割当てしない。足すときは末尾へ。
//
// ワイヤ形式 (32 バイト): [cmd, CHANNEL, id, payload..]。cmd は VIA 標準の
// 0x07 Set / 0x08 Get / 0x09 Save。多バイトは little-endian。Set の応答は
// 「反映後の実際の値」なので、要求と違えば範囲外で捨てられたと分かる。
// 口の無い旧ファームは byte0 = 0xFF (Unhandled) を返す。

const KbSettings = (() => {
  const CHANNEL = 0x10;
  const CMD = { SET: 0x07, GET: 0x08, SAVE: 0x09 };
  const UNHANDLED = 0xFF;
  const PROTOCOL_ID = 0x00;
  const PROTOCOL_VERSION = 1;

  // kind: "range" (min/max/step) / "toggle" (0/1) / "select" (options [[label, value], ..])
  const GROUPS = [
    {
      title: "TrackPoint の速度",
      values: [
        { id: 0x01, key: "speedLevel", label: "速度レベル", type: "u8", kind: "select",
          options: [["1 (遅い)", 0], ["2", 1], ["3 (既定)", 2], ["4 (調整枠)", 3], ["5 (調整枠)", 4]] },
        { id: 0x02, key: "custom4Base", label: "調整枠 4: 基本速度", type: "i16", kind: "range", min: 64, max: 1024, step: 32 },
        { id: 0x03, key: "custom4Acceleration", label: "調整枠 4: 加速", type: "i16", kind: "range", min: 16, max: 256, step: 16 },
        { id: 0x04, key: "custom4Deceleration", label: "調整枠 4: 減速", type: "i16", kind: "range", min: 32, max: 512, step: 16 },
        { id: 0x05, key: "custom5Base", label: "調整枠 5: 基本速度", type: "i16", kind: "range", min: 64, max: 1024, step: 32 },
        { id: 0x06, key: "custom5Acceleration", label: "調整枠 5: 加速", type: "i16", kind: "range", min: 16, max: 256, step: 16 },
        { id: 0x07, key: "custom5Deceleration", label: "調整枠 5: 減速", type: "i16", kind: "range", min: 32, max: 512, step: 16 },
      ],
    },
    {
      title: "オートマウスレイヤー",
      values: [
        { id: 0x08, key: "amlEnabled", label: "自動切替", type: "u8", kind: "toggle" },
        { id: 0x09, key: "amlDelayMs", label: "解除までの時間 (ms)", type: "u16", kind: "range", min: 100, max: 2000, step: 10 },
      ],
    },
    {
      title: "スクロールと音",
      values: [
        { id: 0x0A, key: "scrollCurveEnabled", label: "スクロールの加速カーブ", type: "u8", kind: "toggle" },
        { id: 0x0B, key: "soundEnabled", label: "キー音", type: "u8", kind: "toggle" },
        { id: 0x0C, key: "soundMode", label: "キー音のモード", type: "u8", kind: "select",
          options: [["ランダム", 0], ["ピアノ", 1]] },
      ],
    },
  ];
  const VALUES = GROUPS.flatMap((g) => g.values);
  const byKey = Object.fromEntries(VALUES.map((v) => [v.key, v]));
  const byId = Object.fromEntries(VALUES.map((v) => [v.id, v]));

  function width(entry) { return entry.type === "u8" ? 1 : 2; }

  function encode(entry, value) {
    const v = Math.trunc(Number(value));
    if (width(entry) === 1) return [v & 0xFF];
    return [v & 0xFF, (v >> 8) & 0xFF];
  }

  function decode(entry, bytes, offset) {
    const o = offset || 0;
    if (width(entry) === 1) return bytes[o];
    const raw = bytes[o] | (bytes[o + 1] << 8);
    // i16 は符号付きで読む (ファームと同じ)。u16 (遅延) は正の範囲なので同じ式でよい。
    return entry.type === "u16" ? raw : (raw << 16) >> 16;
  }

  function frame(cmd, id, payload) {
    return [cmd, CHANNEL, id, ...(payload || [])];
  }
  const getFrame = (id) => frame(CMD.GET, id);
  const setFrame = (entry, value) => frame(CMD.SET, entry.id, encode(entry, value));
  const saveFrame = () => frame(CMD.SAVE, 0);
  const protocolFrame = () => frame(CMD.GET, PROTOCOL_ID);

  // 応答 (32 バイト) を読む。unhandled なら口の無いファーム。
  function parseReply(bytes, entry) {
    if (!bytes || bytes[0] === UNHANDLED) return { unhandled: true };
    if (bytes[1] !== CHANNEL) return { unhandled: true };
    const e = entry || byId[bytes[2]];
    if (!e) return { unhandled: false, id: bytes[2], value: bytes[3] };
    return { unhandled: false, id: e.id, value: decode(e, bytes, 3) };
  }

  function parseProtocol(bytes) {
    if (!bytes || bytes[0] === UNHANDLED || bytes[1] !== CHANNEL || bytes[2] !== PROTOCOL_ID) return null;
    return bytes[3];
  }

  // 範囲と刻みに丸める (UI の入力用)。ファーム側も範囲外は捨てるが、刻みは UI の都合。
  function clamp(entry, value) {
    let v = Math.trunc(Number(value));
    if (!Number.isFinite(v)) v = entry.min || 0;
    if (entry.kind === "toggle") return v ? 1 : 0;
    if (entry.kind === "select") return entry.options.some(([, o]) => o === v) ? v : entry.options[0][1];
    v = Math.min(entry.max, Math.max(entry.min, v));
    return entry.min + Math.round((v - entry.min) / entry.step) * entry.step;
  }

  return {
    CHANNEL, CMD, UNHANDLED, PROTOCOL_ID, PROTOCOL_VERSION, GROUPS, VALUES, byKey, byId,
    width, encode, decode, frame, getFrame, setFrame, saveFrame, protocolFrame, parseReply, parseProtocol, clamp,
  };
})();

if (typeof module !== "undefined" && module.exports) module.exports = KbSettings;
