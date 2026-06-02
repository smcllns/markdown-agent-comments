# npm Publish Workflow Plan

Status: in progress

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

- Trusted publisher setup requires the package to already exist on npm.
- Configure npm trusted publisher after first manual publish:
  - package: `markdown-agent-comments`
  - repository: `smcllns/markdown-agent-comments`
  - workflow filename: `publish.yml`
  - environment: `npm`
  - allowed action: `npm publish`
