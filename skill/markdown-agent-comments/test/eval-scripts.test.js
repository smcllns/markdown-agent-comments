import { afterEach, describe, expect, it } from "bun:test";
import { cp, rm } from "node:fs/promises";
import { spawn } from "node:child_process";
import path, { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const TEST_DIR = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(TEST_DIR, "..", "..", "..");
const SCRIPTS_DIR = join(TEST_DIR, "scripts");
const EVAL_DIR = join(TEST_DIR, "fixtures", "skill-evals");
const EXPECTED_DIR = join(EVAL_DIR, "expected");
const RUNS_DIR = join(EVAL_DIR, "runs");

let runDir;

afterEach(async () => {
  if (runDir) await rm(runDir, { recursive: true, force: true });
  runDir = null;
});

describe("skill eval scripts", () => {
  it("prepares a run and judges exact expected outputs as a pass", async () => {
    const runId = `test-${process.pid}-${Date.now()}`;
    runDir = join(RUNS_DIR, runId);

    await runNode(join(SCRIPTS_DIR, "prepare-skill-eval.js"), ["--run-id", runId, "--executor", "test"]);
    await rm(join(runDir, "actual"), { recursive: true, force: true });
    await cp(EXPECTED_DIR, join(runDir, "actual"), { recursive: true });

    const result = await runNode(join(SCRIPTS_DIR, "judge-skill-eval.js"), ["--run", runId]);
    const parsed = JSON.parse(result.stdout);

    expect(parsed.status).toBe("pass");
    expect(parsed.score).toBe(1);
    expect(parsed.cases.every((item) => item.status === "pass")).toBe(true);
  });
});

function runNode(script, args) {
  return new Promise((resolve, reject) => {
    const child = spawn("node", [script, ...args], {
      cwd: REPO_ROOT,
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk) => {
      stdout += chunk;
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk;
    });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) {
        resolve({ stdout, stderr });
      } else {
        reject(new Error(`node ${script} ${args.join(" ")} failed with ${code}\n${stdout}\n${stderr}`));
      }
    });
  });
}
