# Protocol Constants Review Plan

Status: complete

Goal: address the engineering review findings without adding a heavy abstraction layer.

## Scope

- Add regression coverage for human-label normalization consistency.
- Centralize only machine-significant protocol constants and normalizers.
- Tighten `--agent-command` quote handling enough to fail clearly.
- Keep prompt prose inline and readable.

## Tasks

- [x] Add failing tests for label normalization and command quoting.
- [x] Add small protocol module.
- [x] Use protocol helpers in scanner and CLI.
- [x] Run full verification.
- [x] Commit changes.

## Reviewer Input

Subagent finding: avoid broad abstraction; extract a tiny protocol/constants module for shared markers/defaults and fix split human-label normalization.
