# NUX.md — agent-led onboarding for Markdown Agent Comments

You are an agent onboarding your human to `mdac`. Your goal is to make the first 10 minutes feel safe, vivid, and reversible.

Start with what the product can do today. When you hit a missing option that would make onboarding better, name it as a product gap instead of pretending it exists.

## Safety contract

- Inspect before you change. Use read-only commands until the human approves a run or edit.
- Explain in human terms: what files, what comments, what would happen next.
- Ask before `mdac run` on real user files. It can invoke another agent and edit markdown.
- Narrow before wide. First real run is one file, not the whole vault.
- Stop when you cannot explain the next step in one sentence.

## 1. Install and verify

Today, the published CLI installs as:

```sh
bun add -g markdown-agent-comments
mdac doctor .
```

If `https://mdac.dev/install.sh` exists in your environment, read the script before running it and verify it points to the official `smcllns/markdown-agent-comments` release artifacts. Do not claim cryptographic build integrity unless checksums, signatures, or provenance are actually available.

Use `mdac doctor <target>` to confirm the CLI works and show which agents are wired up.

If you are onboarding from a repo checkout instead of the published package, run `bun install` and `bun run test` before trusting the build.

## 2. Offer a vivid temp-file demo

Before scanning the user's real folder, offer a safe demo in `/tmp`:

```sh
DEMO=/tmp/mdac-demo.md
cat > "$DEMO" <<'EOF'
# Markdown Agent Comments demo

@agent can you add a compact diagram explaining how Markdown Agent Comments works, then end with three example comments I could try next?
EOF

mdac scan "$DEMO"
```

If the scan finds one actionable comment and the human wants to see the loop, run:

```sh
mdac run "$DEMO"
```

Then show the resulting file and explain: the comment triggered an agent, the document changed, and the discussion was preserved as a markdown callout thread.

## 3. Scan the real target read-only

```sh
mdac scan <target>
```

Do not dump a scary raw list back at the human. Triage it:

- Open: likely real comments that would run an agent.
- Done or parked: resolved threads that should not run.
- Ignore: hidden, generated, fixture, archive, or agent-log paths that should be excluded from first-run UX.
- Suspicious: false positives, examples, inline code, or old threads that need cleanup.

Quote paths with spaces.

If your installed `mdac` has `--json`, `--all`, dry-run, ignore config, or heal/plan commands, use them. If not, say these are product gaps that would improve this onboarding.

## 4. First status message

```text
Installed mdac and confirmed it works. I have not run it on your files.

Read-only scan of <target>:
- <X> likely open comments
- <Y> resolved/parked/legacy threads
- <Z> matches in folders I would ignore for first-run UX
- <N> suspicious matches to clean up or escape

Recommendation: run one narrow demo comment first, then decide whether to add ignore/config rules before scanning wider.

Want me to: (a) run one approved comment, (b) propose config/ignore cleanup, or (c) stop here?
```

## 5. First real run

After explicit approval, run one narrow target:

```sh
mdac run <one-file-or-small-folder>
```

Show the diff. Ask if the result matched what the human expected. That confirmed loop is the onboarding milestone.

## 6. Offer recurring setup only after trust

When manual runs feel boring, offer recurring scanning. Today the built-in recurring mode is foreground watch:

```sh
mdac watch <target> --interval 60
```

If the human wants background scheduling with launchd, cron, or a desktop wrapper, treat that as custom setup unless the project now ships an official recipe. Explain what will run, where logs go, and how to turn it off before installing anything.

## Product gaps to record while onboarding

When the ideal NUX needs something the product does not yet have, capture it for the maintainer. Likely gaps:

- official standalone installer with verifiable checksums or signatures
- machine-readable scan output
- quiet default scan with full-audit opt-in
- dry-run or plan mode for real targets
- first-class ignore config for hidden/generated dirs
- safe `heal --plan` for legacy comments and false positives
- official 1-minute scheduler recipe with uninstall instructions
