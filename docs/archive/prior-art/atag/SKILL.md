---
name: atag
description: "Use when markdown files (Obsidian notes or regular .md) contain `@claude`, `@codex`, `@agent`, or user-specified `@trigger` tags. Also use when asked to resolve agent tags in markdown, scan for @agent comments, or process open `[!NOTE]+` threads."
---

# Markdown Agent Tags

**Markdown Agent Tags** (`atag`) lets you leave `@agent` tags in markdown files for an AI agent to pick up asynchronously.

A human writes `@codex do X` or `@claude do X` in a markdown file. This skill resolves the tag and records the exchange in a callout thread.

## Example

User writes:

```
@codex can you clean up that formatting pls
```

After the agent acts:

```
> [!DONE]- cleaned up broken formatting
>
> @codex can you clean up that formatting pls
>
> *`codex`* done — removed broken newlines and added missing periods. No changes to text content. <!--atag:eot-->
```

The original tag is preserved verbatim as the first body line. The title is the outcome summary.

## Tag shapes

| Pattern | Status | Scan | Agent behavior |
|---|---|---|---|
| `@agent`, `@claude`, `@codex` | New | Picks up | New tag, action required. |
| `@<custom>` | New | Picks up if the caller specified custom triggers | New tag, action required. |
| `[!NOTE]+` | Active thread | Picks up only when unsealed | If the human spoke last, act. If the agent yielded last, leave it. |
| `[!DONE]-` | Resolved thread | Picks up only when unsealed | If the thread is not sealed with `<!--atag:eot-->`, inspect and reseal. |

The `+/-` marker is load-bearing:
- `[!NOTE]+` distinguishes agent threads from regular callouts.
- `[!DONE]-` collapses the callout in Obsidian.

## Discussion thread format

Inside an active callout, separate turns with a **single blank `>` line** — one paragraph per turn.

Use `@name` only for trigger tags. Speaker labels use inline code as the sender/from field. Do not add a colon or other punctuation after the label:

- Agent turn: ``*`claude`* reply <!--atag:eot-->``.
- Human turn: `` `human` reply``.

Throughout this skill, `human` is the example human speaker label. The poller passes the human label to agents as the agent's known name for the human. Prefer `atag-poll.sh --name <name>` or `--user-name <name>`; when omitted, the poller tries `git config user.name`, GitHub user name/login, and the Unix username before falling back to `user`. Names are normalized to a simple lower-case label, using the first word for full names. Labels that collide with the active agent trigger set are invalid for `--name` and skipped during fallback; if the final fallback would collide, the poller uses the next non-colliding generic label.

Humans are not expected to type the speaker-label markdown by hand. Agents and tools should prefill or normalize the human label in active threads, so the human can just type the reply text after the label.

`<!--atag:eot-->` means the agent yielded the turn. End every agent response with it, including `[!NOTE]+` questions and partial answers. In `[!DONE]-` threads, a human can add follow-up text directly after the token; the next agent pass will inspect and reseal. Do not prefill `[!DONE]-` follow-up lines in v1.

```markdown
> [!DONE]- tightened introduction
>
> @claude tighten the intro
>
> *`claude`* trimmed to 3 sentences — does that read OK or want to go shorter? <!--atag:eot-->
>
> `human` shorter please, ~1 sentence
>
> *`claude`* done — single sentence. <!--atag:eot-->
> no, make it sharper
```

For a soft line break inside a single turn, use two trailing spaces.

## Unresolved rule

A tag is unresolved when any of:

- An open `> [!NOTE]+ ...` callout whose latest nonblank, non-placeholder quoted line is neither sealed with `<!--atag:eot-->` nor an agent speaker label (i.e. a human spoke last).
- A valid inline tag for a recognized trigger not yet processed into a callout.
- A resolved `> [!DONE]- ...` callout whose latest nonblank, non-placeholder quoted line does not end with `<!--atag:eot-->`.

A bare inline-code human label for this skill, such as ``> `human` ``, is a placeholder, not a turn. Legacy emphasized label-only human placeholders are also skipped so old prefilled threads do not retrigger. This skip applies only to this skill's human speaker label; other code-only quoted lines remain real replies.

If the human label falls back to `user` or another generic missing-name label, add this quoted HTML comment immediately after the label-only line when leaving a `[!NOTE]+` thread waiting on the human:

```markdown
> `user`
> <!--atag:missing-human-name no human name detected; please ask the human what name agents should use and store it in AGENTS.md, git config user.name, or pass --name to atag-poll.sh.-->
```

## Resolution contract

For each unresolved tag:

