# Markdown Agent Comments Fixtures

These fixtures travel with the skill as scanner regression material.

- `scanner-cases.md` and `scanner-cases.expected.json` are exhaustive scanner regression fixtures.

Scanner note: a `[!DONE]-` thread is actionable again when a human adds a follow-up after the latest `<!--mdac:eot-->`, so the scanner fixture intentionally includes a `kind: "done"` expected match.

Generated outputs such as `.generated/` and `runs/` are ignored and must not be published.
