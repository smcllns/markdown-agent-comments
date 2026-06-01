# Naming and Web

Status: COMPLETE

## Task

Normalize naming across historic work and the new direction: repo/code `markdown-agent-comments`, CLI `mdac`, natural description `@agent comments in markdown`, website `mdac.dev`.

## Findings

## Historic Naming

Old contract:

- formal name: Markdown Agent Tags
- technical surfaces: `atag`
- natural construct: `@agent` tag
- future domain: `atag.md`

Why it existed:

- keep prose, package, and construct registers separate
- avoid awkward phrases like "the atag tag"
- preserve the visible `@` syntax cue
- avoid `ATAG` because it collides with W3C accessibility terminology

## New Canonical Naming

| Surface | Canonical |
|---|---|
| Repo/folder | `markdown-agent-comments` |
| NPM package | `markdown-agent-comments` |
| Optional scoped reservation | `@smcllns/markdown-agent-comments`, `@smcllns/mdac` |
| CLI binary | `mdac` |
| Spec title | Markdown Agent Comments |
| Spec files | `markdown-agent-comments.spec.md`, `markdown-agent-comments.spec.test.ts` |
| Prose description | `@agent comments in markdown` |
| User-facing construct | `@agent comment`, `@codex comment`, `@claude comment`, or "comment" |
| Domain | `mdac.dev` |
| Config namespace | `mdac.*` |
| Env vars | `MDAC_*` |
| Protocol seal | `<!--mdac:eot-->` |
| CSS/snippet prefix | `mdac-callouts.css`, `--mdac-*` |

## Names To Avoid

- `atag`, `Markdown Agent Tags`, `@agent tags`, `agent tags in markdown`
- `ATAG`, `Atag`, `ATag`, `atags`
- `atag.md`
- `<!--atag:eot-->`, `atag.*`, `--atag-*`
- package names `mdac` and `atag`
- install copy using `npm`, `npx`, or old `atag` names

## Registry Check

Checked 2026-06-01:

- [`mdac`](https://registry.npmjs.org/mdac): 200, taken
- [`atag`](https://registry.npmjs.org/atag): 200, taken
- [`markdown-agent-comments`](https://registry.npmjs.org/markdown-agent-comments): 404, available
- [`@smcllns/mdac`](https://registry.npmjs.org/@smcllns%2fmdac): 404, available
- [`@smcllns/markdown-agent-comments`](https://registry.npmjs.org/@smcllns%2fmarkdown-agent-comments): 404, available

Recommended package shape:

```json
{
  "name": "markdown-agent-comments",
  "bin": {
    "mdac": "./dist/cli.js"
  },
  "homepage": "https://mdac.dev"
}
```

Docs should use Bun-first commands.

## Open Questions

- Publish unscoped `markdown-agent-comments`, scoped `@smcllns/mdac`, or reserve both and publish one?
- Is `<!--mdac:eot-->` final, or should it be longer?
- Is `@agent tag` legacy-only language?
- Should public package be Node-compatible or Bun-first?
