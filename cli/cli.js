#!/usr/bin/env node
import { access, readFile, stat } from "node:fs/promises";
import { constants, realpathSync } from "node:fs";
import { spawn } from "node:child_process";
import { setTimeout as sleep } from "node:timers/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  DEFAULT_HUMAN_LABEL,
  DEFAULT_TRIGGERS,
  normalizeTriggers,
  normalizeHumanLabel,
  scanPath,
} from "../skill/markdown-agent-comments/scripts/scanner.js";

const DEFAULT_AGENT_COMMAND = "claude -p --permission-mode acceptEdits";
const MODULE_DIR = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.join(MODULE_DIR, "..");
const SKILL_DIR = path.join(PROJECT_ROOT, "skill", "markdown-agent-comments");
const SKILL_PATH = path.join(SKILL_DIR, "SKILL.md");
const CLI_PREPROMPT_PATH = path.join(MODULE_DIR, "cli-preprompt.md");

export async function main(argv = process.argv.slice(2), io = process) {
  try {
    const parsed = parseArgs(argv);
    if (parsed.command === "help") {
      io.stdout.write(usage());
      return 0;
    }
    if (parsed.command === "scan") {
      return await scanCommand(parsed, io);
    }
    if (parsed.command === "run") {
      return await runCommand(parsed, io);
    }
    if (parsed.command === "watch") {
      return await watchCommand(parsed, io);
    }
    throw new UsageError(`Unknown command: ${parsed.command}`);
  } catch (error) {
    if (error instanceof UsageError) {
      io.stderr.write(`mdac: ${error.message}\n\n${usage()}`);
      return 2;
    }
    io.stderr.write(`mdac: ${error.message}\n`);
    return 1;
  }
}

function parseArgs(argv) {
  if (argv.length === 0 || argv[0] === "-h" || argv[0] === "--help") {
    return { command: "help" };
  }

  const [command, ...rest] = argv;
  const options = {
    command,
    targetPath: null,
    triggers: null,
    humanLabel: null,
    humanLabelProvided: false,
    debug: false,
    once: false,
    intervalSeconds: 60,
    agentCommand: process.env.MDAC_AGENT_COMMAND || DEFAULT_AGENT_COMMAND,
  };

  for (let index = 0; index < rest.length; index += 1) {
    const arg = rest[index];
    if (arg === "--trigger") {
      const value = rest[index + 1];
      if (!value) throw new UsageError("--trigger requires a value");
      options.triggers = parseTriggerList(value);
      index += 1;
    } else if (arg === "--name") {
      const value = rest[index + 1];
      if (!value) throw new UsageError("--name requires a value");
      options.humanLabel = value;
      options.humanLabelProvided = true;
      index += 1;
    } else if (arg === "--debug") {
      options.debug = true;
    } else if (arg === "--once") {
      options.once = true;
    } else if (arg === "--interval") {
      const value = rest[index + 1];
      if (!value) throw new UsageError("--interval requires a value");
      options.intervalSeconds = parsePositiveInteger(value, "--interval");
      index += 1;
    } else if (arg === "--agent-command") {
      const value = rest[index + 1];
      if (!value) throw new UsageError("--agent-command requires a value");
      options.agentCommand = value;
      index += 1;
    } else if (arg.startsWith("-")) {
      throw new UsageError(`Unknown option: ${arg}`);
    } else if (!options.targetPath) {
      options.targetPath = arg;
    } else {
      throw new UsageError(`Unexpected argument: ${arg}`);
    }
  }

  return options;
}

async function scanCommand(options, io) {
  if (!options.targetPath) throw new UsageError("scan requires a path");
  await access(options.targetPath, constants.R_OK);

  const matches = await scanForOptions(options, io);
  io.stdout.write(formatScan(matches));
  return 0;
}

async function runCommand(options, io) {
  if (!options.targetPath) throw new UsageError("run requires a path");
  if (!options.once) throw new UsageError("run currently requires --once");
  await access(options.targetPath, constants.R_OK);

  return await runAgentCycle(options, io);
}

async function watchCommand(options, io) {
  if (!options.targetPath) throw new UsageError("watch requires a path");
  await access(options.targetPath, constants.R_OK);

  io.stdout.write(`Watching ${options.targetPath} every ${options.intervalSeconds}s...\n`);

  while (true) {
    const code = await runAgentCycle(options, io, { quietWhenClean: true });
    if (code !== 0) return code;
    await sleep(options.intervalSeconds * 1000);
  }
}

async function runAgentCycle(options, io, { quietWhenClean = false } = {}) {
  const matches = await scanForOptions(options, io);
  if (matches.length === 0) {
    if (!quietWhenClean) io.stdout.write(formatScan(matches));
    return 0;
  }

  io.stdout.write(formatScan(matches));

  io.stdout.write("Invoking agent...\n");
  const prompt = await buildAgentPrompt(options, matches);
  const cwd = await agentCwd(options.targetPath);
  if (options.debug) {
    io.stderr.write(`Agent cwd: ${cwd}\n`);
    io.stderr.write(`Agent command: ${formatAgentCommandForDebug(options.agentCommand)}\n`);
    io.stderr.write(`Agent prompt: ${prompt.length} characters\n`);
  }
  return await invokeAgent(options.agentCommand, prompt, cwd, io);
}

