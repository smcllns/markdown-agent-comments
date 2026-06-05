import { describe, expect, it } from "bun:test";
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { scanPath } from "../scripts/scanner.js";

const TEST_DIR = dirname(fileURLToPath(import.meta.url));
const FIXTURES_DIR = join(TEST_DIR, "fixtures");
const DEMO_PATH = join(FIXTURES_DIR, "demo.md");
const PROCESSED_PATH = join(FIXTURES_DIR, "demo.processed.md");

describe("demo markdown fixtures", () => {
  it("detects only the intended demo cases", async () => {
    const contents = await readFile(DEMO_PATH, "utf8");
    const matches = await scanPath(DEMO_PATH);

    expect(matches).toHaveLength(1);
    expect(matches[0].relativePath).toBe("demo.md");
    expect(matches[0].reasons).toEqual([
      { kind: "inline", line: lineOf(contents, "The launch intro is wordy and not very direct."), trigger: "claude" },
      { kind: "inline", line: lineOf(contents, "- [ ] @agent rewrite this task"), trigger: "agent" },
      { kind: "note", line: lineOf(contents, "> [!NOTE] title options"), trigger: "claude" },
      { kind: "inline", line: lineOf(contents, "@agent improve the section above"), trigger: "agent" },
    ]);
  });

  it("keeps the processed demo sealed", async () => {
    const matches = await scanPath(PROCESSED_PATH);

    expect(matches).toEqual([]);
  });
});

function lineOf(contents, needle) {
  const lines = contents.split(/\r?\n/);
  const index = lines.findIndex((line) => line.includes(needle));
  if (index === -1) throw new Error(`Fixture line not found: ${needle}`);
  return index + 1;
}
