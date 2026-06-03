// Verifies the scan documented in `SKILL.md` against the fixtures in
// `markdown-agent-tags.spec.md`.
//
// Run: `bun test` from this directory, or `bun test reference/markdown-agent-tags.spec.test.ts`
// from the skill root. Requires bun >= 1.3. No package.json needed — bun ships
// with `bun:test` built in. For editor types, install `@types/bun` globally
// (optional; the test runs fine without it).
//
// Source-of-truth design:
//   - SCAN_REGEX and AGENTS are HARDCODED here as TS constants.
//   - DONE_SCAN_AWK is HARDCODED here as the inline awk program from SKILL.md.
//   - Consistency tests assert SKILL.md contains them verbatim, so editing
//     SKILL.md without updating the test (or vice versa) fails loud.
//   - Fixtures live in `markdown-agent-tags.spec.md`. Each section's fenced
//     block can opt into the unresolved scan with `@test:match` / `@test:nomatch`,
//     and into the DONE callout scan with `@done:match` / `@done:nomatch`.
//     A fixture can add `@human:<label>` when it needs a non-default human label.
//   - Per-agent fixtures (one bare `@<agent>` tag per name) are
//     generated programmatically from AGENTS.

import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

// ─── single source of truth (TS side) ─────────────────────────────────────
const INLINE_SCAN_REGEX = String.raw`^([^>]*[[:space:]])?@(agent|claude|codex)([^[:alnum:]_]|$)`;
const AGENTS = ["agent", "claude", "codex"] as const;
const HUMAN_LABEL = "human";
const DONE_EOT = "<!--atag:eot-->";
const TRIGGER_ALT = AGENTS.join("|");
const CALLOUT_SCAN_AWK = [
  'BEGIN {',
  '  trigger_re = "(^|[[:space:]])@(" trigger_alt ")([^[:alnum:]_]|$)"',
  '  agent_re = "^[[:space:]]*(\\\\*`(" trigger_alt ")`\\\\*|`(" trigger_alt ")`)([[:space:]]|:|$)"',
  '  human_placeholder_re = "^[[:space:]]*(\\\\*`" human_label "`\\\\*|`" human_label "`):?[[:space:]]*$"',
  '  missing_human_name_re = "^[[:space:]]*<!--atag:missing-human-name "',
  '}',
  'function finish_callout() {',
  '  if (in_callout && has_trigger) {',
  '    if (callout_type == "note" && !sealed && !agent_last) print callout_file ":" start',
  '    if (callout_type == "done" && !sealed) print callout_file ":" start',
  '  }',
  '  in_callout = 0',
  '  callout_type = ""',
  '  has_trigger = 0',
  '  sealed = 0',
  '  agent_last = 0',
  '  callout_file = ""',
  '}',
  'function start_callout(type) {',
  '  in_callout = 1',
  '  callout_type = type',
  '  has_trigger = 0',
  '  sealed = 0',
  '  agent_last = 0',
  '  callout_file = FILENAME',
  '  start = FNR',
  '}',
  'function process_quoted_line() {',
  '  line = $0',
  '  sub(/^[[:space:]]*>[[:space:]]*/, "", line)',
  '  if (line ~ trigger_re) has_trigger = 1',
  '  if (line !~ /^[[:space:]]*$/ && line !~ human_placeholder_re && line !~ missing_human_name_re) {',
  '    sealed = (line ~ /<!--atag:eot-->[[:space:]]*$/)',
  '    agent_last = (line ~ agent_re)',
  '  }',
  '}',
  'FNR == 1 && NR > 1 { finish_callout() }',
  '/^[[:space:]]*>[[:space:]]*\\[!NOTE\\]\\+/ {',
  '  finish_callout()',
  '  start_callout("note")',
  '  process_quoted_line()',
  '  next',
  '}',
  '/^[[:space:]]*>[[:space:]]*\\[!DONE\\]-/ {',
  '  finish_callout()',
  '  start_callout("done")',
  '  process_quoted_line()',
  '  next',
  '}',
  '!in_callout { next }',
  '$0 !~ /^[[:space:]]*>/ { finish_callout(); next }',
  '{',
  '  process_quoted_line()',
  '}',
  'END { finish_callout() }',
].join("\n");

const SKILL_PATH = new URL("../SKILL.md", import.meta.url);
const SPEC_PATH = new URL("./markdown-agent-tags.spec.md", import.meta.url);
const SKILL = readFileSync(SKILL_PATH, "utf8");
const SPEC = readFileSync(SPEC_PATH, "utf8");

// ─── parse fixtures from spec.md ──────────────────────────────────────────
// A fixture is any fenced block (3+ backticks) whose info string is
// `md @test:match` or `md @test:nomatch`. Each block's name is the nearest
// heading preceding it.
interface Fixture {
  name: string;
  expect: "match" | "nomatch";
  content: string;
  humanLabel?: string;
}

