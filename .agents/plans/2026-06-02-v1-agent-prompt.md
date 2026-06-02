# V1 Agent Prompt Plan

Status: complete

Goal: preserve the important agent-behavior contract from the old `atag` skill in the V1 `mdac` agent prompt.

## Scope

- Port V1-relevant guidance from `skills/atag/SKILL.md`.
- Translate historic names/markers to current `mdac` protocol.
- Exclude old scanner, poller, `#agent`, and `[!NOTE]+` guidance.
- Add prompt regression tests so V1.5 can shrink the prompt deliberately.

## Tasks

- [x] Add failing prompt contract tests.
- [x] Expand V1 agent prompt.
- [x] Confirm tests reject historical markers and scanner instructions.
- [x] Update handoff notes.
- [x] Run verification and commit.

## V1.5 Follow-Up

- Reduce prompt length only after tests protect the behavior contract.
- Prefer removing redundancy before removing requirements.
