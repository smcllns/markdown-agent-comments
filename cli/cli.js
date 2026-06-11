import { access, readFile, stat } from "node:fs/promises";
import { constants } from "node:fs";
import { spawn } from "node:child_process";
import { setTimeout as sleep } from "node:timers/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadMdacConfig, splitList } from "./config.js";
import {
  DEFAULT_HUMAN_LABEL,
  formatMatchLines,
  formatText,
  normalizeTriggers,
  normalizeHumanLabel,
  scanPath,
} from "../skill/markdown-agent-comments/scripts/scanner.js";

const MODULE_DIR = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.join(MODULE_DIR, "..");
const SKILL_DIR = path.join(PROJECT_ROOT, "skill", "markdown-agent-comments");
const SKILL_PATH = path.join(SKILL_DIR, "SKILL.md");
const CLI_PREPROMPT_PATH = path.join(MODULE_DIR, "cli-preprompt.md");

// Asset access is injectable so the compiled single-file binary can supply
// embedded content instead of reading the package off disk. The node/npm path
// keeps the disk-backed defaults below.
let loadPreprompt = () => readFile(CLI_PREPROMPT_PATH, "utf8");
let resolveSkillPath = async () => SKILL_PATH;

export function configureAssets({ preprompt, skillPath } = {}) {
  if (preprompt) loadPreprompt = preprompt;
  if (skillPath) resolveSkillPath = skillPath;
}

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
    if (parsed.command === "doctor") {
      return await doctorCommand(parsed, io);
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
    intervalSeconds: 60,
    agentCommand: null,
    defaultAgent: null,
    routes: [],
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
    } else if (arg === "--default-agent") {
      const value = rest[index + 1];
      if (!value) throw new UsageError("--default-agent requires a value");
      options.defaultAgent = [...(options.defaultAgent ?? []), ...splitList(value)];
      index += 1;
    } else if (arg === "--route") {
      const value = rest[index + 1];
      if (!value) throw new UsageError("--route requires a value");
      options.routes.push(parseRoute(value));
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

  const config = await configForOptions(options);
  const matches = await scanForOptions(options, io, config);
  io.stdout.write(formatText(matches));
  return 0;
}

async function runCommand(options, io) {
  if (!options.targetPath) throw new UsageError("run requires a path");
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
  const config = await configForOptions(options);
  const attemptedTriggers = new Set();
  const ran = [];
  const skipped = [];
  let matches = await scanForOptions(options, io, config);
  if (matches.length === 0) {
    if (!quietWhenClean) io.stdout.write(formatText(matches));
    return 0;
  }

  io.stdout.write(formatText(matches));

  while (true) {
    const jobs = planJobs(matches).filter((job) => !attemptedTriggers.has(job.trigger));
    if (jobs.length === 0) break;

    let shouldRescan = false;
    for (const job of jobs) {
      attemptedTriggers.add(job.trigger);
      const route = await resolveRoute(job.trigger, config);

      if (route.kind === "default-missing") {
        io.stderr.write(defaultAgentFailureMessage("agent", config));
        writeRunSummary(io, { ran, skipped });
        return 1;
      }

      if (route.kind === "skip") {
        skipped.push({ trigger: job.trigger, reason: route.reason });
        continue;
      }

      const prompt = await buildAgentPrompt(options, job.matches, config);
      const cwd = await agentCwd(options.targetPath);
      io.stdout.write(`Invoking @${job.trigger} via ${route.agentName}...\n`);
      if (options.debug) {
        io.stderr.write(`Agent cwd: ${cwd}\n`);
        io.stderr.write(`Agent command: ${formatAgentCommandForDebug(route.command)}\n`);
        io.stderr.write(`Agent prompt: ${prompt.length} characters\n`);
      }
      const code = await invokeAgent(route.command, prompt, cwd, io);
      if (code !== 0) {
        io.stdout.write(`Runtime failure: @${job.trigger} via ${route.agentName} exited with ${code}.\n`);
        writeRunSummary(io, { ran, skipped });
        return code;
      }
      ran.push({ trigger: job.trigger, agentName: route.agentName, count: job.count });
      matches = await scanForOptions(options, io, config);
      shouldRescan = true;
      break;
    }

    if (!shouldRescan) break;
  }

  writeRunSummary(io, { ran, skipped });
  writeResidualReport(io, matches, ran);
  return 0;
}

// An agent can exit 0 while leaving its own work unresolved (live trigger still in
// the body, thread unsealed). Surface what the final rescan still shows for the
// triggers that ran instead of ending on a clean summary.
function writeResidualReport(io, matches, ran) {
  const ranTriggers = new Set(ran.map((item) => item.trigger));
  const residual = matches
    .map((match) => ({ ...match, reasons: match.reasons.filter((reason) => ranTriggers.has(reason.trigger)) }))
    .filter((match) => match.reasons.length > 0);
  if (residual.length === 0) return;

  io.stdout.write("Still actionable after run:\n");
  for (const match of residual) {
    io.stdout.write(`${formatMatchLines(match).join("\n")}\n`);
  }
}

