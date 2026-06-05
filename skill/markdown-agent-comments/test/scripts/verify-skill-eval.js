import { readdir, readFile, stat, writeFile } from "node:fs/promises";
import path, { basename, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { scanPath } from "../../scripts/scanner.js";

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const EVAL_DIR = join(SCRIPT_DIR, "..", "fixtures", "skill-evals");
const INPUT_DIR = join(EVAL_DIR, "input");
const EXPECTED_DIR = join(EVAL_DIR, "expected");
const RUNS_DIR = join(EVAL_DIR, "runs");

const options = parseArgs(process.argv.slice(2));
const runDir = resolveRunDir(options.run);
const actualDir = join(runDir, "actual");
await assertDirectory(actualDir);
const metadata = await readJsonMaybe(join(runDir, "metadata.json"));
const caseNames = (await readdir(EXPECTED_DIR)).filter((name) => name.endsWith(".md")).sort();

const cases = [];
for (const caseName of caseNames) {
  cases.push(await judgeCase(caseName));
}

const result = {
  runId: basename(runDir),
  executor: metadata?.executor ?? "unknown",
  verifier: "mdac-baseline-script",
  generatedAt: new Date().toISOString(),
  score: round(average(cases.map((item) => item.score))),
  status: overallStatus(cases),
  cases,
};

const json = `${JSON.stringify(result, null, 2)}\n`;
process.stdout.write(json);

if (options.write) {
  await writeFile(join(runDir, "verify-result.json"), json);
}

async function judgeCase(caseName) {
  const inputPath = join(INPUT_DIR, caseName);
  const expectedPath = join(EXPECTED_DIR, caseName);
  const actualPath = join(actualDir, caseName);
  const input = await readFile(inputPath, "utf8");
  const expected = await readFile(expectedPath, "utf8");
  const actual = await readFileMaybe(actualPath);
  const exact = actual === expected;
  const inputReasons = await scanReasons(inputPath);
  const actualReasons = actual === null ? [] : await scanReasons(actualPath);
  const dimensions = scoreDimensions({ input, expected, actual, inputReasons, actualReasons, exact });
  const score = round(average(Object.values(dimensions)));
  const findings = buildFindings({ actual, expected, actualReasons, dimensions, exact });

  return {
    case: caseName,
    score,
    status: caseStatus(score),
    dimensions,
    findings,
  };
}

function scoreDimensions({ input, expected, actual, inputReasons, actualReasons, exact }) {
  if (actual === null) {
    return {
      detection: 0,
      placement: 0,
      threadFormat: 0,
      taskQuality: 0,
      nonRegression: 0,
    };
  }

  return {
    detection: scoreDetection(inputReasons, actualReasons),
    placement: scorePlacement(expected, actual, exact),
    threadFormat: scoreThreadFormat(expected, actual, actualReasons, exact),
    taskQuality: scoreTaskQuality(expected, actual, actualReasons, exact),
    nonRegression: scoreNonRegression(input, expected, actual),
  };
}

function scoreDetection(inputReasons, actualReasons) {
  if (actualReasons.length === 0) return 1;
  if (actualReasons.length < inputReasons.length) return 0.5;
  return 0;
}

function scorePlacement(expected, actual, exact) {
  if (exact) return 1;

  const expectedTitles = expected.split(/\r?\n/).filter((line) => /^>\s+\[!(?:DONE|NOTE)\]/.test(line));
  if (expectedTitles.length > 0 && expectedTitles.every((line) => actual.includes(line))) return 0.85;
  if (/^>\s+\[!(?:DONE|NOTE)\]/m.test(actual) && actual.includes("<!--mdac:eot-->")) return 0.5;
  return actualChanged(actual) ? 0.25 : 0;
}

function scoreThreadFormat(expected, actual, actualReasons, exact) {
  if (exact) return 1;

  const expectedEotCount = count(expected, "<!--mdac:eot-->");
  const actualEotCount = count(actual, "<!--mdac:eot-->");
  const expectedDoneCount = countRegex(expected, /^>\s+\[!DONE\]-/gm);
  const actualDoneCount = countRegex(actual, /^>\s+\[!DONE\]-/gm);

  if (actualReasons.length === 0 && actualEotCount >= expectedEotCount && actualDoneCount >= expectedDoneCount) return 0.9;
  if (actualEotCount >= expectedEotCount) return 0.7;
  if (actualEotCount > 0) return 0.4;
  return actualChanged(actual) ? 0.2 : 0;
}

function scoreTaskQuality(expected, actual, actualReasons, exact) {
  if (exact) return 1;
  if (!actualChanged(actual)) return 0;

  const similarity = wordSimilarity(stripCallouts(expected), stripCallouts(actual));
  if (actualReasons.length === 0) return round(0.45 + (0.45 * similarity));
  return round(0.15 + (0.35 * similarity));
}

function scoreNonRegression(input, expected, actual) {
  const protectedLines = unique(input.split(/\r?\n/).filter((line) => line.trim() && expected.includes(line)));
  if (protectedLines.length === 0) return 1;

  const preserved = protectedLines.filter((line) => actual.includes(line)).length;
  return round(preserved / protectedLines.length);
}

function buildFindings({ actual, expected, actualReasons, dimensions, exact }) {
  const findings = [];

  if (actual === null) {
    return ["Actual output file is missing."];
  }

  if (exact) return findings;

  if (actualReasons.length > 0) {
    findings.push(`Actual output still has ${actualReasons.length} actionable scanner match(es).`);
  }
  if (dimensions.placement < 1) {
    findings.push("Placement differs from the expected processed shape.");
  }
  if (dimensions.threadFormat < 1) {
    findings.push("Thread format is weaker than expected; check callout state, labels, and mdac eot seals.");
  }
  if (dimensions.taskQuality < 0.75) {
    findings.push("Task answer is less complete or less specific than expected.");
  }
  if (dimensions.nonRegression < 1) {
    findings.push("Some lines that should have stayed unchanged are missing from actual output.");
  }
  if (wordSimilarity(expected, actual) < 1) {
    findings.push("Actual output is not an exact expected match; review semantic differences.");
  }

  return findings;
}

function parseArgs(argv) {
  const parsed = {
    run: null,
    write: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--run") {
      parsed.run = readValue(argv, index, arg);
      index += 1;
    } else if (arg === "--write") {
      parsed.write = true;
    } else {
      throw new Error(`Unknown option: ${arg}`);
    }
  }

  if (!parsed.run) throw new Error("usage: verify-skill-eval --run <run-id-or-path> [--write]");
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
      throw new Error(`Eval actual directory does not exist: ${dir}\nRun eval:prepare first, then point the executor at the generated actual/ files.`);
    }
    throw error;
  }

  if (!result.isDirectory()) {
    throw new Error(`Eval actual path is not a directory: ${dir}`);
  }
}

