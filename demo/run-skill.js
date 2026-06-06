import { cp, mkdir, readFile, stat, writeFile } from "node:fs/promises";
import { spawn } from "node:child_process";
import path, { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { scanPath } from "../skill/markdown-agent-comments/scripts/scanner.js";

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const SKILL_DIR = path.resolve(SCRIPT_DIR, "..", "skill", "markdown-agent-comments");
const SKILL_PATH = join(SKILL_DIR, "SKILL.md");
const SCANNER_PATH = join(SKILL_DIR, "scripts", "scanner.js");
const DEMO_PATH = join(SCRIPT_DIR, "demo.md");
const REFERENCE_PATH = join(SCRIPT_DIR, "demo.processed.md");
const RUNS_DIR = join(SCRIPT_DIR, "runs");

const options = parseArgs(process.argv.slice(2));
const runId = options.runId ?? defaultRunId();
validateRunId(runId);

const runDir = join(RUNS_DIR, runId);
const runDemoPath = join(runDir, "demo.md");
const runSkillDir = join(runDir, "skill");
const runSkillPath = join(runSkillDir, "SKILL.md");
const runScannerPath = join(runSkillDir, "scripts", "scanner.js");
await assertMissing(runDir);
await mkdir(runDir, { recursive: true });
await mkdir(join(runSkillDir, "scripts"), { recursive: true });
await cp(DEMO_PATH, runDemoPath);
await cp(SKILL_PATH, runSkillPath);
await cp(SCANNER_PATH, runScannerPath);

const prompt = demoPrompt({ runId, runDemoPath, runSkillPath, runScannerPath });
await writeFile(join(runDir, "prompt.md"), prompt);
await writeFile(join(runDir, "metadata.json"), `${JSON.stringify({
  runId,
  createdAt: new Date().toISOString(),
  agentCommand: options.agentCommand,
  skillPath: SKILL_PATH,
  runSkillPath,
  sourceDemoPath: DEMO_PATH,
  referencePath: REFERENCE_PATH,
  runDemoPath,
}, null, 2)}\n`);

console.log(`Prepared demo skill run: ${runId}`);
console.log(`Run directory: ${runDir}`);
console.log(`Prompt: ${join(runDir, "prompt.md")}`);
console.log(`Skill copy: ${runSkillPath}`);
console.log(`Generated demo file: ${runDemoPath}`);
console.log(`Reference fixture: ${REFERENCE_PATH}`);
console.log("");

const result = await invokeAgent(options.agentCommand, prompt, runDir);
await writeFile(join(runDir, "agent-stdout.txt"), result.stdout);
await writeFile(join(runDir, "agent-stderr.txt"), result.stderr);

if (result.code !== 0) {
  console.error("");
  const signal = result.signal ? ` (${result.signal})` : "";
  console.error(`Agent command failed with exit code ${result.code}${signal}.`);
  process.exitCode = 1;
}

const matches = await scanPath(runDemoPath);
console.log("Generated demo scan:");
printMatches(matches);

if (matches.length > 0) {
  console.error("");
  console.error("Generated demo still contains actionable comments.");
  process.exitCode = 1;
}

function parseArgs(argv) {
  const parsed = {
    agentCommand: process.env.MDAC_DEMO_AGENT_COMMAND ?? null,
    runId: null,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--agent-command") {
      parsed.agentCommand = readValue(argv, index, arg);
      index += 1;
    } else if (arg === "--run-id") {
      parsed.runId = readValue(argv, index, arg);
      index += 1;
    } else {
      throw new Error(`Unknown option: ${arg}`);
    }
  }

  if (!parsed.agentCommand) {
    throw new Error("demo/run-skill.js requires --agent-command or MDAC_DEMO_AGENT_COMMAND");
  }
  return parsed;
}

function readValue(argv, index, arg) {
  const value = argv[index + 1];
  if (!value) throw new Error(`${arg} requires a value`);
  return value;
}

function defaultRunId() {
  return `demo-${new Date().toISOString().replace(/[:.]/g, "-")}`;
}

function validateRunId(runId) {
  if (!/^[A-Za-z0-9._-]+$/.test(runId)) {
    throw new Error(`Invalid run id: ${runId}`);
  }
}

async function assertMissing(target) {
  try {
    await stat(target);
  } catch (error) {
    if (error.code === "ENOENT") return;
    throw error;
  }
  throw new Error(`Run already exists: ${target}`);
}

function demoPrompt({ runId, runDemoPath, runSkillPath, runScannerPath }) {
  return `# Markdown Agent Comments Demo Run

Run id: ${runId}

Use this run-local copy of the canonical Markdown Agent Comments skill:

${runSkillPath}

Process only this generated copy of the demo fixture:

${runDemoPath}

Do not edit the run-local skill copy, committed source fixture, reference fixture, tests, docs, or any files outside the generated demo file.

Follow SKILL.md as the behavior contract. This prompt only defines the demo run scope.

Before finishing, run this scanner command:

node ${runScannerPath} ${runDemoPath}

If the scanner still reports actionable comments in the generated demo file, fix them before final output.

When finished, report the file changed and any threads left waiting on a human.
`;
}

async function invokeAgent(commandText, prompt, cwd) {
  const command = splitCommand(commandText);
  if (command.length === 0) throw new Error("--agent-command cannot be empty");

  return await new Promise((resolve, reject) => {
    const child = spawn(command[0], [...command.slice(1), prompt], {
      cwd,
      env: process.env,
      stdio: ["ignore", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk) => {
      stdout += chunk;
      process.stdout.write(chunk);
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk;
      process.stderr.write(chunk);
    });
    child.on("error", reject);
    child.on("close", (code, signal) => {
      resolve({ stdout, stderr, code: code ?? 1, signal });
    });
  });
}

function splitCommand(commandText) {
  const parts = [];
  let current = "";
  let quote = "";

  for (const char of commandText.trim()) {
    if (quote) {
      if (char === quote) {
        quote = "";
      } else {
        current += char;
      }
    } else if (char === '"' || char === "'") {
      quote = char;
    } else if (/\s/.test(char)) {
      if (current) {
        parts.push(current);
        current = "";
      }
    } else {
      current += char;
    }
  }

  if (quote) throw new Error("--agent-command has unterminated quote");
  if (current) parts.push(current);
  return parts;
}

function printMatches(matches) {
  if (matches.length === 0) {
    console.log("- No actionable mdac comments found.");
    return;
  }

  for (const match of matches) {
    console.log(`- ${match.relativePath}`);
    for (const reason of match.reasons) {
      console.log(`  - ${reason.kind} line ${reason.line} @${reason.trigger}`);
    }
  }
}
