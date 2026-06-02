# End-of-day wrap: 2026-06-02

## Current state

The local V1 CLI is implemented and passing tests:

- `mdac scan <path>`
- `mdac run <path> --once`
- `mdac watch <path> --interval <seconds>`
- custom triggers, human labels, debug diagnostics, single-file targets, and package allowlist

`markdown-agent-comments@0.0.1` is published on npm as a placeholder to secure the package name. The real CLI release should use `0.1.0`.

## Important decisions

- V1 prompt should preserve the old `atag` behavior contract; V1.5 can shrink it only with prompt-regression tests protecting behavior.
- Protocol constants live in `src/protocol.js`, but prompt prose stays inline in `src/cli.js`.
- No legacy `#agent`, `#silent`, `[!NOTE]+`, or `<!--atag:eot-->` in forward V1 behavior.
- GitHub Actions publish workflow is committed, but npm trusted publishing still needs external setup.

## Verification

- `bun run test` passes: 20 tests.
- Scratch smoke and read-only Obsidian scan were completed earlier.
- Latest code review fix addressed shared protocol constants and human-label normalization.

## Good place to resume tomorrow

Start on `main` in `/Users/smcllns/Projects/markdown-agent-comments`.

Recommended next sequence:

1. Configure GitHub environment `npm` and npm trusted publishing for `smcllns/markdown-agent-comments` / `publish.yml` / environment `npm`.
2. Do one last CLI polish pass before `0.1.0`: focus on `--agent-command` semantics, README install wording, and whether `watch` should print quieter status by default.
3. Bump `package.json` from `0.1.0` only if needed, or publish current `0.1.0` once the final CLI changes are in.
4. Push to GitHub and verify CI/publish behavior.

Useful files:

- `.agents/plans/2026-06-02-mdac-v1-cli.md`
- `.agents/plans/2026-06-02-npm-publish-workflow.md`
- `docs/handoffs/2026-06-02-v1-agent-prompt.md`
- `docs/handoffs/2026-06-02-protocol-constants-review.md`
- `docs/handoffs/2026-06-02-npm-publish-workflow.md`
