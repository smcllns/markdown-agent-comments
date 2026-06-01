# Source Inventory

Status: COMPLETE

## Task

Find and rank historic project material for Markdown Agent Comments / mdac under `/Users/smcllns/Projects`.

## Findings

Use the current `markdown-agent-comments` / `mdac` direction as the forward frame. Older `atag`, `md-asks`, and `markdown-agent-directives` names are history, not defaults.

| # | Source path | Category | Why it matters | Action |
|---:|---|---|---|---|
| 1 | `/Users/smcllns/Projects/dotfiles/agents/skills/atag/SKILL.md` | spec | Richest current `@agent` protocol: EOT seal, human labels, unresolved rules, poller trust boundary. | copied to archive |
| 2 | `/Users/smcllns/Projects/dotfiles/agents/skills/atag/scripts/atag-poll.sh` | CLI | Only concrete local CLI-ish implementation: cheap scan, mtime sort, triggers, labels, timeout, Claude launch. | copied to archive |
| 3 | `/Users/smcllns/Projects/dotfiles/agents/skills/atag/reference/markdown-agent-tags.spec.md` | tests | Best fixture catalog for match/nomatch, active/DONE threads, placeholders, false positives. | copied to archive |
| 4 | `/Users/smcllns/Projects/dotfiles/agents/skills/atag/reference/atag-poll.test.ts` | tests | Poller tests cover no-op, parked threads, human replies, and name collision handling. | copied to archive |
| 5 | `/Users/smcllns/Projects/dotfiles/agents/skills/markdown-agent-directives/reference/directives-spec.md` | spec | Best legacy `#agent` contract; useful evidence for compatibility decisions. | copied to archive |
| 6 | `/Users/smcllns/Projects/obsidian/2 projects/obsidian-comments/tests/RESULTS.md` | tests | V1 vs V2 benchmark showing callouts and `[!DONE]-` improved behavior. | copied to archive |
| 7 | `/Users/smcllns/Projects/obsidian/2 projects/obsidian-comments/token-audit-2026-05-26.md` | ops | Evidence that no-op scheduled agent runs are expensive. | copied to archive |
| 8 | `/Users/smcllns/Projects/obsidian/2 projects/obsidian-comments/Agent Tags Workstream 1-Pager.md` | roadmap | Captures earlier `check`/`sweep` CLI roadmap and cleanup caveats. | copied to archive |
| 9 | `/Users/smcllns/Projects/skills/docs/naming/atag.md` | naming | Register-style naming policy; values are stale but structure maps well. | copied to archive |
| 10 | `/Users/smcllns/Projects/memos/md-asks/md-asks.memo.md` | marketing | Clearest compact user story. | copied to archive |

## Duplicate Or Stale Surfaces

- `skills/skills/atag` and plugin copies differ from `dotfiles/agents/skills/atag`; the dotfiles copy has newer poller and human-label rules.
- `dotfiles/skills/atag` duplicates `dotfiles/agents/skills/atag`; archive only one.
- `dotfiles/agents/skills/markdown-agent-comments/SKILL.md` is useful provenance for the repo name, but its `> @human:` and `#agent` protocol is not the current V1 direction.
- `obsidian/_agents/reports/*md-asks*.md` are repetitive scheduled scan reports; summarize the false-positive patterns instead of copying all.
- `atag-landing/*` is useful visual history for `mdac.dev`, but has stale names and install commands.

## Gaps

- No real `mdac` CLI/package implementation was found; only the shell poller lineage.
- `skills/skills/md-asks` is not present in the current `skills` checkout despite older docs referencing it.
- No actual `mdac.dev` content exists yet.