async function scanForOptions(options, io) {
  if (options.debug) {
    io.stderr.write(`Scanning ${options.targetPath}\n`);
    io.stderr.write(`Triggers: ${formatTriggerSet(options)}\n`);
  }

  const matches = await scanPath(options.targetPath, {
    triggers: options.triggers ?? undefined,
    humanLabel: options.humanLabel ?? DEFAULT_HUMAN_LABEL,
  });

  if (options.debug) {
    const noun = matches.length === 1 ? "file" : "files";
    io.stderr.write(`Matched ${matches.length} actionable ${noun}.\n`);
  }

  return matches;
}

async function buildAgentPrompt(options, matches) {
  const triggers = normalizeTriggers(options.triggers ?? DEFAULT_TRIGGERS);
  const triggerDisplay = triggers.map((trigger) => `@${trigger}`).join(", ");
  const humanLabel = normalizeHumanLabel(options.humanLabel ?? DEFAULT_HUMAN_LABEL);
  const files = matches.map(formatPromptMatch).join("\n");
  const cliPreprompt = await readFile(CLI_PREPROMPT_PATH, "utf8");
  const humanLabelInstruction = options.humanLabelProvided
    ? `Human label provided through mdac CLI args: [@${humanLabel}]`
    : "Human label provided through mdac CLI args: omitted";
  return [
    cliPreprompt.trim(),
    "",
    `Then run the Markdown Agent Comments skill at ${SKILL_PATH}.`,
    "",
    "Runtime facts:",
    `Trigger set: ${triggerDisplay}`,
    humanLabelInstruction,
    `Debug mode: ${options.debug ? "enabled" : "disabled"}`,
    "",
    "Matched files:",
    files,
    "",
  ].join("\n");
}

function formatPromptMatch(match) {
  const lines = [`- ${match.relativePath}`];
  for (const reason of match.reasons) {
    lines.push(`  - ${reason.kind} line ${reason.line} @${reason.trigger}`);
  }
  return lines.join("\n");
}

function formatScan(matches) {
  if (matches.length === 0) {
    return "No actionable mdac comments found.\n";
  }

  const noun = matches.length === 1 ? "file" : "files";
  const lines = [`Found ${matches.length} actionable ${noun}:`];
  for (const match of matches) {
    lines.push(`- ${match.relativePath}`);
    for (const reason of match.reasons) {
      lines.push(`  - ${reason.kind} line ${reason.line} @${reason.trigger}`);
    }
  }
  lines.push("");
  return `${lines.join("\n")}`;
}

function parseTriggerList(value) {
  return value.split(",").map((trigger) => trigger.trim()).filter(Boolean);
}

function formatTriggerSet(options) {
  return normalizeTriggers(options.triggers ?? DEFAULT_TRIGGERS)
    .map((trigger) => `@${trigger}`)
    .join(", ");
}

function parsePositiveInteger(value, optionName) {
  if (!/^[1-9][0-9]*$/.test(value)) {
    throw new UsageError(`${optionName} must be a positive integer`);
  }
  return Number(value);
}

async function agentCwd(targetPath) {
  const absolutePath = path.resolve(targetPath);
  const targetStat = await stat(absolutePath);
  return targetStat.isFile() ? path.dirname(absolutePath) : absolutePath;
}

async function invokeAgent(commandText, prompt, cwd, io) {
  const command = splitCommand(commandText);
  if (command.length === 0) throw new UsageError("--agent-command cannot be empty");

  return await new Promise((resolve, reject) => {
    const child = spawn(command[0], [...command.slice(1), prompt], {
      cwd,
      env: process.env,
      stdio: ["ignore", "pipe", "pipe"],
    });

    child.stdout.on("data", (chunk) => io.stdout.write(chunk));
    child.stderr.on("data", (chunk) => io.stderr.write(chunk));
    child.on("error", reject);
    child.on("close", (code) => resolve(code ?? 1));
  });
}

function formatAgentCommandForDebug(commandText) {
  return `${splitCommand(commandText).join(" ")} <prompt>`;
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
    } else if (char === "'" || char === '"') {
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

  if (quote) throw new UsageError("--agent-command has unterminated quote");

  if (current) parts.push(current);
  return parts;
}

function usage() {
  return [
    "usage: mdac <command> <path> [options]",
    "",
    "Commands:",
    "  scan <path>        Show actionable @agent comments without invoking an agent.",
    "  run <path> --once  Scan, then invoke an agent only when work exists.",
    "  watch <path>       Run continuously, invoking an agent only when work exists.",
    "",
    "Options:",
    "  --trigger @name    Replace the default trigger set.",
    "  --name NAME        Optional human speaker label. Omit when no name is known.",
    "  --agent-command C  Agent command for run/watch. Prompt is appended as final argument.",
    "  --interval SEC     Watch interval in seconds. Default: 60.",
    "  --once             Required for run in V1.",
    "  --debug            Print verbose diagnostics when supported.",
    "  -h, --help         Show help.",
    "",
  ].join("\n");
}

class UsageError extends Error {}

function isDirectRun() {
  if (!process.argv[1]) return false;
  return realpathSync(fileURLToPath(import.meta.url)) === realpathSync(process.argv[1]);
}

if (isDirectRun()) {
  const code = await main();
  process.exitCode = code;
}
