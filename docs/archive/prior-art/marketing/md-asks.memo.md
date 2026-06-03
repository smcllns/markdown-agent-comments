---
uuid: mUkOZDqUhKVEUoRqjL5rzFV8
created: 2026-05-22
updated:
shortURL:
summary: "A tiny markdown protocol for asking agents to do things from inside your notes: write `@claude do X`, get back a resolved callout."
category: Code & AI
---
# md-asks: @-mentioning agents from inside markdown

I do a lot of my thinking inside Obsidian. Sometimes mid-paragraph I want to nudge an agent to do something on a specific spot in a note — tighten this bit, pull in a link, fact-check that claim. Switching out to a terminal to describe what I want and where breaks my flow. Writing it inline does not.

So: I write `@claude` (or `@codex`, or `@whoever`) right next to the thing I want help with. An agent picks it up later, does the work, and wraps the exchange in a callout so the thread stays with the spot it was about.

<!-- TODO: demo-before-after.png — side by side: left = note with "@claude tighten this above"; right = same note with green [!DONE]- callout -->

## The shape of an ask

A bare `@claude` mention is a brand-new ask. Once the agent picks it up, the ask gets wrapped in a callout that has two states:

- **`[!NOTE]+`** — open thread (amber). The human spoke last, the agent's turn.
- **`[!DONE]-`** — resolved (green, auto-collapsed). The work is done.

<!-- TODO: callout-states.png — amber [!NOTE]+ above a green collapsed [!DONE]- -->

The `+`/`-` markers are load-bearing. They're how the agent decides which callouts are "for it" vs. the regular note-taking callouts everywhere else in the vault. From the skill:

> The marker is the protocol signal: only `+` on `[!NOTE]` and `-` on `[!DONE]` indicate an agent thread. Bare `[!NOTE]`, `[!NOTE]-`, `[!DONE]`, and `[!DONE]+` are all plain markdown callouts — the scan ignores them. This way the agent never has to inspect a regular note-taking callout to figure out it's not for them.

The nice side effect: Obsidian uses `+`/`-` to mean "start expanded / start collapsed" — so resolved threads fold themselves out of the way and open ones stay visible.

## The contract

The piece that took the most iteration was pinning down what the agent does once it picks up an ask. The current wording:

> - Read the file and enough surrounding context to understand the request.
> - Use any better-matching skill/tool first when one applies.
> - Do the requested work when it is concrete — edit the **document body**, not the callout. The callout gets a one-line acknowledgement; the actual change goes where the user asked for it.
> - For discussion-only asks (no doc change requested), answer concisely inside the callout.
> - If the ask sits on a task item, update the checkbox too.
> - **Never remove or modify the original ask.** It must appear verbatim as the first body line of the resulting callout, in both `[!DONE]-` and `[!NOTE]+` cases.

The bit I kept tripping over in early versions was "edit the document body, not the callout." Agents wanted to paste rewrites *into the discussion thread* instead of just making the edit in the doc. The callout is for talking *about* the work, not *being* the work.

## When the ask is ambiguous

The agent isn't supposed to guess. It leaves the thread open and asks back:

```markdown
> [!NOTE]+ awaiting clarification
>
> @claude tighten the wording above
>
> @claude: the wording above stretches back 12,000 words but your ask sounds smaller. Confirm: (1) the last paragraph, (2) the last 4 paragraphs on this topic, or (3) the full doc.
```

I reply by adding a `@human: …` paragraph and resaving. The thread is now "human spoke last" → the next scan picks it back up.

<!-- TODO: multi-turn-thread.png — open amber thread with 2-3 back-and-forth turns -->

## The spec

The skill itself is small. The pattern catalog — what counts as an ask, what doesn't, which edge cases are accepted on purpose — lives next to it as a spec that doubles as the test suite:

→ [markdown-agent-directives.spec.md](https://github.com/smcllns/skills/blob/main/skills/md-asks/reference/markdown-agent-directives.spec.md)

It's a rough first pass at a "markdown agent directives spec." If you want something similar in your own setup, the spec is the precise behaviour and the [SKILL.md](https://github.com/smcllns/skills/blob/main/skills/md-asks/SKILL.md) is the agent's instructions for honouring it.
