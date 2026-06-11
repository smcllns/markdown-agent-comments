import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

const CLI = new URL("../bin.js", import.meta.url).pathname;

let tempDir;
let xdgDir;

beforeEach(async () => {
  tempDir = await mkdtemp(join(tmpdir(), "mdac-config-"));
  xdgDir = join(tempDir, "xdg");
});

afterEach(async () => {
  await rm(tempDir, { recursive: true, force: true });
});

describe("mdac config", () => {
  it("loads built-in triggers when no config exists", async () => {
    await write("note.md", [
      "@agent default",
      "@agents alias",
      "@claude explicit",
      "@codex explicit",
      "@pi explicit",
      "",
    ].join("\n"));

    const result = runCli(["scan", tempDir]);

    expect(result.exitCode).toBe(0);
    expect(result.stderr).toBe("");
    expect(result.stdout).toContain("inline line 1 @agent");
    expect(result.stdout).toContain("inline line 2 @agents");
    expect(result.stdout).toContain("inline line 3 @claude");
    expect(result.stdout).toContain("inline line 4 @codex");
    expect(result.stdout).toContain("inline line 5 @pi");
  });

  it("loads global config", async () => {
    await writeGlobalConfig({
      triggers: ["reviewer"],
      agents: {
        reviewer: { command: "reviewer-agent -p" },
      },
    });
    await write("note.md", "@reviewer check this\n@claude ignore this\n");

    const result = runCli(["scan", tempDir]);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("inline line 1 @reviewer");
    expect(result.stdout).not.toContain("@claude");
  });

  it("loads project config and discovers it above the target path", async () => {
    await writeJson(join(tempDir, ".mdac.json"), {
      triggers: ["reviewer"],
      agents: {
        reviewer: { command: "reviewer-agent -p" },
      },
    });
    await write("nested/note.md", "@reviewer check this\n@codex ignore this\n");

    const result = runCli(["scan", join(tempDir, "nested")]);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("inline line 1 @reviewer");
    expect(result.stdout).not.toContain("@codex");
  });

  it("merges project agents over global config while replacing defaultAgent and triggers", async () => {
    await writeGlobalConfig({
      defaultAgent: ["claude"],
      triggers: ["global"],
      agents: {
        global: { command: "global-agent -p" },
        shared: { command: "global-shared -p" },
      },
    });
    await writeJson(join(tempDir, ".mdac.json"), {
      defaultAgent: ["codex"],
      triggers: ["project"],
      agents: {
        project: { command: "project-agent -p" },
      },
    });

    const result = runCli(["doctor", tempDir], { PATH: tempDir });

    expect(result.exitCode).toBe(1);
    expect(result.stdout).toContain("Effective triggers: @project");
    expect(result.stdout).toContain("Default agent candidates: codex");
    expect(result.stdout).toContain("@global -> global-agent -p (global)");
    expect(result.stdout).toContain("@project -> project-agent -p (project)");
    expect(result.stdout).toContain("@shared -> global-shared -p (global)");
  });

  it("applies CLI, env, project, global, then built-in precedence", async () => {
    await writeGlobalConfig({
      defaultAgent: ["claude"],
      triggers: ["global"],
      agents: {
        codex: { command: "global-codex -p" },
      },
    });
    await writeJson(join(tempDir, ".mdac.json"), {
      defaultAgent: ["codex"],
      triggers: ["project"],
      agents: {
        codex: { command: "project-codex -p" },
      },
    });

    const result = runCli([
      "doctor",
      tempDir,
      "--trigger",
      "@cli",
      "--default-agent",
      "pi",
      "--route",
      "@codex=cli-codex -p",
    ], {
      MDAC_DEFAULT_AGENT: "claude",
      MDAC_CODEX_COMMAND: "env-codex -p",
      PATH: tempDir,
    });

    expect(result.exitCode).toBe(1);
    expect(result.stdout).toContain("Effective triggers: @cli");
    expect(result.stdout).toContain("Default agent candidates: pi");
    expect(result.stdout).toContain("@codex -> cli-codex -p (CLI)");
  });

  it("fails on unknown top-level config keys", async () => {
    await writeJson(join(tempDir, ".mdac.json"), {
      routes: { reviewer: "codex" },
    });

    const result = runCli(["scan", tempDir]);

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain(`Unknown config key in ${join(tempDir, ".mdac.json")}: routes`);
  });

  it("fails on invalid JSON for scan, run, and doctor", async () => {
    await writeFile(join(tempDir, ".mdac.json"), "{ nope\n");

    for (const command of ["scan", "run", "doctor"]) {
      const result = runCli([command, tempDir]);
      expect(result.exitCode).toBe(1);
      expect(result.stderr).toContain("Invalid JSON in");
    }
  });

  it("--trigger replaces the configured trigger set", async () => {
    await writeJson(join(tempDir, ".mdac.json"), {
      triggers: ["reviewer"],
      agents: {
        reviewer: { command: "reviewer-agent -p" },
      },
    });
    await write("note.md", "@reviewer ignore\n@pi run\n");

    const result = runCli(["scan", tempDir, "--trigger", "@pi"]);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("inline line 2 @pi");
    expect(result.stdout).not.toContain("@reviewer");
  });
});

function runCli(args, env = {}) {
  const proc = Bun.spawnSync({
    cmd: [process.execPath, CLI, ...args],
    env: {
      ...process.env,
      XDG_CONFIG_HOME: xdgDir,
      HOME: join(tempDir, "home"),
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

async function writeGlobalConfig(config) {
  await writeJson(join(xdgDir, "mdac", "config.json"), config);
}

async function writeJson(file, value) {
  await mkdir(join(file, ".."), { recursive: true });
  await writeFile(file, `${JSON.stringify(value, null, 2)}\n`);
}

async function write(relativePath, contents) {
  const file = join(tempDir, relativePath);
  await mkdir(join(file, ".."), { recursive: true });
  await writeFile(file, contents);
  return file;
}
