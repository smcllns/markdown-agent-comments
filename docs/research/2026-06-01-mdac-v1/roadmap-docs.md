# Roadmap and Docs

Status: COMPLETE

## Task

Collapse historic roadmap, marketing, and docs work into a sequential path: CLI, website, coding-agent plugins, possible desktop app.

## Findings

## Best Existing Roadmap Ideas

- Make `mdac` the canonical engine. The CLI should own scan/archive rules; skills and plugins should wrap it.
- Keep the protocol tiny: `[!NOTE]+`, `[!DONE]-`, and an end-of-turn seal.
- Preserve the original ask/comment verbatim.
- Build scan behavior from the real false-positive corpus.
- Treat scheduled/background runs as later optimization. V1 should start with cheap local scans.
- Keep companion CSS or Obsidian polish outside the core protocol.

## Sequential Roadmap

1. CLI first: `scan`, `run`, foreground `watch`, fixture-driven tests.
2. Cleanup/archive: safe `sweep` if resolved threads still clutter docs.
3. `mdac.dev`: one polished page with a live before/after demo, install docs, spec link, and GitHub link.
4. Coding-agent plugins: thin Claude/Codex/etc. wrappers that call `mdac`.
5. Desktop wrapper: tray/watcher/open-thread UI after CLI stability.

## PRD Should Contain

- product thesis
- user workflows
- naming and vocabulary
- protocol contract
- CLI V1 scope
- test/spec fixture strategy
- sequential roadmap
- non-goals
- open questions

## Archive Should Contain

- raw `atag`, `md-asks`, `markdown-agent-directives`, and `obsidian-comments` history
- scheduled scan reports and token audit
- landing-page variants and generated hero images by path
- old naming docs and handoffs
- skill/plugin experiments

## Positioning Ideas To Keep

- "Your notes can ask. Your agents can answer."
- "Ask your notes. Agents answer in line."
- "plain markdown"
- "works in Obsidian, VS Code, GitHub, any `.md` file"
- animated demo: user writes `@agent`, agent edits body, thread becomes collapsed `[!DONE]-`, raw/preview toggle

## Not Now

- desktop app implementation
- cloud sync/service
- scheduled Cowork/heartbeat product
- destructive sweep
- browser extension
- full Obsidian plugin beyond optional CSS/snippet
- general markdown comment/archive system
- model recommendation matrix
- legacy `#agent` directive compatibility unless explicitly kept
