import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { chmod, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const CLI = new URL("../cli.js", import.meta.url).pathname;

let tempDir;
let binDir;
let logPath;

beforeEach(async () => {
  tempDir = await mkdtemp(join(tmpdir(), "mdac-routing-"));
  binDir = join(tempDir, "bin");
  logPath = join(tempDir, "agent.log");
  await mkdir(binDir, { recursive: true });
});

afterEach(async () => {
  await rm(tempDir, { recursive: true, force: true });
});

describe("mdac run routing", () => {
  it("@agent chooses the first installed defaultAgent candidate", async () => {
    await writeJson(".mdac.json", { defaultAgent: ["claude", "codex", "pi"] });
    await write("note.md", "@agent tighten this\n");
    await stubCommand("codex");
    await stubCommand("pi");

    const result = runCli(["run", tempDir]);

    expect(result.exitCode).toBe(0);
    expect(result.stderr).toBe("");
    expect(result.stdout).toContain("Ran:\n- @agent via codex: 1 comment");
    expect(await logLines()).toEqual(["codex"]);
  });

  it("@agents aliases @agent default routing", async () => {
    await writeJson(".mdac.json", { defaultAgent: ["codex"] });
    await write("note.md", "@agents tighten this\n");
    await stubCommand("codex");

    const result = runCli(["run", tempDir]);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("- @agents via codex: 1 comment");
    expect(await logLines()).toEqual(["codex"]);
  });

  it("@agent exits 1 when no defaultAgent candidate is installed", async () => {
    await write("note.md", "@agent tighten this\n");

    const result = runCli(["run", tempDir]);

    expect(result.exitCode).toBe(1);
    expect(result.stdout).toContain("Found 1 actionable file:");
    expect(result.stderr).toContain("No default agent command is installed for @agent. Install one of: claude, codex, pi; or edit defaultAgent in .mdac.json.");
    expect(existsSync(logPath)).toBe(false);
  });

  it("@agents uses the @agent default-agent failure wording", async () => {
    await write("note.md", "@agents tighten this\n");

    const result = runCli(["run", tempDir]);

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("No default agent command is installed for @agent.");
    expect(result.stderr).not.toContain("for @agents");
  });

  it("@claude missing skips and does not fallback to codex", async () => {
    await write("note.md", "@claude tighten this\n");
    await stubCommand("codex");

    const result = runCli(["run", tempDir]);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("Skipped:\n- @claude: command not installed. Install Claude or remove @claude from triggers.");
    expect(existsSync(logPath)).toBe(false);
  });

  it("@agent still runs when @claude is skipped", async () => {
    await write("note.md", "@claude explicit\n@agent default\n");
    await stubCommand("codex");

    const result = runCli(["run", tempDir]);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("- @claude: command not installed.");
    expect(result.stdout).toContain("- @agent via codex: 1 comment");
    expect(await logLines()).toEqual(["codex"]);
  });

  it("unknown configured triggers skip and exit 0", async () => {
    await writeJson(".mdac.json", { triggers: ["reviewer"] });
    await write("note.md", "@reviewer check this\n");

    const result = runCli(["run", tempDir]);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("- @reviewer: no route configured.");
    expect(existsSync(logPath)).toBe(false);
  });

  it("batches multiple comments for the same trigger into one process", async () => {
    await write("note.md", "@codex first\n@codex second\n");
    await stubCommand("codex");

    const result = runCli(["run", tempDir]);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("- @codex via codex: 2 comments");
    expect(await logLines()).toEqual(["codex"]);
  });

  it("@agent resolving to codex and @codex run as separate processes", async () => {
    await writeJson(".mdac.json", { defaultAgent: ["codex"] });
    await write("note.md", "@agent default\n@codex explicit\n");
    await stubCommand("codex");

    const result = runCli(["run", tempDir]);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("- @agent via codex: 1 comment");
    expect(result.stdout).toContain("- @codex via codex: 1 comment");
    expect(await logLines()).toEqual(["codex", "codex"]);
  });

  it("runtime failure stops later jobs and exits nonzero", async () => {
    await write("note.md", "@codex fail\n@pi later\n");
    await stubCommand("codex", { exitCode: 7 });
    await stubCommand("pi");

    const result = runCli(["run", tempDir]);

    expect(result.exitCode).toBe(7);
    expect(result.stdout).toContain("Invoking @codex via codex...");
    expect(result.stdout).toContain("Runtime failure: @codex via codex exited with 7.");
    expect(await logLines()).toEqual(["codex"]);
  });

  it("runs each trigger at most once per cycle after rescanning", async () => {
    await write("note.md", "@codex first\n@pi second\n");
    await stubCommand("codex", { append: "@codex new work\\n" });
    await stubCommand("pi");

    const result = runCli(["run", tempDir]);

    expect(result.exitCode).toBe(0);
    expect(await logLines()).toEqual(["codex", "pi"]);
  });
});

function runCli(args, env = {}) {
  const proc = Bun.spawnSync({
    cmd: [process.execPath, CLI, ...args],
    env: {
      ...process.env,
      XDG_CONFIG_HOME: join(tempDir, "xdg"),
      HOME: join(tempDir, "home"),
      PATH: binDir,
      MDAC_TEST_LOG: logPath,
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

async function stubCommand(name, { exitCode = 0, append = "" } = {}) {
  const file = join(binDir, name);
  await writeFile(file, [
    "#!/bin/sh",
    `printf '%s\\n' '${name}' >> "$MDAC_TEST_LOG"`,
    append ? `printf '${append}' >> '${join(tempDir, "note.md")}'` : "",
    `exit ${exitCode}`,
    "",
  ].join("\n"));
  await chmod(file, 0o755);
}

async function logLines() {
  return (await readFile(logPath, "utf8")).trim().split("\n");
}

async function writeJson(relativePath, value) {
  await write(relativePath, `${JSON.stringify(value, null, 2)}\n`);
}

async function write(relativePath, contents) {
  const file = join(tempDir, relativePath);
  await mkdir(join(file, ".."), { recursive: true });
  await writeFile(file, contents);
  return file;
}
