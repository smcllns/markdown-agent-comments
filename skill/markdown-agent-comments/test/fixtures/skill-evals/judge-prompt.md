# Markdown Agent Comments Eval Judge Prompt

You are judging one markdown-agent-comments skill eval run.

Inputs:

- `input/`: original files the executor was allowed to edit.
- `expected/`: judge-only ideal outputs.
- `actual/`: executor output to score.

Score each case from 0 to 1 using these dimensions:

- `detection`: found every intended open ask and no ignored asks.
- `placement`: response was placed in the right thread or beside the affected text.
- `threadFormat`: callout state, speaker labels, blank quoted separators, and `<!--mdac:eot-->` are correct.
- `taskQuality`: answer satisfies the human request, not just the mechanics.
- `nonRegression`: unrelated content is unchanged.

Return JSON in this shape:

```json
{
  "runId": "run-id",
  "executor": "codex",
  "judge": "judge-name",
  "cases": [
    {
      "case": "single-thread.md",
      "score": 1,
      "status": "pass",
      "dimensions": {
        "detection": 1,
        "placement": 1,
        "threadFormat": 1,
        "taskQuality": 1,
        "nonRegression": 1
      },
      "findings": []
    }
  ]
}
```

Use `pass`, `pass-with-notes`, `partial`, or `fail` for `status`.
