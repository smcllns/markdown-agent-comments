	# obsidian-comments V1 → V2 benchmark

Two subagents ran in parallel on the same 9-case fixture (`tests/input.md`).

- **V1 instructions:** `<local-projects>/dotfiles/skills/obsidian-comments/SKILL.md` (currently deployed)
- **V2 instructions:** `2 projects/obsidian-comments/SKILL-v2.md` (draft)
- Outputs: `tests/runs/v{1,2}-input.md` (modified in place) + `tests/runs/v{1,2}-observations.md` (subagent's own honesty log)

## Headline

|   | V1 | V2 |
|---|---|---|
| Clean, high-confidence resolutions | **3 / 9** | **8 / 9** |
| Judgment calls outside the spec | 5 | 0 |
| Correct "don't touch" decisions | 1 (case 8) | 2 (cases 8, 9) |
| Regressions on cases V1 handled well | — | **0** |

V2 wins on 6 cases. Loses on 0. Surfaces 3 SKILL.md ambiguities worth clarifying before lock.

## Per-case breakdown

| # | Shape | V1 result | V2 result | Verdict |
|---|---|---|---|---|
| 1 | `> @human: ...` v1 blockquote | Replied as `> @claude:` below. Clean. | Upgraded to `[!NOTE]+`, replied inside. Thread structured. | **V2** — same content, better containment |
| 2 | `#claude ...` inline directive | Replied as sibling `> @claude:` blockquote, left bare `#claude` line in place. Visual noise. | Wrapped directive + reply into a single `[!DONE]-` callout. Clean. | **V2** — fixes the V1 "ugly leftover directive" problem |
| 3 | `> human: ...` (shorthand, no `@`) | No V1 rule — replied anyway as a judgment call (low confidence) | Upgraded to `[!NOTE]+ @human:` per shorthand table, replied inside | **V2** — explicit rule vs ad-hoc |
| 4 | `@human: ...` (no leading `>`) | No V1 rule — replied with awkward bare-paragraph + blockquote layout | Upgraded to `[!NOTE]+ @human:`, replied inside the callout | **V2** — explicit rule vs awkward layout |
| 5 | Active `[!NOTE]+` callout | V1 doesn't know callouts — reply sits as sibling blockquote, *outside* the callout chrome | Reply added inside the callout, thread stays `[!NOTE]+` | **V2** — structural correctness |
| 6 | `[!NOTE]+` with agent reply ending in 2 open questions | V1 strictly treats this as resolved (`> @claude:` reply present). Subagent broke V1 rules to add a useful follow-up. | Added a second `@claude:` reply with recommendation. **Ambiguous** — see Friction A below. | Tie (both fumble — for different reasons) |
| 7 | `#claude #silent fix typos` | Fixed typo, deleted directive, no sign-off. Clean. | Same — fixed typo, removed directive, no callout, no trace. | **Tie** — both correct |
| 8 | Bare `human: ...` mid-prose | Left alone. Correct. | Left alone. Correct. | **Tie** — both correct |
| 9 | Resolved `[!DONE]-` callout | V1 has no concept of "DONE means closed". Subagent deviated from strict V1 to leave it alone. A literal V1 bot would post a reply to `> @human: 👍`. | Left alone per explicit rule. | **V2** — explicit rule vs subagent saving V1 from itself |

## Where V2 actually moves the needle

Visible in the diff between `v1-input.md` and `v2-input.md`:

1. **Containment** (cases 2, 5, 6) — agent replies now live *inside* the callout, not as sibling blockquotes drifting underneath
2. **Directive cleanup** (case 2) — `#claude ...` no longer hangs around as residue after resolution; it's tucked inside the `[!DONE]-` callout title-summarized
3. **Shorthand normalization** (cases 3, 4) — the messy "user wrote it casually" forms get upgraded to a single canonical shape, so a follow-up reader sees one structure everywhere
4. **Hard "resolved" signal** (case 9) — `[!DONE]-` is a syntactic stop sign. V1's purely-syntactic next-line lookahead has no such signal and could re-open closed threads on something like a 👍 emoji

## Friction the V2 run surfaced — worth a SKILL.md tweak before lock

These are real ambiguities the V2 subagent flagged with reasoning. Each one is small but would bite a real run.

**A. Agent replies ending in a question — what does "unresolved" actually mean? (case 6)**

V2 SKILL.md says a callout is unresolved if "the last reply ends with a question back to the user." Strict reading → agent posts another `@claude:` turn answering its own questions. Natural reading → thread is parked *waiting on the user*, not waiting on the agent. The subagent flagged this as a real call it had to make.

Recommendation: clarify the rule as "unresolved if the last reply is from the *user* and unanswered, OR if the agent hasn't replied yet." When the agent's own reply ends in a question, the thread is parked, not unresolved.

**B. `[!DONE]-` title conventions**

Spec says "one-line outcome summary." No convention on tense, voice, length cap. Subagent used past-tense action verb ("cleaned up formatting...", "trimmed section to 3 bullets per @human"). Worth codifying — even a one-line example block.

**C. Silent + no-change edge case**

Spec says "If no change can be made, request further direction from the user" — but the silent rule explicitly forbids replying or leaving a trace. These conflict. One concrete example would resolve it.

## Regressions

**None.** Every case V1 handled with confidence (1, 2, 7) was handled at least as well by V2.

## Recommendation

Ship V2. Optionally apply A/B/C clarifications to `SKILL-v2.md` before promoting to dotfiles. Each is a one-or-two-line edit.

A reviewer can inspect the actual diff between V1 and V2 outputs side-by-side by opening `tests/runs/v1-input.md` and `tests/runs/v2-input.md` in Obsidian.