- Read the file and enough surrounding context to understand the request.
- Use any better-matching skill/tool first when one applies.
- Do the requested work when it is concrete — edit the **document body**, not the callout. The callout gets a one-line acknowledgement; the actual change goes where the user asked for it.
- For discussion-only tags (no doc change requested), answer concisely inside the callout.
- If the tag sits on a task item, update the checkbox too.
- **In general, preserve the original tag/request verbatim inside the callout** as the first body line. Modify, remove, or rewrite the body occurrence only when: (1) the tag was inline, such as on a task list item or inside a table cell; in that case, create a new callout immediately after the affected block, copy the original line verbatim into the callout, and remove the live trigger from the body, (2) prepending the user's speaker label for callout ergonomics, or (3) the user explicitly asks you to.

End every agent reply with `<!--atag:eot-->` so cheap pollers can skip threads waiting on the human without invoking an agent.

**Conclude** with `[!DONE]-` and a one-line outcome summary as the title (past-tense action + scope, ≤~60 chars) once the work is genuinely complete.

**Take a turn** with `[!NOTE]+` if completion requires further input from the human, so the thread stays visually open. End the agent response with `<!--atag:eot-->`, then prefill a blank quoted separator and label-only human line:

```markdown
> *`claude`* Which direction should I take it? <!--atag:eot-->
>
> `human`
```

## If further human input required

When the tag is ambiguous, missing context, or non-actionable, **don't guess**. Do not invent facts, benefits, metrics, names, dates, or other specifics that are not present in the document. If the human asks you to make something concrete but the concrete detail is missing, wrap with `[!NOTE]+`, keep the original tag as the first body line, and ask for the missing detail:

```
> [!NOTE]+ awaiting clarification
>
> @claude tighten the wording above
>
> *`claude`* the wording above stretches back 12,000 words but your request sounds smaller. Confirm: (1) the last paragraph, (2) the last 4 paragraphs on this topic, or (3) the full doc. <!--atag:eot-->
>
> `human`
```

## Scanning for unresolved tags

Scan in two passes. Sort matched files by mtime descending before capping.

1. **Grep for new inline tags** — cheap single-line scan for unwrapped inline tags.

```sh
grep -rlnE --include='*.md' '^([^>]*[[:space:]])?@(agent|claude|codex)([^[:alnum:]_]|$)' <path>
```

Default agent names are `agent claude codex`. For custom triggers, replace the `agent|claude|codex` alternation with the custom alternation, e.g. `nora|hermes`.

2. **Inline awk for callout threads** — multiline scan for actionable `[!NOTE]+` and unsealed `[!DONE]-` callouts. Pass `trigger_alt` as the same alternation used above, e.g. `agent|claude|codex`, and `human_label` as the human speaker label, e.g. `human`.

```sh
find <path> -name '*.md' -exec awk -v trigger_alt='agent|claude|codex' -v human_label='human' '
BEGIN {
  trigger_re = "(^|[[:space:]])@(" trigger_alt ")([^[:alnum:]_]|$)"
  agent_re = "^[[:space:]]*(\\*`(" trigger_alt ")`\\*|`(" trigger_alt ")`)([[:space:]]|:|$)"
  human_placeholder_re = "^[[:space:]]*(\\*`" human_label "`\\*|`" human_label "`):?[[:space:]]*$"
  missing_human_name_re = "^[[:space:]]*<!--atag:missing-human-name "
}
function finish_callout() {
  if (in_callout && has_trigger) {
    if (callout_type == "note" && !sealed && !agent_last) print callout_file ":" start
    if (callout_type == "done" && !sealed) print callout_file ":" start
  }
  in_callout = 0
  callout_type = ""
  has_trigger = 0
  sealed = 0
  agent_last = 0
  callout_file = ""
}
function start_callout(type) {
  in_callout = 1
  callout_type = type
  has_trigger = 0
  sealed = 0
  agent_last = 0
  callout_file = FILENAME
  start = FNR
}
function process_quoted_line() {
  line = $0
  sub(/^[[:space:]]*>[[:space:]]*/, "", line)
  if (line ~ trigger_re) has_trigger = 1
  if (line !~ /^[[:space:]]*$/ && line !~ human_placeholder_re && line !~ missing_human_name_re) {
    sealed = (line ~ /<!--atag:eot-->[[:space:]]*$/)
    agent_last = (line ~ agent_re)
  }
}
FNR == 1 && NR > 1 { finish_callout() }
/^[[:space:]]*>[[:space:]]*\[!NOTE\]\+/ {
  finish_callout()
  start_callout("note")
  process_quoted_line()
  next
}
/^[[:space:]]*>[[:space:]]*\[!DONE\]-/ {
  finish_callout()
  start_callout("done")
  process_quoted_line()
  next
}
!in_callout { next }
$0 !~ /^[[:space:]]*>/ { finish_callout(); next }
{
  process_quoted_line()
}
END { finish_callout() }
' {} +
```

## Foreground polling script

For technical local use, `scripts/atag-poll.sh` runs the cheap scan in a foreground terminal loop and invokes Claude only when the scan finds work.

```sh
skills/atag/scripts/atag-poll.sh --dir /path/to/notes
```

Defaults:

