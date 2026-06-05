import { afterEach, describe, expect, it } from "bun:test";
import { cp, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { spawn } from "node:child_process";
import { tmpdir } from "node:os";
import path, { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const TEST_DIR = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(TEST_DIR, "..", "..", "..");
const SCRIPTS_DIR = join(TEST_DIR, "scripts");
const EVAL_DIR = join(TEST_DIR, "fixtures", "skill-evals");
const EXPECTED_DIR = join(EVAL_DIR, "expected");
const RUNS_DIR = join(EVAL_DIR, "runs");
const DEMO_RUNS_DIR = join(TEST_DIR, "fixtures", "runs");

let runDir;
let demoRunDir;
let tempDir;

afterEach(async () => {
  if (runDir) await rm(runDir, { recursive: true, force: true });
  if (demoRunDir) await rm(demoRunDir, { recursive: true, force: true });
  if (tempDir) await rm(tempDir, { recursive: true, force: true });
  runDir = null;
  demoRunDir = null;
  tempDir = null;
});

describe("skill eval scripts", () => {
  it("prepares a run and verifies exact expected outputs as a pass", async () => {
    const runId = `test-${process.pid}-${Date.now()}`;
    runDir = join(RUNS_DIR, runId);

    await runNode(join(SCRIPTS_DIR, "prepare-skill-eval.js"), ["--run-id", runId, "--executor", "test"]);
    await rm(join(runDir, "actual"), { recursive: true, force: true });
    await cp(EXPECTED_DIR, join(runDir, "actual"), { recursive: true });

    const result = await runNode(join(SCRIPTS_DIR, "verify-skill-eval.js"), ["--run", runId]);
    const parsed = JSON.parse(result.stdout);

    expect(parsed.status).toBe("pass");
    expect(parsed.score).toBe(1);
    expect(parsed.cases.every((item) => item.status === "pass")).toBe(true);
  });

  it("keeps the executor prompt scoped to files instead of restating skill rules", async () => {
    const runId = `prompt-${process.pid}-${Date.now()}`;
    runDir = join(RUNS_DIR, runId);

    await runNode(join(SCRIPTS_DIR, "prepare-skill-eval.js"), ["--run-id", runId, "--executor", "test"]);
    const prompt = await readFile(join(runDir, "executor-prompt.md"), "utf8");
    const judgePrompt = await readFile(join(runDir, "judge-prompt.md"), "utf8");

    expect(prompt).toContain("Use the canonical skill:");
    expect(prompt).toContain("Process only these generated copies:");
    expect(prompt).not.toContain("<!--mdac:eot-->");
    expect(prompt).not.toContain("[!DONE]");
    expect(prompt).not.toContain("[!NOTE]");
    expect(prompt).not.toContain("preserve the original request");
    expect(prompt).not.toContain("active trigger label");
    expect(judgePrompt).toContain(`Run id: ${runId}`);
    expect(judgePrompt).toContain(`actual: ${join(runDir, "actual")}`);
  });

  it("does not pass unprocessed input copies", async () => {
    const runId = `bad-${process.pid}-${Date.now()}`;
    runDir = join(RUNS_DIR, runId);

    await runNode(join(SCRIPTS_DIR, "prepare-skill-eval.js"), ["--run-id", runId, "--executor", "test"]);
    const result = await runNode(join(SCRIPTS_DIR, "verify-skill-eval.js"), ["--run", runId]);
    const parsed = JSON.parse(result.stdout);

    expect(parsed.score).toBeLessThan(0.75);
    expect(parsed.status).not.toBe("pass");
    expect(parsed.status).not.toBe("pass-with-notes");
  });

  it("fails clearly when the actual run directory is missing", async () => {
    const missingRunId = `missing-${process.pid}-${Date.now()}`;

    await expect(runNode(join(SCRIPTS_DIR, "verify-skill-eval.js"), ["--run", missingRunId]))
      .rejects.toThrow("Eval actual directory does not exist");
  });

  it("runs an explicit judge command with the generated judge prompt", async () => {
    const runId = `judge-${process.pid}-${Date.now()}`;
    runDir = join(RUNS_DIR, runId);

    await runNode(join(SCRIPTS_DIR, "prepare-skill-eval.js"), ["--run-id", runId, "--executor", "test"]);

    const fakeJudge = join(runDir, "fake-judge.js");
    await writeFile(fakeJudge, `
const prompt = process.argv[2] ?? "";
if (!prompt.includes("Run id: ${runId}")) process.exit(2);
if (!prompt.includes("actual: ${join(runDir, "actual")}")) process.exit(3);
process.stdout.write(JSON.stringify({ runId: "${runId}", judge: "fake", cases: [] }));
`);

    const result = await runNode(join(SCRIPTS_DIR, "judge-skill-eval.js"), [
      "--run",
      runId,
      "--judge-command",
      `${process.execPath} ${fakeJudge}`,
    ]);
    const parsed = JSON.parse(result.stdout);
    const saved = JSON.parse(await readFile(join(runDir, "judge-result.json"), "utf8"));

    expect(parsed.runId).toBe(runId);
    expect(saved.judge).toBe("fake");
  });

  it("runs the demo fixture through an explicit agent command", async () => {
    const runId = `demo-${process.pid}-${Date.now()}`;
    demoRunDir = join(DEMO_RUNS_DIR, runId);
    tempDir = await mkdtemp(join(tmpdir(), "mdac-demo-agent-"));

    const fakeAgent = join(tempDir, "fake-demo-agent.js");
    await writeFile(fakeAgent, `
import { writeFileSync } from "node:fs";
const prompt = process.argv[2] ?? "";
if (!prompt.includes("SKILL.md")) process.exit(2);
const match = prompt.match(/Process only this generated copy of the demo fixture:\\n\\n([^\\n]+)/);
if (!match) process.exit(3);
writeFileSync(match[1], "# Demo\\n\\nResolved by fake agent.\\n");
process.stdout.write("fake agent processed demo\\n");
`);

    const result = await runNode(join(SCRIPTS_DIR, "run-demo-skill.js"), [
      "--run-id",
      runId,
      "--agent-command",
      `${process.execPath} ${fakeAgent}`,
    ]);

    expect(result.stdout).toContain(`Prepared demo skill run: ${runId}`);
    expect(result.stdout).toContain("fake agent processed demo");
    expect(result.stdout).toContain("- No actionable mdac comments found.");
    expect(await readFile(join(demoRunDir, "agent-stdout.txt"), "utf8")).toContain("fake agent processed demo");
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
