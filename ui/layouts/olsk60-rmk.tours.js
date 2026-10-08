// SPDX-FileCopyrightText: 2025-2026 Techmech keys
// SPDX-License-Identifier: Apache-2.0
// RMK 版 (rmk-config 3.0.1) 用のガイドツアー。QMK 版は olsk60-qmk.tours.js。
//
// QMK 版とは設定キーの名前と一部の意味が違う。
//   - 速度は 5 段の直接指定 (TP Spd1..5)。既定は Spd3。Spd4/Spd5 が調整枠。
//   - 調整の対象（Adj Spd / Acc / Dec / Dly）は Fn2 を離すと基本速度へ戻る。対象を選んでから
//     ↑ / ↓ を押す手順は「Fn2 を離さずに続けて」と書く（離すと別の値が変わる）。
//   - target.custom は端末の vial.json の shortName を空白正規化した名前と一致させる
//     (例 "TP\nSpd1" → "TP Spd1")。fallback は layouts/olsk60.js の customKeycodes。
//
// Source (キー位置): rmk-config keyboards/olsk60/keyboard.toml の control レイヤー。
//   ツアーはキーを名前 (target.custom) で引くので、User 番号には依存しない。
// Source (LED): rmk-config docs/led_feedback_reference.md（色と点滅の正本）
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
        body: "設定レイヤーは、キーボード上の Fn2（Delete の右の設定キー）を押している間だけ有効です。光っているキーだけを押してね。",
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
        title: "4. Fn2 + 2 で既定に戻します",
        preBody: "まず Fn2 を押しつづけます。押したまま、次に光るキーを押します。",
        body: "2 のキーが Spd3（出荷時の既定）です。LED がシアンに2回光ります。光っているキーだけを押してね。",
        target: { custom: "TP Spd3" },
        cond: { type: "press", while: { mo: 2 } },
      },
      {
        title: "5. 調整枠もあります",
        body: "3 はマゼンタ（赤紫）の Spd4、4 は橙の Spd5。どちらも自分好みに調整できる枠で、次のツアーで触れます（Spd2 は設定レイヤーに置いていません）。",
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
        body: "設定レイヤーは、Fn2（Delete の右の設定キー）を押している間だけ有効です。9 の位置は保存内容の消去なので、光っているキーだけを押してね。",
        target: { mo: 2 },
        cond: { type: "hold" },
      },
      {
        title: "2. Fn2 + A で音を ON にします",
        preBody: "まず Fn2 を押しつづけます。押したまま、次に光るキーを押します。",
        body: "A は全音声 ON/OFF です。ON なら緑、OFF なら赤に2回光ります。光っているキーだけを押してね。",
        target: { custom: "Snd Tog" },
        cond: { type: "press", while: { mo: 2 } },
      },
      {
        title: "3. 好きなキーを5回打ちます",
        body: "好きなキーを打って、打鍵音を聞きます。",
        cond: { type: "anyKeys", count: 5 },
      },
      {
        title: "4. Fn2 + S でモード切替です",
        preBody: "まず Fn2 を押しつづけます。押したまま、次に光るキーを押します。",
        body: "S はサウンドモード切替です。ピアノなら青、ランダムならオレンジに2回光ります。音が OFF のときは赤3回で断られます。もう一度打って違いを確認します。光っているキーだけを押してね。",
        target: { custom: "Snd Mode" },
        cond: { type: "press", while: { mo: 2 } },
      },
      {
        title: "5. おしまいです",
        body: "音を消すときは Fn2 + A です。",
        cond: { type: "next" },
      },
    ],
  },
  {
    id: "tp-custom",
    title: "じぶん好みの速さをつくる",
    description: "Fn2 の設定レイヤーで、調整枠（Spd4 / Spd5）の基本速度と加速度を変えます。",
    steps: [
      {
        title: "1. Fn2 を押しつづけます",
        body: "設定レイヤーは、キーボード上の Fn2（Delete の右の設定キー）を押している間だけ有効です。ここからは最後まで Fn2 を離さずに進むとスムーズです。光っているキーだけを押してね。",
        target: { mo: 2 },
        cond: { type: "hold" },
      },
      {
        title: "2. Fn2 のまま 4 を押します",
        preBody: "まず Fn2 を押しつづけます。押したまま、次に光るキーを押します。",
        body: "4 のキーが調整枠の Spd5 です。LED が橙に2回光ったら入りました。調整できるのは Spd4（3 のキー）と Spd5 だけです。光っているキーだけを押してね。",
        target: { custom: "TP Spd5" },
        cond: { type: "press", while: { mo: 2 } },
      },
      {
        title: "3. Fn2 のまま Q を押します",
        preBody: "まず Fn2 を押しつづけます。押したまま、次に光るキーを押します。",
        body: "Q で調整する対象を「基本速度」にします。LED が青で速く明滅します。光っているキーだけを押してね。",
        target: { custom: "Adj Spd" },
        cond: { type: "press", while: { mo: 2 } },
      },
      {
        title: "4. Fn2 のまま ↑ を押します",
        preBody: "Fn2 を押したまま、次に光るキーを押します（Fn2 を離すと対象は基本速度に戻ります）。",
        body: "↑ で基本速度が 1 段上がります。LED が青く長めに1回光ります。Spd1〜Spd3 のときは赤3回、上限では黄3回で断られます。光っているキーだけを押してね。",
        target: { custom: "Adj +" },
        cond: { type: "press", while: { mo: 2 } },
      },
      {
        title: "5. 速くなったのを体感します",
        body: "赤いスティックを動かして、速くなった感じを試します。次へでも進めます。",
        cond: { type: "pointerSpeed", threshold: 300 },
      },
      {
        title: "6. Fn2 のまま W を押します",
        preBody: "まず Fn2 を押しつづけます。押したまま、次に光るキーを押します。",
        body: "W で対象を「加速度」にします。LED がシアンで速く明滅します。強く押したときの伸び方を決める値です。光っているキーだけを押してね。",
        target: { custom: "Adj Acc" },
        cond: { type: "press", while: { mo: 2 } },
      },
      {
        title: "7. Fn2 を離さずに ↓ を押します",
        preBody: "Fn2 を離すと、対象が基本速度に戻ります。Fn2 を押しつづけたら、W を押してから ↓ を押してね。",
        body: "↓ で加速度が 1 段下がります。LED がシアンで短く2回光ります。光っているキーだけを押してね。",
        target: { custom: "Adj -" },
        cond: { type: "press", while: { mo: 2 } },
      },
      {
        title: "8. ほかの設定とまとめ",
        body: "E で「減速度」（紫）、← → で対象を順送りできます。値は自動で保存されます。Fn2 + 2 でいつもの Spd3 に戻れます。設定を出荷時に戻すときは Fn2 + 5 を2秒押しつづけます（緑ゆっくり3回）。",
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
        body: "設定レイヤーは、キーボード上の Fn2（Delete の右の設定キー）を押している間だけ有効です。光っているキーだけを押してね。",
        target: { mo: 2 },
        cond: { type: "hold" },
      },
      {
        title: "2. Fn2 のまま X を押します",
        preBody: "まず Fn2 を押しつづけます。押したまま、次に光るキーを押します。",
        body: "X は解除を短い150msにします。LED が橙に1回光ります。光っているキーだけを押してね。",
        target: { custom: "AL 150" },
        cond: { type: "press", while: { mo: 2 } },
      },
      {
        title: "3. 戻る速さを体感します",
        body: "赤いスティックを動かして、止めた直後にキーを打ってみます。手を離すとすぐ文字入力に戻ります。次へでも進めます。",
        cond: { type: "pointerSpeed", threshold: 300 },
      },
      {
        title: "4. Fn2 のまま C を押します",
        preBody: "まず Fn2 を押しつづけます。押したまま、次に光るキーを押します。",
        body: "C はデフォルトの800msに戻します。LED が橙に3回光ります。光っているキーだけを押してね。",
        target: { custom: "AL 800" },
        cond: { type: "press", while: { mo: 2 } },
      },
      {
        title: "5. Fn2 のまま V を押します",
        preBody: "まず Fn2 を押しつづけます。押したまま、次に光るキーを押します。",
        body: "V で調整する対象を「オートレイヤーの時間」にします。LED が橙で速く明滅します。この時間はどの速度でも調整できます。光っているキーだけを押してね。",
        target: { custom: "Adj Dly" },
        cond: { type: "press", while: { mo: 2 } },
      },
      {
        title: "6. Fn2 を離さずに ↓ を押します",
        preBody: "Fn2 を離すと、対象が基本速度に戻ります。Fn2 を押しつづけたら、V を押してから ↓ を押してね。",
        body: "↓ で 10ms 短くなります（LED が橙で短く2回）。↑ なら 10ms 長くなります（長めに1回）。100〜2000ms の範囲で、端では黄3回で止まります。光っているキーだけを押してね。",
        target: { custom: "Adj -" },
        cond: { type: "press", while: { mo: 2 } },
      },
      {
        title: "7. ほかの設定もあります",
        body: "C でいつもの 800ms に戻せます。Z は機能そのものの ON/OFF（緑/赤）です。時間を数字で入れたいときは、スタッフメニューの「キーボード設定」からも変えられます。",
        cond: { type: "next" },
      },
    ],
  },
]);
