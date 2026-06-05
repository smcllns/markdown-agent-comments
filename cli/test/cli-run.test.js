import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { mkdir, mkdtemp, readFile, realpath, rm, symlink, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const CLI = new URL("../cli.js", import.meta.url).pathname;

let tempDir;
let logPath;
let stubPath;

beforeEach(async () => {
  tempDir = await mkdtemp(join(tmpdir(), "mdac-run-"));
  logPath = join(tempDir, "agent.log");
  stubPath = join(tempDir, "agent-stub.js");
  await writeFile(stubPath, [
    "import { appendFileSync } from 'node:fs';",
    "appendFileSync(process.env.MDAC_TEST_LOG, JSON.stringify({ cwd: process.cwd(), argv: process.argv.slice(2) }) + '\\n');",
    "console.log('agent output');",
    "",
  ].join("\n"));
});

afterEach(async () => {
  await rm(tempDir, { recursive: true, force: true });
});

describe("mdac run --once", () => {
  it("runs when invoked through a bin symlink", async () => {
    const linkedCli = join(tempDir, "mdac");
    await symlink(CLI, linkedCli);

    const proc = Bun.spawnSync({
      cmd: ["node", linkedCli, "--help"],
      stdout: "pipe",
      stderr: "pipe",
    });

    expect(proc.exitCode).toBe(0);
    const stdout = new TextDecoder().decode(proc.stdout);
    expect(stdout).toContain("usage: mdac");
    expect(new TextDecoder().decode(proc.stderr)).toBe("");
  });

  it("does not invoke the agent when scan is clean", async () => {
    await write("note.md", "plain markdown\n");

    const result = runCli(["run", tempDir, "--once", "--agent-command", `node ${stubPath}`]);

    expect(result.exitCode).toBe(0);
    expect(result.stderr).toBe("");
    expect(result.stdout).toBe("No actionable mdac comments found.\n");
    expect(existsSync(logPath)).toBe(false);
  });

  it("invokes the configured agent from the target directory when matches exist", async () => {
    await write("note.md", "@claude tighten this\n");

    const result = runCli(["run", tempDir, "--once", "--agent-command", `node ${stubPath}`, "--name", "Sam McLoughlin"]);

    expect(result.exitCode).toBe(0);
    expect(result.stderr).toBe("");
    expect(result.stdout).toContain("Found 1 actionable file:\n- note.md\n  - inline line 1 @claude\n");
    expect(result.stdout).toContain("Invoking agent...\n");
    expect(result.stdout).toContain("agent output\n");

    const log = JSON.parse((await readFile(logPath, "utf8")).trim());
    expect(log.cwd).toBe(await realpath(tempDir));
    expect(log.argv).toHaveLength(1);
    expect(log.argv[0]).toContain("You were invoked by the `mdac` CLI.");
    expect(log.argv[0]).toContain("Use these instructions only as CLI-specific context.");
    expect(log.argv[0]).not.toContain("Read the mdac CLI adapter at");
    expect(log.argv[0]).toContain("Then run the Markdown Agent Comments skill at");
    expect(log.argv[0]).toContain("skill/markdown-agent-comments/SKILL.md");
    expect(log.argv[0]).toContain("Runtime facts:");
    expect(log.argv[0]).toContain("  - inline line 1 @claude");
    expect(log.argv[0]).toContain("Human label provided through mdac CLI args: [@sam]");
    expect(log.argv[0].length).toBeLessThan(2000);
    expect(log.argv[0]).not.toContain("# Markdown Agent Comments");
  });

  it("prints agent run diagnostics in debug mode", async () => {
    await write("note.md", "@claude tighten this\n");

    const result = runCli(["run", tempDir, "--once", "--debug", "--agent-command", `node ${stubPath}`]);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("agent output\n");
    expect(result.stderr).toContain(`Scanning ${tempDir}`);
    expect(result.stderr).toContain(`Agent cwd: ${tempDir}`);
    expect(result.stderr).toContain(`Agent command: node ${stubPath} <prompt>`);
    expect(result.stderr).toContain("Agent prompt:");

    const log = JSON.parse((await readFile(logPath, "utf8")).trim());
    expect(log.argv[0]).toContain("Human label provided through mdac CLI args: omitted");
    expect(log.argv[0]).not.toContain("Human label provided through mdac CLI args: [@user]");
    expect(log.argv[0]).toContain("Debug mode: enabled");
  });

  it("uses MDAC_AGENT_COMMAND when --agent-command is omitted", async () => {
    await write("note.md", "@claude tighten this\n");

    const result = runCli(["run", tempDir, "--once"], {
      MDAC_AGENT_COMMAND: `node ${stubPath}`,
    });

    expect(result.exitCode).toBe(0);
    expect(result.stderr).toBe("");
    expect(result.stdout).toContain("Invoking agent...\n");
    expect(existsSync(logPath)).toBe(true);
  });

  it("lets --agent-command override MDAC_AGENT_COMMAND", async () => {
    await write("note.md", "@claude tighten this\n");

    const result = runCli(["run", tempDir, "--once", "--agent-command", `node ${stubPath}`], {
      MDAC_AGENT_COMMAND: "definitely-not-a-real-command",
    });

    expect(result.exitCode).toBe(0);
    expect(result.stderr).toBe("");
    expect(result.stdout).toContain("agent output\n");
    expect(existsSync(logPath)).toBe(true);
  });

  it("invokes the agent from the containing directory when target is a file", async () => {
    const file = await write("single.md", "@claude tighten this\n");

    const result = runCli(["run", file, "--once", "--agent-command", `node ${stubPath}`]);

    expect(result.exitCode).toBe(0);
    expect(result.stderr).toBe("");
    expect(result.stdout).toContain("Found 1 actionable file:\n- single.md\n");

    const log = JSON.parse((await readFile(logPath, "utf8")).trim());
    expect(log.cwd).toBe(await realpath(tempDir));
    expect(log.argv[0]).toContain("- single.md");
  });

  it("requires --once for run", async () => {
    const result = runCli(["run", tempDir, "--agent-command", `node ${stubPath}`]);

    expect(result.exitCode).toBe(2);
    expect(result.stderr).toContain("run currently requires --once");
  });

  it("rejects unterminated quoted agent commands", async () => {
    await write("note.md", "@claude tighten this\n");

    const result = runCli(["run", tempDir, "--once", "--agent-command", "\"node"]);

    expect(result.exitCode).toBe(2);
    expect(result.stderr).toContain("--agent-command has unterminated quote");
  });
});

function runCli(args, env = {}) {
  const proc = Bun.spawnSync({
    cmd: ["node", CLI, ...args],
    env: {
      ...process.env,
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

async function write(relativePath, contents) {
  const file = join(tempDir, relativePath);
  await mkdir(join(file, ".."), { recursive: true });
  await writeFile(file, contents);
  return file;
}
