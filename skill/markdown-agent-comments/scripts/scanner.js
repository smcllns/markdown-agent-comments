#!/usr/bin/env node
import { readdir, readFile, stat } from "node:fs/promises";
import { realpathSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const DEFAULT_TRIGGERS = ["agent", "agents", "claude", "codex", "pi"];
export const DEFAULT_HUMAN_LABEL = "user";

const ACTIVE_CALLOUT = "[!NOTE]";
const DONE_CALLOUT = "[!DONE]-";
const EOT_SEAL = "<!--mdac:eot-->";
const ACTIVE_CALLOUT_RE = new RegExp(`^\\s*>\\s*${escapeRegExp(ACTIVE_CALLOUT)}(?:\\s|$)`);
const DONE_CALLOUT_RE = new RegExp(`^\\s*>\\s*${escapeRegExp(DONE_CALLOUT)}(?:\\s|$)`);
const IGNORED_DIRS = new Set([".git", ".generated", "node_modules"]);

export async function scanPath(root, options = {}) {
  const absoluteRoot = path.resolve(root);
  const rootStat = await stat(absoluteRoot);
  const triggers = normalizeTriggers(options.triggers ?? DEFAULT_TRIGGERS);
  const humanLabel = normalizeHumanLabel(options.humanLabel ?? DEFAULT_HUMAN_LABEL);
  const rootIsFile = rootStat.isFile();
  if (rootIsFile && !absoluteRoot.endsWith(".md")) {
    throw new Error(`Not a markdown file: ${absoluteRoot}`);
  }
  const files = rootIsFile ? [absoluteRoot] : await markdownFiles(absoluteRoot);
  const matches = [];

  for (const file of files) {
    const contents = await readFile(file, "utf8");
    const reasons = scanFile(contents, { triggers, humanLabel });
    if (reasons.length === 0) continue;
    const fileStat = await stat(file);
    matches.push({
      file,
      relativePath: rootIsFile ? path.basename(file) : path.relative(absoluteRoot, file),
      mtimeMs: fileStat.mtimeMs,
      reasons,
    });
  }

  matches.sort((a, b) => b.mtimeMs - a.mtimeMs || a.relativePath.localeCompare(b.relativePath));
  return matches;
}

export function normalizeTriggers(triggers) {
  const normalized = triggers.map((trigger) => trigger.replace(/^@/, "").trim().toLowerCase()).filter(Boolean);
  if (normalized.length === 0) return DEFAULT_TRIGGERS;
  for (const trigger of normalized) {
    if (!/^[a-z][a-z0-9_]*$/.test(trigger)) {
      throw new Error(`Invalid trigger: @${trigger}`);
    }
  }
  return [...new Set(normalized)];
}

export function normalizeHumanLabel(label) {
  const first = String(label ?? "").trim().split(/\s+/)[0] || DEFAULT_HUMAN_LABEL;
  return first.toLowerCase().replace(/[^a-z0-9_]+/g, "_").replace(/^_+|_+$/g, "") || DEFAULT_HUMAN_LABEL;
}

async function main(argv = process.argv.slice(2), io = process) {
  const options = parseArgs(argv);
  const matches = await scanPath(options.targetPath, {
    triggers: options.triggers ?? undefined,
    humanLabel: options.humanLabel ?? undefined,
  });

  if (options.json) {
    io.stdout.write(`${JSON.stringify(formatJson(matches), null, 2)}\n`);
  } else {
    io.stdout.write(formatText(matches));
  }

  return 0;
}

function scanFile(contents, options = {}) {
  const triggers = normalizeTriggers(options.triggers ?? DEFAULT_TRIGGERS);
  const humanLabel = normalizeHumanLabel(options.humanLabel ?? DEFAULT_HUMAN_LABEL);
  const lines = contents.split(/\r?\n/);
  const reasons = [];
  let activeFence = null;

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const fence = parseFence(line);
    if (activeFence) {
      if (fence && closesFence(fence, activeFence)) activeFence = null;
      continue;
    }
    if (fence) {
      activeFence = fence;
      continue;
    }

    const callout = parseCalloutStart(line);
    if (callout) {
      const { reason, endIndex } = scanCallout(lines, index, callout.kind, triggers, humanLabel);
      if (reason) reasons.push(reason);
      index = endIndex;
      continue;
    }

    if (isBlockquote(line)) continue;
    const trigger = findTrigger(line, triggers);
    if (trigger) {
      reasons.push({ kind: "inline", line: index + 1, trigger });
    }
  }

  return reasons;
}

function scanCallout(lines, startIndex, kind, triggers, humanLabel) {
  let hasTrigger = null;
  let latestRealLine = "";
  let latestIsAgent = false;
  let endIndex = startIndex;
  let activeFence = null;

  for (let index = startIndex; index < lines.length; index += 1) {
    const rawLine = lines[index];
    if (!isBlockquote(rawLine)) {
      endIndex = index - 1;
      break;
    }
    endIndex = index;

    const quoted = rawLine.replace(/^\s*>\s?/, "");
    const fence = parseFence(quoted);
    if (activeFence) {
      if (fence && closesFence(fence, activeFence)) activeFence = null;
      continue;
    }
    if (fence) {
      activeFence = fence;
      continue;
    }

    const trigger = findTrigger(quoted, triggers);
    if (!hasTrigger && trigger) hasTrigger = trigger;

    if (isRealQuotedLine(quoted, humanLabel, triggers)) {
      latestRealLine = quoted.trim();
      latestIsAgent = isAgentSpeakerLine(latestRealLine, triggers);
    }
  }

  if (!hasTrigger) return { reason: null, endIndex };

  const sealed = latestRealLine.endsWith(EOT_SEAL);
  if (kind === "note" && !sealed) {
    // An unsealed latest agent turn is the signature of an interrupted reply, not
    // a parked thread — report it so the contract's self-check can see it.
    const reasonKind = latestIsAgent ? "unsealed" : kind;
    return { reason: { kind: reasonKind, line: startIndex + 1, trigger: hasTrigger }, endIndex };
  }
  if (kind === "done" && !sealed) {
    return { reason: { kind, line: startIndex + 1, trigger: hasTrigger }, endIndex };
  }
  return { reason: null, endIndex };
}

