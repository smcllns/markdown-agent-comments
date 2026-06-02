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
- [ ] Push local `main` to GitHub once Sam approves the initial main push.
- [ ] Create GitHub environment `npm` with branch policy allowing `main`.
- [ ] Configure npm trusted publisher for `smcllns/markdown-agent-comments`.

## Notes

- Placeholder `markdown-agent-comments@0.0.1` is published on npm.
- Live check on 2026-06-02: `markdown-agent-comments@0.1.0` returned 404 from npm registry, so the real V1 version is still available.
- GitHub repo currently has no remote branch refs. Local `main` contains the publish workflow, but it has not been pushed.
- `gh api` attempt to create environment `npm` failed with `403 Must have admin rights to Repository` using the current `yolo-sam` token.
- Configure npm trusted publisher before the real `0.1.0` publish:
  - package: `markdown-agent-comments`
  - repository: `smcllns/markdown-agent-comments`
  - workflow filename: `publish.yml`
  - environment: `npm`
  - allowed action: `npm publish`