async function readFileMaybe(file) {
  try {
    return await readFile(file, "utf8");
  } catch (error) {
    if (error.code === "ENOENT") return null;
    throw error;
  }
}

async function readJsonMaybe(file) {
  const contents = await readFileMaybe(file);
  return contents ? JSON.parse(contents) : null;
}

async function scanReasons(file) {
  const matches = await scanPath(file);
  return matches.flatMap((match) => match.reasons);
}

function stripCallouts(contents) {
  return contents.split(/\r?\n/).filter((line) => !/^\s*>/.test(line)).join("\n");
}

function wordSimilarity(left, right) {
  const leftWords = words(left);
  const rightWords = words(right);
  if (leftWords.length === 0 && rightWords.length === 0) return 1;
  if (leftWords.length === 0 || rightWords.length === 0) return 0;

  const rightCounts = new Map();
  for (const word of rightWords) {
    rightCounts.set(word, (rightCounts.get(word) ?? 0) + 1);
  }

  let overlap = 0;
  for (const word of leftWords) {
    const countForWord = rightCounts.get(word) ?? 0;
    if (countForWord === 0) continue;
    overlap += 1;
    rightCounts.set(word, countForWord - 1);
  }

  return (2 * overlap) / (leftWords.length + rightWords.length);
}

function words(contents) {
  return contents.toLowerCase().match(/[a-z0-9]+/g) ?? [];
}

function unique(values) {
  return [...new Set(values)];
}

function count(contents, needle) {
  return contents.split(needle).length - 1;
}

function countRegex(contents, regex) {
  return contents.match(regex)?.length ?? 0;
}

function actualChanged(actual) {
  return actual.trim().length > 0;
}

function average(values) {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function round(value) {
  return Math.round(value * 100) / 100;
}

function caseStatus(score) {
  if (score >= 0.98) return "pass";
  if (score >= 0.75) return "pass-with-notes";
  if (score >= 0.45) return "partial";
  return "fail";
}

function overallStatus(cases) {
  if (cases.every((item) => item.status === "pass")) return "pass";
  if (cases.every((item) => item.score >= 0.75)) return "pass-with-notes";
  if (cases.some((item) => item.score >= 0.45)) return "partial";
  return "fail";
}