function parseSpec(spec: string): Fixture[] {
  const fixtures: Fixture[] = [];
  const fenceRe = /(`{3,})md ([^\n]*)\n([\s\S]*?)\n\1\s*$/gm;
  const markerRe = /(?:^|\s)@test:(match|nomatch)\b/;
  const humanRe = /(?:^|\s)@human:([a-z0-9_]+)\b/;
  for (const m of spec.matchAll(fenceRe)) {
    const [, , info, content] = m;
    const markerMatch = info.match(markerRe);
    if (!markerMatch) continue;
    const humanMatch = info.match(humanRe);
    const name = nearestHeadingBefore(spec, m.index!) ?? `fixture@${m.index}`;
    fixtures.push({ name, expect: markerMatch[1] as "match" | "nomatch", content, humanLabel: humanMatch?.[1] });
  }
  return fixtures;
}

function parseMarkedSpec(spec: string, marker: "done"): Fixture[] {
  const fixtures: Fixture[] = [];
  const fenceRe = /(`{3,})md ([^\n]*)\n([\s\S]*?)\n\1\s*$/gm;
  const markerRe = new RegExp(`(?:^|\\s)@${marker}:(match|nomatch)\\b`);
  const humanRe = /(?:^|\s)@human:([a-z0-9_]+)\b/;
  for (const m of spec.matchAll(fenceRe)) {
    const [, , info, content] = m;
    const markerMatch = info.match(markerRe);
    if (!markerMatch) continue;
    const humanMatch = info.match(humanRe);
    const name = nearestHeadingBefore(spec, m.index!) ?? `fixture@${m.index}`;
    fixtures.push({ name, expect: markerMatch[1] as "match" | "nomatch", content, humanLabel: humanMatch?.[1] });
  }
  return fixtures;
}

