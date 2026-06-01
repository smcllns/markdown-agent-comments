# Directives spec — supported patterns

This document is **both the human reference and the source of the test suite**.
Each section below is one fixture: prose explains the pattern, and the fenced
block holds the markdown content. The fence's info string tells the runner
whether the scan should pick this file up:

- info `md @test:match` — scan should find this file
- info `md @test:nomatch` — scan should skip this file
- any other info string (or no fenced block) — ignored by the runner, free for
  prose, framing, and category headers (like this preamble)

The test also auto-generates one fixture per agent name in the documented
agent list. Add a name there → the fixture set extends automatically.

The scan catches **two** kinds of thing: `#agent` directives that haven't been
wrapped yet, and `[!NOTE]+` callouts (active agent threads). The marker is the
protocol signal: only `+` on `[!NOTE]` and `-` on `[!DONE]` indicate an agent
thread. Bare `[!NOTE]`, `[!NOTE]-`, `[!DONE]`, and `[!DONE]+` are all plain
markdown callouts — the scan ignores them. This way the agent never has to
inspect a regular note-taking callout to figure out it's not for them.

---

## Callouts

Discussion threads spawned from a `#agent` directive use two markers:
`[!NOTE]+` while open, `[!DONE]-` when resolved.

### Active agent thread — `[!NOTE]+`

The only marker form that triggers the scan as an agent thread.

```md @test:match
> [!NOTE]+ #claude tighten the intro
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

The canonical resolved marker.

```md @test:nomatch
> [!DONE]- resolved agent thread
```

### Bare `[!DONE]` — plain markdown

`[!DONE]` without `-` is a regular markdown callout. Filtered by the scan
either way (the regex doesn't look for `[!DONE]`).

```md @test:nomatch
> [!DONE] Just a regular done-style callout
```

### `[!DONE]+` — plain markdown

Same as above — filtered by the scan.

```md @test:nomatch
> [!DONE]+ Some other plain done callout
```

### Wrapped directive inside a `[!DONE]-` callout

Once a `#claude` directive is wrapped in `[!DONE]-`, the leading `>` on its
line makes the inline-directive regex skip it (the regex requires a non-`>`
line start).

```md @test:nomatch
> [!DONE]- #claude already wrapped
```

### Directive inside an indented blockquote

Whitespace-indented blockquote — still a blockquote line, still filtered out.
The regex's `^[^>]` clause handles this.

```md @test:nomatch
   > [!DONE] #claude inside indented blockquote
```

---

## Inline directives

A `#<agent>` mention asking the agent to do something. Picked up by the scan,
resolved by wrapping in a callout (see `SKILL.md`).

### Directive at line-start

The bread-and-butter case.

```md @test:match
#claude please pull in the canonical doc link here
```

### Directive indented by two spaces

Indent doesn't change intent — still a directive.

```md @test:match
  #claude indented two spaces
```

### Directive indented by one space

Single space, caught after PR #94 round-2.

```md @test:match
 #claude single-space indent
```

### Directive tab-indented

Tab indent, also caught.

```md @test:match
	#claude tab-indented
```

### Mid-line directive

A `#claude` reference inside running prose, not at line start.

```md @test:match
see #claude for the rule (mid-line)
```

### Trailing directive

Sam's case from 2026-05-19 — directive at the end of a sentence.

```md @test:match
tell me my options please #claude
```

---

## Inline code spans (escape hatch)

Wrapping a directive in inline backticks is the canonical way to write the
syntax in prose without firing the scan. The regex requires whitespace before
`#`, and a backtick is not whitespace.

### Code-span directive

```md @test:nomatch
The scan should not fire on `#claude` references inside backticks.
```

---

## Negative cases

Things that look like directives but shouldn't trigger the scan.

### Plain prose

No callout, no `#agent` — nothing to do.

```md @test:nomatch
just regular markdown, nothing to find
```

### No word boundary after agent name

The pattern requires a non-word character (or end-of-line) after the agent
name. `#claudewhatever` doesn't have one — it's a different tag.

```md @test:nomatch
#claudewhatever not a directive (no word boundary)
```

### Word starting with an agent prefix

False-positive risk for short agent names. `#agency` doesn't match `#agent`
because there's no word boundary after `agent` (the `c` is a word char).

```md @test:nomatch
#agency false-positive risk for agent
```

### No whitespace before `#`

`obsidian#claude` is a tag-on-word, not a directive. The regex requires either
line-start or whitespace before `#`.

```md @test:nomatch
mention obsidian#claude with no separator
```

---

## Accepted false positives

Edge cases we _could_ filter but choose not to — the cost of a perfect regex
exceeds the value.

### Hyphenated agent name like `#claude-team`

`-` is a non-word char, so the word-boundary check triggers right after
`claude`. The whole `#claude-team` matches. Rare enough that we accept it.

```md @test:match
#claude-team please review
```

### Directive inside a fenced code block

`grep` doesn't parse code fences, so a `#claude` inside ` ``` ` triple-backticks
will still match. Use **inline code spans** (single backticks) to escape — see
above. Fenced blocks are accepted FPs because filtering them needs a real
markdown parser.

````md @test:match
```text
#claude inside a code block
```
````
