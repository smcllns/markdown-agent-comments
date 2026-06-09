# ADR 0002: Trigger Command Routing Belongs To The CLI

Status: Accepted
Date: 2026-06-09

## Context

Markdown Agent Comments scans markdown for actionable trigger comments and invokes local agent CLIs through `mdac`. Trigger labels now imply specific local commands: `@claude` should mean Claude, `@codex` should mean Codex, and `@agent` should mean the user's preferred default agent.

The scanner must stay deterministic and machine-independent. Config, command availability, PATH checks, routing, and process execution are local adapter concerns.

## Decision

Implement trigger command routing in the CLI adapter.

### Built-ins

Start with three built-in agent IDs:

- `claude`
- `codex`
- `pi`

Default scanner triggers are:

- `@agent`
- `@agents`
- `@claude`
- `@codex`
- `@pi`

`@agents` is an alias for `@agent`.

### Config

Use JSON config.

Config locations:

1. Global: `$XDG_CONFIG_HOME/mdac/config.json`, falling back to `~/.config/mdac/config.json`
2. Project: `.mdac.json` discovered from the target path or current directory upward

Precedence:

1. CLI flags
2. Environment variables
3. Project config
4. Global config
5. Built-ins

Merge behavior:

- `agents` merge by key.
- `defaultAgent` replaces the prior list.
- `triggers` replaces the prior list.

Fail fast on invalid JSON or unknown top-level keys.

```json
{
  "defaultAgent": ["claude", "codex", "pi"],
  "triggers": ["agent", "agents", "claude", "codex", "pi"],
  "agents": {
    "claude": { "command": "claude -p --permission-mode acceptEdits" },
    "codex": { "command": "codex exec --full-auto" },
    "pi": { "command": "pi -p" }
  }
}
```

`defaultAgent` is list-only. Custom triggers are supported by defining an agent with the same name and adding that trigger to `triggers`.

### Routing

- `@agent` and `@agents` use the first installed command from `defaultAgent`.
- If no `defaultAgent` candidate is installed and an `@agent` or `@agents` comment exists, `run` and `watch` fail with setup instructions.
- Explicit triggers such as `@claude` do not fallback. If the explicit command is missing, that job is skipped and reported.
- Unknown configured triggers are skipped and reported.
- `scan` remains pure and does not check command availability.

### Execution

- Batch comments by trigger label.
- Do not combine `@agent` and `@codex` into one process even if `@agent` resolves to Codex.
- Each trigger label runs at most once per run cycle.
- After each successful agent process, rescan and rebuild remaining jobs.
- Runtime command failure stops the cycle, returns nonzero, and reports partial completion.

### Doctor

Add `mdac doctor [path]`.

Doctor prints:

- config files used
- effective triggers
- `defaultAgent` candidates and installed/missing status
- resolved route table and command source
- problems

Doctor exits nonzero for invalid config or no installed default-agent command. Missing unused built-ins are informational.

## Consequences

Benefits:

- Trigger labels map to inspectable local CLIs.
- `@agent` stays convenient while remaining explicit through `defaultAgent`.
- Missing explicit CLIs do not block unrelated runnable jobs.
- `doctor` gives users a way to debug config and PATH issues.

Tradeoffs:

- Config loading adds CLI complexity.
- Runtime partial edits are not rolled back.
- Trigger aliases such as `@reviewer -> codex` are deferred; first-version custom triggers duplicate command strings.

## Alternatives Considered

- One global `--agent-command`: too magical once trigger labels imply specific local CLIs.
- Route-only config: simpler shape, but mixes trigger aliases and command definitions.
- Include a larger popular-agent registry immediately: too much unverified command-template risk.
- Make `scan` report command availability: blurs scanner work detection with local machine state.
- Fail the whole run when an explicit CLI is missing: too brittle for independent comments.
