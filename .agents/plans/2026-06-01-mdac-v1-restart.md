# mdac V1 restart plan

Status: ready for Sam review

Goal: restart Markdown Agent Comments in the fresh `smcllns/markdown-agent-comments` repo with curated forward docs and archived historic context.

## Tasks

- [x] Clone fresh repo.
- [x] Identify major prior-art locations under `~/Projects`.
- [x] Run parallel research on source inventory, CLI/spec, roadmap/docs, and naming/web.
- [x] Synthesize research into a concise PRD with embedded roadmap.
- [x] Archive best historic work without making it the forward source of truth.
- [ ] Review PRD shape with Sam before implementation.

## Scope

- V1 focus: ship a CLI Sam can use locally.
- Later: marketing page on `mdac.dev`, coding-agent plugins, possible desktop app.
- Do not start CLI implementation until the PRD/roadmap is reviewed.
- Keep forward docs curated and human-owned; historic docs can be broad but clearly separated.

## Unresolved Questions

- Should V1 include a read-only `--legacy-hash` inventory mode for old `#agent` directives?
- Should we publish unscoped `markdown-agent-comments`, scoped `@smcllns/mdac`, or reserve both and publish one?
- Is `<!--mdac:eot-->` the final seal, or should it be longer?
- Which runtime should the CLI use for V1?
