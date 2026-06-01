# Markdown Agent Tags spec — supported patterns

This document is **both the human reference and the source of the test suite**.
Each section below is one fixture: prose explains the pattern, and the fenced
block holds the markdown content. The fence's info string tells the runner
whether the scan should pick this file up:

- info `md @test:match` — unresolved scan should find this file
- info `md @test:nomatch` — unresolved scan should skip this file
- optional `@human:<label>` — run this fixture with a non-`sam` human label
- info `md @done:match` — DONE seal scan should find this file
- info `md @done:nomatch` — DONE seal scan should skip this file
- any other info string (or no fenced block) — ignored by the runner, free for
  prose, framing, and category headers (like this preamble)

The test also auto-generates one fixture per agent name in the documented
agent list. Add a name there → the fixture set extends automatically.

The unresolved scan catches **three** kinds of thing: `@agent` tags that have
not been wrapped yet, active `[!NOTE]+` callouts where the human needs another
agent turn, and `[!DONE]-` callouts whose latest nonblank quoted line does not
end with `<!--atag:eot-->`.

The marker is the protocol signal: only `+` on `[!NOTE]` and `-` on `[!DONE]`
indicate an agent thread. Bare `[!NOTE]`, `[!NOTE]-`, `[!DONE]`, and `[!DONE]+`
are all plain markdown callouts — the scans ignore them. This way the agent
never has to inspect a regular note-taking callout to figure out it's not for
them.

The DONE seal is deliberately append-friendly: a human can type directly after
the token, without a blank quoted separator or speaker label, and the thread
becomes unresolved until an agent inspects it and reseals the final reply. v1
does not prefill `[!DONE]-` follow-up lines.

Inside callouts, `@name` is only for the original trigger tag. Speaker labels
are inline-code sender/from fields with no trailing colon or punctuation. Agent
replies start with an emphasized inline-code label like ``*`claude`* reply``
and end with `<!--atag:eot-->` after yielding the turn. Human replies start
with a bare inline-code label like `` `sam` reply``.

Throughout this spec, `sam` is the example human speaker label. When adapting
the skill for another human, pass the agent's known name for that human with
`atag-poll.sh --name <name>` or replace `sam` in the examples and prefilled
human-label convention with that human's preferred short label. Agents/tools may
prefill that bare human label in active `[!NOTE]+` threads so the human can just
type the reply text. Label-only human-label lines are placeholders; other
code-only quoted lines remain real replies. Poller-provided names are normalized
to a simple lower-case label, using the first word for full names. Labels that
collide with the active agent trigger set are invalid for `--name` and skipped
during fallback; if the final fallback would collide, the poller uses the next
non-colliding generic label.

If no human name can be detected, agents/tools may use `user` or another
non-colliding generic label and include this quoted comment at the bottom of the
callout:

```md
> <!--atag:missing-human-name no human name detected; please ask the human what name agents should use and store it in AGENTS.md, git config user.name, or pass --name to atag-poll.sh.-->
```

---

## Callouts

Discussion threads spawned from an `@agent` tag use two markers:
`[!NOTE]+` while open, `[!DONE]-` when resolved.

### Active agent thread — `[!NOTE]+`

The only marker form that triggers the scan as an agent thread.

```md @test:match
> [!NOTE]+ @claude tighten the intro
```

### Active agent thread — sealed agent reply

The agent already replied and yielded the turn, so the scanner skips it until
the human replies.

```md @test:nomatch
> [!NOTE]+ awaiting direction
>
> @claude make this better
>
> *`claude`* Which direction should I take it? <!--atag:eot-->
```

### Active agent thread — agent-last reply

Active threads may not have the seal yet. If the latest nonblank quoted line is
an agent speaker label, the scanner treats it as waiting on the human.

```md @test:nomatch
> [!NOTE]+ awaiting direction
>
> @claude make this better
>
> *`claude`* Which direction should I take it?
```

### Active agent thread — legacy bare agent-last reply

Older active threads used bare inline-code agent labels. The scanner still
accepts them so existing notes do not become actionable forever.

```md @test:nomatch
> [!NOTE]+ awaiting direction
>
> @claude make this better
>
> `claude` Which direction should I take it?
```

### Active agent thread — legacy colon speaker label

New output omits the colon after speaker labels, but the scanner still accepts
older colon-form agent replies so existing notes do not become actionable
forever.

```md @test:nomatch
> [!NOTE]+ awaiting direction
>
> @claude make this better
>
> `claude`: Which direction should I take it?
```

### Active agent thread — human reply after agent turn

