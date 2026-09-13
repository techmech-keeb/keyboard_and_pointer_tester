# Techmech keys INPUT LAB — 残課題・プラン（進捗・引き継ぎ）

最終更新: 2026-09-13（JST）

このファイルは、**まだ終わっていないこと**だけを持つ。作業を再開するときは
まずここを見る。実装済みの経緯は
[`archive/implementation-log.md`](archive/implementation-log.md)（凍結）。

docs/ 全体の目次は [`INDEX.md`](INDEX.md)。

## どこから手をつけるか

| 状況 | やること | 目安 |
|---|---|---|
| 手元に実機が無い | 「今後のプラン」の 5-A（ツアー文言の出典記録）→ 5-B（横スクロールの方向表示）→ 1（単一バイナリ化） | 数十分〜半日 |
| 展示 PC がある（OLSK60 は無くてよい） | 「実機確認」A の 5 件 | 1 回 30〜60 分 |
| OLSK60 も展示 PC もある | 「実機確認」B → C → D | 1 回 1〜2 時間 |
| 外部エージェントが作業中 | 6（デザインテーマ追加）。ブランチ `design/themes-minimal-and-pop` | — |

各タスクは「何のため / 触る場所 / 手順 / 確認 / 完了条件」で書いてある。上から順に読めば、
このリポジトリを初めて触る人でもそのまま実行できる粒度にしてある。

## 実機確認（実機がある側でのみ可能）

> 状態: **中断（2026-07-09）** — 実機（キーボード／展示PC）が未整備のため保留。
> 環境が整ったら再開する。2026-09-09（JST）に Windows 側で新 UI の**起動・表示だけ**を
> ユーザーが確認した（使用した Artifact/run の対応付けは `要確認`）。それ以外は未実施。

合成入力・合成 Vial 応答による CI 検証は、ここでいう実機確認には数えない。
操作手順の詳細は [設計・検証記録](design/scroll-lab-stage.md)「実機確認の手順」。
場面ごとにまとめてあるので、実機に触れる回ごとに A〜D の単位で消化する。

### 0. 毎回最初に記録する

- [ ] 展示 PC・OLSK60 のファーム版・接続方式（USB / Bluetooth）・WebView2 版・
      Windows 表示倍率・OS のスクロール行数設定・使用した Artifact と run URL
      （アプリ内のビルド表示と `BUILD-INFO.json` を突き合わせる）

### A. 展示機の起動・表示オプション・離脱防止（OLSK60 なしで進む）

- [ ] **日本語トグル 既定オフ**で起動 → 自由入力タブが出ず練習モードのみで正常
- [ ] トグルを**オンに切替** → 日本語が打てる／**変換候補ウィンドウの見え方**
      （全画面・最前面で裏に隠れないか）。※ここが唯一の IME 環境依存の確認点
- [ ] **テーマ切替**（WebView2 で同梱テーマがすべて意図どおり描画されるか。
      2026-09 時点はスタンダードとレトロ液晶の 2 つ。プラン 6 でミニマルとポップを
      追加予定なので、追加後は 4 つとも見る）
- [ ] **再起動後も端末設定が残る**（日本語トグル／テーマ／既定ボードの localStorage 永続）
- [ ] **キオスクの離脱防止**（Win / Alt+Tab / Alt+F4 等）、**75 秒無操作リセット**、
      長時間連続入力での安定性と消費電力

### B. OLSK60 を挿しての Vial 連携

- [ ] **Vial 自動判別**（UID 一致で表示ボードが切り替わるか）
- [ ] **unlock 後のマトリクス点灯**と、切断 → 自動再接続の長時間安定性
- [ ] **未登録 Vial 機の定義表示**（端末 KLE と保存 layout options に合う配置、
      実キーマップの刻印、unlock 後の押下点灯、抜線後の既定ボード復帰）
- [ ] **ガイドツアー**（マトリクス検知でのステップ進行・前提誘導の戻り・
      LED 案内と実機の一致・Enter/Esc ショートカット）
