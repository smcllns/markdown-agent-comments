# Markdown Agent Comments Skill Evals

These fixtures evaluate whether an agent can use `SKILL.md` to process realistic markdown files.

## Directory Roles

- `input/` is executor-visible. Copy these files into a generated run and point the executing agent only at that copy.
- `expected/` is judge-only. Do not include these files in executor prompts.
- `runs/` is generated and ignored. It contains actual executor outputs, prompts, and judge results.

## Run Flow

Prepare a run:

```sh
bun run eval:prepare -- --executor codex
```

The script creates `runs/<run-id>/actual/` from `input/` and writes `executor-prompt.md`.

After an agent processes the files in `actual/`, judge the run:

```sh
bun run eval:judge -- --run <run-id> --write
```

The judge script emits structured JSON with partial-credit dimensions. It is a mechanical baseline, not a substitute for adversarial human or cross-agent review when answer quality matters.

## Cases

- `single-thread.md`: one clear inline ask.
- `mixed-open-closed.md`: one open ask plus parked and sealed threads.
- `code-and-examples.md`: trigger-looking examples must stay untouched.
- `multi-turn-thread.md`: append to existing history after a human follow-up.
- `quality-sensitive.md`: produce a useful answer, not only a valid thread wrapper.
