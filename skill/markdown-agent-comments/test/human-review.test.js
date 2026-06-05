import { describe, expect, it } from "bun:test";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { scanPath } from "../scripts/scanner.js";

const TEST_DIR = dirname(fileURLToPath(import.meta.url));
const REVIEW_DIR = join(TEST_DIR, "human-review");
const INPUT_PATH = join(REVIEW_DIR, "agent-input.md");

describe("human review markdown fixture", () => {
  it("detects only the intended PROCESS cases", async () => {
    const contents = await readFile(INPUT_PATH, "utf8");
    const matches = await scanPath(INPUT_PATH);

    expect(matches).toHaveLength(1);
    expect(matches[0].relativePath).toBe("agent-input.md");
    expect(matches[0].reasons).toEqual([
      { kind: "inline", line: lineOf(contents, "The opening sentence is a little bloated."), trigger: "claude" },
      { kind: "inline", line: lineOf(contents, "- [ ] @agent turn this rough task"), trigger: "agent" },
      { kind: "inline", line: lineOf(contents, "@agent give me three sharper options"), trigger: "agent" },
      { kind: "inline", line: lineOf(contents, "@codex make a photorealistic image"), trigger: "codex" },
      { kind: "inline", line: lineOf(contents, "@agent improve the section above"), trigger: "agent" },
      { kind: "note", line: lineOf(contents, "> [!NOTE] heading options"), trigger: "claude" },
      { kind: "done", line: lineOf(contents, "> [!DONE]- linked actual PR"), trigger: "claude" },
    ]);
  });

  it("can be scanned from the review directory without matching guide or generated output", async () => {
    await mkdir(join(REVIEW_DIR, ".generated"), { recursive: true });
    await writeFile(join(REVIEW_DIR, ".generated", "processed-output.md"), [
      "> [!NOTE] generated output should not be scanned",
      ">",
      "> [@user] @agent ignore generated files",
      "",
    ].join("\n"));

    const matches = await scanPath(REVIEW_DIR);
    expect(matches.map((match) => relative(REVIEW_DIR, match.file))).not.toContain(".generated/processed-output.md");
    expect(matches.map((match) => relative(REVIEW_DIR, match.file))).not.toContain("README.md");

    const reviewMatches = matches.filter((match) => relative(REVIEW_DIR, match.file) === "agent-input.md");

    expect(reviewMatches.map((match) => match.relativePath)).toEqual(["agent-input.md"]);
  });
});

function lineOf(contents, needle) {
  const lines = contents.split(/\r?\n/);
  const index = lines.findIndex((line) => line.includes(needle));
  if (index === -1) throw new Error(`Fixture line not found: ${needle}`);
  return index + 1;
}
