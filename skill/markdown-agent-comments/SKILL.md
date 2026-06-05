---
name: markdown-agent-comments
description: Resolve agent-directed comments in markdown files and callout threads. Use when the mdac CLI invokes this skill, or when a human asks an agent chat to process files containing @agent, @claude, @codex, custom @trigger comments, active [!NOTE] threads, or follow-ups in [!DONE]- threads.
---

# Markdown Agent Comments

Markdown Agent Comments lets people leave small `@agent` requests directly inside markdown. You do the work in the document, then preserve the exchange as a durable callout thread beside the affected text.

The document body is the source of truth. The callout is the record of the request, discussion, and completion.

## Invocation

This skill can be invoked by a human in chat or by the `mdac` CLI.

- Chat: use the files and trigger names the human provides. If no trigger names are supplied, use `@agent`, `@claude`, and `@codex`. If no files are supplied, ask for the smallest useful target path.
- CLI: follow the additional adapter instructions in `cli-preprompt.md` and use the matched files/reasons supplied by the CLI.
- Review-only: if the human asks only for analysis, do not edit files. Otherwise, edit the markdown files directly.

## Finding Work

Prefer the deterministic scanner when it is available:

```sh
node scripts/scanner.js <path>
```

Resolve `scripts/scanner.js` relative to this skill directory. Add `--json` for machine-readable output, `--trigger @name` for custom trigger sets, and `--name NAME` when the human label is known.

Process these actionable shapes:

- inline comments containing an active trigger
- `[!NOTE]` threads where a human turn needs an agent response
- `[!DONE]-` threads with a human follow-up after the latest `<!--mdac:eot-->`

Ignore inline code, fenced code blocks, quoted source material, parked threads, sealed resolved threads, `[!NOTE]+`, `<!--atag:eot-->`, and legacy `#agent` directives.

## Thread Format

Use GitHub/Obsidian-style callouts:

- Active threads use `[!NOTE]`.
- Resolved threads use `[!DONE]-`.
- Separate turns inside a callout with a single blank quoted line: `>`.
- End every agent reply with `<!--mdac:eot-->`.
- Human turns use bracket labels such as `[@sam]` or `[@user]`.
- Agent turns use the active trigger label, such as `[@claude]`, `[@codex]`, or `[@agent]`.

If the invocation provides an explicit human label, use it exactly. Otherwise choose the best human label from context, falling back to `[@user]`. Use one human label consistently within a thread.

## Resolution Contract

For each actionable comment:

- Read the full file and enough surrounding context to understand the request.
- Use a better-matching skill or tool first when one applies.
- Edit the document body only when the human clearly asks you to change, add, remove, insert, or rewrite document content.
- Answer suggestions, options, explanations, reviews, critiques, and brainstorming requests inside the callout unless the human explicitly asks you to put the answer in the document body.
- For multi-part requests, address every part. If you cannot complete a requested part because a tool, permission, file, or fact is unavailable, say exactly what is missing and give the smallest useful next step instead of silently dropping that part.
- If the request sits on a task item, update the checkbox when the task is actually complete.
- Preserve the original request in the callout. For inline comments, this is the trigger and request text, plus only the surrounding body text needed to understand what changed.
- For an inline trigger, create a new callout immediately after the affected block and remove the live trigger from the body.
- Conclude completed work with `[!DONE]-` and a past-tense title, about 60 characters or less.

Do not rewrite or delete earlier human or agent turns unless the human explicitly asks you to. Existing callout history is evidence.

## When Human Input Is Required

Do not guess when the request is ambiguous, missing context, or non-actionable.

Do not invent facts, benefits, metrics, names, dates, URLs, PR links, image files, or other specifics that are not present in the document or available through an appropriate tool.

If you need input:

- Leave the thread as `[!NOTE]`.
- Ask the smallest useful clarification question.
- End your agent reply with `<!--mdac:eot-->`.
- Add a blank quoted separator line.
- Prefill the human reply label on its own quoted line.

```markdown
> [!NOTE] awaiting target section
>
> [@user] @agent improve the section above
>
> [@agent] Which section should I improve? Please point me to the heading or paragraph range. <!--mdac:eot-->
>
> [@user]
```

## Parked Threads

A thread is parked when the latest real agent turn ends with `<!--mdac:eot-->` and the only later human line is an empty label placeholder such as `[@user]`.

Do not self-reply to parked threads. If the same parked thread keeps appearing across runs with no human reply, mention that in final output instead of answering yourself.

If a human follows up after `<!--mdac:eot-->`, inspect the new request and reseal the thread after your turn.

## Final Output

For chat invocations, reply in concise markdown:

- summarize files changed
- link to changed files when the environment supports file links
- list active threads left waiting on the human
- mention checks or tests only if you actually ran them

For CLI invocations, follow `cli-preprompt.md`.

The markdown file itself is the detailed record.
