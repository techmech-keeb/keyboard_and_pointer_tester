# Keyboard & Pointer Tester

統合型の入力テストツール。キーボード入力とポインター操作を可視化し、リアルタイムで動作を確認できます。

![Keyboard & Pointer Tester](./screenshot.png)

## 動作確認

- 本プロジェクト: [https://codepen.io/techmech-keeb/pen/RNrJKgm](https://codepen.io/techmech-keeb/pen/RNrJKgm)
- オリジナル: [https://codepen.io/mass-work/pen/MYaMKzo](https://codepen.io/mass-work/pen/MYaMKzo) (by [@mass-work](https://codepen.io/mass-work))

## 機能

### Type Field（入力テストエリア）
- キーボード入力のテスト
- 日本語IME/英語IME対応
- 入力内容のクリア機能（🗑ボタン）
- 下部のInput Matrixで押下キーをリアルタイム表示

### Input Matrix（キーボード可視化）
- 押下されたキーがリアルタイムでハイライト表示
- 押下中は`down`状態、離した後は`pressed`状態で表示
- 標準QWERTY配列のフルキーボードレイアウト

### Path View（マウス軌跡描写エリア）
- ポインターの軌跡を速度に応じた色で可視化
- 速度が速いほど明るく表示（色相200→240、明度35→80）
- 2秒間のフェードアウト効果
- クリック・ダブルクリック時の波紋エフェクト
- 座標（client）・移動量（movement）・ボタン状態（L/M/R）のリアルタイム表示
- 100pxごとの進捗リング表示とチック音
- 2400×1600pxのスクロール可能なキャンバス領域

### Motion Compass（ポインタ速度コンパス）
- ポインタの移動方向と速度をコンパス形式で表示
- スクロール速度も重ねて表示（リング形式）
- リアルタイムの速度ベクトル表示
- 最大速度300px/s（ポインタ）、600px/s（スクロール）でスケール

### Velocity Graph（速度・加速度グラフ）
- 移動速度の時系列グラフ（直近24秒、約120サンプル）
- 加速度を色で表現（青系=減速、紫系=加速）
- 積算移動距離の大表示（px単位）
- 200ms単位のサンプリング
- 最大速度200px/s以上を基準に自動スケール

### 音声フィードバック
- 速度に応じた連続ピッチ音（周波数120-2200Hz、速度が速いほど高音）
- 100px移動ごとのチック音（880Hzの矩形波）
- 音声ON/OFF切り替えボタン（🔊/🔇）
- 移動開始時に自動でAudioContextを初期化

### テーマ機能
- 4種類のテーマ：Dark（デフォルト）、Light、Pop、Classic
- テーマ切り替えボタンで即座に変更

### その他の機能
- フルスクリーン表示（⛶ボタン）
- 全機能リセット（↺ボタン）
- オフライン動作（インターネット接続不要）
- レスポンシブレイアウト（980px以下で1カラム表示）
- 高DPIディスプレイ対応（devicePixelRatio対応）

## 使い方

1. **キーボード入力の確認**
   - Type Fieldにテキストを入力
   - 下部のオンボードキーボードで押下キーがハイライト表示されます

2. **ポインター操作の確認**
   - Path Viewエリアにマウスを移動
   - 軌跡が速度に応じた色で描画されます（2秒でフェードアウト）
   - クリック/ダブルクリックで波紋エフェクト
   - Motion Compassで速度ベクトルとスクロール速度を確認
   - Velocity Graphで時系列の速度変化と加速度を確認
   - 100px移動ごとにリングがフラッシュし、チック音が鳴ります

3. **音声フィードバック**
   - Path Viewの右上の🔊ボタンで音声ON/OFFを切り替え
   - 移動速度に応じた連続ピッチ音（120-2200Hz）を聞くことができます
   - 100px移動ごとに880Hzのチック音が鳴ります

4. **テーマの切り替え**
   - ヘッダー右上の🖌ボタンでテーマを切り替え（Dark → Light → Pop → Classic → ...）

## 技術仕様

- **HTML5 Canvas**: グラフィックス描画（軌跡、コンパス、速度グラフ）
- **Web Audio API**: 音声生成（Oscillator、Gain、AudioContext）
- **CSS Grid/Flexbox**: レスポンシブレイアウト
- **CSS変数**: テーマシステム（4テーマ対応）
- **Vanilla JavaScript**: フレームワーク不要
- **ResizeObserver**: テキストエリアとPath Viewの高さ同期
- **requestAnimationFrame**: スムーズなアニメーション
- **EMA平滑化**: 速度計算の滑らか化（α=0.3）

## ブラウザ対応

モダンブラウザ対応（以下を推奨）：
- Chrome/Edge（最新版）
- Firefox（最新版）
- Safari（最新版）

## ファイル構成

```
keyboard_and_pointer_tester/
├── tester.html          # メインファイル（全ての機能を含む）
├── odometer.html        # （別の実装ファイル、参考用）
├── README.md            # このファイル
└── screenshot.png       # スクリーンショット画像
```

## クレジット

- オリジナルプロジェクト: [@mass-work](https://codepen.io/mass-work) - [CodePen](https://codepen.io/mass-work/pen/MYaMKzo)
- 本プロジェクトは上記オリジナルをベースに機能拡張・改良したものです

## ライセンス

このプロジェクトは個人利用・学習目的で自由に使用できます。

