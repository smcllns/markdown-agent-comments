### Context & Motivation

<!-- Purpose: Orient a fresh reader in three short moves: what changed, why the CLI is now the priority, and what breaks if we do not centralize this. Keep it plain and executive, not a full history. -->

<!-- What important problem are we solving? Name the workflow problem, not the implementation task. -->
Agent tags are moving from a useful convention into a real workflow. We already have the skill and a basic `check` loop, but finished threads now need a reliable cleanup path: `sweep` will move resolved callouts out of the reading flow while preserving the record.

<!-- Why does this matter now? Explain the leverage of one canonical CLI center across skill/spec/integrations. -->
The priority is to make `atag` the single CLI center for both primitives: `check` finds work agents should act on, and `sweep` archives completed threads. Once the CLI owns the rules, the Skill calls the CLI, and every integration can wrap the same behavior instead of inventing its own version: Claude plugin first, then Codex/Pi/Hermes/OpenClaw, then richer desktop or cloud surfaces later.

<!-- What happens if we do not do this? State the consequence clearly without overselling. -->
If we do not do this, old agent threads will keep cluttering docs, each product surface will drift into slightly different behavior, and Markdown Agent Tags will stay a clever skill instead of becoming a dependable system.

### Executive Status

<!-- Purpose: One-screen status. Goals should be current-workstream deliverables only. Size is rough relative effort from XS ● to XL ●●●●●. PR column should include real PRs and accurately named expected PR placeholders. -->

| Goal | Size | Status | PR |
|---|---:|---:|---|
| 1. Canonical `atag check` CLI | ●●●● | ~10% | **Expected:** PR E2 `feat: Add atag check CLI` |
| 2. Refactor skill/docs around CLI | ●● | ~0% | **Expected:** PR E3 `docs: Refactor atag around CLI` |
| 3. Canonical `atag sweep` CLI | ●●●●● | ~0-20% | **Expected:** PR E4 `feat: Add atag sweep CLI` |
| 4. Claude plugin command shape | ● | ~90% | **Open:** [PR #31](https://github.com/smcllns/skills/pull/31), clean CI |
| 5. Claude plugin backed by CLI | ●● | ~0% | **Expected:** PR E5 `feat: Wire Claude command to atag CLI` |

### PR Roadmap

<!-- Purpose: Sequence the real/open/expected PRs. Do not duplicate the whole status table. Keep future product ideas visibly out of scope for this workstream. -->

- **Open:** PR #31 adds Claude `/agent-tags check` and `/agent-tags sweep` command shape.
- **Expected:** PR E2 adds canonical `atag check` with tests.
- **Expected:** PR E3 simplifies `SKILL.md` and plugin docs around the CLI.
- **Expected:** PR E4 adds canonical `atag sweep` with tests.
- **Expected:** PR E5 updates the Claude command to call the CLI-backed behavior.
- **Future/out of scope:**
	- **Future WS:** Codex/Pi/Hermes/OpenClaw wrappers.
	- **Future WS:** desktop/cloud products built on the same CLI + skill architecture.

### Caveats

<!-- Purpose: Only include material risks, scope boundaries, or debt that would disappoint someone if hidden. Do not list minor implementation TODOs here. -->

- PR #31 is not the real engine. It proves the Claude command shape; the CLI still needs to own durable behavior.
- `sweep` should not mean destructive deletion by default. `--trace` leaves a footnote marker; `--t0` removes the inline marker but should still preserve an archive unless we explicitly add a destructive mode.
- `sweep --all` can move active conversations, so it must stay explicit and well-tested.
- Codex slash-command support is not confirmed. Do not promise `/agent-tags` in Codex yet.
- This is scoped to Markdown Agent Tags callouts, not a general markdown archive/comment system.

