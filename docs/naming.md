# Markdown Agent Comments Naming

Use this naming guide for forward-looking docs, tests, code comments, CLI output, and review feedback.

Historical archive files may keep old names when they are preserving provenance.

## Registers

| Context | Use |
|---|---|
| Product name, formal spec, and human-facing titles | Markdown Agent Comments |
| Repo and npm package | `markdown-agent-comments` |
| CLI binary and shell commands | `mdac` |
| Website | `mdac.dev` |
| Natural description | `@agent comments in markdown` |
| User-facing construct | `@agent comment`, `@claude comment`, trigger-specific comment, or just "comment" |
| Generic work item | request |
| Trigger token | trigger |
| Config keys and CSS prefixes | `mdac.*`, `--mdac-*` |
| Environment variables | `MDAC_*` |
| End of agent comments seal | `<!--mdac:eot-->` |

## First Mention

Use this or a close variant the first time the tool appears in docs, READMEs, or articles:

> **Markdown Agent Comments** (`mdac`) lets you leave `@agent` comments in markdown files for an AI agent to resolve inline.

After first mention, use `mdac` for the CLI and `@agent comment`, trigger-specific comment, or "comment" for the user-facing construct.

## Good Prose

- "I left an `@agent` comment in my note."
- "The scanner found three actionable comments."
- "The agent resolved the comment and left a `[!DONE]-` thread."
- "Use `mdac scan` to list actionable comments."
- "Markdown Agent Comments supports custom triggers like `@codex`."

## Avoid

| Avoid | Use |
|---|---|
| "markdown-agent-comments ask" | "`@agent` comment", "comment", or "request" |
| "mdac ask" | "`@agent` comment" or "comment" |
| "agent tag", "`@agent` tag" | "`@agent` comment" |
| "directive" | "comment" or "trigger" |
| "md-asks", "Markdown Agent Tags", `atag` | Markdown Agent Comments / `mdac` |
| "eot marker" | "`<!--mdac:eot-->` seal" |

The word "ask" is fine as a verb: "humans ask agents for help." Avoid using "ask" as the product construct noun.

## Codebase Rules

- Forward-looking file and folder names use `mdac` or `markdown-agent-comments` when a product prefix is needed.
- Config keys use `mdac.*`.
- CLI output should call matches "actionable comments" or "comments", not "asks".
- Scanner internals may use neutral words like `match`, `reason`, or `trigger`.
- Historic archives may preserve old names, but forward docs should link to this file as the current naming source.
