# mdac V1 restart handoff

## Current direction

Sam is restarting the project in this fresh repo. Current naming preference:

- Repo/code/spec docs: `markdown-agent-comments`
- CLI: `mdac`
- Natural description: `@agent comments in markdown`
- Website: `mdac.dev`

The important product constraint is that forward-looking docs should be concise, curated, and something Sam feels ownership of. Historic work can be archived broadly, but it should not become the source of truth by accident.

## Current artifacts

- Forward source of truth: `docs/PRD.md`
- Archive index: `docs/archive/README.md`
- Copied prior art: `docs/archive/prior-art/`
- Research notes: `research/2026-06-01-mdac-v1/`
- Plan: `.agents/plans/2026-06-01-mdac-v1-restart.md`

## Decisions encoded in the approved PRD

- V1 focuses on `@agent` comments only.
- Legacy `#agent` directives are archived, not part of the default V1 scanner/resolver.
- Package should be long and binary short: publish package `markdown-agent-comments`, CLI `mdac`.
- Reserve scoped package names if convenient during publish.
- Use `<!--mdac:eot-->` as the protocol seal.
- Active threads use `[!NOTE]`, not `[!NOTE]+`, so they render as callouts in GitHub.
- `[!DONE]-` resolved threads intentionally do not render as GitHub callouts; manual cleanup or future sweep moves them out of the reading flow.
- Start with a cheap read-only `mdac scan` before any agent invocation.

## Known prior-art locations

- `/Users/smcllns/Projects/skills/skills/atag`
- `/Users/smcllns/Projects/skills/docs/naming/atag.md`
- `/Users/smcllns/Projects/skills/docs/handoffs/atag-naming-plan-2026-05-26.md`
- `/Users/smcllns/Projects/skills/.agents/plans/*atag*.md`
- `/Users/smcllns/Projects/obsidian/2 projects/obsidian-comments`
- `/Users/smcllns/Projects/obsidian/_agents/reports/*md-asks*.md`
- `/Users/smcllns/Projects/atag-landing`
- `/Users/smcllns/Projects/atag-hero-options`
- `/Users/smcllns/Projects/memos/md-asks/md-asks.memo.md`

## Review Decisions

- No PRD/product decisions remain from the 2026-06-01 review.
- Implementation confirmation: public CLI should probably be Node-compatible at runtime while using Bun for local dev/tests.
