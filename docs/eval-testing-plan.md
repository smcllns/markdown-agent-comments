# Markdown Agent Comments Testing And Eval Strategy

## Why This Exists

Markdown Agent Comments has two different correctness problems:

1. The scanner must deterministically find the right markdown comments and ignore false positives.
2. An agent using the skill must make good edits, preserve the thread protocol, and avoid touching unrelated content.

Those need different test shapes. Scanner behavior should be binary and regression-oriented. Skill behavior should be evaluated with realistic examples, partial-credit scoring, and human-readable findings. A demo fixture should be optimized for humans, not mistaken for exhaustive coverage.

## Goals

- Catch scanner regressions before they ship.
- Give agents realistic skill fixtures that test both protocol mechanics and answer quality.
- Make it easy for a human to understand what the tool does and does not affect.
- Keep executor-visible input separate from judge-only expected output.
- Avoid bloating one fixture until it is bad at every job.
- Keep core skill/scanner tests and small fixtures with the skill so the skill travels with its verification examples.
- Keep skill evals with the skill because they validate `SKILL.md`, not an adapter.
- Keep the human demo at `demo/` because it is product-facing, not a scanner fixture.
- Keep generated eval runs, generated demo output, and scratch artifacts out of git and out of the npm package.

## Non-Goals

- Do not make every skill eval binary pass/fail.
- Do not require fully automated model spawning before the fixture strategy is proven.
- Do not expose expected answers to the agent executing the skill.
- Do not treat the human demo as comprehensive regression coverage.

## Fixture Types

### Scanner Regression Fixtures

Purpose: deterministic binary tests for what counts as an actionable mdac comment.

Implemented files:

- `skill/markdown-agent-comments/test/fixtures/scanner-cases.md`
- `skill/markdown-agent-comments/test/fixtures/scanner-cases.expected.json`

Coverage includes the dense fixture plus focused unit tests for:

- Default triggers: `@agent`, `@claude`, `@codex`.
- Custom triggers in focused unit tests.
- Inline comments.
- Active `[!NOTE]` threads.
- Closed `[!DONE]-` threads.
- DONE follow-ups after `<!--mdac:eot-->`.
- Parked human placeholders.
- Fenced code blocks, including fenced code inside callouts.
- False positives such as email addresses, prose mentions, examples, and quoted snippets.
- Multi-file ordering and line-number stability where relevant.

Verification:

- A scanner test runs the fixture and asserts the full JSON result matches expected output.
- The fixture is allowed to be dense and machine-oriented.

### Skill Eval Fixtures

Purpose: evaluate whether an agent using only the skill processes realistic markdown correctly.

Implemented files:

- `skill/markdown-agent-comments/eval/cases/input/*.md`
- `skill/markdown-agent-comments/eval/cases/expected/*.md`
- `skill/markdown-agent-comments/eval/runs/<run-id>/...` ignored/generated

The executing agent should only be pointed at generated copies from `cases/input/`. The judge can read `cases/input/`, `cases/expected/`, and the produced output. This separation reduces accidental cheating and makes the executor prompt easier to reason about.

Initial cases:

- `single-thread.md`: one clear actionable comment.
- `mixed-open-closed.md`: one open comment plus closed or irrelevant threads that must not change.
- `code-and-examples.md`: trigger-looking text inside code/examples must be ignored.
- `multi-turn-thread.md`: existing user/agent callout where the agent must append, not overwrite.
- `quality-sensitive.md`: request requires a useful answer, not just mechanical DONE wrapping.

Suggested judge dimensions:

- `detection`: found every intended open comment and no ignored comments.
- `placement`: response was appended in the right thread/location.
- `threadFormat`: callout label, DONE state, and end marker are correct.
- `taskQuality`: answer satisfies the human request.
- `nonRegression`: unrelated content is unchanged.

Suggested result shape:

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

### Human Demo Fixtures

Purpose: provide a pleasant, quick-read overview for humans evaluating the tool.

Implemented files:

- `demo/demo.md`
- `demo/demo.processed.md`

The demo should be realistic and readable. It should show useful examples of comments that will be processed and common trigger-looking content that will not be affected. It should not try to be exhaustive.

`demo.processed.md` is a curated reference output, not proof that a current agent generated the exact text. The real demo review flow is `demo/run-skill.js`, which copies `demo.md` to an ignored generated run directory, invokes a real LLM command with `SKILL.md`, and scans the generated output.

## Repository And Package Shape

Core tests should live with the skill, while adapter tests should live with their adapter:

```text
skill/markdown-agent-comments/
  SKILL.md
  scripts/
    scanner.js
  test/
    scanner.test.js
    skill.test.js
    fixtures/
      scanner-cases.md
      scanner-cases.expected.json
  eval/
    README.md
    prepare.js
    verify.js
    judge.js
    judge-prompt.md
    cases/
      input/
      expected/
    runs/

cli/
  cli.js
  cli-preprompt.md
  test/
    cli-run.test.js
    cli-scan.test.js
    cli-watch.test.js

demo/
  README.md
  demo.md
  demo.processed.md
  run-skill.js
  test/
    demo.test.js
    run-skill.test.js
  runs/
```

Root-level `eval/` is reserved for future product-wide or adapter-matrix evals. Current evals are skill-owned.

Small committed tests and fixtures may ship with the package because they document and verify the portable core artifact, CLI adapter, demo, and skill eval harness. Generated outputs should not ship.

Required ignore/package rules:

- Ignore `skill/markdown-agent-comments/eval/runs/`.
- Ignore `demo/runs/`.
- Ignore `.generated/` directories.
- Do not include generated run logs, model transcripts, screenshots, or temporary judge output in npm package contents.
- Keep package contents small enough that installed users get useful examples without noisy artifacts.

## Execution Model

Start semi-manual with the checked-in eval scripts:

1. `bun run eval:prepare -- --executor <name>` creates a run directory.
2. The script writes the executor prompt.
3. The executor agent edits generated copies of the input files.
4. The deterministic verifier compares input, reference output, and actual output for protocol smoke checks.
5. `bun run eval:verify -- --run <run-id> --write` emits baseline structured scores plus mechanical findings.
6. `bun run eval:judge -- --run <run-id> --judge-command "<agent command>"` spawns an explicit local judge command with the generated `judge-prompt.md` and writes `judge-result.json` when the judge returns valid JSON.

Keep judge automation local and explicit until the fixtures and rubric are proven useful enough for CI or model-matrix runs.

## Definition Of Done

- `bun run test` passes.
- Scanner fixture tests fail on meaningful scanner regressions.
- Demo fixture is readable as documentation and has committed before/after files.
- Skill eval fixtures separate executor-visible inputs from judge-only expected files.
- At least one eval run produces structured scoring with partial-credit findings.
- Docs explain how to run scanner tests, demo review, and skill evals.
- Expected-answer files are not included in executor prompts.
- Generated run/output directories are ignored.
- `bun run test:review` invokes a real LLM demo run, not only a scanner summary.
- `bun pm pack --dry-run` shows committed tests/fixtures if desired, but no generated runs or scratch output.
