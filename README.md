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
> [@user] @claude can you update this paragraph to a numbered list pls
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
node ./cli/cli.js scan ~/Notes
```

Install the published CLI:

```bash
bun add -g markdown-agent-comments
mdac scan ~/Notes
```

Manual agent use:

Ask an agent chat to use `skill/markdown-agent-comments/SKILL.md` on one or more markdown files. The skill is the canonical behavior contract; the CLI is one way to supply scan results and invocation context.

## Commands

```bash
mdac scan <path>
```

Read-only scan. Prints files that contain actionable comments.

```bash
mdac run <path>
```

Scans once, then invokes an agent only if actionable comments exist.

```bash
mdac watch <path> --interval 60
```

Runs in the foreground and repeats the `run` behavior on an interval. Clean watch cycles stay quiet by default; use `--debug` to print scan diagnostics.

## Options

| Option | Meaning |
|---|---|
| `--trigger @name` | Replace the default trigger set. |
| `--name NAME` | Optional human speaker label used in threads. Omit this when no name is known. |
| `--agent-command CMD` | Command used by `run` and `watch`. The prompt is appended as the final argument. |
| `--interval SEC` | Watch interval in seconds. Defaults to `60`. |
| `--debug` | Print scanner diagnostics to stderr. |

The default agent command is:

```bash
claude -p --permission-mode acceptEdits
```

You can override it per command:

```bash
mdac run ~/Notes --agent-command "claude -p --permission-mode acceptEdits"
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
> [@user] @agent can you give me three sharper options for this heading?
>
> [@agent] Option 1...
```

Thread markers:

- `[!NOTE]` means active.
- `[!DONE]-` means resolved.
- Agent replies end with `<!--mdac:eot-->`.
- A quoted speaker line that is only an unknown bracket label, such as `> [@sam]`, is treated as a parked human placeholder even when `--name` is omitted. Add actual request text on that line or later in the thread to make it actionable.

Important scanner rules:

- Custom triggers replace defaults.
- Inline code is the escape hatch: `` `@claude` `` does not match.
- Fenced code blocks are ignored.
- Wrapped blockquote lines do not retrigger as fresh inline comments.
- If the latest real thread line is agent-authored, the thread is parked.
- If a human follows up after `<!--mdac:eot-->`, the thread becomes actionable again.

The callout should preserve the trigger and request text, plus only the surrounding body text needed to understand what changed. Edit the document body only when the human clearly asks for a document change; suggestions, options, explanations, reviews, and fallback notes belong in the discussion thread.

## Development

Core skill/scanner artifacts live under `skill/markdown-agent-comments/`. The CLI adapter lives under `cli/`.

```bash
bun run test
node ./cli/cli.js --help
```

For human review before publishing:

```bash
MDAC_DEMO_AGENT_COMMAND="codex exec --ignore-user-config --ignore-rules --ephemeral --skip-git-repo-check --full-auto -m gpt-5.3-codex-spark" bun run test:review
```

This runs the test suite, copies the committed demo fixture to an ignored generated run directory, invokes the real Markdown Agent Comments skill with the configured LLM command, and scans the generated output. The committed processed demo is a curated reference fixture:

- `demo/demo.md`
- `demo/demo.processed.md`

For skill evals:

```bash
bun run eval:prepare -- --executor codex
bun run eval:verify -- --run <run-id> --write
bun run eval:judge -- --run <run-id> --judge-command "claude -p"
```

Eval inputs and expected outputs live under `skill/markdown-agent-comments/eval/cases/`. Generated run directories are ignored.

Forward-looking product decisions live in [docs/PRD.md](docs/PRD.md). Historic explorations live under [docs/archive](docs/archive).
