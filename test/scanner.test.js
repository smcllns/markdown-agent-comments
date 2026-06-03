import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { mkdir, mkdtemp, rm, utimes, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { scanPath } from "../src/scanner.js";

let tempDir;

beforeEach(async () => {
  tempDir = await mkdtemp(join(tmpdir(), "mdac-scan-"));
});

afterEach(async () => {
  await rm(tempDir, { recursive: true, force: true });
});

describe("scanPath", () => {
  it("finds unwrapped inline default trigger comments", async () => {
    await write("note.md", [
      "Please fix this section @claude",
      "contact@claude.com is an email, not a comment",
      "Mentioning `@codex` in code is not actionable",
      "> @agent already wrapped in a thread",
      "",
    ].join("\n"));

    const matches = await scanPath(tempDir);

    expect(matches).toHaveLength(1);
    expect(matches[0].relativePath).toBe("note.md");
    expect(matches[0].reasons).toEqual([
      { kind: "inline", line: 1, trigger: "claude" },
    ]);
  });

  it("detects active NOTE threads only when the human needs another agent turn", async () => {
    await write("threads.md", [
      "> [!NOTE] new active thread",
      ">",
      "> @claude tighten this",
      "",
      "> [!NOTE] parked on agent question",
      ">",
      "> @claude sharpen title",
      ">",
      "> [@claude] Which direction should I take? <!--mdac:eot-->",
      "",
      "> [!NOTE] human follow-up",
      ">",
      "> @claude sharpen title",
      ">",
      "> [@claude] Which direction should I take? <!--mdac:eot-->",
      ">",
      "> [@human] punchier",
      "",
      "> [!NOTE] placeholder only",
      ">",
      "> @claude sharpen title",
      ">",
      "> [@claude] Which direction should I take? <!--mdac:eot-->",
      ">",
      "> [@human]",
      "",
    ].join("\n"));

    const matches = await scanPath(tempDir, { humanLabel: "human" });

    expect(matches).toHaveLength(1);
    expect(matches[0].reasons).toEqual([
      { kind: "note", line: 1, trigger: "claude" },
      { kind: "note", line: 11, trigger: "claude" },
    ]);
  });

  it("treats normalized multi-word human label placeholders as parked", async () => {
    await write("name.md", [
      "> [!NOTE] awaiting clarification",
      ">",
      "> @claude tighten this",
      ">",
      "> [@claude] Which paragraph should I edit? <!--mdac:eot-->",
      ">",
      "> [@human]",
      "",
    ].join("\n"));

    const matches = await scanPath(tempDir, { humanLabel: "Human Person" });

    expect(matches).toEqual([]);
  });

  it("detects DONE follow-ups after the mdac seal", async () => {
    await write("done.md", [
      "> [!DONE]- resolved",
      ">",
      "> @claude tighten this",
      ">",
      "> [@claude] done <!--mdac:eot-->",
      "",
      "> [!DONE]- follow-up",
      ">",
      "> @claude tighten this",
      ">",
      "> [@claude] done <!--mdac:eot-->",
      "> one more tweak please",
      "",
    ].join("\n"));

    const matches = await scanPath(tempDir);

    expect(matches).toHaveLength(1);
    expect(matches[0].reasons).toEqual([
      { kind: "done", line: 7, trigger: "claude" },
    ]);
  });

  it("lets custom triggers replace the default trigger set", async () => {
    await write("custom.md", [
      "@codex default only",
      "@pi custom only",
      "",
    ].join("\n"));

    const matches = await scanPath(tempDir, { triggers: ["pi"] });

    expect(matches).toHaveLength(1);
    expect(matches[0].reasons).toEqual([
      { kind: "inline", line: 2, trigger: "pi" },
    ]);
  });

  it("sorts matched files by mtime descending", async () => {
    const older = await write("older.md", "@claude older\n");
    const newer = await write("newer.md", "@claude newer\n");
    await utimes(older, new Date("2026-01-01T00:00:00Z"), new Date("2026-01-01T00:00:00Z"));
    await utimes(newer, new Date("2026-01-02T00:00:00Z"), new Date("2026-01-02T00:00:00Z"));

    const matches = await scanPath(tempDir);

    expect(matches.map((match) => match.relativePath)).toEqual(["newer.md", "older.md"]);
  });

  it("uses the basename when scanning a single markdown file", async () => {
    const file = await write("single.md", "@codex fix this\n");

    const matches = await scanPath(file);

    expect(matches).toHaveLength(1);
    expect(matches[0].relativePath).toBe("single.md");
  });
});

async function write(relativePath, contents) {
  const path = join(tempDir, relativePath);
  await mkdir(join(path, ".."), { recursive: true });
  await writeFile(path, contents);
  return path;
}
