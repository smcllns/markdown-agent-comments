# Markdown Agent Comments Skill Evals

These fixtures evaluate whether an agent can use `SKILL.md` to process realistic markdown files.

## Directory Roles

- `cases/input/` is executor-visible. Copy these files into a generated run and point the executing agent only at that copy.
- `cases/expected/` is judge-only. Do not include these files in executor prompts.
- `runs/` is generated and ignored. It contains actual executor outputs, prompts, and judge results.

## Run Flow

Prepare a run:

```sh
bun run eval:prepare -- --executor manual --run-id local-smoke
```

The script creates `runs/<run-id>/actual/` from `cases/input/` and writes `executor-prompt.md` and `judge-prompt.md`.

After an agent processes the files in `actual/`, verify the run mechanically:

```sh
bun run eval:verify -- --run <run-id> --write
```

The verifier emits structured JSON with partial-credit dimensions. It is a deterministic protocol smoke check, not the semantic quality judge.

For answer quality, run a local judge agent with the generated judge prompt:

```sh
bun run eval:judge -- --run <run-id> --judge-command "claude -p"
```

The expected files are reference outputs, not the only valid answers.

## Cases

- `single-thread.md`: one clear inline comment.
- `mixed-open-closed.md`: one open comment plus parked and sealed threads.
- `code-and-examples.md`: trigger-looking examples must stay untouched.
- `multi-turn-thread.md`: append to existing history after a human follow-up.
- `quality-sensitive.md`: produce a useful answer, not only a valid thread wrapper.
