# 展示画面・SCROLL LAB 外観レビュー記録（2026-09）

- Status: 凍結（2026-09-13）。**追記しない。** 現在の仕様は
  [`../design/scroll-lab-stage.md`](../design/scroll-lab-stage.md)、残る実機確認は
  [`../roadmap.md`](../roadmap.md)。
- 元: `docs/design/scroll-lab-stage.md` の試作・レビュー段階の記述。実装は main に
  マージ済みで、2026-09-09（JST）に Windows 側で新 UI の起動・表示をユーザーが
  確認した（使用した Artifact/run の対応付けは `要確認`）。
- 画像はこのディレクトリの [`scroll-lab-images/`](scroll-lab-images/) に移した
  （代表 3 枚だけ `docs/design/scroll-lab-images/` に残している）。

## 基点と戻り先

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
| 1368×912 | [先頭](../design/scroll-lab-images/1368x912-default-start.png) | [先頭](../design/scroll-lab-images/1368x912-lcd-start.png) |
| 2560×1440 | [先頭](../design/scroll-lab-images/2560x1440-default-start.png) | [先頭](scroll-lab-images/2560x1440-lcd-start.png) |
| 1024×768 | [先頭](scroll-lab-images/1024x768-default-start.png) | [先頭](scroll-lab-images/1024x768-lcd-start.png) |
| 精密入力のfixture | [1368×912](scroll-lab-images/1368x912-default-precision-fixture.png) | — |
| 中間・終端 | [中間](scroll-lab-images/1368x912-default-middle.png) | [終端](scroll-lab-images/1368x912-lcd-end.png) |
| 打鍵中のfixture | — | [1368×912](scroll-lab-images/1368x912-lcd-key-down.png) |

[変更前の1368×912](scroll-lab-images/before-1368x912.png) とも比較できる。
全状態は `tools/visual-check.js` で再撮影でき、CIではArtifactに保存する（撮影枚数は当時 78、2026-09-13 時点で 90）。

継続点検で [1024×768の長い練習文](scroll-lab-images/1024x768-default-long-phrase.png) と
[ガイド表示fixture・スタンダード](scroll-lab-images/1024x768-default-guide-fixture.png)、
[ガイド表示fixture・LCD](scroll-lab-images/1024x768-lcd-guide-fixture.png) を追加した。
ガイドのキーマップはテスト用応答（AとMO(2)）であり、OLSK60の実キーマップを示す画像ではない。

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

## 実装の分割方針

スクロール演算、長文面、全体レイアウト、既存入力との統合は相互に依存するため、外観レビュー可能な単一PRにまとめる。
追加作業が必要な場合は、以下の単位で後続PRを分ける。

1. 展示実機での確認結果と、そこで必要と分かった入力処理・外観の修正。
2. 実機レビューで確定した基準画像と運用手順の反映。
3. 横スクロールやPlatyxプロファイルなど、今回の縦スクロール体験と独立した機能。
