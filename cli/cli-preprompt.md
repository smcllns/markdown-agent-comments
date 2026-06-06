# mdac CLI adapter

You were invoked by the `mdac` CLI.

Use these instructions only as CLI-specific context. The canonical behavior contract is `SKILL.md`.

## Runtime Facts

The CLI prompt supplies:

- active trigger set
- matched files and line/reason details
- whether `--name` supplied an explicit human label
- whether debug mode is enabled

Process only the matched files and reasons supplied by the CLI. Do not rescan broadly unless the supplied facts are inconsistent with the files.

If debug mode is enabled, write occasional plaintext progress updates to stdout so the developer can tell the process has not stalled. The user cannot answer during this run; continue to completion yourself.

## Final stdout

Keep final stdout plain and concise:

- say what changed
- list active threads left waiting on the human
- do not use markdown tables
- do not dump full callouts unless the human asks for them
