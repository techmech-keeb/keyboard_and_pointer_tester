# Techmech keys INPUT LAB — 残課題・プラン（進捗・引き継ぎ）

最終更新: 2026-09-09（JST）

このファイルは、実装済みの経緯・未完了の実機検証・今後の改善プランを
引き継ぎ用にまとめたもの。作業を再開するときはまずここを見る。

## docs/ の地図

| 置き場 | 中身 |
|---|---|
| 本ファイル | 残課題・**実機確認チェックリスト**・今後のプラン |
| [`design/`](design/) | 仕様・設計の正本。[表示仕様](design/keyboard-layout-display.md) / [展示画面と SCROLL LAB](design/scroll-lab-stage.md) |
| [`research/`](research/) | 調査記録（出典つき・調査時点で凍結）。[RMK 0.9 接続経路の点検](research/2026-09-06_rmk-0.9-vial-integration-check.md) / [複数デバイス選択](research/vial-multi-device-selection.md) |
| [`archive/`](archive/README.md) | 役割を終えた凍結文書（完了した実装依頼書など） |

置き場の使い分けと、依頼書を凍結するときの手順は `AGENTS.md`「Docs」。

## レビュー中：キーボード中心の展示画面・SCROLL LAB

`main` の `b92b96287aa59e25a730a2cbbabf73d4559e936c` を基点とした外観レビュー段階。
実装を進めること、外観をスクリーンショットで確認し、合わなければ基点から再検討することをユーザーが指定。
featureブランチでレビューし、実機確認後にmain反映を判断する。詳細は [設計・検証記録](design/scroll-lab-stage.md)。

2026-09-09（JST）、Windows側で新UIが表示されることをユーザーが確認した。
確認に使ったArtifact/runは `要確認` であり、起動・表示の確認をOLSK60入力、
WebView2の総合動作、外観の最終承認まで拡張して扱わない。

- [x] キーボードを中央に常時表示し、上にタイピング、下に長文体験、最下部に計測帯を配置
- [x] 全画面wheel → 小数を保持する順序付きクランプ → rAF描画。line/page換算、加速・smoothなし
- [x] 元のカーソル位置での方向表示、INPUT MONITOR、ノッチ換算・解像度相当判定、手動リセットを統合
- [x] 自作10章、目盛り・固定線、位置・進捗。1024×768 / 1368×912 / 2560×1440 と両テーマ
- [x] Nodeの小数・端・方向反転テスト、ブラウザでの混合入力・レイヤー表示fixtureと72状態の撮影
- [x] 継続点検: 練習クリア直後のリセット／スキップで演出を消去し、ガイドをEscで閉じた後の自由入力フォーカスを復帰
- [x] 継続点検: 長い練習文と自由入力、1024×768の長いガイド文・操作ボタンの収まりを確認
- [x] Actionsでsource／publish後のUI 18ファイルを照合し、run固有Artifactとbuild情報を付与
- [x] Windows側で新UIの起動・表示をユーザー確認（使用したArtifact/runは `要確認`）
- [ ] ユーザーによる新しい外観・キーボードの大きさ・情報密度のレビュー
- [ ] 通常マウスの1ノッチと連続入力で標準判定を維持するか、OSの行数設定を含めて実機確認
- [ ] ThinkPad X9 Precision Touchpad、OLSK60、通常マウスを同一条件で比較。X9の方が
      滑らかで精緻かつ高速域も広いという初期的な体感はあるが、定量計測はユーザー判断で保留
- [ ] OLSK60＋展示PC＋WebView2で精密～高速移動、Vial接続・レジェンド・レイヤー・IMEを同時確認
- [ ] 実機でdeltaY / deltaMode / wheelDeltaY / 頻度 / 実scrollTopを一時観測。Windows表示倍率とWebView2版も記録
- [ ] ネイティブキオスクの離脱防止、無操作復帰、長時間連続入力・消費電力の実機確認
- [ ] 横方向の体験UI（別課題）。Platyxの仕様確定・プロファイル追加、Bluetoothハイレゾは未確認