- [ ] **オートレイヤー表示シミュレーションの体感**（実機の切替感覚とディレイ設定が
      合うか。合わなければスタッフメニューで調整 or OFF）
- [ ] **ブラウザ単体の WebHID 接続**（`ui/index.html` を開き、バッジクリックで接続）

### C. スクロールとポインターの手触り

- [ ] **通常マウス**の 1 ノッチと連続入力で標準判定を維持するか（OS の行数設定を含む）
- [ ] **OLSK60 で精密〜高速移動**（目標線を固定線へ合わせる／章をまたぐ移動／反転・端・再開）。
      アプリ側で速さを補正していないことを確認する
- [ ] **一時観測**（スタッフメニュー → スクロールの一時観測）で deltaY / deltaMode /
      wheelDeltaY / 頻度 / 論理位置と実 `scrollTop` / 端で制限された量を読む
- [ ] **展示 PC＋WebView2 で同時確認**（スクロール、Vial 接続、レジェンド、レイヤー、IME）

### D. 外観の最終判断（ユーザー）

- [ ] 新しい外観・キーボードの大きさ・情報密度のレビュー（両テーマ・全サイズ・
      少し離れた距離での判読性を含む）。合わなければ
      [外観レビュー記録](archive/scroll-lab-review-log.md)の戻り先から再検討する

### 保留・別課題（この一覧では追わない）

