# docs/ の目次

更新: 2026-09-13（JST）。どこに何があるか。置き場の使い分けは
[`../AGENTS.md`](../AGENTS.md)「Docs」。

## 使う人から引く

| 知りたいこと | 見る場所 |
|---|---|
| 展示機の起動・終了、キーブロックの限界、Vial との同時起動 | [`guide/exhibition.md`](guide/exhibition.md) |
| 画面に何が出て何を測っているか | [`guide/features.md`](guide/features.md) |
| ビルド、CI、リリースの出し方、リポジトリ構成 | [`development.md`](development.md) |
| いま何が残っているか、実機で何を確かめるか | [`roadmap.md`](roadmap.md) |

## 置き場

| 置き場 | 中身 | 鮮度の扱い |
|---|---|---|
| [`guide/`](guide/) | 使う人・展示する人向けの説明 | 実装に合わせて更新する |
| [`design/`](design/) | 仕様・設計の正本。[キーボード表示](design/keyboard-layout-display.md) / [Vial 連携](design/vial-integration.md) / [展示画面と SCROLL LAB](design/scroll-lab-stage.md) / [テーマ追加の実装依頼](design/theme-addition-implementation-request.md) | 実装に合わせて更新する |
| [`research/`](research/) | 調査記録（出典つき）。[RMK 0.9 接続経路の点検](research/2026-09-06_rmk-0.9-vial-integration-check.md) / [複数デバイス選択](research/vial-multi-device-selection.md) | **調査時点で凍結**。結論は design へ反映する |
| [`roadmap.md`](roadmap.md) | 残課題・実機確認チェックリスト・今後のプラン | 随時更新 |
| [`archive/`](archive/README.md) | 役割を終えた凍結文書 | **凍結**（追記しない） |

## 決まりごと

- 実装が仕様と食い違ったら、**同じ作業の中で**該当ドキュメントも直す。
- 実機で確かめていないことを「動作確認済み」と書かない。未確認は `要確認` を付け、
  確認が要る項目は `roadmap.md` のチェックリストに残す。
- 役割を終えた文書は削除せず `archive/` へ移す（手順は [`archive/README.md`](archive/README.md)）。
