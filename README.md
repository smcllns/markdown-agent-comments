# Markdown Agent Comments

`mdac` lets you ask async agents for help directly inside markdown.

Write an `@agent` comment in a markdown file. The CLI finds it, invokes an agent, and the agent preserves the request plus its response in a markdown callout thread.

```markdown
@claude can you update this paragraph to a numbered list pls
```

After the agent resolves it:

```markdown
> [!DONE]- paragraph converted to list
>
> [@sam] @claude can you update this paragraph to a numbered list pls
>
> [@claude] done - updated to a 3-point list <!--mdac:eot-->
```

## Status

V1 is a local CLI for markdown folders and Obsidian vaults.

- Package: `markdown-agent-comments`
- Binary: `mdac`
- Website: `mdac.dev`
- Default triggers: `@agent`, `@claude`, `@codex`

## Local Use

From this checkout:

```bash
bun install
bun run test
node ./src/cli.js scan ~/Notes
```

After the package is published:

```bash
bun add -g markdown-agent-comments
mdac scan ~/Notes
```

## Commands

```bash
mdac scan <path>
```

Read-only scan. Prints files that contain actionable comments.

```bash
mdac run <path> --once
```

Scans once, then invokes an agent only if actionable comments exist.

```bash
mdac watch <path> --interval 60
```

Runs in the foreground and repeats the `run --once` behavior on an interval.

## Options

| Option | Meaning |
|---|---|
| `--trigger @name` | Replace the default trigger set. |
| `--name NAME` | Human speaker label used in threads. Defaults to `sam`. |
| `--agent-command CMD` | Command used by `run` and `watch`. |
| `--interval SEC` | Watch interval in seconds. Defaults to `60`. |
| `--debug` | Print scanner diagnostics to stderr. |

The default agent command is:

```bash
claude -p --permission-mode acceptEdits
```

You can override it per command:

```bash
mdac run ~/Notes --once --agent-command "claude -p --permission-mode acceptEdits"
```

Or with the environment:

```bash
MDAC_AGENT_COMMAND="claude -p --permission-mode acceptEdits" mdac watch ~/Notes
```

## Protocol

V1 recognizes inline comments and markdown callout threads.

```markdown
@agent I pasted this from terminal, can you fix formatting pls
```

```markdown
> [!NOTE] heading options
>
> [@sam] @agent can you give me three sharper options for this heading?
>
> [@agent] Option 1...
```

Thread markers:

- `[!NOTE]` means active.
- `[!DONE]-` means resolved.
- Agent replies end with `<!--mdac:eot-->`.

Important scanner rules:

- Custom triggers replace defaults.
- Inline code is the escape hatch: `` `@claude` `` does not match.
- Wrapped blockquote lines do not retrigger as fresh inline comments.
- If the latest real thread line is agent-authored, the thread is parked.
- If a human follows up after `<!--mdac:eot-->`, the thread becomes actionable again.

The original request should stay verbatim as the first body line inside the callout. The actual work belongs in the document body, not pasted into the discussion thread.

## Development

```bash
bun run test
node ./src/cli.js --help
```

Forward-looking product decisions live in [docs/PRD.md](docs/PRD.md). Historic explorations live under [docs/archive](docs/archive).