- Polls every 60 seconds until the terminal closes or you press `Ctrl-C`.
- Prints one timestamped startup line: `[HH:MM]  Watching for @agent, @claude, @codex agent tags in /path/to/notes...`
- Prints nothing on no-match unless `--debug` is set.
- With `--debug`, no-match prints: `[HH:MM]  No @agent, @claude, @codex agent tags detected`.
- When a match is found, prints a compact status line like `[HH:MM]  atag-poll: found 1 agent tag match (@agent, @claude, @codex) in notes/file.md`.
- In regular mode, Claude startup prints `[HH:MM]  atag-poll: spawning claude agent to resolve...`.
- In `--debug`, the full Claude command/prompt line is also printed with a `[DEBUG]` prefix, and a heartbeat prints every 15 seconds while Claude is still running.
- On `Ctrl-C`, exits with a one-line interruption warning; if Claude had started editing, the markdown file may be partially updated.
- Runs Claude from the target directory with `claude -p --model opus --permission-mode acceptEdits --effort low`. This is an interim default from [ADR 2026-05-28](../../docs/adrs/2026-05-28-atag-poller-opus-low-default.md); pass Claude CLI args after `--` to override the default model or effort.
- Defaults `--response-style auto`: terminal stdout requests plain terminal text; piped/redirected/UI callers get Markdown. Use `--response-style terminal` or `--response-style markdown` to force it.
- Resolves the human speaker label from `--name`/`--user-name`, then `git config user.name`, GitHub user name, Unix username, and finally a non-colliding generic label, usually `user`.
- Uses a 30-minute timeout around Claude as a runaway guard.

⚠️ **Trust boundary:** the scanned notes are untrusted input that Claude reads and acts on with auto-accepted edits. Only run this against directories whose content you trust.

Useful options:

```sh
skills/atag/scripts/atag-poll.sh --once --dir /path/to/notes
skills/atag/scripts/atag-poll.sh --name "Human Example" --dir /path/to/notes
skills/atag/scripts/atag-poll.sh --debug --interval 30 --dir /path/to/notes
skills/atag/scripts/atag-poll.sh --response-style terminal --dir /path/to/notes
skills/atag/scripts/atag-poll.sh --dir /path/to/notes @pi
skills/atag/scripts/atag-poll.sh --dir /path/to/notes '@agento, @pi' -- --effort medium --max-budget-usd 1
skills/atag/scripts/atag-poll.sh --dir /path/to/notes -- --model sonnet --effort low --max-budget-usd 1
skills/atag/scripts/atag-poll.sh --dir /path/to/notes -- --model haiku --effort low --max-budget-usd 1
```

Custom triggers replace the defaults. Passing `@pi` scans for `@pi`, not `@agent`, `@claude`, or `@codex`.

## Tests

[`reference/markdown-agent-tags.spec.md`](reference/markdown-agent-tags.spec.md) documents scan edge cases, accepted false positives, and test fixtures.

**Smoke test after setup:** create a scratch `.md` file with a simple `@codex` tag, run the skill against that folder, and confirm the tag is wrapped in a sealed callout. Then add a human `> ...` follow-up after the `<!--atag:eot-->` token and run again; it should be picked up.

Contributor regression tests: run `bun test` after changing scan commands, agent defaults, callout markers, files under `reference/`, or `scripts/atag-poll.sh`.

## Final message

By default, keep the last assistant message brief and easy to override.

If there are no changes, use one line: `Scanned N files in <path>. No open unresolved @<triggers> tags detected.`

If there are changes or human input is required, output only:

- Changes made.
- Active threads left unchanged because the agent is waiting on the human.
- Changes that should have happened but could not.

Do not summarize already sealed `[!DONE]-` threads, skipped false positives, or previous work unless it directly explains a requested failure. Follow any user-specified summary format over this default. If the caller requests terminal plain text, do not use Markdown tables.

## Best practices

**Scheduled runs should exit asap.** When wrapping this skill in a scheduled task, gate the run on the Scanning commands and exit immediately if they return empty — don't invoke the skill on no-op runs.

**Don't prematurely limit results.** Actionable threads cluster in recently-touched files — sort matches by file mtime descending. If you must, cap after sorting.

**Callout is for discussion, not the work.** If the request asks for content — a paragraph, headline, checklist, code block, or YAML-shaped joke — put it in the **document body**. Use the callout only for discussion or a one-line acknowledgement.

**Proactively correct formatting.** Allow the human to write shorthand imperfectly, and normalize speaker labels to the inline-code no-colon format when you touch a thread.

**Reply using familiar agent name.** Use the agent name the user expects in your context (``*`claude`* ...``, ``*`codex`* ...``, ``*`pi`* ...``, ``*`hermes`* ...``, etc).

**Don't self-reply.** If the most recent speaker label in a `[!NOTE]+` thread is your agent label (for example ``*`claude`* reply``), the thread is waiting on the human. Leave it. If the same thread keeps showing up across scans with no human movement, mention it to the user.