function nearestHeadingBefore(text: string, offset: number): string | null {
  const headings = [...text.slice(0, offset).matchAll(/(^|\n)#{1,6} +([^\n]+)/g)];
  return headings.length ? headings[headings.length - 1][2].trim() : null;
}

const SPEC_FIXTURES = parseSpec(SPEC);
const DONE_FIXTURES = parseMarkedSpec(SPEC, "done");
const AGENT_FIXTURES: Fixture[] = AGENTS.map((agent) => ({
  name: `bare @${agent} tag (generated)`,
  expect: "match",
  content: `@${agent} please assist`,
}));
const ALL_FIXTURES = [...SPEC_FIXTURES, ...AGENT_FIXTURES];

// ─── harness ──────────────────────────────────────────────────────────────
let scanMatched: Set<string>;
let doneMatched: Set<string>;
let scanTempDir = "";
let doneTempDir = "";

beforeAll(async () => {
  const scan = await writeFixtures(ALL_FIXTURES, "markdown-agent-tags-scan-");
  scanTempDir = scan.tempDir;

  const inlineProc = Bun.spawnSync({
    cmd: ["grep", "-rlnE", "--include=*.md", INLINE_SCAN_REGEX, scanTempDir],
    stdout: "pipe",
    stderr: "pipe",
  });
  // grep exits 1 when no matches — not an error for us.
  if (inlineProc.exitCode !== 0 && inlineProc.exitCode !== 1) {
    throw new Error(`grep failed (exit ${inlineProc.exitCode}): ${new TextDecoder().decode(inlineProc.stderr)}`);
  }

  const calloutFixtureNames = runCalloutScans(ALL_FIXTURES, scan.pathsBySlug, scanTempDir, "callout scan");

  scanMatched = new Set([
    ...pathsToFixtureNames(new TextDecoder().decode(inlineProc.stdout), scanTempDir),
    ...calloutFixtureNames,
  ]);

  const doneScan = await writeFixtures(DONE_FIXTURES, "markdown-agent-tags-done-");
  doneTempDir = doneScan.tempDir;

  doneMatched = new Set(runCalloutScans(DONE_FIXTURES, doneScan.pathsBySlug, doneTempDir, "DONE scan"));

  console.log(`Inline:   ${INLINE_SCAN_REGEX}`);
  console.log(`DONE EOT: ${DONE_EOT}`);
  console.log(`Agents:   ${AGENTS.join(" ")}`);
  console.log(`Fixtures: ${SPEC_FIXTURES.length} scan from spec + ${AGENT_FIXTURES.length} generated = ${ALL_FIXTURES.length}; ${DONE_FIXTURES.length} DONE`);
});

afterAll(async () => {
  if (scanTempDir) await rm(scanTempDir, { recursive: true, force: true });
  if (doneTempDir) await rm(doneTempDir, { recursive: true, force: true });
});

// ─── tests ────────────────────────────────────────────────────────────────
describe("SKILL.md ⇄ test constants are in sync", () => {
  it("SKILL.md contains the inline scan regex verbatim", () => {
    expect(SKILL).toContain(INLINE_SCAN_REGEX);
  });
  it("SKILL.md contains the DONE seal token and callout awk verbatim", () => {
    expect(SKILL).toContain(DONE_EOT);
    expect(SKILL).toContain(CALLOUT_SCAN_AWK);
  });
  it("SKILL.md mentions every agent name", () => {
    for (const agent of AGENTS) expect(SKILL).toContain(agent);
  });
});

describe("spec.md fixtures", () => {
  it("contains both match and nomatch examples", () => {
    expect(SPEC_FIXTURES.length).toBeGreaterThan(0);
    expect(SPEC_FIXTURES.some((f) => f.expect === "match")).toBe(true);
    expect(SPEC_FIXTURES.some((f) => f.expect === "nomatch")).toBe(true);
  });
  it("contains both DONE match and nomatch examples", () => {
    expect(DONE_FIXTURES.length).toBeGreaterThan(0);
    expect(DONE_FIXTURES.some((f) => f.expect === "match")).toBe(true);
    expect(DONE_FIXTURES.some((f) => f.expect === "nomatch")).toBe(true);
  });
});

describe("unresolved scan picks up exactly the expected fixtures", () => {
  for (const fx of ALL_FIXTURES) {
    const verb = fx.expect === "match" ? "matches" : "skips";
    it(`${verb}: ${fx.name}`, () => {
      expect(scanMatched.has(slugify(fx.name))).toBe(fx.expect === "match");
    });
  }
});

describe("callout scan picks up exactly the expected DONE fixtures", () => {
  for (const fx of DONE_FIXTURES) {
    const verb = fx.expect === "match" ? "matches" : "skips";
    it(`${verb}: ${fx.name}`, () => {
      expect(doneMatched.has(slugify(fx.name))).toBe(fx.expect === "match");
    });
  }
});

// ─── helpers ──────────────────────────────────────────────────────────────
async function writeFixtures(fixtures: Fixture[], prefix: string): Promise<{ tempDir: string; paths: string[]; pathsBySlug: Map<string, string> }> {
  const tempDir = await mkdtemp(join(tmpdir(), prefix));
  const paths: string[] = [];
  const pathsBySlug = new Map<string, string>();
  const seen = new Set<string>();
  for (const fx of fixtures) {
    const slug = slugify(fx.name);
    if (seen.has(slug)) throw new Error(`Duplicate fixture name (slugged): "${fx.name}"`);
    seen.add(slug);
    const path = join(tempDir, `${slug}.md`);
    const content = fx.content.endsWith("\n") ? fx.content : fx.content + "\n";
    await writeFile(path, content);
    paths.push(path);
    pathsBySlug.set(slug, path);
  }
  return { tempDir, paths, pathsBySlug };
}

function runCalloutScans(fixtures: Fixture[], pathsBySlug: Map<string, string>, tempDir: string, label: string): string[] {
  const pathsByHumanLabel = new Map<string, string[]>();
  for (const fx of fixtures) {
    const path = pathsBySlug.get(slugify(fx.name));
    if (!path) throw new Error(`Missing fixture path for "${fx.name}"`);
    const humanLabel = fx.humanLabel ?? HUMAN_LABEL;
    const paths = pathsByHumanLabel.get(humanLabel) ?? [];
    paths.push(path);
    pathsByHumanLabel.set(humanLabel, paths);
  }

  const matches: string[] = [];
  for (const [humanLabel, paths] of pathsByHumanLabel) {
    const proc = Bun.spawnSync({
      cmd: ["awk", "-v", `trigger_alt=${TRIGGER_ALT}`, "-v", `human_label=${humanLabel}`, CALLOUT_SCAN_AWK, ...paths],
      stdout: "pipe",
      stderr: "pipe",
    });
    if (proc.exitCode !== 0) {
      throw new Error(`${label} failed (exit ${proc.exitCode}): ${new TextDecoder().decode(proc.stderr)}`);
    }
    matches.push(...calloutLinesToFixtureNames(new TextDecoder().decode(proc.stdout), tempDir));
  }
  return matches;
}

function slugify(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

function pathsToFixtureNames(output: string, tempDir: string): string[] {
  return output
    .trim().split("\n").filter(Boolean)
    .map((p) => p.replace(`${tempDir}/`, "").replace(/\.md$/, ""));
}

function calloutLinesToFixtureNames(output: string, tempDir: string): string[] {
  return output
    .trim().split("\n").filter(Boolean)
    .map((line) => {
      const path = line.slice(0, line.lastIndexOf(":"));
      return path.replace(`${tempDir}/`, "").replace(/\.md$/, "");
    });
}
