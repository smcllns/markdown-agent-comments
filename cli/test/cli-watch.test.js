import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { spawn } from "node:child_process";
import { setTimeout as delay } from "node:timers/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

const CLI = new URL("../bin.js", import.meta.url).pathname;

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

    const result = await runWatchUntil(
      ["watch", tempDir, "--interval", "60", "--agent-command", `node ${stubPath}`],
      ({ stdout }) => stdout === `Watching ${tempDir} every 60s...\n`,
      { afterReadyMs: 150 },
    );

    expect(result.stderr).toBe("");
    expect(result.stdout).toBe(`Watching ${tempDir} every 60s...\n`);
    expect(existsSync(logPath)).toBe(false);
  });

  it("prints clean watch cycles in debug mode", async () => {
    await write("note.md", "plain markdown\n");

    const result = await runWatchUntil(
      ["watch", tempDir, "--interval", "60", "--agent-command", `node ${stubPath}`, "--debug"],
      ({ stderr }) => stderr.includes("Matched 0 actionable files.\n"),
    );

    expect(result.stdout).toBe(`Watching ${tempDir} every 60s...\n`);
    expect(result.stderr).toContain("Matched 0 actionable files.\n");
    expect(existsSync(logPath)).toBe(false);
  });

  it("invokes an agent during a watch cycle when matches exist", async () => {
    await write("note.md", "@agent tighten this\n");

    const result = await runWatchUntil(
      ["watch", tempDir, "--interval", "60", "--agent-command", `node ${stubPath}`],
      ({ stdout }) => stdout.includes("agent output\n"),
    );

    expect(result.stderr).toBe("");
    expect(result.stdout).toContain("Found 1 actionable file:");
    expect(result.stdout).toContain("Invoking @agent via agent...\nagent output\n");
    expect(await readFile(logPath, "utf8")).toBe("invoked\n");
  });
});

async function runWatchUntil(args, ready, { afterReadyMs = 0 } = {}) {
  return await new Promise((resolve, reject) => {
    const child = spawn("node", [CLI, ...args], {
      env: {
        ...process.env,
        MDAC_TEST_LOG: logPath,
      },
      stdio: ["ignore", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";
    let settled = false;

    const timeout = globalThis.setTimeout(() => {
      fail(new Error(`watch did not reach expected state\nstdout:\n${stdout}\nstderr:\n${stderr}`));
    }, 3000);

    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
      void maybeResolve();
    });

    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
      void maybeResolve();
    });

    child.on("error", fail);
    child.on("exit", (code, signal) => {
      if (!settled) fail(new Error(`watch exited before expected state: code=${code} signal=${signal}`));
    });

    async function maybeResolve() {
      if (settled || !ready({ stdout, stderr })) return;
      settled = true;
      globalThis.clearTimeout(timeout);
      if (afterReadyMs > 0) await delay(afterReadyMs);
      child.kill("SIGTERM");
      resolve({ stdout, stderr });
    }

    function fail(error) {
      if (settled) return;
      settled = true;
      globalThis.clearTimeout(timeout);
      child.kill("SIGTERM");
      reject(error);
    }
  });
}

async function write(relativePath, contents) {
  const file = join(tempDir, relativePath);
  await mkdir(join(file, ".."), { recursive: true });
  await writeFile(file, contents);
}
