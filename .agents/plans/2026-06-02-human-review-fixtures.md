# Human Review Fixtures Plan

Status: in progress

Goal: add markdown fixtures Sam can read before publish to align on detection and expected processed behavior.

## Scope

- Add a human-readable markdown input fixture under `test/`.
- Add tests that assert the scanner detects exactly the intended fixture cases.
- Add a script that writes a human-readable processed-output markdown file for subjective review.
- Add a package script for the review flow.

## Tasks

- [ ] Add review input fixture.
- [ ] Add scanner fixture test.
- [ ] Add processed-output generator.
- [ ] Add `test:review` script.
- [ ] Run verification and open review files.
- [ ] Commit changes.

## Notes

- Scanner assertions are deterministic.
- Processed output is a curated expected-behavior artifact for human review, not a claim that the CLI has a deterministic resolver.
