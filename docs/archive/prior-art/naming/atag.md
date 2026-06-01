# Markdown Agent Tags naming

**Markdown Agent Tags** (`atag`) lets you leave `@agent` tags in markdown files for an AI agent to pick up asynchronously.

## Registers

Use one register per context:

| Context | Use |
|---|---|
| Formal spec name | **Markdown Agent Tags** |
| Short description phrase | agent tags in markdown |
| Package, module, repo, folder, CLI, command | `atag` |
| Future domain | `atag.md`, if claimed |
| User-facing construct | `@agent` tag, `@claude` tag, `@codex` tag, or just "tag" |
| Verb | tag, tagged, tagging |

Rewrite sentence starts so lowercase `atag` is not first word: "The `atag` CLI handles..." instead of "`atag` handles..."

## First mention

Use this or a close variant the first time the tool appears in docs, READMEs, or articles:

> **Markdown Agent Tags** (`atag`) lets you leave `@agent` tags in markdown files for an AI agent to pick up asynchronously.

After first mention, use `atag` for the tool and `@agent` tag, trigger-specific tag, or "tag" for the construct.

## Good prose

- "I left an `@agent` tag in my daily note."
- "I tagged Claude in my note."
- "The agent picked up my tag and resolved it."
- "Use the `atag` CLI to list open tags."
- "Markdown Agent Tags supports custom triggers like `@codex`."

The verb "tag" is intentionally plain English. In docs, anchor it with the first mention before switching to bare "tag"; in CLI output, bare "tag" is fine once the `atag` command context is established.

## Avoid

| Avoid | Use |
|---|---|
| "the atag tag" | "the `@agent` tag" or "the tag" |
| "an atag" | "an `@agent` tag" |
| "ATAG", "ATag", "Atag" | `atag` |
| "Markdown Agent Tags CLI" | `atag` |
| "the atag spec" | "the Markdown Agent Tags spec" |
| "agent-tag" or "agent tags" without `@` | "`@agent` tag" |
| "atags" | "`@agent` tags" or "tags" |

## Codebase rules

- File and folder names: lowercase `atag`.
- Config keys: `atag.*`, for example `atag.triggers`.
- Identifiers follow language convention, for example `atagClient`, `AtagClient`, `ATAG_VERSION`.
- Comments, docstrings, error messages, and CLI output follow the prose rules.
- Error messages and CLI output refer to the construct as "tag" or "`@agent` tag", never "atag" as a noun.

## Summary

Rename technical surfaces to lowercase `atag`. Keep **Markdown Agent Tags** as the formal spec name in titles and first mentions. In prose and output, call the construct an `@agent` tag or just a tag. Never write "ATAG" for the brand because it collides with the W3C accessibility standard.
