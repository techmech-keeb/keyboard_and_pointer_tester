# 開発

更新: 2026-09-13（JST）。ビルド、UI の検証、リリースの出し方。
作業ルールは [`../AGENTS.md`](../AGENTS.md)、残課題は [`roadmap.md`](roadmap.md)。

## 構成

```text
keyboard_and_pointer_tester/
├── ui/                        # テスター本体（HTML/CSS/JS、外部依存なし・オフライン動作）
│   ├── index.html
│   ├── style.css              # 標準テーマ（ダークHUD）+ テーマ上書き用のCSS変数定義
│   ├── stage.css              # キーボードを中心にした展示画面の構成
│   ├── app.js
│   ├── scroll-input.js        # 小数deltaの単位変換・順序を保つクランプ・判定
│   ├── scroll-lab.js          # フォーカス不要のスクロール面と一時観測
│   ├── scroll-content.js      # 自作の長文・番号付き行・合わせ線
│   ├── boards.js              # ボードプロファイルのレジストリと自動判別（UID / USB ID）
│   ├── layouts/               # ボードプロファイル（olsk60 / generic-ansi60 / generic-fullsize）
│   ├── themes.js              # テーマのレジストリと切替・保存
│   ├── themes/                # テーマ上書きCSS（lcd.css = レトロ液晶）
│   ├── layout.js              # 共通のタイピング練習例文
│   ├── keycodes.js            # QMKキーコード→刻印変換（Vialプロトコル版数で分岐）
│   └── vial.js                # Vial/VIAプロトコル実装（キオスクブリッジ / WebHID 両対応）
├── kiosk/                     # Windows用キオスクホスト（C# WinForms + WebView2）
│   ├── TechmechInputLab.csproj
│   ├── Program.cs
│   ├── KioskForm.cs           # フルスクリーン最前面固定・フォーカス奪還・スリープ抑止
│   ├── KeyboardHook.cs        # 低レベルフックで離脱系ショートカットを吸収
│   ├── RawHidDevice.cs        # Raw HID (usage page 0xFF60) の列挙・読み書き
│   └── VialHidBridge.cs       # WebView2メッセージ⇔HID中継 + vial.json の XZ 展開
├── tools/visual-check.js      # 画面スクリーンショット検証（CIと共通）
└── .github/workflows/         # build-kiosk（exe）/ visual-check（スクショ）/ release
```

## ビルド

.NET 8 SDK があれば Windows / macOS / Linux のどこでもビルドできます。

```sh
dotnet publish kiosk/TechmechInputLab.csproj -c Release -r win-x64 --self-contained \
  -p:PublishSingleFile=true -p:IncludeNativeLibrariesForSelfExtract=true -o publish
```

`publish/` に `TechmechInputLab.exe` と `ui/` フォルダが出力されます。2つセットで配置してください。

`ui/` または `kiosk/` を変更するPRでは `build-kiosk` が自動実行されます。CI成果物には
チェックアウトしたUI全ファイルとのSHA-256照合が入り、`BUILD-INFO.json` に対象ブランチ、
コミット、Actions実行URLを記録します。スタッフメニューに表示される開発版番号
`0.1.0-ci.<実行番号>` はArtifact名の番号と一致します。別版を試すときは、起動中の
`TechmechInputLab.exe` を終了してから、対象runのArtifactを空のフォルダへ展開してください。

## UI ビジュアルチェック

`ui/`、`tools/`、または visual-check ワークフローが変わる対象ブランチへの push / PR では、CI の
`visual-check` が **3 画面サイズ × 両テーマ × 15 状態（90 枚）**を撮影します（2026-09-13 に実行して確認）。
先頭・中間・終端、打鍵、ポインター、クリック、精密／高速入力fixture、自由入力、アトラクトを含み、
長い練習文とガイド表示、端末のレイアウト設定（5-Split＋エンコーダ）を重ねた表示も撮影し、overflow、全画面wheel、混合入力、小数delta、リセット、Vial表示fixtureを検証します。
結果とブラウザ版は Actions の Artifact `visual-check-screenshots` として 14 日間保存されます。ローカルでは
`node tools/visual-check.js` を実行できます（`playwright` のインストール環境、または
`playwright-core` とブラウザを指す `CHROMIUM_PATH` が必要です）。

`node --check ui/app.js`、`node --test tools/scroll-input.test.js`、
`node --test tools/boards.test.js`（ボードプロファイルとガイドツアーの整合）、
`node --test tools/vial-layout.test.js`（layout options の解釈と KLE の読み取り）も実行してください。
ボードプロファイルを触ったときは、正本（`qmk-config` / `rmk-config`）が手元にあれば
`node tools/check-board-sources.js` でずれを確認できます（正本が無ければ何もせず終了します）。
GPU のない検証環境では `CHROMIUM_DISABLE_GPU=1` を指定できます。
合成イベント・合成Vial応答による検証は実機検証とは区別します。
外観の基準候補と実機チェック手順は [SCROLL LAB 設計・検証記録](design/scroll-lab-stage.md) にまとめています。

## バージョン管理とリリース

バージョンは **SemVer**、**単一のソースは git タグ `vX.Y.Z`** です。csproj の
`<Version>` はローカル/開発用の既定（`0.1.0-dev`）で、CI がタグから
`-p:Version=<タグ>` で上書きしてビルドに刻みます。手で csproj を書き換える
必要はありません。

- **アプリ内表示**: スタッフメニュー（ロゴ5連打）下部に `Techmech keys INPUT LAB
  vX.Y.Z` を表示（キオスクホストが exe のバージョンを UI へ通知）。ブラウザ/
  開発ビルドでは `dev` と表示。展示機がどの版かを現地で確認できます。
- **リリースの作り方**: タグを push するだけ。

  ```sh
  git tag v1.2.3
  git push origin v1.2.3
  ```

  `.github/workflows/release.yml` が発火し、win-x64 単一ファイルを
  バージョン刻印付きでビルド → `TechmechInputLab-v1.2.3-win-x64.zip` を添付した
  **GitHub Release を自動作成**（リリースノートは自動生成）。Actions の
  一時成果物と違い、リリースは消えずにバージョン付きで残ります。
- **手動リリース**: Actions の `release` を「Run workflow」で実行。次の2通り。
  - **バージョンを直接入力**（`version` に例 `1.2.3`）→ その値でリリース（`bump` は無視）。
  - **`bump` を選ぶ**（`version` は空のまま）→ 前回リリースのタグを基点に自動附番:
    - `auto`: **前回リリース以降のコミット**を Conventional Commits で判定して
      major/minor/patch を自動決定
    - `patch` / `minor` / `major`: コミット内容を見ずに指定の位置を +1
  - いずれも、その時点のコミットにタグ（`vX.Y.Z`）を作ってリリースします。
- **auto の判定ルール**（コミットメッセージ規約に依存）:
  | コミット | 上げる位置 |
  |---|---|
  | `feat!:` / 任意の `type!:` / 本文に `BREAKING CHANGE` | major |
  | `feat:` | minor |
  | それ以外（`fix:` / `chore:` / `docs:` など、規約外も含む） | patch |

  規約に沿わないメッセージは patch 扱いになります。minor/major を自動で
  出したいときは `feat:` / `feat!:` を使うか、`bump` で明示指定してください。
- 日常の CI ビルド（`build-kiosk.yml`）は対象ブランチへの push に加え、`ui/` または
  `kiosk/` を変更するPRでも動きます。
  配布はタグ＝リリース、と役割を分けています。
