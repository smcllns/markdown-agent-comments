# Markdown Agent Comments Eval Judge Prompt

You are judging one markdown-agent-comments skill eval run.

Inputs:

- `input/`: original files the executor was allowed to edit.
- `expected/`: judge-only reference outputs. These are good examples, not the only valid answer.
- `actual/`: executor output to score.

First inspect the actual markdown output. Do not rely only on exact text matching against `expected/`.

Score each case from 0 to 1 using these dimensions. Include a short evidence-based rationale for each score:

- `detection`: found every intended open comment and no ignored comments.
- `placement`: response was placed in the right thread or beside the affected text.
- `threadFormat`: callout state, speaker labels, blank quoted separators, and `<!--mdac:eot-->` are correct.
- `taskQuality`: answer satisfies the human request, not just the mechanics.
- `nonRegression`: unrelated content is unchanged.

Score bands:

- `1`: correct and complete.
- `0.75`: usable with minor issues.
- `0.5`: partial; important issue remains.
- `0.25`: mostly wrong but some relevant work happened.
- `0`: missing, unsafe, or contradicts the requested behavior.

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
      "rationale": {
        "detection": "All intended comments were resolved and ignored examples stayed untouched.",
        "placement": "The response was placed immediately after the edited block.",
        "threadFormat": "The callout used the expected speaker labels and mdac seal.",
        "taskQuality": "The rewritten sentence is more specific and direct.",
        "nonRegression": "Unrelated sections were unchanged."
      },
      "findings": []
    }
  ]
}
```

Use `pass`, `pass-with-notes`, `partial`, or `fail` for `status`.

Treat protocol failures as serious even if the prose answer is good. Treat semantic failures as serious even if the callout mechanics are correct.
