# ADR 0001: Repository Layout Follows Ownership Boundaries

Status: Accepted
Date: 2026-06-05

## Context

Markdown Agent Comments has one portable core and multiple possible wrappers.

The core is the human-readable skill contract plus deterministic scanner:

- `skill/markdown-agent-comments/SKILL.md`
- `skill/markdown-agent-comments/scripts/scanner.js`

The CLI is an adapter over that core. Future coding-agent plugins and a desktop app should also be adapters or wrappers over the same core behavior, not alternate places where scan rules or protocol rules are reimplemented.

The repository previously mixed deterministic tests, product demos, eval harnesses, generated run folders, and workflow scripts inside `skill/markdown-agent-comments/test/`. That made ownership unclear and encouraged future agents to treat `test/scripts/` as a catch-all.

## Decision

Keep files with the thing that owns them:

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

desktop/
  # future adapter

plugins/
  # future adapters
```

`runs/` directories are generated and ignored.

## Rules

- Core behavior and deterministic core tests live under `skill/markdown-agent-comments/`.
- Skill evals live under `skill/markdown-agent-comments/eval/` because they validate whether an agent following `SKILL.md` behaves correctly.
- Adapter code and adapter tests live with each adapter, such as `cli/` and eventually `desktop/` or `plugins/`.
- The human-facing demo lives at `demo/` because it explains the product, not just the skill internals.
- Do not put workflow entrypoints in `test/scripts/`; put them with the workflow they run.
- Do not duplicate scanner or protocol logic in adapters.

## Consequences

The package scripts must compose tests across ownership folders. That is worth the small script complexity because the file tree communicates the architecture directly.

Future wrappers can be added without disturbing the core:

- `desktop/` for a tray or desktop wrapper
- `plugins/<adapter>/` for coding-agent plugin wrappers

Root-level `eval/` remains available for future product-wide or adapter-matrix evals. The current eval harness is skill-owned and stays under the skill.
