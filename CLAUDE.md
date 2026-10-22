@AGENTS.md

<!-- from ai-agent-playbook@72f3d44 (2026-10-22): OPERATIONS.md パターン D（`@AGENTS.md` を import する薄い CLAUDE.md）に作り直した。初回導入は ai-agent-playbook@1c982cf (2026-09-06): tools/claude-code/CLAUDE.md 雛形 / .claude/rules/github-workflow.md -->
<!-- 確認環境: Claude Code クラウド版（パターンA）/ 2026-10-22 時点。CLI/WSL2（E）・アプリ版（B）は未確認 -->

# CLAUDE.md

ルールの正本は上で import した `AGENTS.md`（Codex と共用）。文章で「読め」と書くだけでは
Claude Code は `AGENTS.md` を読まないため、1 行目の import で取り込んでいる
（code.claude.com/docs/en/memory、2026-10-22 確認）。ここには Claude Code 固有の注意だけを置く。

- Git 運用は `.claude/rules/github-workflow.md`（Claude Code が起動時に読む。Codex には `AGENTS.md`「Git」で同じ内容を指している）。

## Compaction

- コンパクション時は、変更したファイルの完全なリストと確認コマンド
  （`node tools/visual-check.js` / `dotnet build ...`）を必ず保持すること。
