# Techmech keys INPUT LAB — 残課題・プラン（進捗・引き継ぎ）

最終更新: 2026-09-13（JST）

このファイルは、**まだ終わっていないこと**だけを持つ。作業を再開するときは
まずここを見る。実装済みの経緯は
[`archive/implementation-log.md`](archive/implementation-log.md)（凍結）。

docs/ 全体の目次は [`INDEX.md`](INDEX.md)。

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
- [ ] **テーマ切替**（WebView2 でレトロ液晶テーマが意図どおり描画されるか）
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

### 2. 例文コンテンツの構成（増量は完了・残りは未着手）

`ui/layout.js` の `PRACTICE_PHRASES` は PR #9 で 10 文から増量済みで、
**現在 34 文**（2026-09-13 に実ファイルで確認）。残っているのは見せ方の工夫。
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
