import { describe, expect, it } from "bun:test";
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { scanPath } from "../../skill/markdown-agent-comments/scripts/scanner.js";

const TEST_DIR = dirname(fileURLToPath(import.meta.url));
const DEMO_DIR = join(TEST_DIR, "..");
const DEMO_PATH = join(DEMO_DIR, "demo.md");
const PROCESSED_PATH = join(DEMO_DIR, "demo.processed.md");

describe("demo markdown fixtures", () => {
  it("detects only the intended demo cases", async () => {
    const contents = await readFile(DEMO_PATH, "utf8");
    const matches = await scanPath(DEMO_PATH);

    expect(matches).toHaveLength(1);
    expect(matches[0].relativePath).toBe("demo.md");
    expect(matches[0].reasons).toEqual([
      { kind: "inline", line: lineOf(contents, "@agent can you summarize that in three bullets"), trigger: "agent" },
      { kind: "inline", line: lineOf(contents, "- [ ] Write the mdac PRD @claude"), trigger: "claude" },
      { kind: "inline", line: lineOf(contents, "@claude add a link to the PRD"), trigger: "claude" },
      { kind: "inline", line: lineOf(contents, "@codex add ASCII filetree"), trigger: "codex" },
      { kind: "inline", line: lineOf(contents, "@claude people keep telling me I write too much"), trigger: "claude" },
      { kind: "note", line: lineOf(contents, "> [!NOTE] title options"), trigger: "claude" },
      { kind: "inline", line: lineOf(contents, "@codex please make this doc 100x better"), trigger: "codex" },
    ]);
  });

  it("keeps the processed demo sealed", async () => {
    const matches = await scanPath(PROCESSED_PATH);

    expect(matches).toEqual([]);
  });

  it("keeps discussion-only demo answers in the callout", async () => {
    const processed = await readFile(PROCESSED_PATH, "utf8");
    const paragraph = "I keep coming back to a simple pattern in AI work: methods that scale with computation tend to beat methods packed with handcrafted assumptions.";

    expect(processed).toContain(paragraph);
    expect(processed).toContain("> [@claude] Three options:");
    expect(processed).not.toContain("\n1. Systems that scale with computation");
  });

  it("explains unavailable image generation in the demo fallback", async () => {
    const processed = await readFile(PROCESSED_PATH, "utf8");

    expect(processed).toContain("I cannot generate an image");
    expect(processed).toContain("image generation enabled");
  });
});

function lineOf(contents, needle) {
  const lines = contents.split(/\r?\n/);
  const index = lines.findIndex((line) => line.includes(needle));
  if (index === -1) throw new Error(`Fixture line not found: ${needle}`);
  return index + 1;
}
