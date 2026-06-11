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
- Default triggers: `@agent`, `@agents`, `@claude`, `@codex`, `@pi`

## Install

One command (macOS), no JavaScript runtime required:

```bash
curl -fsSL https://raw.githubusercontent.com/smcllns/markdown-agent-comments/main/install.sh | sh
```

The URL points straight at [`install.sh`](install.sh) in this repo, so you can
read exactly what it runs before piping it to `sh`. It downloads a standalone
`mdac` binary to `~/.local/bin`. On first run it installs the Markdown Agent
Comments skill to `~/.agents/skills/markdown-agent-comments/`.

Or install the published CLI via a JS runtime (any OS):

```bash
bun add -g markdown-agent-comments
mdac scan ~/Notes
```

## Local Use

From this checkout:

```bash
bun install
bun run test
node ./cli/bin.js scan ~/Notes
```

Agent-led onboarding:

Ask your coding agent to read [`NUX.md`](NUX.md) and onboard one markdown folder carefully. The new-user flow starts with a safe temp-file demo, then read-only scanning, then one approved narrow run.

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

```bash
mdac doctor [path]
```

Prints resolved config, triggers, routes, and command availability.

## Options

| Option | Meaning |
|---|---|
| `--trigger @name` | Replace the default trigger set. |
| `--name NAME` | Optional human speaker label used in threads. Omit this when no name is known. |
| `--agent-command CMD` | Override the `@agent` / `@agents` command. The prompt is appended as the final argument. |
| `--route @name=CMD` | Override one trigger command for this invocation. |
| `--default-agent LIST` | Override the `@agent` / `@agents` fallback list. Comma-separated. |
| `--interval SEC` | Watch interval in seconds. Defaults to `60`. |
| `--debug` | Print scanner diagnostics to stderr. |

Built-in routes are:

```bash
@claude -> claude -p --permission-mode acceptEdits
@codex  -> codex exec --full-auto
@pi     -> pi -p
```

`@agent` and `@agents` use `defaultAgent`, an ordered fallback list. The first installed candidate wins. The built-in list is `claude,codex,pi`.

You can override the default route per command:

```bash
mdac run ~/Notes --agent-command "claude -p --permission-mode acceptEdits"
```

Or with the environment:

```bash
MDAC_AGENT_COMMAND="claude -p --permission-mode acceptEdits" mdac watch ~/Notes
```

Config is JSON. Global config lives at `$XDG_CONFIG_HOME/mdac/config.json`, falling back to `~/.config/mdac/config.json`. Project config lives in `.mdac.json` discovered from the target path upward. Precedence is CLI flags, environment, project config, global config, then built-ins.

```json
{
  "defaultAgent": ["claude", "codex", "pi"],
  "triggers": ["agent", "agents", "claude", "codex", "pi"],
  "agents": {
    "reviewer": {
      "command": "codex exec --full-auto"
    }
  }
}
```

Environment overrides:

- `MDAC_AGENT_COMMAND`
- `MDAC_DEFAULT_AGENT=claude,codex`
- `MDAC_CLAUDE_COMMAND`
- `MDAC_CODEX_COMMAND`
- `MDAC_PI_COMMAND`

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
- Triggers match after punctuation and emphasis too: `(@claude please)` and `**@codex**` both count.
- A word character or `/` before the `@` never matches, so emails (`contact@claude.com`) and URL handles (`youtube.com/@claude`) stay quiet.
- Inline code is the escape hatch: `` `@claude` `` does not match.
- Fenced code blocks are ignored.
- Wrapped blockquote lines do not retrigger as fresh inline comments.
- A turn's leading speaker label like `[@claude]` is dialogue attribution, not a trigger. A thread stays scannable only while at least one turn's text contains a trigger mention — preserve the original request when wrapping a comment.
- If the latest real thread line is a sealed agent reply, the thread is parked. An agent reply missing the `<!--mdac:eot-->` seal is reported as `unsealed` — the signature of an interrupted reply.
- If a human follows up after `<!--mdac:eot-->`, the thread becomes actionable again.

The callout should preserve the trigger and request text, plus only the surrounding body text needed to understand what changed. Edit the document body only when the human clearly asks for a document change; suggestions, options, explanations, reviews, and fallback notes belong in the discussion thread.

## Security Model

`mdac run` and `mdac watch` turn markdown content into agent prompts, and the built-in Claude and Codex routes run agents with auto-accepted edits (`claude -p --permission-mode acceptEdits`, `codex exec --full-auto`). That means:

- **Any actionable `@agent` comment in watched markdown becomes an agent prompt.** Pasted terminal output, synced notes, downloaded files, or content other people can write into shared folders may contain trigger-shaped instructions the agent will follow with edit permissions in that folder.
- The agent runs with its working directory set to the scanned folder, so its file access is whatever your agent CLI allows from there.

Practical guidance:

- Watch only folders whose contents you control. Start with `mdac scan` (read-only) on anything new.
- Treat pasted or imported content like untrusted input: scan it, read what matched, then run.
- To tighten the blast radius, override the route with a stricter command, e.g. `--agent-command "claude -p --permission-mode default"` to keep edit approval manual.
- Resolved threads are ordinary markdown in your file — git history remains your audit trail.

## Development

Core skill/scanner artifacts live under `skill/markdown-agent-comments/`. The CLI adapter lives under `cli/`.

```bash
bun run test
node ./cli/bin.js --help
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
