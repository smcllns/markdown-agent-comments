# PRD: markdown-agent-comments / mdac

Status: draft source of truth  
Last updated: 2026-06-01  
Owner: Sam

## Product Thesis

`mdac` lets you leave `@agent` comments in markdown and have agents resolve them in place.

The point is not a new chat app. The point is to keep the ask, the work, and the record together in the markdown file where the context already lives.

## User Problem

Sam does a lot of thinking in markdown. When a note needs agent help, switching to a separate chat creates two problems:

- the request loses local document context
- the answer disappears into an agent session instead of staying near the text it changed

`mdac` solves that by making markdown comments agent-addressable:

```markdown
@codex tighten this paragraph
```

The agent edits the document body, then wraps the original request and reply in a resolved callout.

## Naming

| Surface | Use |
|---|---|
| Repo | `markdown-agent-comments` |
| Package | `markdown-agent-comments` |
| CLI binary | `mdac` |
| Natural description | `@agent comments in markdown` |
| Formal spec title | Markdown Agent Comments |
| Website | `mdac.dev` |
| Config namespace | `mdac.*` |
| Env vars | `MDAC_*` |
| Protocol seal | `<!--mdac:eot-->` |

Avoid forward-looking use of `atag`, `Markdown Agent Tags`, `@agent tags`, `md-asks`, and `markdown-agent-directives` except inside archived history.

Registry note, checked 2026-06-01: npm package names [`mdac`](https://registry.npmjs.org/mdac) and [`atag`](https://registry.npmjs.org/atag) are taken. [`markdown-agent-comments`](https://registry.npmjs.org/markdown-agent-comments), [`@smcllns/mdac`](https://registry.npmjs.org/@smcllns%2fmdac), and [`@smcllns/markdown-agent-comments`](https://registry.npmjs.org/@smcllns%2fmarkdown-agent-comments) were available at check time.

## V1 User Workflow

1. Sam writes an `@agent` comment in a markdown file.
2. `mdac scan <path>` shows actionable files without invoking an agent.
3. `mdac run <path> --once` invokes an agent only when the cheap scan finds work.
4. The agent reads surrounding context, edits the document body if the ask is concrete, and records a short reply in the callout.
5. If the ask is ambiguous, the agent leaves an open `[!NOTE]+` thread and pre-fills a human reply label.

## Protocol Contract

V1 recognizes `@agent`, `@claude`, `@codex`, and explicit custom `@trigger` comments.

Thread states:

- `[!NOTE]+` means active and visually open.
- `[!DONE]-` means resolved and visually collapsed.
- Bare `[!NOTE]`, `[!NOTE]-`, `[!DONE]`, and `[!DONE]+` are plain markdown, not `mdac` threads.

Agent replies end with `<!--mdac:eot-->`.

The original request must be preserved verbatim as the first body line inside the callout. The actual work belongs in the document body, not pasted into the discussion thread.

If the agent asks the human a question, the thread is parked. The agent must not self-reply on the next run just because its own message ended with a question.

## V1 CLI Scope

Required:

- `mdac scan <path>`: read-only candidate scan.
- `mdac run <path> --once`: scan, then invoke an agent if actionable work exists.
- `mdac watch <path>`: foreground loop around `run --once`.
- `--trigger @name`: replace the default trigger set.
- `--name <human>`: human speaker label for prefilled replies.
- `--debug`: explain matches and no-match decisions.
- fixture-driven tests for scan and parked-thread behavior.

Deferred:

- `#agent` directive compatibility.
- `#silent`.
- general `@sam:` review comments.
- launchd, cron, Cowork scheduled runs, and heartbeat automation.
- full markdown parsing.
- destructive cleanup modes.

## Scanner Rules

Use a cheap two-pass scan before invoking an agent:

1. Single-line scan for unwrapped `@agent` comments.
2. Multiline scan for actionable `[!NOTE]+` and unsealed `[!DONE]-` threads.

Important rules:

- Default triggers are `agent`, `claude`, and `codex`.
- Custom triggers replace defaults.
- Inline code is the escape hatch: `` `@claude` `` should not match.
- Wrapped blockquote lines should not retrigger as fresh inline comments.
- Accepted V1 false positives: fenced code blocks and hyphenated names like `@claude-team`.
- Sort matched files by mtime before capping output.

## Test Strategy

The spec should double as the test fixture catalog.

Port first:

- archived scanner fixture catalog from the prior `atag` work
- poller behavior tests for quiet no-op, debug output, custom triggers, parked threads, human-label collision handling, timeouts, and agent failure propagation
- selected Obsidian benchmark cases that prove callout containment and `[!DONE]-` closure

Do not treat model-quality failures as CLI failures until the scan/protocol fixture suite is stable.

## Roadmap

### V1: Local CLI That Works For Sam

Ship the `mdac` CLI with `scan`, `run --once`, `watch`, core protocol tests, and a minimal README.

Exit criteria:

- Sam can point `mdac` at a notes folder.
- No-op runs are cheap and transparent.
- Concrete asks resolve into `[!DONE]-`.
- Ambiguous asks become `[!NOTE]+`.
- Tests cover the scanner edge cases already seen in the vault.

### V1.5: Cleanup And Archive

Add safe cleanup for resolved threads if still needed.

Likely command: `mdac sweep <path>`.

Rules:

- preserve the record
- no destructive delete by default
- make `--all` and destructive modes explicit, if they ever exist

### V2: `mdac.dev`

Publish a concise marketing/docs page:

- what it is
- animated before/after demo
- install and first-run commands
- protocol/spec link
- GitHub link

Keep the old landing-page experiments as design history, not copy source.

### V3: Coding-Agent Plugins

Build thin Claude, Codex, and other coding-agent wrappers that call the CLI instead of reimplementing scan rules.

Exit criteria:

- plugin instructions are small
- plugin tests prove the wrapper invokes `mdac`
- no duplicate protocol logic lives in plugin docs

### V4: Desktop Wrapper

Consider a tray/app wrapper only after the CLI has proven stable.

Possible value:

- watch status
- unresolved-thread list
- click to open files
- simple install/update flow

## Non-Goals

- not a general markdown comment system
- not a cloud service
- not an Obsidian-only plugin
- not a replacement for git history or review tools
- not a broad agent scheduler in V1

## Open Questions

- Publish unscoped `markdown-agent-comments`, scoped `@smcllns/mdac`, or reserve both and publish one?
- Is `<!--mdac:eot-->` the final seal, or should it be the longer `<!--markdown-agent-comments:eot-->`?
- Should V1 include a read-only `--legacy-hash` inventory mode for old `#agent` directives?
- Should the public package be Node-compatible, or is Bun-first acceptable for V1?
