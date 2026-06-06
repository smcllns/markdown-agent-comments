# Core Tests | Markdown Agent Comments

This folder owns deterministic tests for the portable core:

1. Does the scanner find the right actionable `@agent` comments?
2. Does `SKILL.md` keep required skill metadata and point to the core scanner?

## Quick Start

Run core tests only:

```sh
bun run test:core
```

Run the full suite:

```sh
bun run test
```

## What Is Where

- `scanner.test.js` checks scanner behavior, including temp-file edge cases.
- `skill.test.js` checks `SKILL.md` structure and scanner helper availability.
- `fixtures/scanner-cases.md` is the dense scanner regression fixture.
- `fixtures/scanner-cases.expected.json` is the exact scanner output expected for that fixture.

CLI adapter tests live in `../../../cli/test/`.
Skill evals live in `../eval/`.
The human-facing demo lives in `../../../demo/`.

Generated outputs such as `.generated/` directories and `runs/` directories are ignored and must not be committed.
