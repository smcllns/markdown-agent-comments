import { cp, mkdir, readFile, readdir, stat, writeFile } from "node:fs/promises";
import path, { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const SKILL_DIR = path.resolve(SCRIPT_DIR, "..");
const EVAL_DIR = SCRIPT_DIR;
const INPUT_DIR = join(EVAL_DIR, "cases", "input");
const EXPECTED_DIR = join(EVAL_DIR, "cases", "expected");
const RUNS_DIR = join(EVAL_DIR, "runs");
const SKILL_PATH = join(SKILL_DIR, "SKILL.md");
const JUDGE_TEMPLATE_PATH = join(EVAL_DIR, "judge-prompt.md");

const options = parseArgs(process.argv.slice(2));
const runId = options.runId ?? defaultRunId(options.executor);
validateRunId(runId);

const runDir = join(RUNS_DIR, runId);
const actualDir = join(runDir, "actual");

await assertMissing(runDir);
await mkdir(RUNS_DIR, { recursive: true });
await mkdir(runDir);
await cp(INPUT_DIR, actualDir, { recursive: true });

const files = await markdownFiles(actualDir);
const metadata = {
  runId,
  executor: options.executor,
  createdAt: new Date().toISOString(),
  skillPath: SKILL_PATH,
  actualDir,
  inputDir: INPUT_DIR,
};

await writeFile(join(runDir, "metadata.json"), `${JSON.stringify(metadata, null, 2)}\n`);
const judgeTemplate = await readFile(JUDGE_TEMPLATE_PATH, "utf8");

await writeFile(join(runDir, "executor-prompt.md"), executorPrompt({ runId, executor: options.executor, files }));
await writeFile(join(runDir, "judge-prompt.md"), judgePrompt({ runId, executor: options.executor, actualDir, judgeTemplate }));

console.log(`Prepared skill eval run: ${runId}`);
console.log(`Run directory: ${runDir}`);
console.log(`Executor prompt: ${join(runDir, "executor-prompt.md")}`);
console.log(`Judge prompt: ${join(runDir, "judge-prompt.md")}`);
console.log("");
console.log("After the executor edits files in actual/, run:");
console.log(`bun run eval:verify -- --run ${runId} --write`);
console.log(`bun run eval:judge -- --run ${runId} --judge-command "<agent command>"`);

function parseArgs(argv) {
  const parsed = {
    executor: "manual",
    runId: null,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--executor") {
      parsed.executor = readValue(argv, index, arg);
      index += 1;
    } else if (arg === "--run-id") {
      parsed.runId = readValue(argv, index, arg);
      index += 1;
    } else {
      throw new Error(`Unknown option: ${arg}`);
    }
  }

  return parsed;
}

function readValue(argv, index, arg) {
  const value = argv[index + 1];
  if (!value) throw new Error(`${arg} requires a value`);
  return value;
}

function defaultRunId(executor) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  return `${timestamp}-${slug(executor)}`;
}

function slug(value) {
  return String(value).toLowerCase().replace(/[^a-z0-9._-]+/g, "-").replace(/^-+|-+$/g, "") || "manual";
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

async function markdownFiles(root) {
  const entries = await readdir(root, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const entryPath = join(root, entry.name);
    if (entry.isDirectory()) {
      files.push(...await markdownFiles(entryPath));
    } else if (entry.isFile() && entry.name.endsWith(".md")) {
      files.push(entryPath);
    }
  }
  return files.sort();
}

function executorPrompt({ runId, executor, files }) {
  const fileList = files.map((file) => `- ${file}`).join("\n");

  return `# Markdown Agent Comments Eval Executor

Run id: ${runId}
Executor: ${executor}

Use the canonical skill:

${SKILL_PATH}

Process only these generated copies:

${fileList}

Do not read \`cases/expected/\` or any files outside the listed generated copies unless the human explicitly redirects you.

Follow \`SKILL.md\` as the behavior contract. This prompt only defines the eval run scope.

When finished, report the files changed and any threads left waiting on a human.
`;
}

function judgePrompt({ runId, executor, actualDir, judgeTemplate }) {
  return `${judgeTemplate.trim()}

## Run Context

Run id: ${runId}
Executor: ${executor}

Read these directories:

- input: ${INPUT_DIR}
- expected: ${EXPECTED_DIR}
- actual: ${actualDir}

Do not edit files. Return only the JSON object described above.
Use the run id and executor from this Run Context in the returned JSON, not placeholder strings from the example.
`;
}