Once the human replies after the sealed agent turn, the thread is actionable
again.

```md @test:match
> [!NOTE]+ awaiting direction
>
> @claude make this better
>
> *`claude`* Which direction should I take it? <!--atag:eot-->
>
> `sam` make it more concrete
```

### Active agent thread — prefilled human label placeholder

Agents/tools may prefill the next human speaker label after yielding in an
active thread. A label-only placeholder is not a reply yet, so the scanner
skips it.

```md @test:nomatch
> [!NOTE]+ awaiting direction
>
> `sam` @claude make this better
>
> *`claude`* Which direction should I take it? <!--atag:eot-->
>
> `sam`
```

### Active agent thread — legacy emphasized human label placeholder

The old prefilled human label form is still treated as a placeholder, not a
reply, so existing prefilled threads do not retrigger.

```md @test:nomatch
> [!NOTE]+ awaiting direction
>
> `sam` @claude make this better
>
> *`claude`* Which direction should I take it? <!--atag:eot-->
>
> *`sam`*
```

### Active agent thread — missing human name placeholder comment

When no human name can be detected, the fallback label and explanatory comment
are both placeholders, not a reply.

```md @test:nomatch @human:user
> [!NOTE]+ awaiting direction
>
> `sam` @claude make this better
>
> *`claude`* Which direction should I take it? <!--atag:eot-->
>
> `user`
> <!--atag:missing-human-name no human name detected; please ask the human what name agents should use and store it in AGENTS.md, git config user.name, or pass --name to atag-poll.sh.-->
```

### Active agent thread — human reply after prefilled label

Once the human types real content after the prefilled label, the thread is
actionable again.

```md @test:match
> [!NOTE]+ awaiting direction
>
> `sam` @claude make this better
>
> *`claude`* Which direction should I take it? <!--atag:eot-->
>
> `sam` make it more concrete
```

### Active agent thread — human reply on line after prefilled label

If the human leaves the prefilled label alone and types on the next quoted
line, the placeholder is ignored and the typed line still makes the thread
actionable.

```md @test:match
> [!NOTE]+ awaiting direction
>
> `sam` @claude make this better
>
> *`claude`* Which direction should I take it? <!--atag:eot-->
>
> `sam`
> make it more concrete
```

### Active agent thread — code-only human reply after prefilled label

Only the skill's human label is a placeholder. If the human replies on the next
line with a code-only token, the thread is actionable.

```md @test:match
> [!NOTE]+ awaiting direction
>
> `sam` @claude which command?
>
> *`claude`* Which command should I use? <!--atag:eot-->
>
> `sam`
> `bun`
```

### Bare `[!NOTE]` — plain markdown, not an agent thread

A `[!NOTE]` without `+` is a regular Obsidian note callout. The scan skips it
even though it looks like a callout, because the protocol uses `+` to mark
"agent thread, active."

```md @test:nomatch
> [!NOTE] Just a regular note callout, not for the agent
```

### `[!NOTE]-` — plain markdown, not an agent thread

Same rule: only `+` indicates an agent thread.

```md @test:nomatch
> [!NOTE]- A collapsed note callout — still plain markdown
```

### Resolved agent thread — `[!DONE]-`

The canonical resolved marker. A sealed resolved thread ends the final
agent-authored quoted line with `<!--atag:eot-->`.

```md @test:nomatch @done:nomatch
> [!DONE]- resolved agent thread
>
> @claude already handled
>
> *`claude`* done. <!--atag:eot-->
```

### Bare `[!DONE]` — plain markdown

