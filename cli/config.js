import { access, readFile, stat } from "node:fs/promises";
import { constants } from "node:fs";
import os from "node:os";
import path from "node:path";

export const BUILT_IN_CONFIG = {
  defaultAgent: ["claude", "codex", "pi"],
  triggers: ["agent", "agents", "claude", "codex", "pi"],
  agents: {
    claude: { command: "claude -p --permission-mode acceptEdits", source: "built-in" },
    codex: { command: "codex exec --full-auto", source: "built-in" },
    pi: { command: "pi -p", source: "built-in" },
  },
};

const KNOWN_CONFIG_KEYS = new Set(["defaultAgent", "triggers", "agents"]);

export async function loadMdacConfig({ targetPath = null, cwd = process.cwd(), env = process.env, cli = {} } = {}) {
  const config = cloneBuiltIns();
  const configFiles = [];

  const globalPath = globalConfigPath(env);
  if (await exists(globalPath)) {
    mergeConfig(config, await readConfigFile(globalPath), "global");
    configFiles.push(globalPath);
  }

  const projectPath = await findProjectConfig({ targetPath, cwd });
  if (projectPath) {
    mergeConfig(config, await readConfigFile(projectPath), "project");
    configFiles.push(projectPath);
  }

  mergeEnv(config, env);
  mergeCli(config, cli);

  return { ...config, configFiles };
}

function cloneBuiltIns() {
  return {
    defaultAgent: [...BUILT_IN_CONFIG.defaultAgent],
    triggers: [...BUILT_IN_CONFIG.triggers],
    agents: Object.fromEntries(
      Object.entries(BUILT_IN_CONFIG.agents).map(([name, agent]) => [name, { ...agent }]),
    ),
    defaultAgentCommand: null,
  };
}

async function readConfigFile(file) {
  let parsed;
  try {
    parsed = JSON.parse(await readFile(file, "utf8"));
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error(`Invalid JSON in ${file}: ${error.message}`);
    }
    throw error;
  }
  validateConfig(parsed, file);
  return parsed;
}

function validateConfig(config, file) {
  if (!config || typeof config !== "object" || Array.isArray(config)) {
    throw new Error(`Invalid config in ${file}: expected a JSON object`);
  }

  for (const key of Object.keys(config)) {
    if (!KNOWN_CONFIG_KEYS.has(key)) throw new Error(`Unknown config key in ${file}: ${key}`);
  }

  if ("defaultAgent" in config && !isStringArray(config.defaultAgent)) {
    throw new Error(`Invalid config in ${file}: defaultAgent must be an array of strings`);
  }
  if ("triggers" in config && !isStringArray(config.triggers)) {
    throw new Error(`Invalid config in ${file}: triggers must be an array of strings`);
  }
  if ("agents" in config) {
    if (!config.agents || typeof config.agents !== "object" || Array.isArray(config.agents)) {
      throw new Error(`Invalid config in ${file}: agents must be an object`);
    }
    for (const [name, agent] of Object.entries(config.agents)) {
      if (!agent || typeof agent !== "object" || Array.isArray(agent) || typeof agent.command !== "string") {
        throw new Error(`Invalid config in ${file}: agents.${name}.command must be a string`);
      }
    }
  }
}

function mergeConfig(config, incoming, source) {
  if ("defaultAgent" in incoming) config.defaultAgent = [...incoming.defaultAgent];
  if ("triggers" in incoming) config.triggers = [...incoming.triggers];
  if ("agents" in incoming) {
    for (const [name, agent] of Object.entries(incoming.agents)) {
      config.agents[normalizeName(name)] = { command: agent.command, source };
    }
  }
}

function mergeEnv(config, env) {
  if (env.MDAC_DEFAULT_AGENT) {
    config.defaultAgent = splitList(env.MDAC_DEFAULT_AGENT);
  }
  if (env.MDAC_AGENT_COMMAND) {
    config.defaultAgentCommand = { command: env.MDAC_AGENT_COMMAND, source: "env" };
  }

  for (const name of ["claude", "codex", "pi"]) {
    const key = `MDAC_${name.toUpperCase()}_COMMAND`;
    if (env[key]) config.agents[name] = { command: env[key], source: "env" };
  }
}

function mergeCli(config, cli) {
  if (cli.triggers) config.triggers = [...cli.triggers];
  if (cli.defaultAgent) config.defaultAgent = [...cli.defaultAgent];
  if (cli.agentCommand) {
    config.defaultAgentCommand = { command: cli.agentCommand, source: "CLI" };
  }
  for (const route of cli.routes ?? []) {
    const name = normalizeName(route.name);
    if (name === "agent" || name === "agents") {
      config.defaultAgentCommand = { command: route.command, source: "CLI" };
    } else {
      config.agents[name] = { command: route.command, source: "CLI" };
    }
  }
}

async function findProjectConfig({ targetPath, cwd }) {
  const startPath = targetPath ? path.resolve(cwd, targetPath) : cwd;
  const startStat = await stat(startPath);
  let current = startStat.isFile() ? path.dirname(startPath) : startPath;

  while (true) {
    const candidate = path.join(current, ".mdac.json");
    if (await exists(candidate)) return candidate;
    const parent = path.dirname(current);
    if (parent === current) return null;
    current = parent;
  }
}

function globalConfigPath(env) {
  if (env.XDG_CONFIG_HOME) return path.join(env.XDG_CONFIG_HOME, "mdac", "config.json");
  return path.join(env.HOME || os.homedir(), ".config", "mdac", "config.json");
}

async function exists(file) {
  try {
    await access(file, constants.R_OK);
    return true;
  } catch {
    return false;
  }
}

function isStringArray(value) {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

export function splitList(value) {
  return String(value).split(",").map((item) => item.trim()).filter(Boolean);
}

function normalizeName(name) {
  return String(name).replace(/^@/, "").trim().toLowerCase();
}
