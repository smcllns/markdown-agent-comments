import { afterEach, describe, expect, it } from "bun:test";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { spawn } from "node:child_process";
import { tmpdir } from "node:os";
import path, { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const TEST_DIR = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(TEST_DIR, "..", "..");
const DEMO_DIR = join(TEST_DIR, "..");
const RUNS_DIR = join(DEMO_DIR, "runs");

let runDir;
let tempDir;

afterEach(async () => {
  if (runDir) await rm(runDir, { recursive: true, force: true });
  if (tempDir) await rm(tempDir, { recursive: true, force: true });
  runDir = null;
  tempDir = null;
});

describe("demo runner", () => {
  it("runs the demo fixture through an explicit agent command", async () => {
    const runId = `demo-${process.pid}-${Date.now()}`;
    runDir = join(RUNS_DIR, runId);
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

    const result = await runNode(join(DEMO_DIR, "run-skill.js"), [
      "--run-id",
      runId,
      "--agent-command",
      `${process.execPath} ${fakeAgent}`,
    ]);

    expect(result.stdout).toContain(`Prepared demo skill run: ${runId}`);
    expect(result.stdout).toContain("fake agent processed demo");
    expect(result.stdout).toContain("- No actionable mdac comments found.");
    expect(await readFile(join(runDir, "agent-stdout.txt"), "utf8")).toContain("fake agent processed demo");
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
