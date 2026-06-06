# AGENTS.md

## Start Here

- Product/spec source: `docs/PRD.md`
- Naming rules: `docs/naming.md`
- Layout decision: `docs/adrs/0001-layout-ownership.md`
- Core testing guide: `skill/markdown-agent-comments/test/README.md`
- Skill eval guide: `skill/markdown-agent-comments/eval/README.md`
- Eval strategy: `docs/eval-testing-plan.md`
- Historical context only: `docs/archive/README.md`

Use current naming from `docs/naming.md` in all forward-looking docs and code. In particular, call the user-facing construct an `@agent` comment or comment, not an ask, tag, or directive.

## Architecture

- `skill/markdown-agent-comments/SKILL.md` is the canonical agent behavior contract.
- `skill/markdown-agent-comments/scripts/scanner.js` is the deterministic scanner.
- `skill/markdown-agent-comments/test/` contains deterministic core tests and scanner fixtures.
- `skill/markdown-agent-comments/eval/` contains skill-owned model/agent evals.
- `mdac` is the CLI adapter over the skill and scanner; its code and tests live under `cli/`.
- `demo/` contains the human-facing product demo and generated demo runs.
- Future wrappers should live under adapter-owned directories such as `desktop/` or `plugins/`.
- Generated `runs/` directories are ignored and must not be committed.

## Reviewer Checklist

- Check behavior, stale docs, missing tests, release/package risks, and scope creep.
- For test/eval changes, check that executor prompts do not leak expected answers or restate the skill behavior being evaluated.
- Check package dry-run output when files move or new generated paths appear.
- Treat `docs/adrs/0001-layout-ownership.md` as the layout source of truth, `docs/eval-testing-plan.md` as strategy, and local README files as practical how-to docs.

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
