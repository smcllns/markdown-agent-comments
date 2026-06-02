# Protocol Constants Review Plan

Status: in progress

Goal: address the engineering review findings without adding a heavy abstraction layer.

## Scope

- Add regression coverage for human-label normalization consistency.
- Centralize only machine-significant protocol constants and normalizers.
- Tighten `--agent-command` quote handling enough to fail clearly.
- Keep prompt prose inline and readable.

## Tasks

- [ ] Add failing tests for label normalization and command quoting.
- [ ] Add small protocol module.
- [ ] Use protocol helpers in scanner and CLI.
- [ ] Run full verification.
- [ ] Commit changes.

## Reviewer Input

Subagent finding: avoid broad abstraction; extract a tiny protocol/constants module for shared markers/defaults and fix split human-label normalization.
