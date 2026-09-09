# AGENTS.md

<!-- from ai-agent-playbook@1c982cf (2026-09-06): tools/codex/templates/project-AGENTS.md / tools/claude-code/CLAUDE.md 雛形 / tools/claude-code/rules/github-workflow.md を Codex 主体（Claude Code 併用）の構成で導入 -->
<!-- 確認環境: Claude Code クラウド版（パターンA） / 2026-09-06 時点。Codex Cloud（D）・CLI/WSL2（E）は未確認 -->

## Repository purpose

このリポジトリは **Techmech keys INPUT LAB**（OLSK60 を中心とした
キーボード／ポインティングデバイスの体験テスター。展示キオスク兼練習アプリ）を管理する。
UI は `ui/`（依存なしの HTML/CSS/JS）、Windows キオスクホストは `kiosk/`（C# WinForms + WebView2）。

## Working policy

- 説明・報告は日本語で行う。コード・識別子・コミットメッセージは既存の慣習に合わせる。
- 変更前に目的、影響範囲、作業方針を簡潔に整理する。
- 既存のファイル構成、命名規則、文体、運用ルールを優先する。無関係な変更や大規模な整形を避ける。
- 不明点は `README.md`、`docs/roadmap.md`、既存ファイルを確認してから判断する。
  推測で断定せず、根拠、前提、不明点（`要確認`）を明記する。
- **実機（OLSK60 / 展示 PC）で確かめていないことを「動作確認済み」と書かない**。
  実機確認が要る項目は `docs/roadmap.md` のチェックリストに残す。

## Board / firmware facts（正本は他リポジトリ）

- OLSK60 v2 のハード仕様・キーマップの正本は `qmk-config`（QMK 版）と
  `rmk-config`（RMK 版・現行開発）。**ピン・VID/PID・Vial UID・customKeycodes を
  ここで推測して書かない**。値は正本から移す。
- Vial 連携は **Vial プロトコル標準機能のみ**で実装する（ファーム独自パッチに依存しない）。
  RMK 0.9 系との照合結果は `docs/research/2026-09-06_rmk-0.9-vial-integration-check.md`。
- ガイドツアー（`ui/layouts/olsk60-qmk.tours.js` / `olsk60-rmk.tours.js`）の文言は OLSK60_v2 の公開ドキュメントと
  同期する。ファイル冒頭の docs revision を更新時に確認する。

## External context

必要に応じて以下を参照する（いずれも private。GitHub MCP / `gh` で読む）。

- techmech-keeb/AI-agent-playbook — AI の働かせ方（ルール・skill・テンプレート）
- techmech-keeb/knowledge-base — 技術的事実の正本（Vial Raw HID プロトコルのノート等）
- techmech-keeb/rmk-config — RMK 版 OLSK60 の実装・課題台帳（`WATCHLIST.md`）

外部リポジトリは参照専用とし、このリポジトリの変更・コミット・PR に混ぜない。
外部知見を採用した場合は、参照元と採用理由を報告する。
作業対象リポジトリの現行仕様と外部知見が矛盾する場合は、現行仕様を優先する。

## Required checks

変更内容に応じて以下を実行する。実行できない確認がある場合は、理由を明記する。

- `ui/` を変えたら: `node tools/visual-check.js`（Playwright または `CHROMIUM_PATH`
  が要る。無ければ CI の `visual-check` の Artifact で確認する）
- `kiosk/` を変えたら: `dotnet build kiosk/TechmechInputLab.csproj -c Release`
  （.NET 8 SDK。exe の実行確認は Windows 実機でのみ可能）
- Vial 連携を変えたら: 実機（Vial unlock 済み）でキーマップ表示・マトリクス点灯・
  レイヤー追従を確認する。できなければ「未確認」と報告する。

## Repository-specific restrictions

- `ui/` は外部依存なし・オフライン動作を維持する（CDN・npm 依存を足さない）。
- 日本語 IME に依存する処理は自由入力タブ（`app.js` の該当部）に閉じ込める。
- キオスクの離脱ブロックを弱める変更（`KeyboardHook.cs` / `KioskForm.cs`）は
  理由を PR 本文に書く。
- 顧客名・問い合わせ原文・未公開の製品仕様を書かない。

## Git

- ブランチ運用・PR・並行作業の衝突回避は `.claude/rules/github-workflow.md` に従う
  （Codex でも同じ内容を適用する）。
- 明示的に依頼されない限り PR を作らない。バージョンは git タグ `vX.Y.Z` が単一のソース
  （`README.md`「バージョン管理とリリース」）。

## Reporting

最終報告では日本語で以下をまとめる。

- 変更内容と変更ファイル
- 実行した確認（コマンドと結果。実機未確認は明記）
- 未確認事項
- knowledge-base / AI-agent-playbook へ反映すべき知見
