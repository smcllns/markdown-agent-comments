# CLI and Spec

Status: COMPLETE

## Task

Extract the best current CLI, scanner, thread protocol, tests, and known gotchas from prior `atag`, `md-asks`, `markdown-agent-comments`, and `markdown-agent-directives` work.

## Findings

## Strongest Protocol Decisions

- Treat `/Users/smcllns/Projects/dotfiles/agents/skills/atag` as the strongest source where it disagrees with `/Users/smcllns/Projects/skills/skills/atag`.
- Core shape: `@agent`, `@claude`, and `@codex` comments create callout threads.
- `[!NOTE]+` means active. `[!DONE]-` means resolved. Bare callouts are plain markdown.
- Preserve the original request verbatim inside the callout.
- Put actual edits in the document body, not inside the callout.
- Agent replies should end with `<!--mdac:eot-->` in the new project.
- If the agent spoke last, even with a question, the thread is parked on the human.
- Speaker-label ergonomics matter, but label-only placeholders must not retrigger the scanner.

## Scanner Rules To Preserve

- Two-pass scan:
  - inline `@agent` comments with line-start/whitespace-before and word-boundary-after rules
  - multiline callout scan for actionable `[!NOTE]+` and unsealed `[!DONE]-`
- Default triggers: `agent`, `claude`, `codex`.
- Custom triggers replace defaults.
- Skip inline triggers inside blockquotes so wrapped requests do not retrigger.
- Inline backticks are the escape hatch.
- Accept bounded false positives instead of building a full Markdown parser in V1.
- Sort matched files by mtime before capping.

## CLI Surface

Recommended V1:

```sh
mdac scan /path/to/notes
mdac run /path/to/notes --once
mdac watch /path/to/notes --interval 60
mdac run /path/to/notes --name Sam --trigger @pi
```

`scan` is read-only. `run --once` is the Sam-first resolver path. `watch` is a foreground polling loop, not launchd/cron.

## Tests To Port First

- `docs/archive/prior-art/atag/reference/markdown-agent-tags.spec.md`
- `docs/archive/prior-art/atag/reference/markdown-agent-tags.spec.test.ts`
- `docs/archive/prior-art/atag/reference/atag-poll.test.ts`
- selected behavioral examples from `docs/archive/prior-art/obsidian-comments/tests/RESULTS.md`

## V1 Recommendation

V1 should focus on `@agent` comments only. Do not keep `#agent` directive compatibility in the default scanner/resolver.

Keep `#agent` as legacy prior art. A later `mdac scan --legacy-hash` inventory mode may be useful, but default V1 should not auto-resolve `#agent`.