- **ThinkPad X9 Precision Touchpad との定量比較**: ユーザー判断で保留。初期の体感比較と
  一次情報は [knowledge-base PR #54](https://github.com/techmech-keeb/knowledge-base/pull/54)。
  比較試験を再開するまで、SCROLL LAB 側に独自の加速や平滑化を加えて差を覆い隠さない
- **横方向の体験 UI / Platyx プロファイル / Bluetooth ハイレゾ**: 別課題（「今後のプラン 4」）
- **RMK 版追従の実機確認**（WebView2 での `AudioVolumeUp` keydown、hi-res 時の `wheel` 値）:
  実装とセットなので「今後のプラン 5」に残す

関連する正本は、[knowledge-base PR #54](https://github.com/techmech-keeb/knowledge-base/pull/54)
（Precision Touchpad と X9 実機証跡）、
[rmk-config PR #227](https://github.com/techmech-keeb/rmk-config/pull/227)
（USB／Bluetooth を含む firmware 候補設計）、
[AI-agent-playbook PR #50](https://github.com/techmech-keeb/AI-agent-playbook/pull/50)
（CI 成果物の来歴確認）。各 PR の実装済み／未確認範囲を TIL 側で拡張解釈しない。

## 今後のプラン

実装の残タスク。**2026-09-13 に main の実装を読んで点検し、すでに終わっていたものは
落とした**（何が終わっていたかは各項目に書いてある）。

### 1. 単一バイナリ化（未着手・約半日）

**何のため**: いまは `TechmechInputLab.exe` と `ui/` フォルダの 2 点セットでしか動かない
（`SetVirtualHostNameToFolderMapping` がディスク上の `ui/` を読むため）。展示現場で片方だけ
コピーして白画面になる事故を無くす。`PublishSingleFile` が 1 つにまとめるのは .NET
ランタイムと管理 DLL だけで、`ui/` は exe の横に素のファイルで出る。

**触る場所**: `kiosk/TechmechInputLab.csproj`（`ui/**` を Content → EmbeddedResource へ）、
`kiosk/KioskForm.cs`（`SetVirtualHostNameToFolderMapping` をやめて `WebResourceRequested`
ハンドラで埋め込みリソースを返す。50〜80 行）。

**手順**:

1. csproj の `<Content Include="..\ui\**" …>` を `<EmbeddedResource …>` に変える。
2. WebView2 の `WebResourceRequested` を購読し、`https://olsk60.app/<path>` の `<path>` を
   リソース名へ変換して `Content-Type` 付きで返す。**ナビゲーション先の URL は変えない**
   （origin が変わると `localStorage` の設定＝テーマ・日本語トグル・既定ボードが消える）。
3. 見つからないパスは 404 を返し、ログに残す。

**確認**: `dotnet publish` して `publish/` に `ui/` が出ないこと、exe 単体で起動して
画面が出ること（**実機 Windows が要る**）。`build-kiosk` の UI ファイル照合ステップは
`ui/` を publish 先と突き合わせているので、**このステップの書き換えも同じ PR で必要**。

**完了条件**: exe 1 ファイル＋ライセンス 3 ファイルで展示機が動く。白画面が出ない。

**注意**: WebView2 ランタイムは引き続き OS 側の前提（exe には埋め込めない。Win10/11 は標準搭載）。
現地での `ui/` 直接編集はできなくなる（キオスクではむしろ安全側）。

### 2. 練習例文の見せ方（増量は完了・残りは未着手）

**何のため**: `ui/layout.js` の `PRACTICE_PHRASES` は 34 文ある（PR #9 で 10 文から増量済み）。
残っているのは**選び方の工夫**だけ。

**触る場所**: `ui/layout.js`（配列にカテゴリと難易度を持たせる）、`ui/app.js`（出題の選択部）。

**手順**: 1) 文をカテゴリ（パングラム / 自作キーボード文化 / ローマ字ことわざ）と難易度 3 段に
分類する → 2) セットを回して出す → 3) 方針が固まったら knowledge-base `03_decisions/` に
「例文ソース選定方針」を残す。

**確認**: `node tools/visual-check.js`（長い例文が枠に収まるか。1024×768 で特に確認）。

**完了条件**: 同じ文が連続して出ない。どの文も物理キーだけで打てる。

**ライセンス方針（厳守）**: パブリックドメイン（パングラム・古典格言・いろは 等）と自作のみ。
MonkeyType(GPL-3.0)・TypeRacer（著作物）・e-typing（商用）はそのまま流用不可。

### 3. 練習モードの IME ヒント（任意・数十分）

**何のため**: 練習モードは IME オンでも動く（物理キー `e.code` ＋ローマ字フォールバック）が、
利用者が戸惑う場合に備えた補助。

**触る場所**: `ui/app.js` の練習モードのキーハンドラ。

**手順**: `e.key === "Process"` を検知したら「半角英数で入力」ヒントを表示するだけ。

**完了条件**: ヒントが出る。既存の判定には影響しない。

**やらないこと**: アプリから IME を強制オフにする実装（WebView2 のプロセス分離で高コスト・不確実）。

### 4. Platyx（無線ボード）対応（中断中）

> **状態: 中断（2026-07-09）** — Platyx が未開発のため。ハードとファーム（RMK+Vial／無線方式）が
> 固まり、Platyx リポジトリを接続してから再開する。

**いまの立ち位置**: 共存の土台（ボードプロファイル化＋UID/VID 自動判別）は 2026-07 に実装済み。
**再開時は `ui/layouts/platyx.js` を 1 枚足すところから始められる。**

**前提（最重要）**: Platyx が **RMK + Vial** であること。RMK は Vial をネイティブ対応し、
BLE 経由のキーマップ編集も公式サポートする。ZMK は Vial 非対応（ZMK Studio は別プロトコル）なので、
その場合は全く別実装になる。

**無線でもほぼ無改修で載る理由**: TIL は Vial を Raw HID（usage page `0xFF60` / usage `0x61`）で話し、
列挙も usage で絞るため**トランスポート非依存**。Windows は BLE HID（HOGP）も同じ HID スタックに
出すので、BLE で `0xFF60` が公開されていれば現行コードがそのまま発見・通信する。

**実機・ファーム確定後に確かめること**:

1. BLE で `0xFF60`/`0x61` のベンダー HID コレクションを HOGP 公開できるか（RMK 設定次第・最重要）
2. 30Hz マトリクスポーリングの速度と安定性（BLE の接続間隔次第で 10〜15Hz へ間引く可能性）
3. スリープ／再接続の頻度（タイムアウト 500ms / 1.5s の緩和が要るか）
4. 2.4GHz ドングル方式の場合、ドングルが Raw HID をブリッジするか（BLE のほうが素直）

劣化しても既存の縮退モード（刻印＋手動レイヤータブ）で成立するので、最悪でも表示はできる。

**段階**: A) プロファイル化＋自動判別（**完了**）→ B) Platyx プロファイル＋実機で Vial 接続確認
→ C) 無線ライブ検証（レート・タイムアウト調整）→ D) 任意: 端末の `vial.json` から物理配列を
動的描画して完全にボード非依存化。

