import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { mkdir, mkdtemp, readFile, realpath, rm, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const CLI = new URL("../src/cli.js", import.meta.url).pathname;

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

    const result = runCli(["run", tempDir, "--once", "--agent-command", `node ${stubPath}`, "--name", "Sam"]);

    expect(result.exitCode).toBe(0);
    expect(result.stderr).toBe("");
    expect(result.stdout).toContain("Found 1 actionable file:\n- note.md\n  - inline line 1 @claude\n");
    expect(result.stdout).toContain("Invoking agent...\n");
    expect(result.stdout).toContain("agent output\n");

    const log = JSON.parse((await readFile(logPath, "utf8")).trim());
    expect(log.cwd).toBe(await realpath(tempDir));
    expect(log.argv).toHaveLength(1);
    expect(log.argv[0]).toContain("note.md");
    expect(log.argv[0]).toContain("[!NOTE]");
    expect(log.argv[0]).toContain("[!DONE]-");
    expect(log.argv[0]).toContain("<!--mdac:eot-->");
    expect(log.argv[0]).toContain("Human speaker label: [@sam]");
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