`[!DONE]` without `-` is a regular markdown callout. Filtered by the scan
either way (the regex doesn't look for `[!DONE]`).

```md @test:nomatch @done:nomatch
> [!DONE] Just a regular done-style callout
```

### `[!DONE]+` — plain markdown

Same as above — filtered by the scan.

```md @test:nomatch @done:nomatch
> [!DONE]+ Some other plain done callout
```

### Unsealed wrapped tag inside a `[!DONE]-` callout

Once an `@claude` tag is wrapped in `[!DONE]-`, the leading `>` on its
line makes the inline-tag regex skip it (the regex requires a non-`>`
line start). The DONE seal scan still reports this callout unless the latest
nonblank quoted line ends with `<!--atag:eot-->`.

```md @test:match @done:match
> [!DONE]- @claude already wrapped
```

### Human follow-up inside `[!DONE]-`

The grep scan skips this, but the DONE seal scan reports the callout because the
human wrote after the seal.

```md @test:match @done:match
> [!DONE]- tightened intro
>
> @claude tighten the intro
>
> *`claude`* done, tightened it. <!--atag:eot-->
> one more tweak please
```

### Resealed agent reply after human follow-up inside `[!DONE]-`

The DONE seal scan skips this because the latest nonblank quoted line ends with
the seal token.

```md @test:nomatch @done:nomatch
> [!DONE]- tightened intro
>
> @claude tighten the intro
>
> *`claude`* done, tightened it. <!--atag:eot-->
> one more tweak please
>
> *`claude`* done, tightened it again. <!--atag:eot-->
```

### Multiple DONE callouts with one unsealed

Any unsealed DONE callout in a file makes the file actionable.

```md @test:match @done:match
> [!DONE]- first
>
> @claude first task
>
> *`claude`* done. <!--atag:eot-->

> [!DONE]- second
>
> @codex second task
>
> *`codex`* done.
```

### Tag inside an indented blockquote

Whitespace-indented blockquote — still a blockquote line, still filtered out.
The regex's `^[^>]` clause handles this.

```md @test:nomatch
   > [!DONE] @claude inside indented blockquote
```

---

## Inline tags

An `@<agent>` mention asking the agent to do something. Picked up by the scan,
resolved by wrapping in a callout (see `SKILL.md`).

### Tag at line-start

The bread-and-butter case.

```md @test:match
@claude please pull in the canonical doc link here
```

### Tag indented by two spaces

Indent doesn't change intent — still a tag.

```md @test:match
  @claude indented two spaces
```

### Tag indented by one space

Single space, caught after PR #94 round-2.

```md @test:match
 @claude single-space indent
```

### Tag tab-indented

Tab indent, also caught.

```md @test:match
	@claude tab-indented
```

### Mid-line tag

An `@claude` reference inside running prose, not at line start.

```md @test:match
see @claude for the rule (mid-line)
```

### Trailing tag

A tag at the end of a sentence is still actionable.

```md @test:match
tell me my options please @claude
```

### Resolved inline task tag

When a tag was inline on a task item, the resolved body task should no longer
contain the live trigger. The original task line is preserved verbatim inside
the sealed callout immediately after the affected block.

```md @test:nomatch @done:nomatch
- [x] brainstorm a `config.yml` shaped joke

> [!DONE]- drafted config.yml joke
>
> - [ ] brainstorm a `config.yml` shaped joke @claude do this pls
>
> *`claude`* done — joke above. <!--atag:eot-->
```

---

## Inline code spans (escape hatch)

Wrapping a tag in inline backticks is the canonical way to write the
syntax in prose without firing the scan. The regex requires whitespace before
`@`, and a backtick is not whitespace.

### Code-span tag

```md @test:nomatch
The scan should not fire on `@claude` references inside backticks.
```

---

## Negative cases

Things that look like tags but shouldn't trigger the scan.

### Plain prose

No callout, no `@agent` — nothing to do.

```md @test:nomatch
just regular markdown, nothing to find
```

### No word boundary after agent name

The pattern requires a non-word character (or end-of-line) after the agent
name. `@claudewhatever` doesn't have one — it's a different mention.

```md @test:nomatch
@claudewhatever not a tag (no word boundary)
```

### Word starting with an agent prefix

False-positive risk for short agent names. `@agency` doesn't match `@agent`
because there's no word boundary after `agent` (the `c` is a word char).

```md @test:nomatch
@agency false-positive risk for agent
```

### No whitespace before `@`

`contact@claude.com` is an email, not a tag. The regex requires either
line-start or whitespace before `@`.

```md @test:nomatch
reach me at contact@claude.com if needed
```

### Literal `[!NOTE]+` in prose

Plain prose or code-like text mentioning the marker is not an agent callout. The
callout scan requires a blockquoted callout start.

```md @test:nomatch
The literal marker [!NOTE]+ should not trigger outside a blockquote callout.
```

---

## Accepted false positives

Edge cases we _could_ filter but choose not to — the cost of a perfect regex
exceeds the value.

### Hyphenated agent name like `@claude-team`

`-` is a non-word char, so the word-boundary check triggers right after
`claude`. The whole `@claude-team` matches. Rare enough that we accept it.

```md @test:match
@claude-team please review
```

### Tag inside a fenced code block

`grep` doesn't parse code fences, so an `@claude` inside ` ``` ` triple-backticks
will still match. Use **inline code spans** (single backticks) to escape — see
above. Fenced blocks are accepted FPs because filtering them needs a real
markdown parser.

````md @test:match
```text
@claude inside a code block
```
````
