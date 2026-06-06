# PRD: markdown-agent-comments / mdac

Status: V1 implemented; maintained as product/spec reference
Last updated: 2026-06-05
Owner: maintainer

## Product Vision

Markdown Agent Comments (`mdac`) lets users write `@agent` comments in markdown files to prompt an async agent for input or document changes inline.

It follows a file-over-app philosophy (the markdown file is the source of truth) so it works across any markdown editor and agents that work with `.md` files. It aims to require minimal additional syntax that supports a good reading and writing experience in plaintext markdown with progressive enhancement in Obsidian and GitHub.

## Product Goals

- works with any markdown editor that uses local `.md` files
- works with coding agents that can read and edit local files
- one human-readable skill at `skill/markdown-agent-comments/SKILL.md`, one scanner helper at `skill/markdown-agent-comments/scripts/scanner.js`, a minimal CLI adapter in `cli/`, and future wrappers for coding agent plugins or desktop apps.
- aspire to be fast, convenient, and minimal, with high upside and negligible downside

## Non-Goals

- not a cloud service (you bring your own coding agent)
- not a replacement for git history or review tools (those are complementary tools)
- not a general markdown comment system
- not an Obsidian-only plugin

## User Problem

When you're writing in a markdown doc it can be disruptive to prompt an agent for input:

- you leave the document and switch to an agent chat and lose focus
- you have to re-explain which file and passage need work
- that discussion ends up outside the markdown file and is often hard to find later

### How this solves it

Humans ask for work with `@agent`, `@claude`, `@codex`, or an explicitly configured custom trigger:

```markdown
@claude can you update that paragraph to numbered list pls
```

The agent edits the document as requested, then wraps the discussion in a callout which acts like threaded comments inside the markdown file and can be committed to git or deleted. Comment threads can be multi-turn if the agent needs more input or the human has a follow-up request.

> [!DONE]- paragraph converted to list
>
> [@user] @claude can you switch that paragraph to numbered list pls
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

## V1 Scope

### User Workflow

1. Human writes an `@agent` comment in a markdown file.
2. `mdac scan <path>` shows actionable files without invoking an agent.
3. `mdac run <path> --once` invokes an agent only when the cheap scan finds work.
4. The agent reads surrounding context, edits the document body when the request clearly asks for a document change, and records a short reply in the callout.
5. If the request is ambiguous, or it is appropriate to ask for further user input before concluding, the agent leaves an open `[!NOTE]` thread and pre-fills the human reply label.

### Protocol Principles

Markdown Agent Comments should feel like lightweight threaded comments that live inside the markdown file:

- Humans ask for work with `@agent`, `@claude`, `@codex`, or an explicitly configured custom trigger.
- Concrete document-change requests should change the document body; suggestions, options, explanations, and fallback notes stay in the callout unless the human asks to insert them.
- The original request should be preserved so the markdown file keeps the conversation context.
- `[!NOTE]` threads are open; `[!DONE]-` threads are resolved.
- Agent replies end with `<!--mdac:eot-->` so later human follow-ups can be detected.
- A quoted speaker line that is only an unknown bracket label, such as `> [@sam]`, is a parked human placeholder even when the CLI was run without `--name`.
- If the agent needs human input, it should leave the thread open and parked rather than guessing or self-replying.

### CLI Scope

Required:

- `mdac scan <path>`: read-only candidate scan.
- `mdac run <path> --once`: scan, then invoke an agent if actionable work exists.
- `mdac watch <path>`: foreground loop around `run --once`.
- `--trigger @<name>`: replace the default agent trigger name.
- `--name <label>`: optional human speaker label the agent must use for prefilled replies; omit when no name is known.
- `--debug`: verbose terminal output for debugging.
- `skill/markdown-agent-comments/test/`: deterministic core scanner and skill tests.
- `skill/markdown-agent-comments/eval/`: skill-owned agent eval cases and eval runner scripts.
- `cli/test/`: CLI adapter tests for scan, run, watch, and prompt handoff behavior.
- `demo/`: human-facing product demo, demo runner, and demo tests.

