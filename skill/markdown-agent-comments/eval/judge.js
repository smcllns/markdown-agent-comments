import { readFile, stat, writeFile } from "node:fs/promises";
import { spawn } from "node:child_process";
import path, { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const RUNS_DIR = join(SCRIPT_DIR, "runs");

const options = parseArgs(process.argv.slice(2));
const runDir = resolveRunDir(options.run);
await assertDirectory(runDir);

const promptPath = join(runDir, "judge-prompt.md");
const prompt = await readFile(promptPath, "utf8");
const rawOutput = await invokeJudge(options.judgeCommand, prompt, runDir);
const rawPath = join(runDir, "judge-output.txt");
await writeFile(rawPath, rawOutput);

let parsed;
try {
  parsed = JSON.parse(rawOutput);
} catch {
  throw new Error(`Judge output was not valid JSON. Raw output saved to ${rawPath}`);
}

const json = `${JSON.stringify(parsed, null, 2)}\n`;
await writeFile(join(runDir, "judge-result.json"), json);
process.stdout.write(json);

function parseArgs(argv) {
  const parsed = {
    run: null,
    judgeCommand: process.env.MDAC_JUDGE_COMMAND ?? null,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--run") {
      parsed.run = readValue(argv, index, arg);
      index += 1;
    } else if (arg === "--judge-command") {
      parsed.judgeCommand = readValue(argv, index, arg);
      index += 1;
    } else {
      throw new Error(`Unknown option: ${arg}`);
    }
  }

  if (!parsed.run) {
    throw new Error("usage: eval:judge -- --run <run-id-or-path> --judge-command <command>");
  }
  if (!parsed.judgeCommand) {
    throw new Error("eval:judge requires --judge-command or MDAC_JUDGE_COMMAND");
  }
  return parsed;
}

function readValue(argv, index, arg) {
  const value = argv[index + 1];
  if (!value) throw new Error(`${arg} requires a value`);
  return value;
}

function resolveRunDir(run) {
  if (path.isAbsolute(run) || run.includes("/")) return path.resolve(run);
  if (!/^[A-Za-z0-9._-]+$/.test(run)) throw new Error(`Invalid run id: ${run}`);
  return join(RUNS_DIR, run);
}

async function assertDirectory(dir) {
  let result;
  try {
    result = await stat(dir);
  } catch (error) {
    if (error.code === "ENOENT") {
      throw new Error(`Eval run directory does not exist: ${dir}\nRun eval:prepare first.`);
    }
    throw error;
  }

  if (!result.isDirectory()) {
    throw new Error(`Eval run path is not a directory: ${dir}`);
  }
}

async function invokeJudge(commandText, prompt, cwd) {
  const command = splitCommand(commandText);
  if (command.length === 0) throw new Error("--judge-command cannot be empty");

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
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk;
    });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) {
        resolve(stdout);
      } else {
        reject(new Error(`judge command failed with ${code}\n${stderr}`));
      }
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

  if (quote) throw new Error("--judge-command has unterminated quote");
  if (current) parts.push(current);
  return parts;
}
