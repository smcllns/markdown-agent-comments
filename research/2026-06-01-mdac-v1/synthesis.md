# mdac V1 Research Synthesis

Status: COMPLETE

## Summary

The historic work has one clear through-line: centralize behavior in a CLI, then make skills/plugins wrap the CLI instead of reimplementing scan rules.

## Recommendations

1. Make `docs/PRD.md` the forward source of truth.
2. Keep historic material in `docs/archive`, clearly marked as provenance.
3. Ship V1 as `@agent` comments only.
4. Use package `markdown-agent-comments` and binary `mdac`.
5. Start with `scan`, `run --once`, and foreground `watch`.
6. Defer `#agent`, `#silent`, scheduled runs, plugins, and desktop work.

## Evidence

- The dotfiles `atag` copy has the strongest protocol and poller behavior.
- The old Obsidian benchmark showed callout containment and `[!DONE]-` closure improved behavior materially.
- The token audit showed no-op scheduled agent runs are expensive; cheap pre-scan should be non-negotiable.
- The npm registry check makes `mdac` a good binary name but a bad unscoped package name.

## Current Artifacts

- `docs/PRD.md`
- `docs/archive/README.md`
- `docs/archive/prior-art/`
- `research/2026-06-01-mdac-v1/*.md`