**リポジトリ接続後にもらう情報**: 無線方式（BLE / 2.4GHz / 両対応）・ファーム（RMK 確定か）・
VID/PID・Vial UID・`vial.json`・物理配列（キー数）・TrackPoint 接続・マトリクス（rows/cols）。

### 5. RMK 版 OLSK60 への追従（残り 3 件）

**2026-09-13 の点検結果**: 2026-09-07 に挙げた 6 件のうち、次は**すでに実装済みだった**。

- Vial UID の追加（`1E EB CB 50 9F 6B 94 EE`）・matrix 6×13・RMK 名の customKeycodes・
  `shortName` の空白正規化 → `ui/layouts/olsk60.js` の `OLSK60_RMK_PROFILE`
- EEPROM の layout options 反映（VIA `0x02 0x02`）→ `ui/vial.js` の `readLayoutOptions()` と
  `ui/app.js` の `applyDeviceLayout()`。取得失敗時は overlay だけ破棄する挙動も入っている

接続経路の照合結果は
[`research/2026-09-06_rmk-0.9-vial-integration-check.md`](research/2026-09-06_rmk-0.9-vial-integration-check.md)。
残るのは次の 3 件。

#### 5-A. ガイドツアーの出典（docs revision）を RMK 版にも記録する（実機不要・30 分）

**何のため**: `AGENTS.md` は「各 `*.tours.js` 冒頭に出典（olsk60_v2 docs / revision）を記録し、
docs を更新したら revision を確認して文言を同期する」と定めている。`olsk60-qmk.tours.js` には
`// docs revision: 8990e7c (2026-07-18)` があるが、**`olsk60-rmk.tours.js` には無い**。
このままだと「いつの文言か」が追えず、同期の運用が回らない。

**触る場所**: `ui/layouts/olsk60-rmk.tours.js` の冒頭コメント。

**手順**: 1) OLSK60_v2 の公開ドキュメントの現在の revision を確認する → 2) RMK 版ツアーの文言
（LED 点滅・速度プロファイル）をその revision と突き合わせる → 3) `// docs revision: <sha> (<日付>)`
を冒頭に書く。文言がずれていたら直す。

**確認**: `node --test tools/boards.test.js`（ツアーとボードプロファイルの整合検査）。

**完了条件**: 両方の `*.tours.js` に docs revision がある。

#### 5-B. 横スクロールの方向表示（実機不要・半日）

**何のため**: 横入力は入力合計とノッチ判定には入っているが、**画面の方向表示（シェブロン）は
縦だけ**。`ui/app.js` の `wheelVisual` が `dir`（上下）しか持っていない。

**触る場所**: `ui/app.js` の `wheelVisual` と、それを描く `frame()` 内のシェブロン描画。

**手順**: 1) `wheelVisual` に横方向を持たせる → 2) 描画で左右のシェブロンを出す
→ 3) 縦横が同時に来たときの見せ方を決める（強い方だけ出す等）。

**確認**: `node --test tools/scroll-input.test.js` と `node tools/visual-check.js`。
横入力の fixture を追加すること。

**完了条件**: 横に回したときに画面が反応する。縦の挙動は変わらない。

**やらないこと**: 横方向に本文を動かすこと（現仕様では対象外）。