関連する正本は、[knowledge-base PR #54](https://github.com/techmech-keeb/knowledge-base/pull/54)
（Precision TouchpadとX9実機証跡）、
[rmk-config PR #227](https://github.com/techmech-keeb/rmk-config/pull/227)
（USB／Bluetoothを含むfirmware候補設計）、
[AI-agent-playbook PR #50](https://github.com/techmech-keeb/AI-agent-playbook/pull/50)
（CI成果物の来歴確認）。各PRの実装済み／未確認範囲をTIL側で拡張解釈しない。

## 完了済み

- **Vial連携**（PR #7, merged）: Raw HID (usage page 0xFF60/0x61) で接続中の
  OLSK60 から実キーマップを読み出し、レイヤー刻印表示・レイヤータブ・
  約30Hzマトリクスポーリング・自動レイヤー追従・unlockウィザードを実装。
  Vialプロトコル標準機能のみ（ファーム独自パッチ非依存）。
- **接続不能バグ修正**（PR #7, `914305a`）: C#→JS で HID 応答が Base64 文字列に
  なり全ゼロ化していた問題を int[] 送出で修正（実機で発覚）。
- **デバイス入力の堅牢化**（PR #7, `303c046`）: XZ展開の入出力上限、
  マトリクス次元・レイヤー数・customKeycodes のレンジクランプ。
- **CIアクション更新**（PR #8, merged）: checkout/setup-dotnet v5・
  upload-artifact v6。Node.js 20 非推奨警告 Annotation を解消（0件確認済み）。
- **日本語入力トグル**（PR #9, merged）: 日本語IME依存を自由入力タブ1枚に
  集約し、スタッフメニューから ON/OFF（localStorage 保存・再ビルド不要）。
  **既定オフ**（`app.js` の `JP_INPUT_DEFAULT`）。
- **例文コンテンツ拡充**（PR #9, merged）: 練習例文を 10→40（PDパングラム＋
  自作＋ローマ字ことわざ）。ライセンス安全・全文字が物理キー対応を検証済み。
- **キーボード表示の仕様**: 何を描き、どこから取るかを
  [`docs/design/keyboard-layout-display.md`](design/keyboard-layout-display.md) に整理
  （製品プロファイル / 端末定義 / 端末状態の 3 層、未登録 Vial 機の扱い、
  未接続時の既定と構成）。**未実装分を含む仕様書**
- **バージョン管理＋リリース**: SemVer、単一ソース＝git タグ `vX.Y.Z`（CIが
  `-p:Version` で刻印）。スタッフメニューに版表示。タグ push で
  `release.yml` が GitHub Release を自動作成（win-x64 zip＋自動ノート）。
- **ガイドツアーラウンド**（PR #23〜#30, merged, 2026-07-18）:
  - **ガイドツアー機能 Phase 1**: `ui/tours.js`（エンジン）+
    `ui/layouts/olsk60-qmk.tours.js`（速度プロファイル / サウンドの2ツアー。
    2026-09 に QMK 版 / RMK 版へ分割）。
    Vial unlock 済み接続時のみ「ガイド」ボタン表示。キーコード指定の
    ターゲットを実機キーマップから実行時解決（リマップ耐性）。
    同時押しステップは前提誘導つき2段階表示。Enter=次へ（次へ可能
    ステップのみ）/ Esc=やめる。スクリムは4分割でキーボードパネルは
    常に鮮明。検知入力は3フック関数に集約（合成入力でレビュー検証可能）
  - **ツアーデータの出自管理**: 各 `*.tours.js` 冒頭に出典
    （olsk60_v2 docs / revision）を記録。**OLSK60_v2 の docs を更新したら
    この revision を確認して文言を同期する**（運用ルール）
  - **オートレイヤー表示シミュレーション**: トラックポイント操作で
    表示レイヤーをマウスレイヤー(L3)へ切替、ディレイ後復帰
    （150/400/800ms・既定800ms=実機既定）。スタッフメニューで ON/OFF。
    MO/LT 押下・ツアー中は発動しない。プロファイル宣言 `autoLayerSim`
  - **LCD テーマの完全モノクロ化**: 黄緑紙色 #f4f4d8 + 純黒インク基調、
    打鍵 OSD の色変数化（LCD で判読可能に）
- **2026-07 改修ラウンド**（PR #12〜#21, merged）:
  - 表示名を **Techmech keys INPUT LAB** へ変更（内部識別子は据え置き）
  - **ボードプロファイル化**（Phase A 完了）: `ui/boards.js` + `ui/layouts/`、
    Vial UID / USB ID 自動判別、汎用 ANSI 60% / フルサイズ104、スタッフ
    メニューの既定ボード選択（`olsk60.defaultBoard`）、キー `h`（縦サイズ）
    と縦フィット対応
  - **右カラム再設計**: CLICK/SCROLL を INPUT MONITOR に統合、ライブ
    フィード（×N集約）、レスポンシブ（≤1100px 1カラム / ≥1800px 拡幅）
  - **エフェクト強調**: クリック波紋・シェブロンを画面サイズ比例に、
    色は `FX_PALETTE`（CSS変数ブリッジ）へ集約
  - **テーマ切替**: `data-theme` + `ui/themes.js` + `ui/themes/lcd.css`
    （レトロ液晶）、`olsk60.theme` 保存。標準テーマは無回帰を機械検証済み
  - **visual-check CI**: `tools/visual-check.js` + workflow が UI 変更の
    push でスクリーンショット（3サイズ×4場面+テーマ別）を Artifact 化。
    CI トリガーは `codex/**` ブランチにも対応
  - README を上記仕様に全面更新（スクリーンショット2枚も撮り直し）

## 残課題：実機検証（実機がある側でのみ可能）

> 状態: **中断（2026-07-09）** — 実機（キーボード／展示PC）が未整備のため保留。
> 環境が整ったら再開する。以下は再開時のチェックリスト。

- [ ] **日本語トグル 既定オフ**で起動 → 自由入力タブが出ず練習モードのみで正常
- [ ] トグルを**オンに切替** → 日本語が打てる／**変換候補ウィンドウの見え方**
      （全画面・最前面で裏に隠れないか）。※ここが唯一のIME環境依存の確認点
- [ ] 再起動後もトグル設定が保持される（localStorage 永続）
- [ ] **WebHID 単体接続**（ブラウザで ui/index.html を開き、バッジクリックで接続）
- [ ] **75秒自動リセット**と切断→自動再接続の長時間安定性
- [ ] **OLSK60 実機の Vial 自動判別**（UID 一致でボード表示が切り替わるか）
- [ ] **未登録 Vial 機の定義表示**（端末 KLE と保存 layout options に合う配置、
      実キーマップの刻印、unlock 後の押下点灯、抜線後の既定ボード復帰）
- [ ] **テーマ切替の実機確認**（WebView2 でレトロ液晶テーマの描画・localStorage 永続）
- [ ] **ガイドツアーの実機確認**（マトリクス検知でのステップ進行・前提誘導の
      戻り・LED 案内と実機の一致・Enter/Esc ショートカット）
- [ ] **オートレイヤー表示シミュレーションの体感**（実機の切替感覚とディレイ設定が
      合うか。合わなければスタッフメニューで調整 or OFF）

## 今後のプラン

### 1. 単一バイナリ化（提案・未着手）

現状は exe＋`ui/` フォルダの2点構成が必須（`SetVirtualHostNameToFolderMapping`
がディスク上の `ui/` を読む）。`PublishSingleFile` が単一化するのは
.NETランタイムと管理DLLのみで、`ui/` は素のファイルとして exe の横に出る。

- **方針**: `ui/**` を Content→**EmbeddedResource** に変更し、
  `SetVirtualHostNameToFolderMapping` をやめて **`WebResourceRequested`
  ハンドラで埋め込みリソースを配信**する。ナビゲーション先は
  `https://olsk60.app/...` のまま（origin 不変＝日本語トグルの localStorage
  設定も保持、Web側は無改修）。
- **利点**: exe と ui/ の分離事故が消える、改ざん耐性、配布が1ファイル。
- **コスト**: 中（約半日）。C#に「パス→リソース→Content-Type付き応答」ハンドラ
  50〜80行＋csproj変更。現状 ui/ はテキスト資産のみでバイナリ無し。
- **リスク/trade-off**: 配信ハンドラのバグ＝白画面（実機確認が要る）。
  現地での loose file 直接編集ができなくなる（キオスクではむしろ安全側）。
- **注意**: WebView2 ランタイムは引き続きOS側の前提（exeには埋め込めない。
  Win10/11 は標準搭載）。固定バージョン同梱はファイル増で本末転倒のため非推奨。

### 2. 例文コンテンツの拡充（提案・未着手）

`ui/layout.js` の `PRACTICE_PHRASES`（現在10文）を増量・魅力向上。
- **ライセンス方針**: パブリックドメイン（パングラム・古典格言・いろは 等）
  ＋自作のみ。MonkeyType(GPL-3.0)・TypeRacer(著作物)・e-typing(商用) は
  そのまま流用不可。
- カテゴリ化（パングラム／自作キーボード文化／ローマ字ことわざ 等）＋
  難易度3段＋セットのローテーション表示を検討。
- 方針が固まれば KB `03_decisions/` に「例文ソース選定方針」を残す。

### 3. 練習モードの IME ヒント（任意・低コスト）

練習モードは IME オンでも動作するが（物理キー`e.code`＋ローマ字フォールバック）、
気になる場合は IME 検知時（`e.key==="Process"`）に「半角英数で入力」ヒントを
表示する軽い補助を追加できる（数十分）。アプリからの IME 強制オフは
WebView2 のプロセス分離により高コスト・不確実のため見送り。

### 4. Platyx（無線ボード）対応とマルチボード共存（提案・中断）

> 状態: **中断（2026-07-09）** — Platyx が未開発のため。ハードとファーム
> （RMK+Vial／無線方式）が固まり、Platyx リポジトリを接続してから再開する。
> なお共存アーキテクチャの Phase A（ボードプロファイル化＋UID/VID自動判別）は
> **2026-07 に実装済み**（「完了済み」の改修ラウンド参照）。Platyx 対応は
> プロファイル1ファイルの追加（`ui/layouts/platyx.js`）から始められる。

Platyx = 設計中の 50% ワイヤレス・オルソリニア＋トラックポイント。無線Vialで
本アプリに接続し、OLSK60 と同等（実キーマップ表示・レイヤータブ・マトリクス
ポーリング・unlock）を実現しつつ両機を共存させる構想。※正式情報は Platyx
リポジトリ接続後に確定。

- **前提（最重要）**: Platyx が **RMK + Vial** であること。RMK は Vial を
  ネイティブ対応し **BLE 経由のキーマップ編集も公式サポート**。ZMK は Vial
  非対応（ZMK Studio という別プロトコル）なので、その場合は全く別実装。
- **無線でもほぼ無改修で載る理由**: 本アプリは Vial を Raw HID (FF60/0x61) で
  話し、列挙は usage で絞るため**トランスポート非依存**。Windows は BLE HID
  (HOGP) も同じ HID スタックに出す→ BLE で FF60 が公開されていれば現コードが
  そのまま発見・通信する。WebHID も BLE HID 可。トラックポイント可視化は OS
  カーソル基準でボード非依存。
- **無線特有の要確認（実機・ファーム確定後）**:
  1. BLE で FF60/0x61 ベンダーHIDコレクションを HOGP 公開できるか（RMK設定次第・最重要）
  2. 30Hz マトリクスポーリングの速度/安定性（BLE接続間隔で遅延の恐れ→ライブ点灯は
     10〜15Hz へ間引き調整の可能性。キーマップ読み出しは一発で遅延に強い）
  3. スリープ/再接続の頻度（タイムアウト 500ms/1.5s の緩和調整の可能性）
  4. 2.4GHz ドングル方式ならドングルが raw HID をブリッジするか（BLE のほうが素直）
  - 劣化時は既存の縮退モード（刻印＋手動タブ）で成立するため最悪でも表示は可能。
- **共存アーキテクチャ（本命）**:
  1. `layout.js` の単一 `OLSK60` を**ボードプロファイル化**（`layouts/olsk60.js` /
     `layouts/platyx.js` … 同一形状を export、レジストリ `BOARDS`）
  2. Vial 接続時の **UID / VID・PID で自動判別**し、接続ボードのレイアウト・
     ブランディングへ自動追従（挿し替えるだけで切替）
  3. 発展: 端末の vial.json(KLE) から**物理レイアウトを動的描画**して真のボード
     非依存化。WebHID 単体（XZ不可）は bundled プロファイルにフォールバック
- **段階**: A) プロファイル化＋自動判別（無線と独立・先行可、OLSK60 無回帰確認）
  → B) Platyx プロファイル＋実機(RMK+BLE)で Vial 接続確認 → C) 無線ライブ検証
  （レート/タイムアウト調整）→ D)(任意) vial.json 動的描画で完全非依存化。
