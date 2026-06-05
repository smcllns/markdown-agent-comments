import { describe, expect, it } from "bun:test";
import { readdir } from "node:fs/promises";
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

      expect(inputMatches.length, `${caseName} should contain at least one actionable ask`).toBeGreaterThan(0);
      expect(expectedMatches, `${caseName} expected output should be sealed`).toEqual([]);
    }
  });
});

async function markdownFiles(dir) {
  const entries = await readdir(dir);
  return entries.filter((entry) => entry.endsWith(".md")).sort();
}
