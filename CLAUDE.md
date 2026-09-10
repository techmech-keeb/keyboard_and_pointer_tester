<!-- from ai-agent-playbook@1c982cf (2026-09-06): tools/claude-code/CLAUDE.md 雛形（薄いポインタ構成）/ .claude/rules/github-workflow.md -->
<!-- 確認環境: Claude Code クラウド版（パターンA） / 2026-09-06 時点。CLI/WSL2（E）・アプリ版（B）は未確認 -->

# CLAUDE.md

ルールの正本は [`AGENTS.md`](AGENTS.md)（Codex と共用）。ここには重大な gotcha だけを置く。

- 日本語で回答する。
- **実機（OLSK60 / 展示 PC）で確かめていないことを「動作確認済み」と書かない。**
- Vial UID・VID/PID・matrix 次元・customKeycodes は `qmk-config` / `rmk-config` の
  正本から移す。推測で埋めない。
- **TIL 起動中は Vial が繋がらない**（TIL が 30Hz でポーリングしている入力レポートが
  Vial 側の未初期化グローバル参照を踏む。Vial のバグでファームは無関係）。一方を
  終了してから開く。詳細は `README.md`「同時起動できない: TIL と Vial」。
- `ui/` はオフライン動作・外部依存なしを維持する。
- Git 運用は `.claude/rules/github-workflow.md`。PR は依頼されたときだけ作る。

## Compaction

- コンパクション時は、変更したファイルの完全なリストと確認コマンド
  （`node tools/visual-check.js` / `dotnet build ...`）を必ず保持すること。
