# AGENTS.md

## Git And Release Workflow

- Never push directly to `main`.
- Always work on a branch and open a PR before merging code, docs, config, version bumps, or release fixes.
- Before Sam approves a PR, get adversarial cross-agent review:
  - If Claude authored the change, ask Codex to review it.
  - If Codex authored the change, ask Claude to review it.
- The reviewer should look for real blockers: broken behavior, missing tests, stale docs, release risks, security issues, and scope creep. Do not use review as a rubber stamp.
- The author requests the review, and the reviewer posts findings as a PR comment before Sam approves.
- Sam approves and merges all PRs. Agents never merge PRs: not their own, not each other's.
- The only allowed npm publish path is the gated GitHub Actions workflow. Agents must never run `npm publish`, `bun publish`, or any local version-bump-and-publish flow.
- Only Sam approves the GitHub `npm` environment publish gate, and only after the merged PR has passed CI and Sam has approved the release.
