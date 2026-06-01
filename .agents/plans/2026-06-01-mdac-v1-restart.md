# mdac V1 restart plan

Status: ready for Sam review

Goal: restart Markdown Agent Comments in the fresh `smcllns/markdown-agent-comments` repo with curated forward docs and archived historic context.

## Tasks

- [x] Clone fresh repo.
- [x] Identify major prior-art locations under `~/Projects`.
- [x] Run parallel research on source inventory, CLI/spec, roadmap/docs, and naming/web.
- [x] Synthesize research into a concise PRD with embedded roadmap.
- [x] Archive best historic work without making it the forward source of truth.
- [ ] Finish Sam PRD review before implementation.

## Implementation Notes

Move tactical implementation detail here instead of bloating `docs/PRD.md`.

Initial fixture/test porting candidates:

- archived scanner fixture catalog from prior `atag` work
- poller behavior tests for quiet no-op, debug output, custom triggers, parked threads, human-label collision handling, timeouts, and agent failure propagation
- selected Obsidian benchmark cases that prove callout containment and `[!DONE]-` closure

Current implementation recommendation: write portable TypeScript/JavaScript for the CLI, use Bun for local dev/test/package scripts, and avoid Bun-only runtime APIs. The source can be the same either way; the distinction is whether the published CLI requires users to have Bun installed or runs under standard Node after install.

## Scope

- V1 focus: ship a CLI Sam can use locally.
- Later: marketing page on `mdac.dev`, coding-agent plugins, possible desktop app.
- Do not start CLI implementation until the PRD/roadmap is reviewed.
- Keep forward docs curated and human-owned; historic docs can be broad but clearly separated.

## Review Decisions

- No PRD/product questions remain from the 2026-06-01 review.
- Implementation confirmation: public CLI should probably be Node-compatible at runtime while using Bun for local dev/tests.
