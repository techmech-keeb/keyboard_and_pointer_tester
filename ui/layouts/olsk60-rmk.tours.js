// RMK 版 (rmk-config 3.0.0-rc.1) 用のガイドツアー。QMK 版は olsk60-qmk.tours.js。
//
// QMK 版とは設定キーの名前と一部の意味が違う。
//   - 速度は 5 段の直接指定 (TP Spd1..5)。既定は Spd3。Spd4/Spd5 が調整枠。
//   - target.custom は端末の vial.json の shortName を空白正規化した名前と一致させる
//     (例 "TP\nSpd1" → "TP Spd1")。fallback は layouts/olsk60.js の customKeycodes。
//
// Source (キー位置): rmk-config keyboards/olsk60/keyboard.toml の control レイヤー
//   L2 row0 col1..5 = User0..4 / row1 col1,2 = User12,13 / row1 col6..9 = User5,6,7,18
//   row2 col1..4 = User14..17 / row3 col1,2 = User8,9
// Source (LED): rmk-config keyboards/olsk60/src/settings_keys.rs
//   FEEDBACK_BLINK = (60,40,2) = 2 回点滅 / REJECTED_BLINK = (45,35,3) = 赤 3 回
//   LEVEL_COLORS = 青 緑 赤 紫 橙 / DELAY_PRESETS = 150 赤 400 緑 800 青
//   および docs/led_feedback_reference.md
// 実機での見え方は未確認 (RMK 版の実機でツアーを通していない)。
"use strict";

