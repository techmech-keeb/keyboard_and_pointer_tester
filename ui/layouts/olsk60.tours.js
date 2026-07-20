// Source: techmech-keeb/olsk60_v2 docs/OLSK60_user_guide.md「レイヤー2：設定レイヤー」
// docs revision: 8990e7c (2026-07-18)
"use strict";

tourEngine.registerTours("olsk60v2", [
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
        body: "1 は Precision（低速・精密）です。LED が青く2回光ったら成功です。光っているキーだけを押してね。",
        target: { custom: "Precision" },
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
        body: "3 は Fast（高速・デフォルト）です。LED が赤く2回光ります。光っているキーだけを押してね。",
        target: { custom: "Fast" },
        cond: { type: "press", while: { mo: 2 } },
      },
      {
        title: "5. カスタム枠もあります",
        body: "4 は Custom Precision、5 は Custom Fast です。自分好みに調整できるカスタム枠です。",
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
        body: "設定レイヤーは、Fn2（MO(2)）を押している間だけ有効です。Esc 位置は全設定リセットなので、光っているキーだけを押してね。",
        target: { mo: 2 },
        cond: { type: "hold" },
      },
      {
        title: "2. Fn2 + Z で音を ON にします",
        preBody: "まず Fn2 を押しつづけます。押したまま、次に光るキーを押します。",
        body: "Z は全音声 ON/OFF です。光っているキーだけを押してね。",
        target: { custom: "Snd" },
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
        body: "X はサウンドモード切替です。ランダム ↔ ピアノが切り替わります。もう一度打って違いを確認します。光っているキーだけを押してね。",
        target: { custom: "SndMode" },
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
    description: "Fn2 の設定レイヤーで、カスタム枠の速度を調整します。",
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
        body: "5 は Custom Fast です。LED がオレンジに2回光ったらカスタム枠に入りました。光っているキーだけを押してね。",
        target: { custom: "CustFast" },
        cond: { type: "press", while: { mo: 2 } },
      },
      {
        title: "3. Fn2 のまま Q を押します",
        preBody: "まず Fn2 を押しつづけます。押したまま、次に光るキーを押します。",
        body: "Q は基本速度を上げます。LED が明るい緑に1回光ったら成功です。※1〜3 の固定プロファイル中は赤3回点滅で断られます。光っているキーだけを押してね。",
        target: { custom: "Spd+" },
        cond: { type: "press", while: { mo: 2 } },
      },
      {
        title: "4. 速くなったのを体感します",
        body: "赤いスティックを動かして、速くなった感じを試します。次へでも進めます。",
        cond: { type: "pointerSpeed", threshold: 300 },
      },
      {
        title: "5. ほかの調整もできます",
        body: "W で下げる、A/S は加速度、D/F は減速度です。Fn2 + 3 でいつもの Fast に戻れます。",
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
        body: "Y は解除を短い150msにします。光っているキーだけを押してね。",
        target: { custom: "AL 150ms" },
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
        body: "I はデフォルトの800msに戻します。光っているキーだけを押してね。",
        target: { custom: "AL 800ms" },
        cond: { type: "press", while: { mo: 2 } },
      },
      {
        title: "5. ほかの設定もあります",
        body: "U は中間400ms、O は機能そのものの ON/OFF です。",
        cond: { type: "next" },
      },
    ],
  },
]);
