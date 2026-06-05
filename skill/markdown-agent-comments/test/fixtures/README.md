# Markdown Agent Comments Fixtures

These fixtures travel with the skill as examples and regression material.

- `demo.md` and `demo.processed.md` are a human-readable before/after pair.
- `scanner-cases.md` and `scanner-cases.expected.json` are exhaustive scanner regression fixtures.
- `skill-evals/` contains agent-eval inputs, judge-only expected outputs, prompts, and ignored generated run directories.

Scanner note: a `[!DONE]-` thread is actionable again when a human adds a follow-up after the latest `<!--mdac:eot-->`, so the scanner fixture intentionally includes a `kind: "done"` expected match.

Generated outputs such as `.generated/` and `skill-evals/runs/` are ignored and must not be published.
