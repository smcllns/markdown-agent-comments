# PRD: markdown-agent-comments / mdac

Status: approved for V1 implementation
Last updated: 2026-06-02
Owner: Sam

## Product Thesis

Markdown Agent Comments (`mdac`) lets you ask async agents for help directly inside markdown.

Write an `@agent` comment inline in a markdown file. An async agent picks it up and handles the ask and saves your request and their response in a comment thread in the markdown file.

## User Problem

When you're writing a markdown doc, prompting an agent is a disruptive workflow:

- you leave the document and switch to an agent chat and lose focus
- you have to re-explain which file and passage need work
- that discussion ends up outside the markdown file and is often hard to find later

Markdown Agent Comments solves this problem by enabling agent-addressable markdown comments:

```markdown
@claude can you update that paragraph to numbered list pls
```

The agent edits the document as requested, then wraps the original request and their reply in a markdown callout which works like threaded comments.

> [!DONE]- paragraph converted to list
>
> [@sam] @claude can you switch that paragraph to numbered list pls
>
> [@claude] done - updated to a 3-point list <!--mdac:eot-->

## Common Uses

These are the recurring shapes that make Markdown Agent Comments useful:

```markdown
@codex can you make a photorealistic image of a pelican riding a bike and add it here
```

```markdown
@agent I pasted this from terminal, can you fix formatting pls
```

```markdown
@claude add a link to the actual PR here. Also drop in the homepage screenshot from the PR here too pls.
```

```markdown
@agent can you give me three sharper options for this heading?
```

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

Use one name register per context:

- Use **Markdown Agent Comments** for human-facing titles, first mentions, product prose, and the formal spec.
- Use `mdac` for the CLI binary, shell commands, package-facing examples, config keys, CSS prefixes, and protocol tokens.
- Use `MDAC_*` only for environment variables.
- Use `@agent comment`, `@claude comment`, `@codex comment`, or simply "comment" for the user-facing construct.
- Avoid prose titles like "`mdac` V1 Human Review"; prefer "Markdown Agent Comments V1 Human Review".

Avoid forward-looking use of `atag`, `Markdown Agent Tags`, `@agent tags`, `md-asks`, and `markdown-agent-directives` except inside archived history.

Registry note, checked 2026-06-01: npm package names [`mdac`](https://registry.npmjs.org/mdac) and [`atag`](https://registry.npmjs.org/atag) are taken. [`markdown-agent-comments`](https://registry.npmjs.org/markdown-agent-comments), [`@smcllns/mdac`](https://registry.npmjs.org/@smcllns%2fmdac), and [`@smcllns/markdown-agent-comments`](https://registry.npmjs.org/@smcllns%2fmarkdown-agent-comments) were available at check time.

Publish the unscoped `markdown-agent-comments` package and expose `mdac` as its CLI binary. Reserve `@smcllns/mdac` and `@smcllns/markdown-agent-comments` if convenient during publish.

## V1 User Workflow

1. Sam writes an `@agent` comment in a markdown file.
2. `mdac scan <path>` shows actionable files without invoking an agent.
3. `mdac run <path> --once` invokes an agent only when the cheap scan finds work.
4. The agent reads surrounding context, edits the document body if the ask is concrete, and records a short reply in the callout.
5. If the ask is ambiguous, or it is appropriate to ask for further user input before concluding, the agent leaves an open `[!NOTE]` thread and pre-fills the human reply label.

## Protocol Contract

V1 recognizes `@agent`, `@claude`, `@codex`, and explicitly provided `@<custom-trigger>`.

Thread states:

- `[!NOTE]` means active and visually open
- `[!DONE]-` means resolved and visually collapsed.

Agent replies end with `<!--mdac:eot-->`. This means humans can add follow-up questions or comments to active or closed threads and it can be easily detected for agents to process.

The original request must be preserved verbatim as the first body line inside the callout. The actual work belongs in the document body, not pasted into the discussion thread.

If the agent asks the human a question, the thread is parked awaiting human response and the agent will not self-reply on subsequent runs.

## V1 CLI Scope

Required:

- `mdac scan <path>`: read-only candidate scan.
- `mdac run <path> --once`: scan, then invoke an agent if actionable work exists.
- `mdac watch <path>`: foreground loop around `run --once`.
- `--trigger @<name>`: replace the default trigger set.
- `--name <human>`: human speaker label for prefilled replies.
- `--debug`: verbose terminal output for debugging
- fixture-driven tests for scan and parked-thread behavior.

Outside V1:

- Scheduled runs with launchd/cron
- Cowork, Codex, OpenClaw (etc) plugins and extensions
- Cleanup feature to move resolved comments to footnotes

## Scanner Rules

Use a cheap two-pass scan before invoking an agent:

1. Single-line scan for unwrapped `@agent` comments.
2. Multiline scan for actionable `[!NOTE]` and unsealed `[!DONE]-` threads.

Important rules:

- Default triggers are `agent`, `claude`, and `codex`.
- Custom triggers replace defaults.
- Inline code is the escape hatch: `` `@claude` `` should not match.
- Wrapped blockquote lines should not retrigger as fresh inline comments.
- Sort matched files by mtime before capping output.

## Quality Bar

The spec doubles as the test fixture catalog.

The product should be tested against real markdown shapes from the archive, especially scanner edge cases, parked threads, callout containment, and resolved-thread follow-ups.

Do not treat model-quality failures as CLI failures until the scan/protocol fixture suite is stable. Detailed fixture-porting work belongs in the implementation plan, not this PRD.

## Roadmap

### V1: Local CLI That Works For Sam

Ship the `mdac` CLI with `scan`, `run --once`, `watch`, core protocol tests, and a minimal README.

Exit criteria:

- Sam can point `mdac` at a notes folder, including inside Obsidian vault
- No-op runs are cheap and transparent.
- Concrete asks resolve into `[!DONE]-`.
- Asks that require further user input become `[!NOTE]`.
- Tests cover the scanner edge cases already seen in the vault.
- Packaged published on https://registry.npmjs.org/markdown-agent-comments

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

### V5: Cleanup And Archive

Add safe cleanup for resolved threads if still needed.

Likely command: `mdac sweep <path>`.

Rules:

- preserve the record
- no destructive delete by default
- make `--all` and destructive modes explicit, if they ever exist

## Non-Goals

- not a general markdown comment system
- not a cloud service
- not an Obsidian-only plugin
- not a replacement for git history or review tools
- not a broad agent scheduler in V1
