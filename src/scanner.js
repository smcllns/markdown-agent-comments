import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";
import {
  ACTIVE_CALLOUT,
  DEFAULT_HUMAN_LABEL,
  DEFAULT_TRIGGERS,
  DONE_CALLOUT,
  EOT_SEAL,
  normalizeHumanLabel,
} from "./protocol.js";

const ACTIVE_CALLOUT_RE = new RegExp(`^\\s*>\\s*${escapeRegExp(ACTIVE_CALLOUT)}(?:\\s|$)`);
const DONE_CALLOUT_RE = new RegExp(`^\\s*>\\s*${escapeRegExp(DONE_CALLOUT)}(?:\\s|$)`);
const IGNORED_DIRS = new Set([".git", ".generated", "node_modules"]);

export async function scanPath(root, options = {}) {
  const absoluteRoot = path.resolve(root);
  const rootStat = await stat(absoluteRoot);
  const triggers = normalizeTriggers(options.triggers ?? DEFAULT_TRIGGERS);
  const humanLabel = normalizeHumanLabel(options.humanLabel ?? DEFAULT_HUMAN_LABEL);
  const rootIsFile = rootStat.isFile();
  const files = rootIsFile
    ? (absoluteRoot.endsWith(".md") ? [absoluteRoot] : [])
    : await markdownFiles(absoluteRoot);
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

export function scanFile(contents, options = {}) {
  const triggers = normalizeTriggers(options.triggers ?? DEFAULT_TRIGGERS);
  const humanLabel = normalizeHumanLabel(options.humanLabel ?? DEFAULT_HUMAN_LABEL);
  const lines = contents.split(/\r?\n/);
  const reasons = [];

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
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

function scanCallout(lines, startIndex, kind, triggers, humanLabel) {
  let hasTrigger = null;
  let latestRealLine = "";
  let latestIsAgent = false;
  let endIndex = startIndex;

  for (let index = startIndex; index < lines.length; index += 1) {
    const rawLine = lines[index];
    if (!isBlockquote(rawLine)) {
      endIndex = index - 1;
      break;
    }
    endIndex = index;

    const quoted = rawLine.replace(/^\s*>\s?/, "");
    const trigger = findTrigger(quoted, triggers);
    if (!hasTrigger && trigger) hasTrigger = trigger;

    if (isRealQuotedLine(quoted, humanLabel)) {
      latestRealLine = quoted.trim();
      latestIsAgent = isAgentSpeakerLine(latestRealLine, triggers);
    }
  }

  if (!hasTrigger) return { reason: null, endIndex };

  const sealed = latestRealLine.endsWith(EOT_SEAL);
  if (kind === "note" && !sealed && !latestIsAgent) {
    return { reason: { kind, line: startIndex + 1, trigger: hasTrigger }, endIndex };
  }
  if (kind === "done" && !sealed) {
    return { reason: { kind, line: startIndex + 1, trigger: hasTrigger }, endIndex };
  }
  return { reason: null, endIndex };
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
  for (const trigger of triggers) {
    const escaped = escapeRegExp(trigger);
    const pattern = new RegExp(`(^|\\s)@(${escaped})([^A-Za-z0-9_]|$)`, "i");
    const match = line.match(pattern);
    if (match) return match[2].toLowerCase();
  }
  return null;
}

function isRealQuotedLine(line, humanLabel) {
  const trimmed = line.trim();
  if (trimmed === "") return false;
  if (isHumanPlaceholder(trimmed, humanLabel)) return false;
  if (trimmed.startsWith("<!--mdac:missing-human-name ")) return false;
  return true;
}

function isHumanPlaceholder(line, humanLabel) {
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

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
