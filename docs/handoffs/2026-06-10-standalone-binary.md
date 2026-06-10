# Standalone macOS binary + one-command install (v0.1.4)

Shipped a zero-prerequisite install path so non-technical users can get `mdac`
with one command. Status: **done and live** (npm 0.1.4, GitHub Release v0.1.4,
`curl … install.sh` verified end-to-end).

## Two install paths

- **macOS, no runtime:** `curl -fsSL https://raw.githubusercontent.com/smcllns/markdown-agent-comments/main/install.sh | sh`
  → standalone binary to `~/.local/bin`.
- **Any OS with a JS runtime:** `bun add -g markdown-agent-comments`.

## Architecture (what changed and why)

- `cli/cli.js` is now a **pure library** — its top-level auto-run was removed
  because it misfired when bundled into the compiled binary.
- `cli/bin.js` — node/npm entrypoint (`package.json` `bin` points here).
- `cli/compiled-entry.js` — **Bun-only** entrypoint for `bun build --compile`.
  Embeds `cli-preprompt.md` + `SKILL.md` via `with { type: "text" }` and injects
  them through `configureAssets()` in cli.js.
- `cli/materialize-skill.js` — on first run the binary writes `SKILL.md` to
  `~/.agents/skills/markdown-agent-comments/` (override: `MDAC_SKILL_DIR`),
  write-if-changed, then points the spawned agent at that path.
- `.github/workflows/release.yml` — on a `v*` tag: builds `darwin-arm64` +
  `darwin-x64`, smoke-tests the host-arch binary, publishes a GitHub Release via
  `gh`. `npm run build:binaries` does the same locally.

## Landmines / gotchas

- **Bun `--compile`**: top-level side-effects (`if (isDirectRun())`) run inside
  the bundled binary and crash on the `/$bunfs/` path — keep entrypoints thin and
  cli.js side-effect-free. `scanner.js` `isDirectRun` is try/catch-guarded for
  the same reason.
- **Can't import one file as both code and text**: cli.js imports `scanner.js`
  as a code module, so it cannot also be embedded as `type:"text"`. That's why
  the binary does **not** ship the on-disk scanner — in CLI mode the binary
  pre-scans and supplies matched files, so the agent doesn't need it. The npm
  package still ships the scanner on disk.
- **Release prerequisite**: `install.sh` reads `releases/latest`, so it 404s
  until a `v*` tag has been cut and the workflow has published binaries.

## Next (later)

- **Linux/Windows binaries** — not built (no machines to test on). `install.sh`
  refuses non-macOS cleanly and points to `bun add -g`. To add: extend the
  `release.yml` matrix with `bun-linux-x64`/`-arm64` (+ Windows) targets and the
  arch/OS cases in `install.sh`.