- **リポ接続後にほしい情報**: 無線方式(BLE/2.4GHz/両対応)・ファーム(RMK確定か)・
  VID/PID・Vial UID・vial.json・物理配列(キー数)・TP接続・マトリクス(rows/cols)。
- OLSK60 の RMK 移行（KB #27）と同じ基盤のため知見は相互流用可。単一バイナリ化
  （上記プラン1）ともプロファイル埋め込みで相性良好。

### 5. RMK 版 OLSK60 への追従（2026-09-07 再点検・未着手）

RMK 0.9 系（rmk-config `3.0.0-rc.1`）との接続経路は
[`research/2026-09-06_rmk-0.9-vial-integration-check.md`](research/2026-09-06_rmk-0.9-vial-integration-check.md)
で照合済み。プロトコルは無改修で通るが、TIL 側に次が残る（優先順）。
2026-09-07 の再点検では公開 upstream の 0.9.0 タグが同じ基準 rev を指すことを確認した。
ただし private の `rmk-config` remote と実機にはこの環境からアクセスできないため、最新 FW の
remote HEAD 確認および下記の実機項目は未確認のまま。

- [ ] **T-10 相当**: Vial UID の追加（RMK 版 `1E EB CB 50 9F 6B 94 EE`。QMK 版は残す）、
      matrix fallback 6×13、customKeycodes を RMK の `vial.json` 名へ、`shortName` の改行正規化、
      ガイドツアーの `target.custom` 名の更新
