#!/usr/bin/env node
import { access } from "node:fs/promises";
import { constants } from "node:fs";
import { spawn } from "node:child_process";
import { setTimeout as sleep } from "node:timers/promises";
import { scanPath, normalizeTriggers } from "./scanner.js";

const DEFAULT_AGENT_COMMAND = "claude -p --permission-mode acceptEdits";

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
    humanLabel: "sam",
    debug: false,
    once: false,
    intervalSeconds: 60,
    maxCycles: null,
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
    } else if (arg === "--max-cycles") {
      const value = rest[index + 1];
      if (!value) throw new UsageError("--max-cycles requires a value");
      options.maxCycles = parsePositiveInteger(value, "--max-cycles");
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

  const matches = await scanForOptions(options);
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

  let cycles = 0;
  while (true) {
    cycles += 1;
    const code = await runAgentCycle(options, io);
    if (code !== 0) return code;
    if (options.maxCycles !== null && cycles >= options.maxCycles) return 0;
    await sleep(options.intervalSeconds * 1000);
  }
}

async function runAgentCycle(options, io) {
  const matches = await scanForOptions(options);
  io.stdout.write(formatScan(matches));
  if (matches.length === 0) return 0;

  io.stdout.write("Invoking agent...\n");
  const prompt = buildAgentPrompt(options, matches);
  return await invokeAgent(options.agentCommand, prompt, options.targetPath, io);
}

async function scanForOptions(options) {
  const matches = await scanPath(options.targetPath, {
    triggers: options.triggers ?? undefined,
    humanLabel: options.humanLabel,
  });
  return matches;
}

export function buildAgentPrompt(options, matches) {
  const triggers = normalizeTriggers(options.triggers ?? ["agent", "claude", "codex"]);
  const triggerDisplay = triggers.map((trigger) => `@${trigger}`).join(", ");
  const humanLabel = normalizeHumanLabel(options.humanLabel);
  const files = matches.map((match) => `- ${match.relativePath}`).join("\n");
  return [
    "Use the Markdown Agent Comments protocol in the current working directory.",
    "",
    `Trigger set: ${triggerDisplay}`,
    `Human speaker label: [@${humanLabel}]`,
    "",
    "Resolve actionable mdac comments in:",
    files,
    "",
    "Protocol:",
    "- Active threads use [!NOTE].",
    "- Resolved threads use [!DONE]-.",
    "- Preserve the original request verbatim as the first body line inside the callout.",
    "- Edit the document body for concrete asks; keep the thread as the record.",
    "- End every agent reply with <!--mdac:eot-->.",
    "- If you need human input, leave the thread as [!NOTE] and prefill the human reply label.",
    "",
  ].join("\n");
}

export function formatScan(matches) {
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

function parsePositiveInteger(value, optionName) {
  if (!/^[1-9][0-9]*$/.test(value)) {
    throw new UsageError(`${optionName} must be a positive integer`);
  }
  return Number(value);
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

  if (current) parts.push(current);
  return parts;
}

function normalizeHumanLabel(label) {
  const first = String(label).trim().split(/\s+/)[0] || "user";
  return first.toLowerCase().replace(/[^a-z0-9_]+/g, "_").replace(/^_+|_+$/g, "") || "user";
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
    "  --name NAME        Human speaker label for thread placeholders.",
    "  --agent-command C  Agent command for run. Default: claude -p --permission-mode acceptEdits.",
    "  --interval SEC     Watch interval in seconds. Default: 60.",
    "  --once             Required for run in V1.",
    "  --debug            Print verbose diagnostics when supported.",
    "  -h, --help         Show help.",
    "",
  ].join("\n");
}

class UsageError extends Error {}

if (import.meta.url === `file://${process.argv[1]}`) {
  const code = await main();
  process.exitCode = code;
}
