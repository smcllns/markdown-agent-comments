# V1 next steps

## Current status

`markdown-agent-comments@0.1.1` is published on npm.

Verified today:

- GitHub Actions trusted publish succeeded: `https://github.com/smcllns/markdown-agent-comments/actions/runs/26857702615`
- Registry metadata is live at `https://registry.npmjs.org/markdown-agent-comments/0.1.1`
- Published tarball exposes the `mdac` binary path and uses `DEFAULT_HUMAN_LABEL=human`.
- Published tarball smoke passed for `--help`, `scan`, and `run --once` on a tiny markdown fixture with a stub agent.
- Local test suite and human-review generator pass.

## Tomorrow sequence

1. Review the V1 human-review fixture and generated processed output:
   - `test/human-review/README.md`
   - `test/human-review/agent-input.md`
   - `test/human-review/.generated/processed-output.md` after `bun run test:review`
2. Run `mdac` as the main CLI for the maintainer's Obsidian workflows for the day.
3. Patch anything that blocks real daily use, especially:
   - install/run command ergonomics
   - watch-mode noise
   - agent prompt behavior on real notes
   - false positives or parked-thread surprises
4. Ship a quick V1 `mdac.dev` page focused on the terminal solution:
   - what it is
   - install command
   - before/after example
   - GitHub and npm links
5. After terminal dogfooding feels reliable, add thin plugin packaging for coding agents. Plugins should call the CLI and avoid duplicating protocol rules.

## Keep out of scope for tomorrow

- Desktop wrapper
- Sweep/archive automation
- Rewriting the agent prompt for compactness
- Reintroducing legacy `#agent` or `#silent` behavior
