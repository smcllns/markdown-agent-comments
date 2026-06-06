# npm publish workflow handoff

## Current result

`markdown-agent-comments@0.1.1` was published successfully from GitHub Actions after the maintainer approved the `npm` environment deployment.

- Successful run: `https://github.com/smcllns/markdown-agent-comments/actions/runs/26857702615`
- Registry version URL: `https://registry.npmjs.org/markdown-agent-comments/0.1.1`
- Published `0.1.1` bin metadata was `{"mdac":"src/cli.js"}`; current dogfood work moves the bin to `skill/markdown-agent-comments/scripts/cli.js`.
- Published `0.1.1` tarball smoke passed by downloading the npm tarball and running `node package/src/cli.js --help`, and running `scan` plus the then-current one-shot `run` command on a tiny fixture with a stub agent.

Local `bun add markdown-agent-comments@0.1.1` is expected to fail briefly on the local machine because the Bun wrapper enforces a minimum package release age. That is a local supply-chain guard, not an npm publish failure.

## What is configured

`.github/workflows/publish.yml` runs on pushes to `main` and on manual dispatch.

The workflow:

- runs the Bun test suite
- checks whether `package.json` version changed in the pushed commit
- treats manual dispatch as an explicit publish check
- checks whether the current `package.json` version already exists on npm before publishing
- skips publish if the version already exists
- publishes only changed, missing versions
- uses GitHub OIDC trusted publishing instead of a long-lived npm token
- targets the GitHub environment named `npm`

## Why npm CLI appears in the workflow

Local development stays on Bun.

The publish step uses npm CLI because npm trusted publishing currently requires npm CLI with Node 22.14.0 or newer. Bun publish supports token-based automation through `NPM_CONFIG_TOKEN`, but that would reintroduce a long-lived token.

## GitHub setup

The GitHub environment is configured:

- Environment name: `npm`
- Deployment branches and tags: selected branches and tags
- Allowed branch: `main`
- Required reviewer: `smcllns`

The environment branch rule is important because npm trusted publishing is configured against a repository, workflow filename, and optional environment. The environment gives GitHub a place to reject publish jobs from non-main refs and require the maintainer's approval before publish.

## npm setup

The package name is now secured on npm.

Bootstrap completed:

- Published placeholder: `markdown-agent-comments@0.0.1`
- Registry URL: `https://www.npmjs.com/package/markdown-agent-comments`
- Tarball contained only `package.json`, `README.md`, and `LICENSE`.

Trusted publishing is configured on npm:

- Package: `markdown-agent-comments`
- Provider: GitHub Actions
- Organization or user: `smcllns`
- Repository: `markdown-agent-comments`
- Workflow filename: `publish.yml`
- Environment name: `npm`
- Allowed action: `npm publish`

After the trusted publisher succeeds, npm recommends setting publishing access to require 2FA and disallow tokens.

## Expected future automated runs

The next push to `main` with a new `package.json` version should run tests, wait for the maintainer `npm` environment approval, and publish automatically after approval. Re-running a workflow for an already-published version should skip publishing.

Adding or changing non-version files on `main` should run tests but skip publish.
