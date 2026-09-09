# 依頼: キーボード表示仕様の残タスク実装

作成: 2026-09-09（JST）。**Codex への実装依頼書**。仕様の正本は
[`keyboard-layout-display.md`](keyboard-layout-display.md)。本書はその §7「現行との差分」を
実装単位に割ったもの。役割を終えたら `docs/archive/` へ移すか、本書に完了を追記する。

## 0. 先に読むもの

| 文書 | 何が書いてあるか |
|---|---|
| `AGENTS.md` | このリポジトリの作業規約。**必読** |
| `docs/design/keyboard-layout-display.md` | 表示仕様（3 層モデル・決定木・決定事項） |
| `docs/research/2026-09-06_rmk-0.9-vial-integration-check.md` §8 | 端末レイアウト反映の設計根拠 |
| `ui/vial-layout.js` | KLE の解釈・layout options の bit 詰め・合成（実装済みの部品） |

## 1. 共通の制約（3 タスクすべてに掛かる）

1. **`ui/` は外部依存なし・オフライン動作を維持する**（CDN・npm を足さない）。
2. **`qmk-config` / `rmk-config` の内容をこの repo へ取り込まない**（submodule 禁止。
   理由は `keyboard-layout-display.md` §8）。
3. **実機で確かめていないことを「動作確認済み」と書かない**（`AGENTS.md`）。
   合成 fixture の成功は実機確認ではない。
4. 製品固有の知識（TrackPoint の位置、ガイドツアー、練習文）を**端末定義から推測しない**。
   定義に無いものは出さない。
5. コミットは小さく、1 タスク = 1 PR。PR は依頼されたときだけ作る。

## 2. タスク A: 未登録の Vial 機を定義だけで描く（仕様 S3）

### 目的

登録済みプロファイルに一致しない Vial 機を繋いだとき、いまは直前のプロファイルの絵が
残り、刻印だけが matrix 一致で塗られて意味不明になる。その機の定義どおりに描く。

### 変更対象

`ui/app.js`（`vialOnConnected` / `applyDeviceLayout` 周辺）、必要なら `ui/vial-layout.js`。

### 受け入れ条件

- 未登録機を繋ぐと、**その機の `vial.json` の KLE と保存 layout options** でキーが描かれる
- **TrackPoint を描かない**。ガイドツアーのボタンを出さない。練習文は汎用のまま
- ボード名は定義の `name`
- 刻印は接続後にキーマップから埋まる（プロファイルの刻印表が無いので接続前は空でよい）
- **切断すると元の既定ボードの絵に戻る**
- 既存の登録機（OLSK60 の 2 プロファイル）の挙動が変わらない

### やらないこと

- 未登録機向けのツアー・練習文・TP の推測
- `KeyboardEvent.code` による点灯（matrix ↔ code の対応が無いため実現できない）

## 3. タスク B: 定義を取れない未登録機を汎用テンプレートへ落とす（仕様 S7）

**完了（2026-09-09）**: 選択中の既定ボードへフォールバックし、利用者向けの
キーボードキャプションに定義を取得できなかった理由を表示する。合成 fixture で確認し、
WebHID 実機は未確認。

### 目的

ブラウザ / WebHID 経路は XZ 展開を持たないため `vial.json` を取れない。未登録機では
描く材料がゼロになる。この場合に無理をせず汎用テンプレートへ落とし、理由を示す。

### 変更対象

`ui/app.js`。

### 受け入れ条件

- 未登録 ＋ 定義を取れない場合、**汎用テンプレート**（既定ボードの選択に従う）で描く
- 画面に理由が出る（例: 「この機の定義を取得できないため汎用表示です」）。
  スタッフ画面だけでなく、利用者に分かる場所でよいかは実装時に判断し、PR で説明する
- 登録機は従来どおり（プロファイルの KLE 写しで描く）

## 4. タスク C: プロファイルの座標を同梱 KLE から導く（仕様 §7）

### 目的

`ui/layouts/olsk60.js` は、キーの座標・寸法・matrix 座標を**手書き `keys` と同梱 KLE の
両方**に持っている。`vial.json` を更新したとき 2 か所直す必要があり、ずれる余地がある。

### 変更対象

`ui/layouts/olsk60.js`、`ui/app.js`（未接続時の描画経路）。

### 受け入れ条件

- プロファイルに `defaultLayoutOptions: 2`（3-Split・エンコーダ無し）を持たせ、
  **未接続時はそれを使って同梱 KLE から座標・寸法・matrix 座標を導く**
- 手書き `keys` からは座標・寸法・matrix 座標を落とし、
  **matrix 座標 → 刻印（`label` / `shift`）・`KeyboardEvent.code`・修飾（`layer` / `win` /
  `homing` / `id`）の対応表**だけを残す
- **見た目が変わらない**こと。`node tools/visual-check.js` の 78 枚が、変更前後で
  レイアウト検査に通り、キーの位置と寸法が一致する（`defaultLayoutOptions: 2` は
  現行の手書きと同一構成のため）
- 汎用テンプレート（`generic-ansi60.js` / `generic-fullsize.js`）は KLE を持たないので
  **手書き `keys` のまま**。「KLE があればそれを使い、無ければ `keys` を使う」の二本立てにする
- `node tools/check-board-sources.js` が引き続き全項目一致を返す

### 補足

見た目を変えない整理なので、退行を見つけやすい。タスク A・B より先に入れると、
接続時と未接続時で描画経路が 1 本になり、後続が読みやすくなる。**推奨順は C → A → B**。

## 5. 検証（各タスク共通・PR に結果を書く）

```bash
node --check ui/app.js
node --test tools/scroll-input.test.js
node --test tools/boards.test.js
node --test tools/vial-layout.test.js
node tools/visual-check.js          # playwright か CHROMIUM_PATH が要る
node tools/check-board-sources.js   # 正本が手元にある場合のみ
```

- 新しい挙動には**回帰テストを足す**。`tools/vial-layout.test.js`（ホスト単体）または
  `tools/visual-check.js` の fixture（描画・状態遷移）のどちらが適切かを選ぶ
- 実機確認が必要な項目は「未確認」と明記する。エンコーダ付き個体と QMK 版 2.0.x は
  対象個体が無く、現時点では確認できない

## 6. 完了の記録

- 各タスクを終えたら `keyboard-layout-display.md` §5 の「現状」欄と §7 の表を更新する
- 実機確認が要る項目は §9「未確認・保留」へ移す