async function scanForOptions(options, io, config) {
  if (options.debug) {
    io.stderr.write(`Scanning ${options.targetPath}\n`);
    io.stderr.write(`Triggers: ${formatTriggerSet(config)}\n`);
  }

  const matches = await scanPath(options.targetPath, {
    triggers: config.triggers,
    humanLabel: options.humanLabel ?? DEFAULT_HUMAN_LABEL,
  });

  if (options.debug) {
    const noun = matches.length === 1 ? "file" : "files";
    io.stderr.write(`Matched ${matches.length} actionable ${noun}.\n`);
  }

  return matches;
}

async function buildAgentPrompt(options, matches, config) {
  const triggers = normalizeTriggers(config.triggers);
  const triggerDisplay = triggers.map((trigger) => `@${trigger}`).join(", ");
  const humanLabel = normalizeHumanLabel(options.humanLabel ?? DEFAULT_HUMAN_LABEL);
  const files = matches.map((match) => formatMatchLines(match).join("\n")).join("\n");
  const cliPreprompt = await loadPreprompt();
  const skillPath = await resolveSkillPath();
  const humanLabelInstruction = options.humanLabelProvided
    ? `Human label provided through mdac CLI args: [@${humanLabel}]`
    : "Human label provided through mdac CLI args: omitted";
  return [
    cliPreprompt.trim(),
    "",
    `Then run the Markdown Agent Comments skill at ${skillPath}.`,
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

async function doctorCommand(options, io) {
  const targetPath = options.targetPath ?? process.cwd();
  await access(targetPath, constants.R_OK);
  const config = await configForOptions({ ...options, targetPath });
  const defaultStatuses = await Promise.all(
    config.defaultAgent.map(async (name) => {
      const agent = config.agents[name];
      return {
        name,
        installed: agent ? await isCommandInstalled(agent.command) : false,
      };
    }),
  );
  const defaultCommandStatus = config.defaultAgentCommand
    ? {
        command: config.defaultAgentCommand.command,
        source: config.defaultAgentCommand.source,
        installed: await isCommandInstalled(config.defaultAgentCommand.command),
      }
    : null;
  const routeRows = await Promise.all(
    Object.entries(config.agents)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(async ([name, agent]) => ({
        name,
        command: agent.command,
        source: agent.source,
        installed: await isCommandInstalled(agent.command),
      })),
  );
  if (defaultCommandStatus) {
    routeRows.unshift({
      name: "agent",
      command: defaultCommandStatus.command,
      source: defaultCommandStatus.source,
      installed: defaultCommandStatus.installed,
    });
  }
  const hasDefaultCandidate = defaultCommandStatus?.installed || defaultStatuses.some((candidate) => candidate.installed);
  const problems = hasDefaultCandidate
    ? []
    : [defaultAgentFailureMessage("agent", config).trim()];

  const lines = [];
  lines.push("Config files:");
  if (config.configFiles.length === 0) {
    lines.push("- none");
  } else {
    for (const file of config.configFiles) lines.push(`- ${file}`);
  }
  lines.push(`Effective triggers: ${normalizeTriggers(config.triggers).map((trigger) => `@${trigger}`).join(", ")}`);
  lines.push(`Default agent candidates: ${defaultStatuses.map((candidate) => `${candidate.name} ${candidate.installed ? "installed" : "missing"}`).join(", ")}`);
  lines.push("Routes:");
  for (const row of routeRows) {
    lines.push(`- @${row.name} -> ${row.command} (${row.source}) ${row.installed ? "installed" : "missing"}`);
  }
  if (problems.length === 0) {
    lines.push("Problems: none");
  } else {
    lines.push("Problems:");
    for (const problem of problems) lines.push(`- ${problem}`);
  }
  io.stdout.write(`${lines.join("\n")}\n`);
  return problems.length === 0 ? 0 : 1;
}

function parseTriggerList(value) {
  return value.split(",").map((trigger) => trigger.trim()).filter(Boolean);
}

function formatTriggerSet(config) {
  return normalizeTriggers(config.triggers)
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
  const command = splitCommand(commandText, "Agent command");
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
  return `${splitCommand(commandText, "Agent command").join(" ")} <prompt>`;
}

function splitCommand(commandText, label = "--agent-command") {
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

  if (quote) throw new UsageError(`${label} has unterminated quote`);

  if (current) parts.push(current);
  return parts;
}

function parseRoute(value) {
  const splitAt = value.indexOf("=");
  if (splitAt <= 0) throw new UsageError("--route must look like @name=COMMAND");
  const name = value.slice(0, splitAt).replace(/^@/, "").trim();
  const command = value.slice(splitAt + 1).trim();
  if (!name) throw new UsageError("--route requires a trigger name");
  if (!command) throw new UsageError("--route requires a command");
  return { name, command };
}

async function configForOptions(options) {
  return await loadMdacConfig({
    targetPath: options.targetPath,
    cli: {
      triggers: options.triggers,
      defaultAgent: options.defaultAgent,
      agentCommand: options.agentCommand,
      routes: options.routes,
    },
  });
}

function planJobs(matches) {
  const jobs = new Map();
  for (const match of matches) {
    for (const reason of match.reasons) {
      if (!jobs.has(reason.trigger)) {
        jobs.set(reason.trigger, { trigger: reason.trigger, matchesByFile: new Map(), count: 0 });
      }
      const job = jobs.get(reason.trigger);
      if (!job.matchesByFile.has(match.file)) {
        job.matchesByFile.set(match.file, { ...match, reasons: [] });
      }
      job.matchesByFile.get(match.file).reasons.push(reason);
      job.count += 1;
    }
  }

  return [...jobs.values()].map((job) => ({
    trigger: job.trigger,
    count: job.count,
    matches: [...job.matchesByFile.values()],
  }));
}

async function resolveRoute(trigger, config) {
  if (trigger === "agent" || trigger === "agents") {
    if (config.defaultAgentCommand) {
      const installed = await isCommandInstalled(config.defaultAgentCommand.command);
      if (!installed) return { kind: "default-missing" };
      return {
        kind: "run",
        agentName: "agent",
        command: config.defaultAgentCommand.command,
        source: config.defaultAgentCommand.source,
      };
    }

    for (const candidate of config.defaultAgent) {
      const agent = config.agents[candidate];
      if (agent && await isCommandInstalled(agent.command)) {
        return { kind: "run", agentName: candidate, command: agent.command, source: agent.source };
      }
    }
    return { kind: "default-missing" };
  }

  const agent = config.agents[trigger];
  if (!agent) return { kind: "skip", reason: "no-route" };
  if (!(await isCommandInstalled(agent.command))) return { kind: "skip", reason: "not-installed" };
  return { kind: "run", agentName: trigger, command: agent.command, source: agent.source };
}

async function isCommandInstalled(commandText) {
  const command = splitCommand(commandText, "Agent command");
  if (command.length === 0) return false;
  const executable = command[0];
  if (executable.includes("/")) {
    try {
      await access(executable, constants.X_OK);
      return true;
    } catch {
      return false;
    }
  }
  for (const directory of (process.env.PATH ?? "").split(path.delimiter).filter(Boolean)) {
    try {
      await access(path.join(directory, executable), constants.X_OK);
      return true;
    } catch {
      // Keep searching PATH.
    }
  }
  return false;
}

function defaultAgentFailureMessage(trigger, config) {
  const candidates = config.defaultAgent.join(", ");
  return `No default agent command is installed for @${trigger}. Install one of: ${candidates}; or edit defaultAgent in .mdac.json.\n`;
}

function writeRunSummary(io, { ran, skipped }) {
  if (ran.length > 0) {
    io.stdout.write("Ran:\n");
    for (const item of ran) {
      const noun = item.count === 1 ? "comment" : "comments";
      io.stdout.write(`- @${item.trigger} via ${item.agentName}: ${item.count} ${noun}\n`);
    }
  }
  if (skipped.length > 0) {
    io.stdout.write("Skipped:\n");
    for (const item of skipped) {
      io.stdout.write(`- @${item.trigger}: ${formatSkipReason(item.trigger, item.reason)}\n`);
    }
  }
}

function formatSkipReason(trigger, reason) {
  if (reason === "no-route") return "no route configured.";
  if (reason === "not-installed") {
    return `command not installed. Install ${titleCase(trigger)} or remove @${trigger} from triggers.`;
  }
  return reason;
}

function titleCase(value) {
  return `${value.slice(0, 1).toUpperCase()}${value.slice(1)}`;
}

function usage() {
  return [
    "usage: mdac <command> <path> [options]",
    "",
    "Commands:",
    "  scan <path>        Show actionable @agent comments without invoking an agent.",
    "  run <path>         Scan, then invoke an agent only when work exists.",
    "  watch <path>       Run continuously, invoking an agent only when work exists.",
    "  doctor [path]      Show resolved config, routes, and command availability.",
    "",
    "Options:",
    "  --trigger @name    Replace the default trigger set.",
    "  --name NAME        Optional human speaker label. Omit when no name is known.",
    "  --agent-command C  Override @agent/@agents command. Prompt is appended as final argument.",
    "  --route @name=C    Override one trigger command for this invocation.",
    "  --default-agent L  Override @agent/@agents fallback list, comma-separated.",
    "  --interval SEC     Watch interval in seconds. Default: 60.",
    "  --debug            Print verbose diagnostics when supported.",
    "  -h, --help         Show help.",
    "",
  ].join("\n");
}

class UsageError extends Error {}
