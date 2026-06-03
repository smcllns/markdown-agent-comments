# npm Publish Workflow Plan

Status: workflow committed locally; remote push and trusted publishing setup pending

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
- [x] Verify `markdown-agent-comments@0.1.0` is still unpublished on npm.
- [x] Push local `main` to GitHub once Sam approves the initial main push.
- [x] Create GitHub environment `npm` with branch policy allowing `main`.
- [x] Configure npm trusted publisher for `smcllns/markdown-agent-comments`.
- [x] Fix npm publish warning by using `bin.mdac = "src/cli.js"`.

## Notes

- Placeholder `markdown-agent-comments@0.0.1` is published on npm.
- Live check on 2026-06-02: `markdown-agent-comments@0.1.0` returned 404 from npm registry, so the real V1 version is still available.
- GitHub repo currently has no remote branch refs. Local `main` contains the publish workflow, but it has not been pushed.
- `gh api` attempt to create environment `npm` failed with `403 Must have admin rights to Repository` using the current `yolo-sam` token.
- First workflow run failed at `npm publish` before trusted publishing was configured and warned that `bin.mdac = "./src/cli.js"` was auto-corrected. Use `src/cli.js`.
- GitHub environment `npm` now exists with required reviewer `smcllns`; `can_admins_bypass` is still true.
- Configure npm trusted publisher before the real `0.1.0` publish:
  - package: `markdown-agent-comments`
  - repository: `smcllns/markdown-agent-comments`
  - workflow filename: `publish.yml`
  - environment: `npm`
  - allowed action: `npm publish`