function parseArgs(argv) {
  const options = {
    targetPath: null,
    triggers: null,
    humanLabel: null,
    json: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--trigger") {
      const value = argv[index + 1];
      if (!value) throw new Error("--trigger requires a value");
      options.triggers = value.split(",").map((trigger) => trigger.trim()).filter(Boolean);
      index += 1;
    } else if (arg === "--name") {
      const value = argv[index + 1];
      if (!value) throw new Error("--name requires a value");
      options.humanLabel = value;
      index += 1;
    } else if (arg === "--json") {
      options.json = true;
    } else if (arg.startsWith("-")) {
      throw new Error(`Unknown option: ${arg}`);
    } else if (!options.targetPath) {
      options.targetPath = arg;
    } else {
      throw new Error(`Unexpected argument: ${arg}`);
    }
  }

  if (!options.targetPath) throw new Error("usage: scanner <path> [--trigger @name] [--name NAME] [--json]");
  return options;
}

function parseCalloutStart(line) {
  if (ACTIVE_CALLOUT_RE.test(line)) return { kind: "note" };
  if (DONE_CALLOUT_RE.test(line)) return { kind: "done" };
  return null;
}

function isBlockquote(line) {
  return /^\s*>/.test(line);
}

function findTrigger(line, triggers) {
  // A word character before the @ means it is part of a word (contact@claude.com),
  // never a trigger. Any other prefix counts, so (@claude ...) and **@codex** work.
  const searchable = stripCodeSpans(line);
  for (const trigger of triggers) {
    const escaped = escapeRegExp(trigger);
    const pattern = new RegExp(`(^|[^A-Za-z0-9_])@(${escaped})([^A-Za-z0-9_]|$)`, "i");
    const match = searchable.match(pattern);
    if (match) return match[2].toLowerCase();
  }
  return null;
}

function stripCodeSpans(line) {
  return line.replace(/(`+)[^`]*?\1/g, (span) => " ".repeat(span.length));
}

function parseFence(line) {
  const match = line.match(/^\s*(`{3,}|~{3,})/);
  if (!match) return null;
  return {
    marker: match[1][0],
    length: match[1].length,
  };
}

function closesFence(candidate, activeFence) {
  return candidate.marker === activeFence.marker && candidate.length >= activeFence.length;
}

function isRealQuotedLine(line, humanLabel, triggers) {
  const trimmed = line.trim();
  if (trimmed === "") return false;
  if (isHumanPlaceholder(trimmed, humanLabel, triggers)) return false;
  if (trimmed.startsWith("<!--mdac:missing-human-name ")) return false;
  return true;
}

function isHumanPlaceholder(line, humanLabel, triggers) {
  const bracketLabel = line.match(/^\[@([a-z][a-z0-9_]*)\]$/i);
  if (bracketLabel && !triggers.includes(bracketLabel[1].toLowerCase())) return true;

  const label = escapeRegExp(humanLabel);
  return new RegExp(`^(?:\\[@${label}\\]|\\\`${label}\\\`|\\*\\\`${label}\\\`\\*)$`, "i").test(line);
}

function isAgentSpeakerLine(line, triggers) {
  for (const trigger of triggers) {
    const escaped = escapeRegExp(trigger);
    const pattern = new RegExp(`^(?:\\[@${escaped}\\]|\\*\\\`${escaped}\\\`\\*|\\\`${escaped}\\\`)(?:\\s|:|$)`, "i");
    if (pattern.test(line)) return true;
  }
  return false;
}

async function markdownFiles(root) {
  const files = [];
  await walk(root, files);
  files.sort();
  return files;
}

async function walk(current, files) {
  const currentStat = await stat(current);
  if (currentStat.isFile()) {
    if (current.endsWith(".md")) files.push(current);
    return;
  }
  if (!currentStat.isDirectory()) return;

  const entries = await readdir(current, { withFileTypes: true });
  for (const entry of entries) {
    if (IGNORED_DIRS.has(entry.name)) continue;
    await walk(path.join(current, entry.name), files);
  }
}

function formatJson(matches) {
  return matches.map((match) => ({
    file: match.file,
    relativePath: match.relativePath,
    reasons: match.reasons,
  }));
}

export function formatMatchLines(match) {
  const lines = [`- ${match.relativePath}`];
  for (const reason of match.reasons) {
    lines.push(`  - ${reason.kind} line ${reason.line} @${reason.trigger}`);
  }
  return lines;
}

export function formatText(matches) {
  if (matches.length === 0) return "No actionable mdac comments found.\n";

  const noun = matches.length === 1 ? "file" : "files";
  const lines = [`Found ${matches.length} actionable ${noun}:`];
  for (const match of matches) {
    lines.push(...formatMatchLines(match));
  }
  lines.push("");
  return lines.join("\n");
}

function isDirectRun() {
  if (!process.argv[1]) return false;
  // Returns false when bundled into the compiled binary: the embedded import.meta
  // path has no real file, so realpathSync throws and this stays an import.
  try {
    return realpathSync(fileURLToPath(import.meta.url)) === realpathSync(process.argv[1]);
  } catch {
    return false;
  }
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

if (isDirectRun()) {
  process.exitCode = await main();
}
