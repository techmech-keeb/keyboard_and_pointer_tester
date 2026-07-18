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
]);
