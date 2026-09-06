---
paths:
  - "**"
---
<!-- playbook-meta: status=active; derived_from=tools/claude-code/rules/github-workflow.md; last_verified=2026-09-06 -->

# GitHub workflow rule

- Develop on a feature branch; never push directly to the default branch
  without explicit permission.
- Name the branch after the task, not vaguely (`til-rmk-uid-profile`,
  not `policies` や `fixes`). When one logical change spans multiple repos,
  the same branch name may be shared across them on purpose — say so in each
  PR body so reviewers know they are one unit.
- Commit only when asked; keep commits small and reviewable
  (1ノウハウ = 1コミット).
- When a change is split across several commits, verify **each commit**, not
  just the branch tip: extract every commit and build/test it before
  submitting. A commit that removes something a *later* commit stops using
  still has to compile on its own, otherwise reviewers cannot read the commits
  separately and `git bisect` breaks. Full rule: ai-agent-playbook
  `common/verification-policy.md`「コード変更」.
- Scope each PR to one reviewable theme; do not bundle unrelated concerns
  (例: 導入 + doc 修正 + 実装修正) into one PR just because they share a
  branch or session. When the branch name is fixed (harness-mandated), still
  split by theme — after each merge, recut the same-named branch from the
  latest default branch for the next change, rather than growing one
  long-lived branch that mixes concerns.
- Do not open a pull request unless explicitly requested.
- When opening a pull request, follow the repository's PR template if one
  exists (`.github/PULL_REQUEST_TEMPLATE.md`). Otherwise structure the body
  as 概要 / 変更内容 / 検証, and state verification results honestly
  (commands run and their outcomes, not assumptions).
- Once a pull request is merged, do not push further commits to it; start
  follow-up work on a branch cut from the latest default branch.
- Before pushing follow-up commits to a branch whose PR is already open,
  re-check the PR state, in this order: (1) ask GitHub directly
  (`gh pr view` or GitHub MCP); (2) only if the repository auto-deletes
  merged head branches, treat an absent remote branch
  (`git ls-remote --heads origin <branch>` returns nothing) as merged —
  a branch that still exists proves nothing; (3) if the state cannot be
  determined, do not reuse the branch: continue on a fresh branch cut from
  the latest default branch and open a new PR (safe whether the old PR is
  open or merged).
- Write commit messages as "what and why", concise and in the imperative.
- For CI failures, diagnose from logs before pushing a fix; report what failed.
- **Contributing to a repository the user does not own** (OSS upstream, a fork
  of someone else's project): set the commit **author to the human** before
  committing. Whether to also record the AI with a `Co-Authored-By:` trailer
  depends on the target project: **add it when that project asks contributors to
  disclose AI use, and omit it when the project says nothing** — check
  `CONTRIBUTING.md`, the PR template, the code of conduct and the README's
  contributing section before deciding, and ask the human when it is unclear.
  The author is the human either way. The PR being
  opened under the user's account is not enough — Contributors and the
  contribution graph are judged by the commit author, so an AI-authored commit
  credits the AI even when the human opened the PR. Check `git config
  user.email` in that working tree first, set it per-repository (not globally),
  and re-set it whenever the fork is re-cloned. **After a merge the author can
  no longer be changed**, so verify before pushing. Also read the message and
  PR body for tool-injected trailers or footers (session URLs, generator
  notices) that do not belong in someone else's repository. Full rule:
  ai-agent-playbook `common/external-contribution-attribution.md`.
  This does not apply to the user's own repositories.

## Parallel work (avoid colliding with other sessions)

Multiple sessions may work the same repositories at once. The default branch
can move under you mid-task. To avoid silently clobbering or duplicating
another session's work:

- **Before starting** on a file or doc, check for open PRs / recently merged
  PRs that touch the same files (`gh pr list` or GitHub MCP `list_pull_requests`
  / `search_pull_requests`). If another session is already moving the same
  content, coordinate or pick a different slice instead of racing it.
- **Before merging**, re-sync onto the latest default branch and resolve
  conflicts. If the conflict is a **generated file** (tag index, lockfile),
  regenerate it from source rather than hand-merging. If two sessions changed
  the **same content two different ways**, integrate both — never discard one
  side to make the merge pass.
- After a force-with-lease rebase, verify the remote tip is still your own
  commit (the lease target) before pushing, so you don't overwrite a push
  that landed in between.