#### 5-C. ロータリーエンコーダの割当表示（実機があると確実・1 日）

**何のため**: いまはエンコーダの**位置**は描ける（`vial.json` の KLE から拾って
`ui/app.js` が `.key.encoder` を置いている）が、**各レイヤーに何が割り当てられているかは
表示していない**（Vial の `0xFE 0x03` = `vial_get_encoder` が未実装）。

**触る場所**: `ui/vial.js`（`0xFE 0x03` のコマンド追加）、`ui/app.js`（表示）。

**手順**: 1) 選択済み `vial.json` からノブ位置と index を取る（ここは実装済み）→
2) `0xFE 0x03` で全レイヤーの CW / CCW 割当を読む → 3) 押し込み `(5,12)` の割当を反映する →
4) OLSK60 は下カーソル位置で push・CCW・CW を 1 つのノブにまとめて表示する。

**注意**: 回転の発生元は標準 HID では一意に識別できないので**「推定」表示**にする。
HID 出力のない L2 は設定値のみ表示。エンコーダの有無は option 名ではなく、
**layout options 適用後に encoder の KLE 要素が残るか**で判定する（調査書 §8.2–8.5、§9.4）。

**完了条件**: エンコーダを持つ端末で、レイヤーごとの割当が読める。持たない端末では何も出ない。

#### 5-D. RMK 実機での確認（実機が要る）

WebView2 で `AudioVolumeUp` の keydown が届くか／hi-res 時の `wheel` の値／ボトム行の
matrix 位置（Space `[4,4]` と RMK keymap の `(4,6)`）。**上の 5-A〜5-C とセットで確認する**ため、
「実機確認」の一覧には入れていない。

### 6. デザインテーマの追加（外部エージェントが作業中）

**何のため**: 同梱テーマをスタンダード／レトロ液晶の 2 つから 4 つに増やす。
「ミニマル」（Dieter Rams の Less but better に倣った静かな明色）と「ポップ」
（高彩度・多色。既存 3 つのどれとも被らない方向）。

**進め方**: ブランチ `design/themes-minimal-and-pop` に依頼書
[`design/theme-addition-implementation-request.md`](design/theme-addition-implementation-request.md)
を置いてある。実装は外部エージェント（ChatGPT Work モード）が行う。

**このリポジトリ側で発生する追従作業**（テーマ追加の PR に含める）:

- `tools/visual-check.js` の `THEMES` にテーマ id を足す → 撮影枚数が
  **90 枚（3 サイズ × 2 テーマ × 15 状態）→ 180 枚**になる。CI 時間が問題になるようなら、
  新テーマだけ 1 サイズに絞る案を検討する（既存テーマの撮影は減らさない）
- `README.md`・`docs/guide/features.md`・`docs/development.md`（枚数）の記載更新
- 「実機確認」A のテーマ確認が 2 テーマ → 4 テーマになる（項目は追加しない。見る対象が増えるだけ）

**完了条件**: スタッフメニューの「デザイン」で 4 つ選べ、どのテーマでも刻印と計測値が読める。

## 関連する他リポジトリの課題

- `knowledge-base` `02_notes/_open-verifications.md` #27:
  **RMK+Vial 移行時**にロック中キーマップ読み出し可否・マトリクス応答形式を
  実機で再確認（プロトコル仕様ノート `02_notes/keyboard/2026-07-08_vial-raw-hid-protocol-notes.md` 参照）。
  → 2026-09-06 にソース照合で両方「同じ」と確認（バイト配置は実機でも確認済み）。残るのは
  ロック中読み出しの実機確認のみ。
- `rmk-config` `WATCHLIST.md` T-10（テスター更新）: **TIL 側は対応済み**
  （RMK 版 UID・matrix 6×13・customKeycodes を `ui/layouts/olsk60.js` に登録済み。
  2026-09-13 に実装を読んで確認）。実機での判別確認は「実機確認」B の 1 件目。
