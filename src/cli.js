#!/usr/bin/env node
import { access } from "node:fs/promises";
import { constants } from "node:fs";
import { scanPath } from "./scanner.js";

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

  const matches = await scanPath(options.targetPath, {
    triggers: options.triggers ?? undefined,
    humanLabel: options.humanLabel,
  });

  io.stdout.write(formatScan(matches));
  return 0;
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

function usage() {
  return [
    "usage: mdac <command> <path> [options]",
    "",
    "Commands:",
    "  scan <path>        Show actionable @agent comments without invoking an agent.",
    "",
    "Options:",
    "  --trigger @name    Replace the default trigger set.",
    "  --name NAME        Human speaker label for thread placeholders.",
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
