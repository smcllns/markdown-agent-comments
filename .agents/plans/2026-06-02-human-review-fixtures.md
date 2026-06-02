# Human Review Fixtures Plan

Status: in progress

Goal: add markdown fixtures Sam can read before publish to align on detection and expected processed behavior.

## Scope

- Add a human-readable markdown input fixture under `test/`.
- Add tests that assert the scanner detects exactly the intended fixture cases.
- Add a script that writes a human-readable processed-output markdown file for subjective review.
- Add a package script for the review flow.

## Tasks

- [x] Add review input fixture.
- [x] Add scanner fixture test.
- [x] Add processed-output generator.
- [x] Add `test:review` script.
- [x] Run verification and open review files.
- [x] Commit changes.
- [x] Rename review files around human-readable purpose.
- [x] Keep generated review output ignored.

## Notes

- Scanner assertions are deterministic.
- Processed output is a curated expected-behavior artifact for human review, not a claim that the CLI has a deterministic resolver.
- `test/human-review/README.md` is the human guide.
- `test/human-review/agent-input.md` is the clean markdown an agent may read.
- `test/human-review/.generated/processed-output.md` is generated and ignored.
- Use `Markdown Agent Comments` in human-facing titles; reserve `mdac` for CLI commands, package/binary references, protocol tokens, and URLs.
