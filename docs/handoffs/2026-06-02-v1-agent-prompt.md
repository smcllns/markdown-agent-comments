# V1 agent prompt handoff

## Decision

V1 should preserve the agent-behavior contract from the historic `atag` skill instead of using the shortest possible prompt.

The compact prompt in the first CLI pass was too small. It kept the core markers but dropped important operating rules, including inline-trigger cleanup, task checkbox updates, clarification behavior, turn formatting, parked-thread semantics, and the outcome-title convention.

## What changed

The CLI prompt in `skill/markdown-agent-comments/scripts/cli.js` now points agents at repo-local `skill/markdown-agent-comments/cli-preprompt.md` plus `skill/markdown-agent-comments/SKILL.md`, then passes runtime scan facts:

- `[!NOTE]`, not `[!NOTE]+`
- `[!DONE]-`
- `<!--mdac:eot-->`, not `<!--atag:eot-->`
- `[@user]` / `[@agent]` speaker labels
- no scanner, poller, grep, awk, or legacy directive guidance

## Regression guard

`skill/markdown-agent-comments/test/cli-run.test.js` protects the prompt handoff through the spawned-agent stub.

It asserts that the CLI passes a thin prompt with the skill path, matched scan facts, and normalized human label behavior. V1.5 can shrink the prompt further, but should keep that end-to-end contract green or update it only with a deliberate product decision.
