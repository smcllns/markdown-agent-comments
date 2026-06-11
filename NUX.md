# NUX.md — agent-led onboarding for Markdown Agent Comments

You are an agent onboarding a human to `mdac`. Make the first 10 minutes feel safe, concrete, and reversible.

Use today's product honestly. If you want an option that does not exist yet, call it a product gap.

## Contract

- Read and inspect before changing anything.
- Ask before `mdac run` on real user files.
- Explain the trust model before any recurring setup: any actionable `@agent` comment in watched markdown becomes an agent prompt, and the built-in Claude and Codex routes auto-accept edits. See the README Security Model section.
- Start with a temp-file demo, then one narrow real target.
- Explain what would happen in human terms: files, comments, next action.
- Stop if the next step is not obvious or safe.

## Flow

### 1. Install and check

Published CLI:

```sh
bun add -g markdown-agent-comments
mdac doctor .
```

If `https://mdac.dev/install.sh` exists, read it before running it. Verify it points to official `smcllns/markdown-agent-comments` release artifacts. Do not claim cryptographic integrity unless checksums, signatures, or provenance are actually available.

If onboarding from a repo checkout, run:

```sh
bun install
bun run test
```

### 2. Demo in `/tmp`

Offer a safe demo before scanning user files:

```sh
DEMO=/tmp/mdac-demo.md
cat > "$DEMO" <<'EOF'
# Markdown Agent Comments demo

@agent can you add a compact diagram explaining how Markdown Agent Comments works, then end with three example comments I could try next?
EOF

mdac scan "$DEMO"
```

If the human wants to see the loop:

```sh
mdac run "$DEMO"
```

Then show the resulting file and explain: the comment triggered an agent, the document changed, and the discussion was preserved as a markdown callout thread.

### 3. Scan the real target read-only

```sh
mdac scan <target>
```

Do not paste a scary raw list. Triage findings into:

- Open: likely real comments that would run an agent.
- Done/parked: resolved threads that should not run.
- Ignore: hidden, generated, fixture, archive, or agent-log paths.
- Suspicious: examples, inline-code misses, false positives, or legacy threads.

Quote paths with spaces.

If your installed `mdac` has `--json`, `--all`, dry-run, ignore config, or heal/plan commands, use them. If not, name that as a product gap.

### 4. Report status

```text
Installed mdac and confirmed it works. I have not run it on your files.

Read-only scan of <target>:
- <X> likely open comments
- <Y> done/parked/legacy threads
- <Z> matches in paths I would ignore for first-run UX
- <N> suspicious matches to clean up or escape

Recommendation: start with one narrow approved run, or first quiet the scan with config/cleanup.

Choose: (a) run one approved comment, (b) propose config/cleanup, (c) stop here.
```

### 5. Run one narrow real target

Only after explicit approval:

```sh
mdac run <one-file-or-small-folder>
```

Show the diff. Ask whether it matched expectations. Widen only after the loop feels predictable.

### 6. Offer recurring setup later

When manual runs feel boring, offer recurring scanning. Today's built-in recurring mode is foreground watch:

```sh
mdac watch <target> --interval 60
```

For launchd, cron, or desktop wrappers, explain what will run, where logs go, and how to turn it off before installing anything.

## WIP notes

This is a quick v1 of the new-user experience. It should become the primary install/onboarding path, but it still needs product and docs refinement.

Known areas to improve:

- decide whether `NUX.md` should lead with `bun add -g`, `install.sh`, or a verified binary download
- add an official verification story: checksums, signatures, provenance, or another trust path
- make the temp-file demo more vivid and reliable across installed agents
- add an `EXAMPLES.md` that agents can open as teaching props
- improve first scan UX: quiet defaults, categories, ignored paths, and full-audit mode
- add machine-readable scan output for agent triage
- add a real dry-run/plan mode for user files
- document or ship a safe recurring 1-minute scanner setup with uninstall instructions
- decide the canonical user-facing comment style: bare `@agent`, HTML comment, Obsidian blockquote, or multiple examples
