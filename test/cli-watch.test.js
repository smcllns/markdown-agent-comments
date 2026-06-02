import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const CLI = new URL("../src/cli.js", import.meta.url).pathname;

let tempDir;
let logPath;
let stubPath;

beforeEach(async () => {
  tempDir = await mkdtemp(join(tmpdir(), "mdac-watch-"));
  logPath = join(tempDir, "agent.log");
  stubPath = join(tempDir, "agent-stub.js");
  await writeFile(stubPath, [
    "import { appendFileSync } from 'node:fs';",
    "appendFileSync(process.env.MDAC_TEST_LOG, 'invoked\\n');",
    "console.log('agent output');",
    "",
  ].join("\n"));
});

afterEach(async () => {
  await rm(tempDir, { recursive: true, force: true });
});

describe("mdac watch", () => {
  it("runs one scan cycle without invoking an agent when clean", async () => {
    await write("note.md", "plain markdown\n");

    const result = runCli(["watch", tempDir, "--interval", "60", "--max-cycles", "1", "--agent-command", `node ${stubPath}`]);

    expect(result.exitCode).toBe(0);
    expect(result.stderr).toBe("");
    expect(result.stdout).toContain(`Watching ${tempDir} every 60s`);
    expect(result.stdout).toContain("No actionable mdac comments found.\n");
    expect(existsSync(logPath)).toBe(false);
  });

  it("invokes an agent during a watch cycle when matches exist", async () => {
    await write("note.md", "@claude tighten this\n");

    const result = runCli(["watch", tempDir, "--interval", "60", "--max-cycles", "1", "--agent-command", `node ${stubPath}`]);

    expect(result.exitCode).toBe(0);
    expect(result.stderr).toBe("");
    expect(result.stdout).toContain("Found 1 actionable file:");
    expect(result.stdout).toContain("Invoking agent...\nagent output\n");
    expect(await readFile(logPath, "utf8")).toBe("invoked\n");
  });
});

function runCli(args) {
  const proc = Bun.spawnSync({
    cmd: ["node", CLI, ...args],
    env: {
      ...process.env,
      MDAC_TEST_LOG: logPath,
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
}
