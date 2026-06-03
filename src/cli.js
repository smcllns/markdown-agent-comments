#!/usr/bin/env node
import { access, stat } from "node:fs/promises";
import { constants } from "node:fs";
import { spawn } from "node:child_process";
import { setTimeout as sleep } from "node:timers/promises";
import path from "node:path";
import { scanPath, normalizeTriggers } from "./scanner.js";
import {
  ACTIVE_CALLOUT,
  DEFAULT_HUMAN_LABEL,
  DEFAULT_TRIGGERS,
  DONE_CALLOUT,
  EOT_SEAL,
  normalizeHumanLabel,
} from "./protocol.js";

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
    humanLabel: DEFAULT_HUMAN_LABEL,
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

  let cycles = 0;
  while (true) {
    cycles += 1;
    const code = await runAgentCycle(options, io, { quietWhenClean: true });
    if (code !== 0) return code;
    if (options.maxCycles !== null && cycles >= options.maxCycles) return 0;
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
  const prompt = buildAgentPrompt(options, matches);
  const cwd = await agentCwd(options.targetPath);
  return await invokeAgent(options.agentCommand, prompt, cwd, io);
}

async function scanForOptions(options, io) {
  if (options.debug) {
    io.stderr.write(`Scanning ${options.targetPath}\n`);
    io.stderr.write(`Triggers: ${formatTriggerSet(options)}\n`);
  }

  const matches = await scanPath(options.targetPath, {
    triggers: options.triggers ?? undefined,
    humanLabel: options.humanLabel,
  });

  if (options.debug) {
    const noun = matches.length === 1 ? "file" : "files";
    io.stderr.write(`Matched ${matches.length} actionable ${noun}.\n`);
  }

  return matches;
}

export function buildAgentPrompt(options, matches) {
  const triggers = normalizeTriggers(options.triggers ?? DEFAULT_TRIGGERS);
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
    "Thread format:",
    `- Active threads use ${ACTIVE_CALLOUT}.`,
    `- Resolved threads use ${DONE_CALLOUT}. The title is a one-line outcome summary.`,
    "- Separate turns inside a callout with a single blank quoted line.",
    `- Human turns use [@${humanLabel}]. Agent turns use the active trigger label, for example [@${triggers[0]}].`,
    `- End every agent reply with ${EOT_SEAL}.`,
    "",
    "Resolution contract:",
    "- Read the full file and enough surrounding context to understand the request.",
    "- Use any better-matching skill or tool first when one applies.",
    "- Do concrete requested work in the document body, not the callout. The callout gets the record and a concise acknowledgement.",
    "- For discussion-only asks, answer concisely inside the callout.",
    "- If the ask sits on a task item, update the checkbox too.",
    "- Preserve the original request verbatim as the first body line inside the callout.",
    "- For an inline trigger, create a new callout immediately after the affected block, copy the original line verbatim into the callout, and remove the live trigger from the body.",
    `- Conclude completed work with ${DONE_CALLOUT} and a title using past-tense action + scope, about 60 characters or less.`,
    "",
    "When more human input is required:",
    "- If the request is ambiguous, missing context, or non-actionable, do not guess.",
    "- Do not invent facts, benefits, metrics, names, dates, or other specifics that are not present in the document.",
    `- Leave the thread as ${ACTIVE_CALLOUT}, ask the smallest useful clarification question, end with ${EOT_SEAL}, then prefill the human reply label.`,
    `- Prefill format: a blank quoted separator line, then > [@${humanLabel}]`,
    "",
    "Parked threads:",
    "- If the latest real thread line is agent-authored, the thread is parked waiting on the human.",
    "- Do not self-reply to parked threads, even if the agent's last reply asked a question.",
    `- If a human follows up after ${EOT_SEAL}, inspect the request and reseal the thread after your turn.`,
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
    `  --name NAME        Human speaker label for thread placeholders. Default: ${DEFAULT_HUMAN_LABEL}.`,
    "  --agent-command C  Agent command for run/watch. Prompt is appended as final argument.",
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
