# mdac V1 restart handoff

## Current direction

The maintainer is restarting the project in this fresh repo. Current naming preference:

- Repo/code/spec docs: `markdown-agent-comments`
- CLI: `mdac`
- Natural description: `@agent comments in markdown`
- Website: `mdac.dev`

The important product constraint is that forward-looking docs should be concise, curated, and something the maintainer feels ownership of. Historic work can be archived broadly, but it should not become the source of truth by accident.

## Current artifacts

- Forward source of truth: `docs/PRD.md`
- Local CLI user guide: `README.md`
- Archive index: `docs/archive/README.md`
- Copied prior art: `docs/archive/prior-art/`
- Implementation handoffs: `docs/handoffs/`

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

- `<local-projects>/skills/skills/atag`
- `<local-projects>/skills/docs/naming/atag.md`
- `<local-projects>/skills/docs/handoffs/atag-naming-plan-2026-05-26.md`
- `<local-projects>/skills/.agents/plans/*atag*.md`
- `<local-projects>/obsidian/2 projects/obsidian-comments`
- `<local-projects>/obsidian/_agents/reports/*md-asks*.md`
- `<local-projects>/atag-landing`
- `<local-projects>/atag-hero-options`
- `<local-projects>/memos/md-asks/md-asks.memo.md`

## Review Decisions

- No PRD/product decisions remain from the 2026-06-01 review.
- Implementation confirmation: public CLI should probably be Node-compatible at runtime while using Bun for local dev/tests.

## V1 CLI implementation status

Implemented:

- `mdac scan <path>`
- `mdac run <path> --once`
- `mdac watch <path> --interval <seconds>`
- `--trigger`, `--name`, `--agent-command`, and `--debug`
- cheap markdown scanner for inline comments, active `[!NOTE]` threads, `[!DONE]-` follow-ups, parked agent replies, custom triggers, and mtime sorting
- package allowlist for a small npm artifact: `package.json`, `LICENSE`, `README.md`, `docs/PRD.md`, and the skill directory

Verification:

- `bun run test` passes.
- Scratch smoke passed for `scan`, `run --once`, and bounded `watch` with a fake agent command.
- Read-only Obsidian scan completed against `<local-projects>/obsidian` and found real actionable files.
- The published `0.1.1` tarball contained the intended files at that time: `package.json`, `LICENSE`, `README.md`, `docs/PRD.md`, and `src/`. Current dogfood work moves runtime code into the skill directory.

V1 publish status:

- `markdown-agent-comments@0.1.1` is published on npm.
- GitHub Actions publish uses npm trusted publishing and waits for the maintainer `npm` environment approval.
