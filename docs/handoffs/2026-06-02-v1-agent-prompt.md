# V1 agent prompt handoff

## Decision

V1 should preserve the agent-behavior contract from the historic `atag` skill instead of using the shortest possible prompt.

The compact prompt in the first CLI pass was too small. It kept the core markers but dropped important operating rules, including inline-trigger cleanup, task checkbox updates, clarification behavior, turn formatting, parked-thread semantics, and the outcome-title convention.

## What changed

`buildAgentPrompt()` in `src/cli.js` now includes V1-relevant guidance from `skills/atag/SKILL.md`, translated to the current protocol:

- `[!NOTE]`, not `[!NOTE]+`
- `[!DONE]-`
- `<!--mdac:eot-->`, not `<!--atag:eot-->`
- `[@sam]` / `[@agent]` speaker labels
- no scanner, poller, grep, awk, or legacy directive guidance

## Regression guard

`test/agent-prompt.test.js` protects the prompt contract.

It asserts that the prompt includes the important V1 behavior requirements and does not carry forward historical scanner instructions or obsolete markers. V1.5 can shrink the prompt, but should keep this test green or update it only with a deliberate product decision.