- [ ] **EEPROM レイアウト選択の反映**: VIA `0x02 0x02` で永続化済み layout options を読み、
      `vial.json.layouts.labels/keymap` の qualifier を解決して選択中の物理配列だけを描画する。
      結果は一時 `DeviceLayout` として board profile に重ね、OLSK60 の TrackPoint、ガイド、外形等は
      profile から維持する。取得失敗時は overlay だけを破棄（調査書 §8.3）
- [ ] ツアー文言（LED 点滅・速度プロファイル）を RMK 版実装で再確認して同期
- [ ] 詳細スクロール（hi-res）の表現: **受信・サブノッチ判定・ノッチ換算・インジケータはmain実装済み**。
      上記レビュー中の変更で縦長文体験・px量によるフィード集約・量比例エフェクトを追加。
      実機確認と横スクロール方向表示は残る（同書 §9.5）
- [ ] ロータリーエンコーダの表現: 選択済み `vial.json` からノブ位置/index を取得し、Vial
      `0xFE 0x03` で全 layer の割当を表示、押し込み `(5,12)` を反映する。回転元は標準 HID では
      一意に識別できないため「推定」表示とし、HID 出力のない L2 は設定値のみ表示。エンコーダー有無は
      option 名でなく、layout options 適用後に encoder KLE 要素が残るかで判定。OLSK60は下カーソル位置で
      push・CCW・CWを単一ノブに統合する（同書 §8.2–8.5、§9.4）
- [ ] 実機確認: WebView2 で `AudioVolumeUp` keydown が届くか／hi-res 時の `wheel` の値／
      ボトム行の matrix 位置（Space `[4,4]` vs RMK keymap の `(4,6)`）

## 関連する他リポジトリの課題

- `knowledge-base` `02_notes/_open-verifications.md` #27:
  **RMK+Vial 移行時**にロック中キーマップ読み出し可否・マトリクス応答形式を
  実機で再確認（プロトコル仕様ノート `02_notes/keyboard/2026-07-08_vial-raw-hid-protocol-notes.md` 参照）。
  → 2026-09-06 にソース照合で両方「同じ」と確認（バイト配置は実機でも確認済み）。残るのは
  ロック中読み出しの実機確認のみ。
- `rmk-config` `WATCHLIST.md` T-10（テスター更新）: 上記 5 の 1 点目と同じ。
