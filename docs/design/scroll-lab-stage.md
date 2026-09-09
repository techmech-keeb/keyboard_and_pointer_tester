# キーボード中心の展示画面と SCROLL LAB

更新: 2026-09-09（JST）。外観レビュー用の実装。Windows側で新UIの起動・表示は
ユーザー確認済み。ただし確認に使ったArtifact/runは `要確認`。OLSK60の入力特性、
通常マウスとの比較、展示PC構成・WebView2での総合動作は未確認。

## 方針と戻り先

タイピング帯、中央の大きなキーボード、長文スクロール面、下部の計測帯を同時表示する。
長文を読むこと自体より、触っている実機と画面の反応の関係を明確にすることを優先した。
キーボードをタブやモーダルへ隠さず、スクロールも第三の入力モードにはしない。
スタンダードは落ち着いた暗色と赤いTrackPoint、LCDは紙色と黒い輪郭で構成する。

ユーザーは推奨案での実装継続と、スクリーンショットでの確認を指定した。
折り合いがつかない場合は、手戻りを許容して以下の基点から再検討する。
mainへ反映する前にfeatureブランチとPRでレビューし、基点は比較・再検討用に保持する。

- 調査・実装基点: `b92b96287aa59e25a730a2cbbabf73d4559e936c`
- 作業開始時のGitHub確認: mainは上記SHA、open PRは0件
- 作業ブランチ: `feat/keyboard-stage-scroll-lab`
- GitHub上に保持した基点ブランチ: `checkpoint/pre-scroll-lab-b92b962`
- 変更前の別worktree（作業環境内）: `../keyboard-tester-before`

別環境でも、作業中の差分を捨てずに基点を開ける。

```sh
git worktree add --detach ../keyboard-tester-reconsider b92b96287aa59e25a730a2cbbabf73d4559e936c
```

そのworktreeの `ui/index.html` を開いて比較する。新案のCSSだけを外すとHTML構造と整合しないため、
戻す際は基点一式を使用する。新案を残したまま別案を作ることも可能。

## 試作確認履歴

### Windows版で旧UIが表示された事象

2026-09-09（JST）、featureブランチを選んでWindows版をビルドした後も旧UIが表示される
事象をユーザーが確認した。source選択、Actionsのcheckout、publish内容、ダウンロード／展開、
旧プロセス、WebView2 cacheのどの層が単独原因だったかは特定しておらず、推測で一つに
断定しない。

commit `f6c77e6` で、次の再発防止と切り分け手段を追加した。

- PR更新時にも `build-kiosk` を実行し、.NET SDK 8を `global.json` とworkflow内検査で固定。
- source側とpublish後のUI 18ファイルについて、path・件数・SHA-256の一致をActionsで検査。
- Artifact名を `ci-<run number>` とし、branch、commit、run URLを `BUILD-INFO.json` に保存。
- アプリ専用WebView2 profileのdisk cacheを起動時に消去し、`localStorage` の設定は保持。
- READMEに、空フォルダへの展開、旧プロセス終了、アプリ内build表示と
  `BUILD-INFO.json` の照合手順を追加。

