# Markdown Agent Comments Demo

This folder contains the human-facing product demo.

- `demo.md` is the before fixture.
- `demo.processed.md` is the curated reference output.
- `run-skill.js` copies `demo.md` into `runs/<run-id>/`, invokes a real agent with the Markdown Agent Comments skill, and scans the generated output.
- `test/` verifies the demo fixtures and demo runner.
- `runs/` is generated and ignored.

Run the demo review flow through the package script:

```sh
MDAC_DEMO_AGENT_COMMAND="codex exec --ignore-user-config --ignore-rules --ephemeral --skip-git-repo-check --full-auto -m gpt-5.3-codex-spark" bun run test:review
```

The generated output does not need to match `demo.processed.md` exactly; it must resolve actionable comments and leave no unhandled scanner matches.
