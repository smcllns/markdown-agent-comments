# npm Publish Workflow Plan

Status: workflow committed; trusted publishing setup pending

Goal: publish `markdown-agent-comments` from GitHub Actions when `main` contains an unpublished package version.

## Scope

- Add `.github/workflows/publish.yml`.
- Use Bun for install/test.
- Use npm CLI only for OIDC trusted publishing, because npm currently requires npm CLI for trusted publisher auth.
- Avoid long-lived npm token secrets.
- Document npm-side setup and first-publish bootstrap limitation.

## Tasks

- [x] Add publish workflow.
- [x] Add setup notes for npm trusted publishing.
- [x] Validate YAML and local tests.
- [x] Commit workflow setup.

## Notes

- Placeholder `markdown-agent-comments@0.0.1` is published on npm.
- Configure npm trusted publisher before the real `0.1.0` publish:
  - package: `markdown-agent-comments`
  - repository: `smcllns/markdown-agent-comments`
  - workflow filename: `publish.yml`
  - environment: `npm`
  - allowed action: `npm publish`