[build-kiosk #74](https://github.com/techmech-keeb/keyboard_and_pointer_tester/actions/runs/34243241376)
では、head `f6c77e6c9a4c2484c883ca24d1076940ce31dc2c` から
`TechmechInputLab-win-x64-ci-74` を生成し、UI 18ファイルの一致を確認した。
[visual-check #46](https://github.com/techmech-keeb/keyboard_and_pointer_tester/actions/runs/34243241509)
も成功している。その後、ユーザーはWindows側で新UIが表示されたことを確認した。
ただし、その確認に使ったArtifact/runの対応付け、OLSK60入力、キオスク離脱防止、
OS IME、実機Vialの確認は未実施または `要確認` とする。

### ThinkPad X9との初期比較と試験保留

ユーザーは ThinkPad X9-14 Gen 1（21QBCTO1WW）の高精細オプションの
Precision Touchpad とOLSK60を新しいスクロール面で操作し、次を観察した。

- OLSK60のTrackPointでも、微小移動から大きな移動まで幅広く操作できた。
- X9のPrecision Touchpadは、それより滑らかかつ精緻に微小操作でき、強い操作時の
  ダイナミックな移動も両立していると感じられた。

これは同一条件の計測による結論ではなく、ユーザーの初期的な体感比較である。
通常マウスとの比較、入力値の一時観測、OLSK60のUSB／Bluetooth別比較は、ユーザー判断で
いったん見送った。センサー、firmwareのtransfer、report頻度、Windows Precision Touchpad
stackの寄与率や、firmware変更でどこまで近づけられるかは、現時点では `要確認`。
比較試験を再開するまで、SCROLL LAB側に独自の加速や平滑化を加えて差を覆い隠さない。

## 外観の確認用画像

実ブラウザによる撮影。合成入力による画面は、実機操作の証明ではない。
新しい画像は外観の基準**候補**であり、ユーザーの外観評価を待つ。

| 表示 | スタンダード | LCD |
|---|---|---|
| 1368×912 | [先頭](scroll-lab-images/1368x912-default-start.png) | [先頭](scroll-lab-images/1368x912-lcd-start.png) |
| 2560×1440 | [先頭](scroll-lab-images/2560x1440-default-start.png) | [先頭](scroll-lab-images/2560x1440-lcd-start.png) |
| 1024×768 | [先頭](scroll-lab-images/1024x768-default-start.png) | [先頭](scroll-lab-images/1024x768-lcd-start.png) |
| 精密入力のfixture | [1368×912](scroll-lab-images/1368x912-default-precision-fixture.png) | — |
| 中間・終端 | [中間](scroll-lab-images/1368x912-default-middle.png) | [終端](scroll-lab-images/1368x912-lcd-end.png) |
| 打鍵中のfixture | — | [1368×912](scroll-lab-images/1368x912-lcd-key-down.png) |

[変更前の1368×912](scroll-lab-images/before-1368x912.png) とも比較できる。
全78状態は `tools/visual-check.js` で再撮影でき、CIではArtifactに保存する。

継続点検で [1024×768の長い練習文](scroll-lab-images/1024x768-default-long-phrase.png) と
[ガイド表示fixture・スタンダード](scroll-lab-images/1024x768-default-guide-fixture.png)、
[ガイド表示fixture・LCD](scroll-lab-images/1024x768-lcd-guide-fixture.png) を追加した。
ガイドのキーマップはテスト用応答（AとMO(2)）であり、OLSK60の実キーマップを示す画像ではない。

| CSS viewport | モデルの実測寸法（OLSK60） | 文章の長さ / スクロール領域高 | 構成 |
|---|---:|---:|---|
| 1368×912 | 約861×287 px | 約29.35画面 | 展示基準。キーボードを中心に上下の体験帯を常時表示 |
| 2560×1440 | 約1497×499 px | 約24.20画面 | モデル・本文・見出しを拡大し、単なる余白増加にしない |
| 1024×768 | 約714×238 px | 約26.74画面 | 説明・計測の間隔を縮め、主要体験を同時に残す |

上記はLinux / Chromium 106.0.5249.0 / DPR 1 / 日本語Notoフォントの測定。
Windowsのフォント・表示倍率・WebView2では再測定が必要。少し離れた位置での判読性も要確認。

## 入力と描画

1. documentのcaptureリスナーを `{ passive: false, capture: true }` で登録し、通常の体験画面ではcancelableなwheelを同期的にpreventDefaultする。
2. `deltaMode` を先に読み、pixelはそのまま、lineは本文の計測済み行高、pageはスクロール領域高で縦CSS pxへ換算する。独自の倍率・加速は加えない。
3. 各イベントを到着順に論理位置へ加え、端でクランプする。数値は小数のまま保持し、signed合計・絶対量・適用量・端で制限された量を別に記録する。
4. rAFで最新の論理位置を一度だけscrollTopへ書き、位置、章、進捗、計測帯、フィード、カーソル付近の方向表示を更新する。
5. ブラウザがscrollTopを丸めても、その読み戻しを次の位置計算へ使わない。画面で見える最小移動はブラウザ・DPRに制約されるが、小数の残りは失わない。

単純なフレーム内signed合計だけでは、上端で `-10,+5` が0になってしまう。
到着順クランプでは5へ移動できる。中間では正負が相殺されても、入力量と方向別絶対量は保持する。
端では「入力合計」と「実際の移動」が異なるため、表示でも入力量と位置を区別する。

`wheelDeltaX/Y` またはfallbackの `wheelDelta` は既存の判定・ノッチ換算専用。
120未満（境界の誤差許容あり）の成分を観測したら「高解像度相当の入力を観測」とし、リセットまで保持する。
pixel deltaの小ささだけでは判定せず、判定情報がなければ未判定にする。
機種・入力元・ファームウェア設定・Bluetoothの能力を示す表示ではない。

横入力は既存の入力合計・判定へ反映し、縦の文章は動かさない。
スタッフメニューとツアー選択メニューでは背景の体験を停止してフォーム操作を優先する。
自由入力のフォーカス維持もその間は休止し、閉じたら復帰する。
documentと親へのスクロール連鎖は抑止し、ホストの離脱防止コードには変更を加えていない。

## 性能と既存機能

- wheelごとのDOM追加、classを外してoffsetWidthを読む処理、3本ずつのエフェクト追加を廃止。
- 1フレームあたりの描画と表示更新へ集約。方向表示の量は入力量で制限し、粒子数を増やさない。
- フィードは方向別CSS pxの合計を表示。内部の履歴DOMも30件以内。キーとクリックは従来の経路を維持。
- オートレイヤーは設定をキャッシュし、連続入力では期限を延長する。イベントごとにタイマーを作り直さない。
- 行高・ページ高・章位置のレイアウト参照は起動・resize・テーマ変更時に集約する。
- 長文は最初に一度構築する。仮想化や外部コンテンツ取得は行わない。
- 計測用の一時ログはスタッフが有効にした場合だけメモリへ保持し、最大4096記録のリングバッファに制限する。
- リセットは位置と計測だけでなく、未描画バッチ、方向表示、キーのOSDフラッシュも消去する。

Vial transport・プロトコル・プロファイルの定義は維持している。
画面上のレイヤー追従は従来同様の近似とオートレイヤー表示シミュレーションであり、
ファーム内部の状態を直接取得する機能へ変わったわけではない。

## 変更ファイル

| ファイル | 変更理由 |
|---|---|
| `ui/index.html` | 常時表示の4段構成、スクロール面、スタッフ用の一時観測欄 |
| `ui/stage.css` | レイアウト、情報階層、3サイズへの調整、モデルを覆わない表示 |
| `ui/scroll-input.js` | DOM・ボード非依存の単位換算、小数の位置計算、既存判定 |
| `ui/scroll-content.js` | 自作10章、段落、目標線、番号付き行 |
| `ui/scroll-lab.js` | 入力蓄積、rAF反映、進捗、リセット、寸法再測定、一時ログ |
| `ui/app.js` | 既存入力への統合、量による演出集約、フォーカス、縦横フィット、オートレイヤーの負荷削減 |
| `ui/themes.js`, `ui/themes/lcd.css` | テーマ変更時の再測定、LCDの入力状態と新しい面の可読性 |
| `ui/tours.js` | ガイドの選択・終了後に自由入力をクリックなしで再開できるようフォーカスを復帰 |
| `tools/scroll-input.test.js`, `tools/visual-check.js` | 数値保存・境界・混合入力・レイヤーfixture・新デザインの検証 |
| `.github/workflows/visual-check.yml` | 算術検証、featureブランチとPRの対象化、失敗時も撮影済みArtifactを保存 |
| `README.md`, `docs/roadmap.md`, `docs/design/`, `docs/screenshot.png`, `docs/attract.png` | 現行説明・外観候補・復帰点・実機未確認事項を記録 |

## 実行した自動検証

```sh
node --check ui/app.js
node --check ui/scroll-input.js
node --check ui/scroll-lab.js
node --check ui/scroll-content.js
node --check ui/tours.js
node --test tools/scroll-input.test.js
CHROMIUM_PATH=/path/to/chromium CHROMIUM_DISABLE_GPU=1 node tools/visual-check.js screenshots
git diff --check
```

- Node: 6テスト。小数、方向反転、3種のdeltaMode、端、リセット、標準ノッチと任意軸の判定。
- ブラウザ: 3サイズ×両テーマ。主領域のoverflow・document非スクロール・モデルの枠内表示・自由入力時の表示。
- キーボード／計測帯／タイピング／紙面の4位置で合成wheelとブラウザ経由wheelを投入し、scrollTopとpreventDefaultの効果を確認。
- 10,000回の0.1pxを1000pxとして保持。端での反転、フレーム前リセット、手動と無操作の復帰を確認。
- スクロール中の練習入力、点灯、打鍵数、自由入力、compositionハンドラ、スタッフ入力とのフォーカス共存を確認。
- 合成Vialキーマップの刻印とマトリクス点灯、オートレイヤーの切替／復帰、接続状態で10,000イベント、TrackPointを持たないプロファイルを確認。
- 別途1024×768で16レイヤータブの表示を目視。OSのIME候補ウィンドウ、実機マトリクス、実機スクロール特性の検証とは区別する。
- 継続点検: 全練習文の枠内表示、長い自由入力、クリア直後のリセット／Esc、ガイドメニューとツアー終了後の自由入力復帰を確認。
- 継続点検: 最長の既存ガイド文によるfixtureを両テーマ・全サイズで撮影。1024×768で発見したボタンのはみ出しを、説明とボタンを横並びにして解消。

継続点検で発見した不具合は、①CLEAR演出の表示中にリセット／スキップすると演出が残る、
②ガイド選択をEscで閉じると自由入力のフォーカスが戻らない、③小画面のガイドカードに縦overflowが生じる、の3点。
①②は修正前にブラウザ上で再現し、修正後の自動検証へ組み込んだ。
画面寸法やスクロールの倍率を変えずに、復帰処理とガイド内部の配置を修正した。

新しい外観のピクセルを旧デザインへ一致させるテストは行わない。
スクリーンショットを目視し、文字の判読性、モデルの大きさ、体験面の共存、overflowと入力反応で判定する。
今回のブラウザはLinux上のChromium 106.0.5249.0、GPU無効。最新Chromiumの取得は環境の通信制約で完了せず、
手元で使用できるブラウザで確認した。CIが使用する現行Chromiumと展示WebView2での再確認は要確認。

## 実機確認の手順（未実施）

1. OLSK60、展示PC、ファーム版、USB/Bluetooth等の接続方式、WebView2版、OSのスクロール設定、Windows倍率とCSS viewportを記録する。Bluetoothでのハイレゾは前提にしない。
2. 通常マウスで1ノッチ・連続入力・反転。標準表示か、documentや自由入力が勝手に動かないか確認する。
3. OLSK60で軽く動かし、番号付きの目標線を固定線へ合わせる。強く動かして離れた章へ移動し、反転・端・再開も確認する。動きの速さをアプリ側で補正しない。
4. その間も練習、自由入力、押下中の点灯、打鍵数、Vial実キーマップ／レイヤー、オートレイヤーの復帰を確認する。長時間の高頻度入力では軌跡や打鍵の遅延も見る。
5. ロゴ5連打 → スタッフメニューの「スクロールの一時観測」を開き、開始→メニューを閉じる→操作→再度開く。deltaY / deltaMode / wheelDeltaY、開始後の平均Hz、論理位置と実scrollTop、端で制限された量を読む。
6. 頻度は観測開始後平均なので、開始から操作までの間や休止も含む。比較ごとにクリアし、同じ時間条件で短く測る。ブラウザ開発時は `ScrollLab.records()` でwheel／描画／実scrollイベントの時刻を個別に見られる。観測後は停止・クリアする。ログはメモリのみで、キー文字やネットワーク送信を含まない。
7. 数px刻みで実scrollTopが追うか、少数deltaの反復が累積するかを確認する。OS / WebView2が既に変換したdeltaから生のファーム入力を逆算しない。
8. 両テーマ・全サイズ・少し離れた距離で文字、押下状態、軌跡、スクロールを確認。75秒無操作復帰、切断・再接続、キオスク離脱防止とIME候補も確認する。

長文の移動感、Surfaceでのモデル寸法、LCDの判読性について外観と実機の評価が合わなければ、
上記の戻り先から配置案を再検討する。表示仕様を変える場合は毎回スクリーンショットを更新して提示する。

## 実装の分割方針

スクロール演算、長文面、全体レイアウト、既存入力との統合は相互に依存するため、外観レビュー可能な単一PRにまとめる。
追加作業が必要な場合は、以下の単位で後続PRを分ける。

1. 展示実機での確認結果と、そこで必要と分かった入力処理・外観の修正。
2. 実機レビューで確定した基準画像と運用手順の反映。
3. 横スクロールやPlatyxプロファイルなど、今回の縦スクロール体験と独立した機能。

## 関連リポジトリと正本の分担

TIL固有のUI、試作履歴、体感観察、未完了の受入確認は本書とroadmapに残す。
技術調査、firmware設計、汎用的なAI作業ルールは重複コピーせず、次を正本とする。

- [knowledge-base PR #54](https://github.com/techmech-keeb/knowledge-base/pull/54):
  Precision Touchpadの一次情報、X9の実機証跡、OLSK60との比較材料。
- [rmk-config PR #227](https://github.com/techmech-keeb/rmk-config/pull/227):
  OLSK60の精密域・高速域、USB／Bluetooth共通化を含むfirmware候補設計。
  firmware実装と比較試験は含まない。
- [AI-agent-playbook PR #50](https://github.com/techmech-keeb/AI-agent-playbook/pull/50):
  CI成果物の同一性・来歴確認を、source、package、download／extraction、runtimeの
  各層に分ける共通ルール。

端で方向反転するときの順序付きクランプ、論理小数位置と実 `scrollTop` の分離、
基点SHA・新旧スクリーンショット・合成fixture／実機確認を区別する運用は、
本試作の設計判断として本書にも保持する。
