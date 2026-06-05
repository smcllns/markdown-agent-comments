# End-of-day wrap: 2026-06-02

## Current state

The local V1 CLI is implemented and passing tests:

- `mdac scan <path>`
- `mdac run <path> --once`
- `mdac watch <path> --interval <seconds>`
- custom triggers, human labels, debug diagnostics, single-file targets, and package allowlist

`markdown-agent-comments@0.1.1` is published on npm with the V1 CLI.

## Important decisions

- V1 prompt should preserve the old `atag` behavior contract; V1.5 can shrink it only with prompt-regression tests protecting behavior.
- Scanner-owned protocol constants stay in `skill/markdown-agent-comments/scripts/scanner.js`; prompt prose stays in the canonical skill plus CLI preprompt.
- No legacy `#agent`, `#silent`, `[!NOTE]+`, or `<!--atag:eot-->` in forward V1 behavior.
- GitHub Actions publish workflow uses npm trusted publishing and requires maintainer approval through the GitHub `npm` environment.

## Verification

- `bun run test` passes: 25 tests.
- `bun run test:review` passes. The former generated human-review output has since been replaced by committed demo and eval fixtures under `skill/markdown-agent-comments/test/fixtures/`.
- Published `0.1.1` tarball smoke passed for `--help`, package contents, `scan`, and `run --once` with a stub agent.
- Scratch smoke and read-only Obsidian scan were completed earlier.
- Latest code review fix addressed shared scanner constants and human-label normalization.

## Good place to resume tomorrow

Start on `main` in `<local-projects>/markdown-agent-comments`.

Recommended next sequence:

1. Review the V1 demo and eval fixtures under `skill/markdown-agent-comments/test/fixtures/`.
2. Run `mdac` as the main CLI against the maintainer's Obsidian workflow for a day.
3. Patch any dogfooding issues that block daily use.
4. Publish a quick V1 `mdac.dev` page for the terminal solution.
5. Add thin coding-agent plugin packaging after the terminal path feels reliable.

Useful files:

- `docs/PRD.md`
- `README.md`
- `docs/handoffs/2026-06-02-v1-agent-prompt.md`
- `docs/handoffs/2026-06-02-protocol-constants-review.md`
- `docs/handoffs/2026-06-02-npm-publish-workflow.md`
