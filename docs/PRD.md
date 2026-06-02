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

## V1 User Workflow

1. Sam writes an `@agent` comment in a markdown file.
2. `mdac scan <path>` shows actionable files without invoking an agent.
3. `mdac run <path> --once` invokes an agent only when the cheap scan finds work.
4. The agent reads surrounding context, edits the document body if the ask is concrete, and records a short reply in the callout.
5. If the ask is ambiguous, or it is appropriate to ask for further user input before concluding, the agent leaves an open `[!NOTE]` thread and pre-fills the human reply label.

## Protocol Principles

Markdown Agent Comments should feel like lightweight threaded comments that live inside the markdown file:

- Humans ask for work with `@agent`, `@claude`, `@codex`, or an explicitly configured custom trigger.
- Concrete asks should change the document body; the callout is the record of the request and agent response.
- The original request should be preserved so the markdown file keeps the conversation context.
- `[!NOTE]` threads are open; `[!DONE]-` threads are resolved.
- Agent replies end with `<!--mdac:eot-->` so later human follow-ups can be detected.
- If the agent needs human input, it should leave the thread open and parked rather than guessing or self-replying.

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

## Non-Goals

- not a general markdown comment system
- not a cloud service
- not an Obsidian-only plugin
- not a replacement for git history or review tools
- not a broad agent scheduler in V1

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

## Naming

| Context | Use |
|---|---|
| Product name, formal spec, and human-facing titles | Markdown Agent Comments |
| Repo and npm package | `markdown-agent-comments` |
| CLI binary and shell commands | `mdac` |
| Website | `mdac.dev` |
| Natural description | `@agent comments in markdown` |
| User-facing construct | `@agent comment`, `@claude comment`, `@codex comment`, or "comment" |
| Config keys and CSS prefixes | `mdac.*`, `--mdac-*` |
| Environment variables | `MDAC_*` |
| Protocol seal | `<!--mdac:eot-->` |

Prior names from historic work are retired: `atag`, `Markdown Agent Tags`, `@agent tags`, `md-asks`, and `markdown-agent-directives`. If they appear in forward-looking docs, code, or UI, update them to the current naming system; leave them only in archived history or explicit historical notes.

## Executable Spec

The PRD describes product intent. Detailed scanner, prompt, and fixture behavior belongs in tests so code changes cannot silently drift from the spec:

- Scanner rules: [`test/scanner.test.js`](../test/scanner.test.js)
- CLI behavior: [`test/cli-scan.test.js`](../test/cli-scan.test.js), [`test/cli-run.test.js`](../test/cli-run.test.js), [`test/cli-watch.test.js`](../test/cli-watch.test.js)
- Agent prompt contract: [`test/agent-prompt.test.js`](../test/agent-prompt.test.js)
- Human-readable review fixture: [`test/human-review/README.md`](../test/human-review/README.md)

When protocol behavior changes, update the relevant test or fixture in the same change as the implementation. Do not duplicate detailed scanner branches here.
