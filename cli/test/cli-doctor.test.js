import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { chmod, mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

const CLI = new URL("../bin.js", import.meta.url).pathname;

let tempDir;
let binDir;
let xdgDir;

beforeEach(async () => {
  tempDir = await mkdtemp(join(tmpdir(), "mdac-doctor-"));
  binDir = join(tempDir, "bin");
  xdgDir = join(tempDir, "xdg");
  await mkdir(binDir, { recursive: true });
});

afterEach(async () => {
  await rm(tempDir, { recursive: true, force: true });
});

describe("mdac doctor", () => {
  it("prints config files, triggers, defaultAgent status, and route table", async () => {
    await writeJson(join(xdgDir, "mdac/config.json"), {
      agents: {
        reviewer: { command: "reviewer-agent -p" },
      },
    });
    await writeJson(join(tempDir, ".mdac.json"), {
      defaultAgent: ["codex", "claude"],
      triggers: ["agent", "reviewer"],
    });
    await stubCommand("codex");

    const result = runCli(["doctor", tempDir]);

    expect(result.exitCode).toBe(0);
    expect(result.stderr).toBe("");
    expect(result.stdout).toContain("Config files:");
    expect(result.stdout).toContain(join(xdgDir, "mdac/config.json"));
    expect(result.stdout).toContain(join(tempDir, ".mdac.json"));
    expect(result.stdout).toContain("Effective triggers: @agent, @reviewer");
    expect(result.stdout).toContain("Default agent candidates: codex installed, claude missing");
    expect(result.stdout).toContain("@codex -> codex exec --full-auto (built-in) installed");
    expect(result.stdout).toContain("@reviewer -> reviewer-agent -p (global) missing");
    expect(result.stdout).toContain("Problems: none");
  });

  it("exits nonzero when no defaultAgent candidate is installed", async () => {
    const result = runCli(["doctor", tempDir]);

    expect(result.exitCode).toBe(1);
    expect(result.stdout).toContain("No default agent command is installed for @agent.");
  });

  it("treats missing unused built-ins as informational", async () => {
    await writeJson(join(tempDir, ".mdac.json"), {
      defaultAgent: ["codex"],
      triggers: ["agent"],
    });
    await stubCommand("codex");

    const result = runCli(["doctor", tempDir]);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("@claude -> claude -p --permission-mode acceptEdits (built-in) missing");
    expect(result.stdout).toContain("Problems: none");
  });

  it("uses an @agent command override as the default route", async () => {
    await stubCommand("mdac-agent");

    const result = runCli(["doctor", tempDir], {
      MDAC_AGENT_COMMAND: "mdac-agent -p",
    });

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("@agent -> mdac-agent -p (env) installed");
    expect(result.stdout).toContain("Problems: none");
  });
});

function runCli(args, env = {}) {
  const proc = Bun.spawnSync({
    cmd: [process.execPath, CLI, ...args],
    env: {
      ...process.env,
      XDG_CONFIG_HOME: xdgDir,
      HOME: join(tempDir, "home"),
      PATH: binDir,
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

async function stubCommand(name) {
  const file = join(binDir, name);
  await writeFile(file, "#!/bin/sh\nexit 0\n");
  await chmod(file, 0o755);
}

async function writeJson(file, value) {
  await mkdir(join(file, ".."), { recursive: true });
  await writeFile(file, `${JSON.stringify(value, null, 2)}\n`);
}
