# mdac V1 restart plan

Status: in progress

Goal: restart Markdown Agent Comments in the fresh `smcllns/markdown-agent-comments` repo with curated forward docs and archived historic context.

## Tasks

- [x] Clone fresh repo.
- [x] Identify major prior-art locations under `~/Projects`.
- [ ] Run parallel research on source inventory, CLI/spec, roadmap/docs, and naming/web.
- [ ] Synthesize research into a concise PRD with embedded roadmap.
- [ ] Archive best historic work without making it the forward source of truth.
- [ ] Review PRD shape with Sam before implementation.

## Scope

- V1 focus: ship a CLI Sam can use locally.
- Later: marketing page on `mdac.dev`, coding-agent plugins, possible desktop app.
- Do not start CLI implementation until the PRD/roadmap is reviewed.
- Keep forward docs curated and human-owned; historic docs can be broad but clearly separated.

## Unresolved Questions

- Which historic docs should be copied verbatim into the repo archive?
- Should V1 use `@agent` comments only, or keep `#agent` directive compatibility?
- Should the package name be `markdown-agent-comments`, `mdac`, or scoped?
- Which runtime should the CLI use for V1?