tourEngine.registerTours("olsk60v2-rmk", [
  {
    id: "tp-speed",
    title: "トラックポイントの速さをえらぶ",
    description: "Fn2 の設定レイヤーで、赤いスティックの速度を切り替えます。",
    steps: [
      {
        title: "1. Fn2 を押しつづけます",
        body: "設定レイヤーは、キーボード上の Fn2（MO(2)）を押している間だけ有効です。光っているキーだけを押してね。",
        target: { mo: 2 },
        cond: { type: "hold" },
      },
      {
        title: "2. Fn2 のまま 1 を押します",
        preBody: "まず Fn2 を押しつづけます。押したまま、次に光るキーを押します。",
        body: "1 はいちばん遅い速度 Spd1 です。LED が青く2回光ったら成功です。光っているキーだけを押してね。",
        target: { custom: "TP Spd1" },
        cond: { type: "press", while: { mo: 2 } },
      },
      {
        title: "3. 低速を体感します",
        body: "赤いスティックを動かして、ゆっくり細かく動く感じを試します。次へでも進めます。",
        cond: { type: "pointerSpeed", threshold: 300 },
      },
      {
        title: "4. Fn2 + 3 で戻します",
        preBody: "まず Fn2 を押しつづけます。押したまま、次に光るキーを押します。",
        body: "3 は Spd3（出荷時の既定）です。LED が赤く2回光ります。光っているキーだけを押してね。",
        target: { custom: "TP Spd3" },
        cond: { type: "press", while: { mo: 2 } },
      },
      {
        title: "5. 調整枠もあります",
        body: "2 は Spd2（紫は 4、橙は 5）。4 と 5 は自分好みに調整できる枠で、次のツアーで触れます。",
        cond: { type: "next" },
      },
    ],
  },
  {
    id: "sound",
    title: "打鍵音であそぶ",
    description: "Fn2 の設定レイヤーで、音声 ON/OFF とサウンドモードを試します。",
    steps: [
      {
        title: "1. Fn2 を押しつづけます",
        body: "設定レイヤーは、Fn2（MO(2)）を押している間だけ有効です。Esc 位置は保存内容の消去なので、光っているキーだけを押してね。",
        target: { mo: 2 },
        cond: { type: "hold" },
      },
      {
        title: "2. Fn2 + Z で音を ON にします",
        preBody: "まず Fn2 を押しつづけます。押したまま、次に光るキーを押します。",
        body: "Z は全音声 ON/OFF です。ON なら緑、OFF なら赤に2回光ります。光っているキーだけを押してね。",
        target: { custom: "Snd Tog" },
        cond: { type: "press", while: { mo: 2 } },
      },
      {
        title: "3. 好きなキーを5回打ちます",
        body: "好きなキーを打って、打鍵音を聞きます。",
        cond: { type: "anyKeys", count: 5 },
      },
      {
        title: "4. Fn2 + X でモード切替です",
        preBody: "まず Fn2 を押しつづけます。押したまま、次に光るキーを押します。",
        body: "X はサウンドモード切替です。ピアノなら青、ランダムなら黄緑に2回光ります。音が OFF のときは赤3回で断られます。もう一度打って違いを確認します。光っているキーだけを押してね。",
        target: { custom: "Snd Mode" },
        cond: { type: "press", while: { mo: 2 } },
      },
      {
        title: "5. おしまいです",
        body: "音を消すときは Fn2 + Z です。",
        cond: { type: "next" },
      },
    ],
  },
  {
    id: "tp-custom",
    title: "じぶん好みの速さをつくる",
    description: "Fn2 の設定レイヤーで、調整枠（Spd4 / Spd5）の速度を変えます。",
    steps: [
      {
        title: "1. Fn2 を押しつづけます",
        body: "設定レイヤーは、キーボード上の Fn2（MO(2)）を押している間だけ有効です。光っているキーだけを押してね。",
        target: { mo: 2 },
        cond: { type: "hold" },
      },
      {
        title: "2. Fn2 のまま 5 を押します",
        preBody: "まず Fn2 を押しつづけます。押したまま、次に光るキーを押します。",
        body: "5 は調整枠の Spd5 です。LED がオレンジに2回光ったら入りました。光っているキーだけを押してね。",
        target: { custom: "TP Spd5" },
        cond: { type: "press", while: { mo: 2 } },
      },
      {
        title: "3. Fn2 のまま Q を押します",
        preBody: "まず Fn2 を押しつづけます。押したまま、次に光るキーを押します。",
        body: "Q は基本速度を上げます。明るい緑に2回光ったら成功です。※Spd1〜Spd3 のときや上限では赤3回で断られます。光っているキーだけを押してね。",
        target: { custom: "Base +" },
        cond: { type: "press", while: { mo: 2 } },
      },
      {
        title: "4. 速くなったのを体感します",
        body: "赤いスティックを動かして、速くなった感じを試します。次へでも進めます。",
        cond: { type: "pointerSpeed", threshold: 300 },
      },
      {
        title: "5. ほかの調整もできます",
        body: "W で下げる、A/S は加速度、D/F は減速度です。Fn2 + 3 でいつもの Spd3 に戻れます。",
        cond: { type: "next" },
      },
    ],
  },
  {
    id: "auto-layer",
    title: "オートレイヤーをととのえる",
    description: "Fn2 の設定レイヤーで、文字入力に戻るタイミングを調整します。",
    steps: [
      {
        title: "1. Fn2 を押しつづけます",
        body: "設定レイヤーは、キーボード上の Fn2（MO(2)）を押している間だけ有効です。光っているキーだけを押してね。",
        target: { mo: 2 },
        cond: { type: "hold" },
      },
      {
        title: "2. Fn2 のまま Y を押します",
        preBody: "まず Fn2 を押しつづけます。押したまま、次に光るキーを押します。",
        body: "Y は解除を短い150msにします。LED が赤く2回光ります。光っているキーだけを押してね。",
        target: { custom: "AL 150" },
        cond: { type: "press", while: { mo: 2 } },
      },
      {
        title: "3. 戻る速さを体感します",
        body: "赤いスティックを動かして、止めた直後にキーを打ってみます。手を離すとすぐ文字入力に戻ります。次へでも進めます。",
        cond: { type: "pointerSpeed", threshold: 300 },
      },
      {
        title: "4. Fn2 のまま I を押します",
        preBody: "まず Fn2 を押しつづけます。押したまま、次に光るキーを押します。",
        body: "I はデフォルトの800msに戻します。LED が青く2回光ります。光っているキーだけを押してね。",
        target: { custom: "AL 800" },
        cond: { type: "press", while: { mo: 2 } },
      },
      {
        title: "5. ほかの設定もあります",
        body: "U は中間400ms（緑）、O は機能そのものの ON/OFF です。",
        cond: { type: "next" },
      },
    ],
  },
]);
