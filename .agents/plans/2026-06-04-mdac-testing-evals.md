# MDAC Testing And Skill Evals Plan

## Goal

Build a testing setup that catches regressions in the markdown-agent-comments scanner, gives agents a realistic skill execution eval suite, and provides humans a readable demo of what the tool does and does not touch.

## Current State

- Unit tests cover scanner behavior through inline fixtures in `test/scanner.test.js`.
- CLI tests cover prompt assembly and agent command wiring in `test/cli-run.test.js`.
- Human review fixtures live under `test/human-review/` and are useful, but they mix three jobs:
  - scanner regression coverage
  - agent/skill behavior examples
  - human-readable demo material
- The canonical skill now lives at `skill/markdown-agent-comments/SKILL.md`.
- CLI-only guidance now lives at `skill/markdown-agent-comments/cli-preprompt.md`.
- `skill/markdown-agent-comments/scripts/scan-mdac.js` currently wraps the shared scanner implementation.

## Proposed Shape

### 1. Scanner Regression Fixture

Purpose: deterministic binary regression tests for what counts as a markdown-agent-comments ask.

Files:

- `test/fixtures/scanner-cases.md`
- `test/fixtures/scanner-cases.expected.json`

Coverage:

- Supported triggers: `@codex`, `@claude`, `@agent`, plus configured triggers.
- Supported labels: exact trigger labels and accepted human reply labels.
- Callout handling: open asks in `[!NOTE]+` blocks.
- Closed-thread handling: ignore `[!DONE]-` and sealed threads.
- Code handling: ignore fenced code blocks, including fenced code inside callouts.
- False positives: email addresses, ordinary markdown links, prose mentions, historical examples, quoted snippets.
- Multi-ask ordering and line number stability.

Verification:

- Add or update a test that runs the scanner against `scanner-cases.md`.
- Assert the full JSON result matches `scanner-cases.expected.json`.
- Keep this fixture intentionally exhaustive and machine-oriented.

### 2. Skill Eval Fixtures

Purpose: evaluate whether an agent using only the skill can process realistic files correctly.

Files:

- `test/fixtures/skill-evals/input/*.md`
- `test/fixtures/skill-evals/expected/*.md`
- `test/fixtures/skill-evals/runs/<run-id>/...` ignored/generated

Why separate `input/` and `expected/`:

- The executing agent should be pointed only at `input/`.
- The judge can compare the produced output against `expected/`.
- This reduces accidental "cheating" by making expected outputs out of scope for the executor prompt.

Initial cases:

- `single-thread.md`: one clear actionable ask, simple response.
- `mixed-open-closed.md`: one open ask plus closed or irrelevant threads that must not change.
- `code-and-examples.md`: trigger-looking text inside code/examples must be ignored.
- `multi-turn-thread.md`: existing user/agent callout where the agent must append, not overwrite.
- `quality-sensitive.md`: ask requires a real answer, not just mechanical DONE wrapping.

Execution model:

- Executor agent receives the canonical skill and one or more files under `input/`.
- Executor writes processed files into a generated run directory.
- Judge agent reads `input/`, `expected/`, and executor output.
- Judge produces structured results and narrative findings.

Suggested result schema:

```json
{
  "runId": "2026-06-04T18-00-00Z-codex",
  "executor": "codex",
  "judge": "claude-or-codex",
  "cases": [
    {
      "case": "mixed-open-closed.md",
      "score": 0.86,
      "status": "pass-with-notes",
      "dimensions": {
        "detection": 1,
        "placement": 1,
        "threadFormat": 1,
        "taskQuality": 0.6,
        "nonRegression": 1
      },
      "findings": [
        "Answer was correct but less specific than expected."
      ]
    }
  ]
}
```

Rubric:

- `detection`: found every intended open ask and no ignored asks.
- `placement`: response appended in the right thread/location.
- `threadFormat`: callout label, DONE state, and end marker are correct.
- `taskQuality`: answer satisfies the human request, not just the file mechanics.
- `nonRegression`: unrelated content is unchanged.

Verification:

- First version may be semi-manual: a script prepares a run directory and prints exact executor/judge prompts.
- Later version can automate the executor and judge when the agent command is stable.
- Include at least one recorded run showing partial-credit scoring, not only binary pass/fail.

### 3. Human Demo Fixture

Purpose: pleasant, quick-read overview for humans evaluating the tool.

Files:

- `test/fixtures/demo.md`
- `test/fixtures/demo.processed.md`

Content:

- A short realistic markdown document.
- A few common open asks that should be processed.
- A few common false positives that should remain unchanged.
- Not exhaustive and not optimized for machine coverage.

Verification:

- Update `scripts/generate-review-output.js` or replace it with a fixture-oriented script.
- Keep `demo.processed.md` committed so humans can diff input vs output without running anything.
- Keep generated scratch output ignored.

## Implementation Phases

### Phase 1: Fixture Split

- Move the current human-readable fixture content toward `test/fixtures/demo.md`.
- Commit `test/fixtures/demo.processed.md`.
- Add `test/fixtures/scanner-cases.md` and `scanner-cases.expected.json`.
- Update tests to use the scanner fixture.

### Phase 2: Skill Evals Skeleton

- Add `test/fixtures/skill-evals/input/` and `expected/`.
- Add 3-5 initial eval cases.
- Add ignored `runs/` directory pattern.
- Add a README explaining executor vs judge roles.

### Phase 3: Eval Harness

- Add a small script to create a run directory and print/copy executor instructions.
- Add a judge script or prompt template that emits JSON using the result schema.
- Keep the first harness simple and explicit before automating model calls.

### Phase 4: Dogfood And Tighten

- Run the scanner tests and demo generation.
- Run at least one skill eval with an agent executor.
- Run a judge pass and record the result.
- Tighten SKILL.md and fixtures based on observed failures.

## Definition Of Done

- `bun run test` passes.
- Scanner fixture test fails on meaningful scanner regressions.
- Demo fixture is readable as documentation and has committed before/after files.
- Skill eval fixtures separate executor-visible inputs from judge-only expected files.
- At least one eval run produces structured scoring with partial-credit findings.
- README or plan docs explain how to run scanner tests, demo review, and skill evals.
- No expected-answer files are included in executor prompts.
- Any generated run/output directories are ignored.

## Open Questions For Sam

- Should the first skill eval harness be semi-manual, or should it immediately spawn an executor agent?
- Which executor/judge pair do we want first: Codex executing and Claude judging, Claude executing and Codex judging, or both?
- Should we move the scanner implementation into `skill/markdown-agent-comments/scripts/scan-mdac.js` before doing this work, so the skill script is canonical and the CLI imports from it?
- Should the human demo live only under `test/fixtures/`, or should README also link to it as the primary demo?
