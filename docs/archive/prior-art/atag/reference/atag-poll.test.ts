import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { chmod, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { realpathSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const SCRIPT = new URL("../scripts/atag-poll.sh", import.meta.url).pathname;

let tempDir = "";
let binDir = "";
let fixtureDir = "";
let logPath = "";

beforeEach(async () => {
  tempDir = await mkdtemp(join(tmpdir(), "atag-poll-"));
  binDir = join(tempDir, "bin");
  fixtureDir = join(tempDir, "fixture");
  logPath = join(tempDir, "claude.log");
  await mkdir(binDir);
  await mkdir(fixtureDir);
  await installGitStub("Human Example");
});

afterEach(async () => {
  if (tempDir) await rm(tempDir, { recursive: true, force: true });
});

describe("atag-poll", () => {
  it("prints the startup line and does not invoke Claude when no tags match", async () => {
    await installClaudeStub();
    await writeFile(join(fixtureDir, "note.md"), "plain markdown\n");

    const result = runPoll(["--once", "--dir", fixtureDir]);

    expect(result.exitCode).toBe(0);
    expectStdoutWithStartup(result.stdout, "@agent, @claude, @codex");
    expect(result.stderr).toBe("");
    expect(await readLog()).toBe("");
  });

  it("prints one debug no-match status line after startup", async () => {
    await installClaudeStub();
    await writeFile(join(fixtureDir, "note.md"), "plain markdown\n");

    const result = runPoll(["--once", "--debug", "--dir", fixtureDir]);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toMatch(
      new RegExp(
        [
          `^\\[[0-9]{2}:[0-9]{2}\\]  Watching for @agent, @claude, @codex agent tags in ${escapeRegExp(realpathSync(fixtureDir))}\\.\\.\\.`,
          "",
          "\\[[0-9]{2}:[0-9]{2}\\]  No @agent, @claude, @codex agent tags detected",
          "$",
        ].join("\n"),
      ),
    );
    expect(result.stderr).toBe("");
    expect(await readLog()).toBe("");
  });

  it("invokes Claude from the target directory when a default trigger matches", async () => {
    await installClaudeStub({ stdout: "claude output\n" });
    await writeFile(join(fixtureDir, "note.md"), "@codex please help\n");

    const result = runPoll(["--once", "--dir", fixtureDir]);

    expect(result.exitCode).toBe(0);
    expectStdoutWithStartup(result.stdout, "@agent, @claude, @codex", "claude output\n");
    const log = await readLog();
    expect(log).toContain(`cwd=${realpathSync(fixtureDir)}`);
    expect(log).toContain("arg=-p");
    expect(log).toContain("arg=--model");
    expect(log).toContain("arg=opus");
    expect(log).toContain("arg=--permission-mode");
    expect(log).toContain("arg=acceptEdits");
    expect(log).toContain("arg=--effort");
    expect(log).toContain("arg=low");
    expect(log).toContain("Use the atag skill");
  });

  it("does not invoke Claude when active NOTE threads are waiting on the human", async () => {
    await installClaudeStub();
    await writeFile(
      join(fixtureDir, "note.md"),
      [
        "> [!NOTE]+ awaiting direction",
        ">",
        "> @claude make this better",
        ">",
        "> *`claude`* Which direction should I take it? <!--atag:eot-->",
        "",
        "> [!NOTE]+ agent-last thread",
        ">",
        "> @claude draft a headline",
        ">",
        "> *`claude`* What benefit should the headline emphasize?",
        "",
        "> [!NOTE]+ legacy bare agent-last thread",
        ">",
        "> @claude draft a headline",
        ">",
        "> `claude` What benefit should the headline emphasize?",
        "",
        "> [!NOTE]+ legacy colon agent-last thread",
        ">",
        "> @claude draft a headline",
        ">",
        "> `claude`: What benefit should the headline emphasize?",
        "",
      ].join("\n"),
    );

    const result = runPoll(["--once", "--debug", "--dir", fixtureDir]);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toMatch(/\[[0-9]{2}:[0-9]{2}\]  No @agent, @claude, @codex agent tags detected\n?$/);
    expect(result.stderr).toBe("");
    expect(await readLog()).toBe("");
  });

  it("invokes Claude when a human replies after an active NOTE agent turn", async () => {
    await installClaudeStub({ stdout: "note scan\n" });
    await writeFile(
      join(fixtureDir, "note.md"),
      [
        "> [!NOTE]+ awaiting direction",
        ">",
        "> @claude make this better",
        ">",
        "> *`claude`* Which direction should I take it? <!--atag:eot-->",
        ">",
        "> `human` make it more concrete",
        "",
      ].join("\n"),
    );

    const result = runPoll(["--once", "--dir", fixtureDir]);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("note scan\n");
    expect(await readLog()).toContain("note.md");
  });

  it("does not invoke Claude for a label-only prefilled human reply line", async () => {
    await installClaudeStub();
    await writeFile(
      join(fixtureDir, "note.md"),
      [
        "> [!NOTE]+ awaiting direction",
        ">",
        "> `human` @claude make this better",
        ">",
        "> *`claude`* Which direction should I take it? <!--atag:eot-->",
        ">",
        "> `human` ",
        "",
      ].join("\n"),
    );

    const result = runPoll(["--once", "--debug", "--dir", fixtureDir]);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toMatch(/\[[0-9]{2}:[0-9]{2}\]  No @agent, @claude, @codex agent tags detected\n?$/);
    expect(result.stderr).toBe("");
    expect(await readLog()).toBe("");
  });

  it("uses an explicit human name for label-only placeholders", async () => {
    await installClaudeStub();
    await writeFile(
      join(fixtureDir, "note.md"),
      [
        "> [!NOTE]+ awaiting direction",
        ">",
        "> `maya` @claude make this better",
        ">",
        "> *`claude`* Which direction should I take it? <!--atag:eot-->",
        ">",
        "> `maya` ",
        "",
      ].join("\n"),
    );

    const result = runPoll(["--once", "--debug", "--dir", fixtureDir, "--name", "Maya"]);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toMatch(/\[[0-9]{2}:[0-9]{2}\]  No @agent, @claude, @codex agent tags detected\n?$/);
    expect(result.stderr).toBe("");
    expect(await readLog()).toBe("");
  });

  it("rejects an explicit human name that collides with an agent trigger", async () => {
    await installClaudeStub();

    const result = runPoll(["--once", "--debug", "--dir", fixtureDir, "--name", "Codex"]);

    expect(result.exitCode).toBe(2);
    expect(result.stderr).toContain("--name resolves to 'codex', which collides with an agent trigger label");
    expect(await readLog()).toBe("");
  });

  it("falls back to git name before GitHub name and unix username", async () => {
    await installGitStub("Human Example");
    await installGhStub("Maya Example");
    await installIdStub("unixname");
    await installClaudeStub();
    await writeFile(
      join(fixtureDir, "note.md"),
      [
        "> [!NOTE]+ awaiting direction",
        ">",
        "> `human` @claude make this better",
        ">",
        "> *`claude`* Which direction should I take it? <!--atag:eot-->",
        ">",
        "> `human` ",
        "",
      ].join("\n"),
    );

    const result = runPoll(["--once", "--debug", "--dir", fixtureDir]);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toMatch(/\[[0-9]{2}:[0-9]{2}\]  No @agent, @claude, @codex agent tags detected\n?$/);
    expect(result.stderr).toBe("");
    expect(await readLog()).toBe("");
  });

  it("skips fallback names that collide with agent triggers", async () => {
    await installGitStub("Codex");
    await installGhStub("Maya Example");
    await installIdStub("unixname");
    await installClaudeStub();
    await writeFile(
      join(fixtureDir, "note.md"),
      [
        "> [!NOTE]+ awaiting direction",
        ">",
        "> `maya` @claude make this better",
        ">",
        "> *`claude`* Which direction should I take it? <!--atag:eot-->",
        ">",
        "> `maya` ",
        "",
      ].join("\n"),
    );

    const result = runPoll(["--once", "--debug", "--dir", fixtureDir]);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toMatch(/\[[0-9]{2}:[0-9]{2}\]  No @agent, @claude, @codex agent tags detected\n?$/);
    expect(result.stderr).toBe("");
    expect(await readLog()).toBe("");
  });

  it("uses a non-colliding missing-name fallback when user is a custom trigger", async () => {
    await installGitStub(null);
    await installGhStub(null);
    await installIdStub(null);
    await installClaudeStub();
    await writeFile(join(fixtureDir, "note.md"), "@user please help\n");

    const result = runPoll(["--once", "--dir", fixtureDir, "@user"]);

    expect(result.exitCode).toBe(0);
    const log = await readLog();
    expect(log).toContain("Human speaker label: `human` (source: fallback)");
    expect(log).toContain("prefill `human`");
    expect(log).toContain("<!--atag:missing-human-name no human name detected;");
  });

  it("falls back to GitHub name before the unix username", async () => {
    await installGitStub(null);
    await installGhStub("Maya Example");
    await installIdStub("unixname");
    await installClaudeStub();
    await writeFile(
      join(fixtureDir, "note.md"),
      [
        "> [!NOTE]+ awaiting direction",
        ">",
        "> `maya` @claude make this better",
        ">",
        "> *`claude`* Which direction should I take it? <!--atag:eot-->",
        ">",
        "> `maya` ",
        "",
      ].join("\n"),
    );

    const result = runPoll(["--once", "--debug", "--dir", fixtureDir]);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toMatch(/\[[0-9]{2}:[0-9]{2}\]  No @agent, @claude, @codex agent tags detected\n?$/);
    expect(result.stderr).toBe("");
    expect(await readLog()).toBe("");
  });

  it("uses the fallback user label and missing-name comment when no local identity is found", async () => {
    await installGitStub(null);
    await installGhStub(null);
    await installIdStub(null);
    await installClaudeStub();
    await writeFile(join(fixtureDir, "note.md"), "@codex please help\n");

    const result = runPoll(["--once", "--dir", fixtureDir]);

    expect(result.exitCode).toBe(0);
    const log = await readLog();
    expect(log).toContain("Human speaker label: `user` (source: fallback)");
    expect(log).toContain("<!--atag:missing-human-name no human name detected;");
    expect(log).toContain("pass --name to atag-poll.sh");
  });

  it("does not invoke Claude for a fallback user placeholder with the missing-name comment", async () => {
    await installGitStub(null);
    await installGhStub(null);
    await installIdStub(null);
    await installClaudeStub();
    await writeFile(
      join(fixtureDir, "note.md"),
      [
        "> [!NOTE]+ awaiting direction",
        ">",
        "> `user` @claude make this better",
        ">",
        "> *`claude`* Which direction should I take it? <!--atag:eot-->",
        ">",
        "> `user`",
        "> <!--atag:missing-human-name no human name detected; please ask the human what name agents should use and store it in AGENTS.md, git config user.name, or pass --name to atag-poll.sh.-->",
        "",
      ].join("\n"),
    );

    const result = runPoll(["--once", "--debug", "--dir", fixtureDir]);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toMatch(/\[[0-9]{2}:[0-9]{2}\]  No @agent, @claude, @codex agent tags detected\n?$/);
    expect(result.stderr).toBe("");
    expect(await readLog()).toBe("");
  });

  it("does not invoke Claude for a legacy emphasized label-only human reply line", async () => {
    await installClaudeStub();
    await writeFile(
      join(fixtureDir, "note.md"),
      [
        "> [!NOTE]+ awaiting direction",
        ">",
        "> `human` @claude make this better",
        ">",
        "> *`claude`* Which direction should I take it? <!--atag:eot-->",
        ">",
        "> *`human`* ",
        "",
      ].join("\n"),
    );

    const result = runPoll(["--once", "--debug", "--dir", fixtureDir]);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toMatch(/\[[0-9]{2}:[0-9]{2}\]  No @agent, @claude, @codex agent tags detected\n?$/);
    expect(result.stderr).toBe("");
    expect(await readLog()).toBe("");
  });

  it("invokes Claude when a human types after a prefilled reply label", async () => {
    await installClaudeStub({ stdout: "prefill reply scan\n" });
    await writeFile(
      join(fixtureDir, "note.md"),
      [
        "> [!NOTE]+ awaiting direction",
        ">",
        "> `human` @claude make this better",
        ">",
        "> *`claude`* Which direction should I take it? <!--atag:eot-->",
        ">",
        "> `human` make it more concrete",
        "",
      ].join("\n"),
    );

    const result = runPoll(["--once", "--dir", fixtureDir]);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("prefill reply scan\n");
    expect(await readLog()).toContain("note.md");
  });

  it("invokes Claude when a human replies on the line after a prefilled label", async () => {
    await installClaudeStub({ stdout: "next-line reply scan\n" });
    await writeFile(
      join(fixtureDir, "note.md"),
      [
        "> [!NOTE]+ awaiting direction",
        ">",
        "> `human` @claude make this better",
        ">",
        "> *`claude`* Which direction should I take it? <!--atag:eot-->",
        ">",
        "> `human`",
        "> make it more concrete",
        "",
      ].join("\n"),
    );

    const result = runPoll(["--once", "--dir", fixtureDir]);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("next-line reply scan\n");
    expect(await readLog()).toContain("note.md");
  });

  it("invokes Claude when a human replies with a code-only line after a prefilled label", async () => {
    await installClaudeStub({ stdout: "code-only reply scan\n" });
    await writeFile(
      join(fixtureDir, "note.md"),
      [
        "> [!NOTE]+ awaiting direction",
        ">",
        "> `human` @claude which command?",
        ">",
        "> *`claude`* Which command should I use? <!--atag:eot-->",
        ">",
        "> `human`",
        "> `bun`",
        "",
      ].join("\n"),
    );

    const result = runPoll(["--once", "--dir", fixtureDir]);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("code-only reply scan\n");
    expect(await readLog()).toContain("note.md");
  });

  it("does not invoke custom-trigger runs for default-trigger active NOTE threads", async () => {
    await installClaudeStub();
    await writeFile(
      join(fixtureDir, "note.md"),
      [
        "> [!NOTE]+ waiting on codex",
        ">",
        "> @codex please help",
        ">",
        "> `human` one more thing",
        "",
      ].join("\n"),
    );

    const result = runPoll(["--once", "--dir", fixtureDir, "@pi"]);

    expect(result.exitCode).toBe(0);
    expect(await readLog()).toBe("");
  });

  it("adds terminal response-style instructions when requested", async () => {
    await installClaudeStub();
    await writeFile(join(fixtureDir, "note.md"), "@codex please help\n");

    const result = runPoll(["--once", "--dir", fixtureDir, "--response-style", "terminal"]);

    expect(result.exitCode).toBe(0);
    expect(await readLog()).toContain("Response style: terminal plain text");
  });

  it("adds markdown response-style instructions when requested", async () => {
    await installClaudeStub();
    await writeFile(join(fixtureDir, "note.md"), "@codex please help\n");

    const result = runPoll(["--once", "--dir", fixtureDir, "--response-style", "markdown"]);

    expect(result.exitCode).toBe(0);
    expect(await readLog()).toContain("Response style: Markdown");
  });

  it("prints compact debug match output and hides the full prompt behind a DEBUG prefix", async () => {
    await installClaudeStub({ stdout: "claude output\n" });
    await writeFile(join(fixtureDir, "note.md"), "@codex please help\n");

    const result = runPoll(["--once", "--debug", "--dir", fixtureDir]);

    expect(result.exitCode).toBe(0);
    expect(result.stderr).toContain(`\n[`);
    expect(result.stderr).toContain(`]  atag-poll: found 1 agent tag match (@agent, @claude, @codex) in fixture/note.md\n`);
    expect(result.stderr).toContain("]  atag-poll: spawning claude agent to resolve...\n");
    expect(result.stderr).toContain("]  [DEBUG] atag-poll: invoking claude ");
    expect(result.stderr).toEndWith("\n\n");
  });

  it("prints debug heartbeats while Claude is still running", async () => {
    await installClaudeStub({ stdout: "slow output\n", sleepSeconds: 2 });
    await writeFile(join(fixtureDir, "note.md"), "@codex please help\n");

    const result = runPoll(["--once", "--debug", "--dir", fixtureDir], {
      ATAG_POLL_HEARTBEAT_SECONDS: "1",
    });

    expect(result.exitCode).toBe(0);
    expect(result.stderr).toMatch(/\[DEBUG\] atag-poll: claude still running \([0-9]+s elapsed\)/);
    expect(result.stdout).toContain("slow output\n");
  });

  it("times out the Claude subprocess", async () => {
    await installClaudeStub({ sleepSeconds: 10 });
    await writeFile(join(fixtureDir, "note.md"), "@codex please help\n");

    const result = runPoll(["--once", "--dir", fixtureDir, "--timeout", "1"]);

    expect(result.exitCode).toBe(124);
    expect(result.stderr).toContain("atag-poll: claude timed out after 1s");
    expect(await readLog()).toContain("arg=opus");
  });

  it("lets custom triggers replace the default triggers", async () => {
    await installClaudeStub();
    await writeFile(join(fixtureDir, "note.md"), "@codex default only\n");

    const result = runPoll(["--once", "--dir", fixtureDir, "@pi"]);

    expect(result.exitCode).toBe(0);
    expectStdoutWithStartup(result.stdout, "@pi");
    expect(result.stderr).toBe("");
    expect(await readLog()).toBe("");
  });

  it("accepts comma-separated custom triggers with optional whitespace", async () => {
    await installClaudeStub({ stdout: "matched\n" });
    await writeFile(join(fixtureDir, "note.md"), "@pi custom\n");

    const result = runPoll(["--once", "--dir", fixtureDir, "@agento,", "@pi"]);

    expect(result.exitCode).toBe(0);
    expectStdoutWithStartup(result.stdout, "@agento, @pi", "matched\n");
    expect(await readLog()).toContain("@agento, @pi");
  });

  it("rejects whitespace-separated custom triggers", async () => {
    await installClaudeStub();

    const result = runPoll(["--once", "--dir", fixtureDir, "@agento", "@pi"]);

    expect(result.exitCode).toBe(2);
    expect(result.stderr).toContain("invalid trigger list");
    expect(await readLog()).toBe("");
  });

  it("invokes Claude for unsealed DONE follow-ups", async () => {
    await installClaudeStub({ stdout: "done scan\n" });
    await writeFile(
      join(fixtureDir, "note.md"),
      [
        "> [!DONE]- tightened intro",
        ">",
        "> @claude tighten the intro",
        ">",
        "> *`claude`* done. <!--atag:eot-->",
        "> one more tweak",
        "",
      ].join("\n"),
    );

    const result = runPoll(["--once", "--dir", fixtureDir]);

    expect(result.exitCode).toBe(0);
    expectStdoutWithStartup(result.stdout, "@agent, @claude, @codex", "done scan\n");
    expect(await readLog()).toContain("note.md");
  });

  it("passes through Claude args and lets callers override default model and effort", async () => {
    await installClaudeStub();
    await writeFile(join(fixtureDir, "note.md"), "@codex please help\n");

    const result = runPoll(["--once", "--dir", fixtureDir, "--", "--model", "haiku", "--effort", "low", "--max-budget-usd", "1"]);

    expect(result.exitCode).toBe(0);
    const log = await readLog();
    expect(log).toContain("arg=--max-budget-usd");
    expect(log).toContain("arg=1");
    expect(log).toContain("arg=haiku");
    expect(log).toContain("arg=low");
    expect(log).not.toContain("arg=opus");
  });

  it("propagates Claude failures", async () => {
    await installClaudeStub({ stdout: "partial\n", stderr: "boom\n", exitCode: 7 });
    await writeFile(join(fixtureDir, "note.md"), "@codex please help\n");

    const result = runPoll(["--once", "--dir", fixtureDir]);

    expect(result.exitCode).toBe(7);
    expectStdoutWithStartup(result.stdout, "@agent, @claude, @codex", "partial\n");
    expect(result.stderr).toContain("atag-poll: spawning claude agent to resolve...");
    expect(result.stderr).toContain("boom\n");
  });
});

function runPoll(args: string[], env: Record<string, string> = {}) {
  const proc = Bun.spawnSync({
    cmd: [SCRIPT, ...args],
    env: {
      ...process.env,
      PATH: `${binDir}:${process.env.PATH ?? ""}`,
      ATAG_POLL_LOG: logPath,
      ...env,
    },
    stdout: "pipe",
    stderr: "pipe",
  });
  return {
    exitCode: proc.exitCode,
    stdout: new TextDecoder().decode(proc.stdout),
    stderr: new TextDecoder().decode(proc.stderr),
  };
}

async function installClaudeStub(options: { stdout?: string; stderr?: string; exitCode?: number; sleepSeconds?: number } = {}) {
  const stdout = JSON.stringify(options.stdout ?? "");
  const stderr = JSON.stringify(options.stderr ?? "");
  const exitCode = options.exitCode ?? 0;
  const sleepSeconds = options.sleepSeconds ?? 0;
  const stub = `#!/usr/bin/env bash
set -euo pipefail
{
  printf 'cwd=%s\\n' "$PWD"
  for arg in "$@"; do printf 'arg=%s\\n' "$arg"; done
} >> "$ATAG_POLL_LOG"
sleep ${sleepSeconds}
printf '%b' ${stdout}
printf '%b' ${stderr} >&2
exit ${exitCode}
`;
  const path = join(binDir, "claude");
  await writeFile(path, stub);
  await chmod(path, 0o755);
}

async function installGitStub(userName: string | null) {
  const body =
    userName === null
      ? "exit 1\n"
      : `if [[ "$*" == *"config user.name"* ]]; then printf '%s\\n' ${JSON.stringify(userName)}; exit 0; fi\nexit 1\n`;
  await installStub("git", body);
}

async function installGhStub(userName: string | null) {
  const body =
    userName === null
      ? "exit 1\n"
      : `if [[ "$*" == *"api user"* ]]; then printf '%s\\n' ${JSON.stringify(userName)}; exit 0; fi\nexit 1\n`;
  await installStub("gh", body);
}

async function installIdStub(userName: string | null) {
  const body =
    userName === null
      ? "exit 1\n"
      : `if [[ "$*" == "-un" ]]; then printf '%s\\n' ${JSON.stringify(userName)}; exit 0; fi\nexit 1\n`;
  await installStub("id", body);
}

async function installStub(name: string, body: string) {
  const path = join(binDir, name);
  await writeFile(path, `#!/usr/bin/env bash\nset -euo pipefail\n${body}`);
  await chmod(path, 0o755);
}

async function readLog(): Promise<string> {
  try {
    return await readFile(logPath, "utf8");
  } catch {
    return "";
  }
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function expectStdoutWithStartup(stdout: string, triggers: string, suffix = "") {
  expect(stdout).toMatch(
    new RegExp(
      [
        `^\\[[0-9]{2}:[0-9]{2}\\]  Watching for ${escapeRegExp(triggers)} agent tags in ${escapeRegExp(realpathSync(fixtureDir))}\\.\\.\\.`,
        "",
        escapeRegExp(suffix) + "$",
      ].join("\n"),
    ),
  );
}
