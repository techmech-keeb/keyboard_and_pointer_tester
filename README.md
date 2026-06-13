# Keyboard & Pointer Tester — Kiosk MVP

Surface Pro 7 と ThinkPad X9 14インチを想定した、Edge キオスクモード向けのローカル HTML 入力テストツールです。ページがアクティブな状態で、特定の入力欄や描画領域をクリックしなくても、キーボード入力・文字入力・ポインター操作を 1 画面で可視化します。ポインター軌跡は全画面の背景レイヤーに薄い記録紙風の残像として残しつつ、下部の Live Pointer Trace で直近10秒の動きを縮図として確認できます。入力テキストや操作量の数値は、明色の診断紙面風インターフェイスとして表示します。

![Keyboard & Pointer Tester](./screenshot.png)

## 実行前提

- **端末**: Surface Pro 7、ThinkPad X9 14インチ
- **ブラウザ**: Microsoft Edge
- **起動形態**: Edge キオスクモードでローカルの `tester.html` を表示
- **ネットワーク**: 不要（外部ライブラリや CDN なし）
- **保存**: キオスク運用を優先し、設定保存や入力ログ保存には依存しません

> 注意: OS や Edge キオスクモードに予約されたキー、ブラウザがブロックするショートカット、別アプリ・別タブの入力は JavaScript から取得できない場合があります。

## 画面構成

### Header / Status / Reset

- 入力キャプチャ状態を `CAPTURE ON / OFF` で表示
- `Pause / Resume` で入力キャプチャを一時停止・再開
- `Reset` で文字列、キー履歴、ポインター軌跡、ステータスを初期化

### Full-screen Pointer Canvas / Live Pointer Trace

- 画面全体を背景キャンバスとして使用し、連続したポインター軌跡とクリック / タップ波紋を薄い記録紙風の残像として描画
- Canvas は `pointer-events: none` とし、UI操作と全画面入力検知を両立
- 下部の Live Pointer Trace では、直近10秒の軌跡を画面全体の縮図として表示
- Trace パネルでは、現在位置、移動方向、クリック / タップイベント、古い点から新しい点への濃淡を確認可能
- ポインター軌跡は一定距離・時間ごとにサンプリングし、上限点数と時間窓を抑えつつ描画

### Paper Diagnostics Console

- 薄いクリーム背景、黒い罫線、モノスペース書体を中心にした診断紙面風レイアウト
- Live Text、Keyboard Matrix、Pointer & Motion、Motion Compass、Live Pointer Trace を1画面に整理
- キー押下中は黒塗り、押下履歴は薄いグレーで表示し、Active / Recent / Idle の凡例で状態を確認可能
- 全画面軌跡は主張を抑えた紙面風残像として残し、Trace パネル側を主表示として扱います

### Live Text

- 表示用ビューとフォーカス維持用の隠し `textarea` を分離
- Live Textパネルは下部HUDと同じ幅で中央配置し、表示行数を増やすため高さを拡張しています
- 入力行が増えた場合はパネル内で縦スクロールします
- 文字入力は隠し `textarea` の `beforeinput` / `input` を優先して反映し、IME入力との二重入力を避けます
- `Backspace`、`Enter`、`Tab` の最小編集操作に対応
- IME 入力中の未確定文字はスキャンライン風ハイライトとHUD風カーソルで表示し、確定時に本文へ反映

### Keyboard Matrix

- 既存のフルキーボード表示を継続
- キーボード表示エリアは省面積化しつつ、キーの主ラベルとサブレジェンドが読み取りやすいサイズで表示されます
- 数字行や記号キーなど2つのレジェンドを持つキーは、縦積みではなく横並びにしてキー高さを抑えます
- 数字・記号キーなど2つのレジェンドがある全キーで、通常入力の主レジェンドとShift入力側の副レジェンドをモノクロで表示します
- 入力検知は `document` レベルで行い、特定の `textarea` フォーカスに依存しません
- Shift / Ctrl / Alt / Meta は `KeyboardEvent.code` を優先して左右を識別します
- 押下中のキーは `down`、押下履歴は `pressed` としてハイライト

### Motion Compass / Pointer & Motion

- `document` レベルのポインター移動量と `wheel` / タッチパッドスクロールの `deltaX` / `deltaY` を同じ方位盤上に重ねて表示
- Pointer & Motion パネルでは、位置、移動量、速度、ボタン状態、スクロール量を数値で表示
- ポインター移動は実線ベクトル、スクロールは破線ベクトルとして区別
- 下部左側の方位盤と左右の数値ブロックで、現在の移動方向・スクロール方向・速度感を即時確認できます

## 使い方

1. Edge キオスクモード、または通常の Edge で `tester.html` を開きます。
2. ページがアクティブな状態でキーを押すと、Live Text に文字が表示され、Keyboard Matrix がハイライトされます。
3. 画面上でマウス、タッチパッド、タッチ、ペンを動かすと、画面全体の背景レイヤーに軌跡が表示されます。
4. クリックまたはタップすると全画面背景レイヤーに薄い波紋と十字マーカーが表示され、Live Pointer Trace にはクリック / イベント点として記録されます。
5. ホイールまたはタッチパッドでスクロールすると、Motion Compass の破線方向ベクトルに反映されます。
6. テストをやり直す場合は `Reset` を押します。

## MVPで意図的に後回しにした機能

- 音声フィードバック
- テーマ切り替え
- 高度な Velocity Graph
- Settings を使った詳細な表示モード永続化
- 入力ログ保存・エクスポート
- 本格的なテキストエディタ機能（任意位置編集、選択範囲、Undo/Redo など）

## 技術仕様

- **単一HTML**: `tester.html` に CSS / JavaScript を内包
- **Vanilla JavaScript**: フレームワーク不要
- **HTML5 Canvas**: Full-screen Pointer Canvas の紙面風残像、Live Pointer Trace の直近10秒トレース、Motion Compass のポインター / スクロール重ね合わせベクトル描画
- **Pointer Events**: mouse / touch / pen を `document` レベルで統合的に検知し、Motion Compassにも移動量を反映
- **Keyboard Events**: `document` レベルの `keydown` / `keyup` でキーの押下状態を検知し、左右修飾キーは `KeyboardEvent.code` で区別
- **Wheel Events**: `document` レベルの `wheel` でホイール / タッチパッドスクロール量を検知し、Motion Compassにも反映
- **Input Events**: 隠し `textarea` の `beforeinput` / `input` で文字列を反映
- **Composition Events**: IME の未確定・確定入力を処理
- **高DPI対応**: `devicePixelRatio` に応じて Canvas をリサイズしつつ、キオスク端末での過負荷を避けるため描画DPRを最大 1.5 に制限
- **描画負荷対策**: アニメーションは入力・波紋・コンパス減衰がある間だけ `requestAnimationFrame` を予約し、アイドル時の全画面再描画を停止
- **オフライン動作**: 外部通信なし

## ファイル構成

```text
keyboard_and_pointer_tester/
├── tester.html          # Kiosk MVP メインファイル
├── odometer.html        # 参考実装ファイル
├── README.md            # このファイル
└── screenshot.png       # スクリーンショット画像
```

## クレジット

- オリジナルプロジェクト: [@mass-work](https://codepen.io/mass-work) - [CodePen](https://codepen.io/mass-work/pen/MYaMKzo)
- 本プロジェクトは上記オリジナルをベースに、キオスク向けの最小構成へ刷新したものです。

## ライセンス

このプロジェクトは個人利用・学習目的で自由に使用できます。