Outside V1:

- Scheduled runs with launchd/cron
- Cowork, Codex, OpenClaw (etc) plugins and extensions
- Cleanup feature to move resolved comments to footnotes

## Naming

Detailed naming guidance lives in [`docs/naming.md`](naming.md).

| Context                                            | Use                                                                 |
| -------------------------------------------------- | ------------------------------------------------------------------- |
| Product name, formal spec, and human-facing titles | Markdown Agent Comments                                             |
| Repo and npm package                               | `markdown-agent-comments`                                           |
| CLI binary and shell commands                      | `mdac`                                                              |
| Website                                            | `mdac.dev`                                                          |
| Natural description                                | `@agent comments in markdown`                                       |
| User-facing construct                              | `@agent comment`, `@claude comment` or just "comment" |
| Config keys and CSS prefixes                       | `mdac.*`, `--mdac-*`                                                |
| Environment variables                              | `MDAC_*`                                                            |
| End of agent comments seal                         | `<!--mdac:eot-->`                                                   |

Prior names from historic work are retired: `atag`, `Markdown Agent Tags`, `@agent tags`, `md-asks`, and `markdown-agent-directives`. If they appear in forward-looking docs, code, or UI, update them to the current naming system; leave them only in archived history or explicit historical notes.

## Executable Spec

The PRD describes product intent. Detailed scanner, prompt, and fixture behavior belongs in tests to avoid drift:

- Layout ownership: [`docs/adrs/0001-layout-ownership.md`](adrs/0001-layout-ownership.md)
- Scanner rules: [`skill/markdown-agent-comments/test/scanner.test.js`](../skill/markdown-agent-comments/test/scanner.test.js)
- CLI behavior: [`cli/test/cli-scan.test.js`](../cli/test/cli-scan.test.js), [`cli/test/cli-run.test.js`](../cli/test/cli-run.test.js), [`cli/test/cli-watch.test.js`](../cli/test/cli-watch.test.js)
- Agent prompt handoff: [`cli/test/cli-run.test.js`](../cli/test/cli-run.test.js)
- Skill file standards: [`skill/markdown-agent-comments/test/skill.test.js`](../skill/markdown-agent-comments/test/skill.test.js)
- Human-readable demo: [`demo/README.md`](../demo/README.md)
- Skill evals: [`skill/markdown-agent-comments/eval/README.md`](../skill/markdown-agent-comments/eval/README.md)
- Testing and eval strategy: [`docs/eval-testing-plan.md`](eval-testing-plan.md)

## Roadmap

### V1: Local CLI That Works

Ship the `mdac` CLI with `scan`, `run --once`, `watch`, core protocol tests, and a minimal README.

Exit criteria:

- Users can point `mdac` at a notes folder, including an Obsidian vault
- No-op runs are cheap and transparent.
- Concrete requests resolve into `[!DONE]-`.
- Requests that require further user input become `[!NOTE]`.
- Tests cover scanner edge cases, demo before/after behavior, and skill eval fixtures.
- Package published on [https://registry.npmjs.org/markdown-agent-comments](https://registry.npmjs.org/markdown-agent-comments)

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

### V4: Cleanup And Archive

Add safe cleanup for resolved threads if still needed. Moves them to doc footnotes by default, or deleted if explicitly requested.

Likely command: `mdac sweep <path>`.
Potential editing-time shorthands: `#sweep` to sweep when resolved, `#delete` to fully remove when resolved.
Default is manual sweep; users may later configure auto-sweep or auto-delete when comments resolve.

Rules:

- preserve the record
- no destructive delete by default
- make `--all` and destructive modes explicit, if they ever exist

### V5: Desktop Wrapper

Consider a tray/app wrapper only after the CLI has proven stable.

Possible value:

- watch status
- unresolved-thread list
- click to open files
- simple install/update flow
