import { describe, expect, it } from "bun:test";
import { readFile, readdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { scanPath } from "../scripts/scanner.js";

const TEST_DIR = dirname(fileURLToPath(import.meta.url));
const EVAL_DIR = join(TEST_DIR, "fixtures", "skill-evals");
const INPUT_DIR = join(EVAL_DIR, "input");
const EXPECTED_DIR = join(EVAL_DIR, "expected");

describe("skill eval fixtures", () => {
  it("keeps input and expected cases paired", async () => {
    const inputCases = await markdownFiles(INPUT_DIR);
    const expectedCases = await markdownFiles(EXPECTED_DIR);

    expect(inputCases).toEqual(expectedCases);
  });

  it("keeps inputs actionable and expected outputs sealed", async () => {
    const caseNames = await markdownFiles(INPUT_DIR);

    for (const caseName of caseNames) {
      const inputMatches = await scanPath(join(INPUT_DIR, caseName));
      const expectedMatches = await scanPath(join(EXPECTED_DIR, caseName));

      expect(inputMatches.length, `${caseName} should contain at least one actionable comment`).toBeGreaterThan(0);
      expect(expectedMatches, `${caseName} expected output should be sealed`).toEqual([]);
    }
  });

  it("does not leak expected replacement body lines through input context", async () => {
    const caseNames = await markdownFiles(INPUT_DIR);

    for (const caseName of caseNames) {
      const input = await readFile(join(INPUT_DIR, caseName), "utf8");
      const expected = await readFile(join(EXPECTED_DIR, caseName), "utf8");
      const inputLines = contentLines(input);

      for (const line of contentLines(expected)) {
        if (inputLines.includes(line)) continue;
        expect(inputLines.some((inputLine) => inputLine.includes(line)), `${caseName} leaks expected line: ${line}`).toBe(false);
      }
    }
  });
});

async function markdownFiles(dir) {
  const entries = await readdir(dir);
  return entries.filter((entry) => entry.endsWith(".md")).sort();
}

function contentLines(contents) {
  return contents
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length >= 24)
    .filter((line) => !line.startsWith("#"))
    .filter((line) => !line.startsWith(">"))
    .filter((line) => !line.includes("@agent") && !line.includes("@claude") && !line.includes("@codex"));
}
