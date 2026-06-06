# MDAC Testing And Skill Evals Plan

## Goal

Build a testing setup that catches regressions in the markdown-agent-comments scanner, gives agents a realistic skill execution eval suite, and provides humans a readable demo of what the tool does and does not touch.

## Implemented State

- The canonical skill now lives at `skill/markdown-agent-comments/SKILL.md`.
- CLI-only guidance now lives at `cli/cli-preprompt.md`.
- The canonical scanner now lives at `skill/markdown-agent-comments/scripts/scanner.js`.
- Unit tests cover scanner behavior through `skill/markdown-agent-comments/test/scanner.test.js`.
- CLI tests cover prompt assembly and agent command wiring in `cli/test/cli-run.test.js`, `cli/test/cli-scan.test.js`, and `cli/test/cli-watch.test.js`.
- Human demo fixtures live under `demo/demo.md` and `demo/demo.processed.md`.
- Skill eval fixtures live under `skill/markdown-agent-comments/eval/`.
- Generated eval runs live under `skill/markdown-agent-comments/eval/runs/`, are ignored, and are excluded from the npm package.

## Proposed Shape

### 1. Scanner Regression Fixture

Purpose: deterministic binary regression tests for what counts as a Markdown Agent Comments comment.

Files:

- `skill/markdown-agent-comments/test/fixtures/scanner-cases.md`
- `skill/markdown-agent-comments/test/fixtures/scanner-cases.expected.json`

Coverage:

- Supported triggers: `@codex`, `@claude`, `@agent`, plus configured triggers.
- Supported labels: exact trigger labels and accepted human reply labels.
- Callout handling: open comments in `[!NOTE]` blocks.
- Closed-thread handling: ignore `[!DONE]-` and sealed threads.
- Code handling: ignore fenced code blocks, including fenced code inside callouts.
- False positives: email addresses, ordinary markdown links, prose mentions, historical examples, quoted snippets.
- Multi-comment ordering and line number stability.

Verification:

- Add or update a test that runs the scanner against `scanner-cases.md`.
- Assert the full JSON result matches `scanner-cases.expected.json`.
- Keep this fixture intentionally exhaustive and machine-oriented.

### 2. Skill Eval Fixtures

Purpose: evaluate whether an agent using only the skill can process realistic files correctly.

Files:

- `skill/markdown-agent-comments/eval/cases/input/*.md`
- `skill/markdown-agent-comments/eval/cases/expected/*.md`
- `skill/markdown-agent-comments/eval/runs/<run-id>/...` ignored/generated

Why separate `input/` and `expected/`:

- The executing agent should be pointed only at `input/`.
- The judge can compare the produced output against `expected/`.
- This reduces accidental "cheating" by making expected outputs out of scope for the executor prompt.

Initial cases:

- `single-thread.md`: one clear actionable comment, simple response.
- `mixed-open-closed.md`: one open comment plus closed or irrelevant threads that must not change.
- `code-and-examples.md`: trigger-looking text inside code/examples must be ignored.
- `multi-turn-thread.md`: existing user/agent callout where the agent must append, not overwrite.
- `quality-sensitive.md`: request requires a real answer, not just mechanical DONE wrapping.

Execution model:

- Executor agent receives the canonical skill and one or more files under `input/`.
- Executor writes processed files into a generated run directory.
- `eval:verify` reads `input/`, `expected/`, and executor output for deterministic protocol checks.
- `eval:judge` spawns an explicit local judge command with the generated `judge-prompt.md`.
- Judge output is written as `judge-result.json` when it returns valid JSON.

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

- `detection`: found every intended open comment and no ignored comments.
- `placement`: response appended in the right thread/location.
- `threadFormat`: callout label, DONE state, and end marker are correct.
- `taskQuality`: answer satisfies the human request, not just the file mechanics.
- `nonRegression`: unrelated content is unchanged.

Verification:

- First version is semi-manual for the executor: `eval:prepare` creates a run directory and exact executor/judge prompts.
- Judge automation is local and explicit: `eval:judge -- --run <run-id> --judge-command "<agent command>"`.
- `eval:verify` gives deterministic partial-credit protocol scoring; LLM judge output handles semantic quality.

### 3. Human Demo Fixture

Purpose: pleasant, quick-read overview for humans evaluating the tool.

Files:

- `demo/demo.md`
- `demo/demo.processed.md`

Content:

- A short realistic markdown document.
- A few common open comments that should be processed.
- A few common false positives that should remain unchanged.
- Not exhaustive and not optimized for machine coverage.

Verification:

- Replace `scripts/generate-review-output.js` with the real LLM demo runner at `demo/run-skill.js`.
- Keep `demo.processed.md` committed as a curated reference so humans can diff intended input vs output without running anything.
- Keep generated demo run output ignored under `demo/runs/`.

## Implementation Phases

### Phase 1: Fixture Split

- [x] Move the current human-readable fixture content toward `demo/demo.md`.
- [x] Commit `demo/demo.processed.md`.
- [x] Add `skill/markdown-agent-comments/test/fixtures/scanner-cases.md` and `scanner-cases.expected.json`.
- [x] Update tests to use the scanner fixture.

### Phase 2: Skill Evals Skeleton

- [x] Add `skill/markdown-agent-comments/eval/cases/input/` and `expected/`.
- [x] Add 3-5 initial eval cases.
- [x] Add ignored `runs/` directory pattern.
- [x] Add a README explaining executor vs judge roles.

### Phase 3: Eval Harness

- [x] Add a small script to create a run directory and print/copy executor instructions.
- [x] Add `eval:verify` for deterministic protocol scoring.
- [x] Add `eval:judge` and `judge-prompt.md` for explicit local LLM judge runs.
- [x] Keep the first harness simple and explicit before CI or model-matrix automation.

### Phase 4: Dogfood And Tighten

- [x] Run the scanner tests and real demo skill runner.
- [x] Run at least one skill eval with an agent executor.
- [x] Run a judge pass and keep results in ignored generated run output.
- [x] Tighten SKILL.md and fixtures based on observed failures.

## Definition Of Done

- `bun run test` passes.
- Scanner fixture test fails on meaningful scanner regressions.
- Demo fixture is readable as documentation and has committed before/after files.
- Skill eval fixtures separate executor-visible inputs from judge-only expected files.
- At least one eval run produces structured scoring with partial-credit findings.
- README or plan docs explain how to run scanner tests, demo review, and skill evals.
- No expected-answer files are included in executor prompts.
- Any generated run/output directories are ignored.
- `bun run test:review` invokes a real LLM demo run, not only a scanner summary.

## Resolved Questions

- The first executor harness is semi-manual.
- The first judge harness is a local explicit command wrapper, not CI automation.
- The scanner implementation is canonical at `skill/markdown-agent-comments/scripts/scanner.js`.
- The human demo lives under `demo/`, with `demo.processed.md` as curated reference and generated LLM demo runs under ignored `demo/runs/`.
