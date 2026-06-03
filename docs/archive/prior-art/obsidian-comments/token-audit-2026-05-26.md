# md-asks Cowork scheduled task — token audit

Audit of the `md-asks-obsidian` Cowork scheduled task (May 23–26 2026, ~3.2 days, 15-min cadence, 301 runs).

## Headline

| Bucket | Sessions | Cost | Avg/session |
|---|---|---|---|
| Real action (wrote to a real vault file) | 5 | $3.88 | $0.78 |
| Logged only (write to journal/`_agents` only) | 159 | $99.84 | $0.63 |
| No writes (scanned and exited) | 137 | $79.67 | $0.58 |
| **Total** | **301** | **$183.39** | **$0.61** |

**The cost is in the heartbeat, not the work.** Only 1.7% of runs actioned anything. The other 98.3% spent $179 confirming there was nothing to do.

## Root cause: every run pays ~$0.60 baseline

- ~35K-token baseline loaded per run (system prompt + ~100 MCP tool schemas — Gmail, Calendar, Drive, Chrome, computer-use, Spotify, etc., none used by md-asks)
- ~35 assistant turns average, growing context to ~65K by end of run
- Cost splits ~50/50 between cache_creation and cache_read; output is <1%
- **87% of runs hit the helper-script-not-found fallback** — the skill references `reference/done-followups.awk` but the path doesn't resolve in the Cowork sandbox, so the agent wastes ~5 turns reinventing the logic inline
- 50% of runs use TaskCreate/Update for a 30-second scan, adding 2–4 bookkeeping turns
- 20% of runs read the same file 2+ times in one session

## Fix landed

Added to `Projects/skills/skills/md-asks/SKILL.md` (Best practices section):

> **Scheduled runs should exit asap.** When wrapping this skill in a scheduled task, gate it on a precondition grep so quiet runs exit in one turn instead of loading the skill.

This nudges Cowork (when it auto-writes a scheduled-task SKILL.md that invokes md-asks) to add a grep precondition. Expected savings: ~85% on no-op runs.

## How to reproduce this audit

**Session files live at:**

```
<local-claude-sessions>/
  <account-uuid>/<workspace-uuid>/
    local_<session-uuid>.json    ← metadata (title, createdAt, model)
    local_<session-uuid>/audit.jsonl    ← turn-by-turn transcript
```

Account/workspace UUIDs change per machine — glob `local_*.json` and filter by `title` field.

**The non-obvious bits:**

1. `audit.jsonl` `result` events have a `total_cost_usd` field — use that directly, don't reconstruct from token counts (Anthropic's reported cost reflects pricing tier mixes you can't see from the raw `usage` object).
2. `audit.jsonl` `assistant` events have a `message.usage` block with `input_tokens`, `cache_creation_input_tokens`, `cache_read_input_tokens`, `output_tokens`.
3. `cache_read` dominates totals for long agentic loops — each turn re-sends accumulated context. Don't be misled by a 1.7M-token session: most of that is cache reads at $0.30/Mtok.
4. To classify "real action" vs "heartbeat-only", look at `Edit`/`Write` tool_use `file_path` args. Writes to `/4 wiki/agent-journal/` or `/_agents/` are heartbeat logs, not actioned asks. Writes elsewhere are real actions.
5. The Cowork sandbox runs files at `/sessions/<name>/mnt/...` not `<local-projects>/...` — relevant if you're trying to grep absolute paths from tool inputs.

**Quick start script** — the analysis script lives nowhere persistent; rebuild it from the conversation at `<local-claude-projects>/` if needed. Skeleton:

```python
import json, pathlib
base = pathlib.Path("<local-claude-sessions>/<acct>/<workspace>").expanduser()
for jf in base.glob("local_*.json"):
    meta = json.loads(jf.read_text())
    if meta.get("title") != "<task title>": continue
    audit = base / jf.stem / "audit.jsonl"
    for line in audit.read_text().splitlines():
        d = json.loads(line)
        if d.get("type") == "result":
            cost = d.get("total_cost_usd", 0)
            # ...
```

## Open optimizations (not yet done)

If the SKILL.md early-exit nudge doesn't reduce cost enough, the next levers (in impact order):

1. **Host cron + `claude -p`** — bypass Cowork entirely; do the grep at shell level, only invoke claude when there's work. Saves ~$55/day → ~$1/day. Tradeoff: lose Cowork UI/run history.
2. **Fix the `done-followups.awk` path resolution** — 87% of runs waste turns hunting for it. Either inline the awk into the skill or document a stable path Cowork can find.
3. **Run on Haiku 4.5** instead of Sonnet 4.6 for the scan — ~5× cheaper. Tradeoff: weaker judgment on subtle/ambiguous asks.

Cost confirmation pricing: Sonnet 4.6 at $3/Mtok input, $15/Mtok output, $0.30/Mtok cache read, $3.75–$6/Mtok cache write.
