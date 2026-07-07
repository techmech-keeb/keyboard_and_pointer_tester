# OLSK60 INPUT LAB

トラックポイント搭載自作キーボード **OLSK60** の操作感を、展示会・店頭で来場者に直感的に体験してもらうためのキオスク型テスターです。

- トラックポイントを動かすと **カーソル軌跡が全画面に流れ**、速度で色が変わる
- キーを押すと **実機と同じ配列のキーボードが光り**、押した回数でヒートマップ化
- **タイピング練習**（WPM / 正確率）と **自由入力**（日本語IME対応）
- 初見でも迷わない **TRY IT! ミッション** とアトラクト画面、無操作で自動リセット
- ネイティブのキオスクホストが **Winキー / Alt+Tab / Alt+F4 などをブロック**し、来場者が何を押してもテスター画面から離脱しない

![OLSK60 INPUT LAB](./docs/screenshot.png)

![アトラクト画面](./docs/attract.png)

## 構成

```text
keyboard_and_pointer_tester/
├── ui/                        # テスター本体（HTML/CSS/JS、外部依存なし・オフライン動作）
│   ├── index.html
│   ├── style.css
│   ├── app.js
│   └── layout.js              # OLSK60 v2 実配列データ（公式KLE準拠）
├── kiosk/                     # Windows用キオスクホスト（C# WinForms + WebView2）
│   ├── OLSK60Tester.csproj
│   ├── Program.cs
│   ├── KioskForm.cs           # フルスクリーン最前面固定・フォーカス奪還・スリープ抑止
│   └── KeyboardHook.cs        # 低レベルフックで離脱系ショートカットを吸収
└── .github/workflows/build-kiosk.yml   # exe を自動ビルド
```

## 実行方法

### キオスク運用（Surface Pro 7 など）

1. GitHub Actions の **build-kiosk** ワークフローの Artifact `OLSK60Tester-win-x64` をダウンロードして展開
   （手元でビルドする場合は下記「ビルド」参照）
2. `OLSK60Tester.exe` を実行するだけ。フルスクリーン・最前面でテスターが起動します
   - WebView2 ランタイムが必要です（Windows 10/11 には標準搭載）
3. 終了はスタッフ用の隠しコマンド **`Ctrl + Alt + Shift + F12`**

デザイン確認などでウィンドウ表示したいときは `OLSK60Tester.exe --windowed`（この場合キーブロックは無効）。

### お手軽モード（ブラウザだけで試す）

`ui/index.html` をブラウザで開くだけでも動きます（Edge のキオスクモード起動でも可）。
ただし **ブラウザだけでは Winキー等の OS ショートカットはブロックできません**。展示ではキオスクホスト経由での起動を推奨します。

## キーブロックの仕組みと限界

`KeyboardHook.cs` が低レベルキーボードフック（`WH_KEYBOARD_LL`）で以下を吸収します。吸収したキーは WebView 経由でテスターに転送されるため、**Winキーを押しても OS には届かず、画面上のキーボードだけが光ります**。

| 操作 | 挙動 |
|---|---|
| Win / Win+○○ | ブロック（スタートメニュー・Win+L 等が発動しない） |
| Alt+Tab / Alt+Esc / Alt+Space | ブロック |
| Alt+F4 | ブロック（さらにフォーム側でも Close をキャンセル） |
| Ctrl+Esc | ブロック |
| タスク切替等でフォーカスが外れた場合 | 1秒以内に自動で最前面へ復帰 |
| バッテリー運用 | `SetThreadExecutionState` でスリープ・画面消灯を抑止 |

**ブロックできないもの**: `Ctrl+Alt+Del` は Windows のセキュア操作のためアプリからは無効化できません。展示を完全に固めたい場合は併用してください:

- タッチ画面のエッジスワイプ無効化: `HKLM\SOFTWARE\Policies\Microsoft\Windows\EdgeUI` に `AllowEdgeSwipe`(DWORD)=0
- さらに厳密にするなら Windows の割り当てられたアクセス（Assigned Access / Shell Launcher）で本アプリをシェルとして起動

## ビルド

.NET 8 SDK があれば Windows / macOS / Linux のどこでもビルドできます。

```sh
dotnet publish kiosk/OLSK60Tester.csproj -c Release -r win-x64 --self-contained \
  -p:PublishSingleFile=true -p:IncludeNativeLibrariesForSelfExtract=true -o publish
```

`publish/` に `OLSK60Tester.exe` と `ui/` フォルダが出力されます。2つセットで配置してください。

## テスターの機能

### KEYBOARD

- OLSK60 v2 の実配列（[公式KLEデータ](https://www.keyboard-layout-editor.com/#/gists/641df3ee125afe1bd4ef41c9a0cded7d)準拠、60キー + 中央トラックポイント）
- 押下中は赤く点灯、押した回数に応じてキーが「熱を持つ」ヒートマップ表示
- 押したキーの大型OSD表示、打鍵数・最後のキーの表示
- Fn1 / Fn2 はレイヤーキー（単体では信号を送らない）として破線表示
- キオスクモード時は Win キーに 🔒 マーク

### TRACKPOINT

- カーソル軌跡を全画面 HUD として描画（ゆっくり=シアン → 速い=赤）
- 画面中央のキーボード上のトラックポイントも、カーソルの動きに合わせて傾いて光る
- クリックは波紋+ラベル（左/中/右/タッチ）、スクロールはシェブロンとメーターで可視化
- コンパス（移動方向）、速度 px/s、累計移動距離（メートル換算）

### TYPING

- **練習モード**: 短いお題を打つと WPM / 正確率 / クリア数を集計。`KeyboardEvent.code` フォールバックにより IME がオンのままでも動作。Esc でお題スキップ
- **自由入力**: 日本語IMEの未確定文字（下線表示）・確定を含めて表示

### キオスク向け挙動

- 起動時と 75 秒無操作でアトラクト画面に戻り、全カウンタを自動リセット（次の来場者用）
- 描画は入力があるときだけ `requestAnimationFrame`、DPR 上限 1.5（バッテリー配慮）
- 右クリックメニュー・テキスト選択・ズーム・スワイプナビゲーション無効

## クレジット

- OLSK60 / OLSK60 v2: [Techmech keys](https://techmech.booth.pm/)
- 旧バージョンのテスターは [@mass-work さんの CodePen](https://codepen.io/mass-work/pen/MYaMKzo) をベースにしていました。現バージョンは全面書き直しです

## ライセンス

このプロジェクトは個人利用・学習目的で自由に使用できます。
