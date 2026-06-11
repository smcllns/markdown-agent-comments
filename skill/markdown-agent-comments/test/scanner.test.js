import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { mkdir, mkdtemp, readFile, rm, utimes, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { scanPath } from "../scripts/scanner.js";

const TEST_DIR = dirname(fileURLToPath(import.meta.url));
const FIXTURES_DIR = join(TEST_DIR, "fixtures");

let tempDir;

beforeEach(async () => {
  tempDir = await mkdtemp(join(tmpdir(), "mdac-scan-"));
});

afterEach(async () => {
  await rm(tempDir, { recursive: true, force: true });
});

describe("scanPath", () => {
  it("matches the scanner-cases fixture exactly", async () => {
    const matches = await scanPath(join(FIXTURES_DIR, "scanner-cases.md"));
    const expected = JSON.parse(await readFile(join(FIXTURES_DIR, "scanner-cases.expected.json"), "utf8"));

    expect(matches.map(toExpectedShape)).toEqual(expected);
  });

  it("finds unwrapped inline default trigger comments", async () => {
    await write("note.md", [
      "Please fix this section @claude",
      "contact@claude.com is an email, not a comment",
      "Mentioning `@codex` in code is not actionable",
      "@agents plural alias",
      "@pi pi trigger",
      "> @agent already wrapped in a thread",
      "",
    ].join("\n"));

    const matches = await scanPath(tempDir);

    expect(matches).toHaveLength(1);
    expect(matches[0].relativePath).toBe("note.md");
    expect(matches[0].reasons).toEqual([
      { kind: "inline", line: 1, trigger: "claude" },
      { kind: "inline", line: 4, trigger: "agents" },
      { kind: "inline", line: 5, trigger: "pi" },
    ]);
  });

  it("matches triggers adjacent to punctuation, brackets, and emphasis", async () => {
    await write("punctuation.md", [
      "(@claude can you check this section?)",
      "**@codex** make this heading bolder.",
      "Ask via [@pi] anytime.",
      "contact@claude.com stays an email",
      "",
    ].join("\n"));

    const matches = await scanPath(tempDir);

    expect(matches).toHaveLength(1);
    expect(matches[0].reasons).toEqual([
      { kind: "inline", line: 1, trigger: "claude" },
      { kind: "inline", line: 2, trigger: "codex" },
      { kind: "inline", line: 3, trigger: "pi" },
    ]);
  });

  it("ignores @handles in URLs", async () => {
    await write("urls.md", [
      "Watch https://youtube.com/@claude for demos.",
      "Read https://medium.com/@codex/some-post too.",
      "But (@claude please check this) is a real comment.",
      "",
    ].join("\n"));

    const matches = await scanPath(tempDir);

    expect(matches).toHaveLength(1);
    expect(matches[0].reasons).toEqual([
      { kind: "inline", line: 3, trigger: "claude" },
    ]);
  });

  it("does not treat callout speaker labels as live triggers", async () => {
    await write("labels.md", [
      "> [!NOTE] discussion with no live mention",
      ">",
      "> [@user] what do you think of this section?",
      ">",
      "> [@claude] Looks good to me. <!--mdac:eot-->",
      ">",
      "> [@user] thanks!",
      "",
    ].join("\n"));

    const matches = await scanPath(tempDir);

    expect(matches).toEqual([]);
  });

  it("strips double-backtick code spans without inner backticks", async () => {
    await write("ticks.md", "Use ``inline @agent code`` for examples.\n");

    const matches = await scanPath(tempDir);

    expect(matches).toEqual([]);
  });

  it("scans uppercase markdown extensions", async () => {
    const file = await write("NOTES.MD", "@agent tighten this\n");

    const matches = await scanPath(file);

    expect(matches).toHaveLength(1);
    expect(matches[0].reasons).toEqual([
      { kind: "inline", line: 1, trigger: "agent" },
    ]);
  });

  it("reports DONE threads with an unsealed latest agent turn as done, not unsealed", async () => {
    await write("done-unsealed.md", [
      "> [!DONE]- partially recorded",
      ">",
      "> [@user] @claude update this",
      ">",
      "> [@claude] partial work, no seal",
      "",
    ].join("\n"));

    const matches = await scanPath(tempDir);

    expect(matches).toHaveLength(1);
    expect(matches[0].reasons).toEqual([
      { kind: "done", line: 1, trigger: "claude" },
    ]);
  });

  it("ignores triggers inside inline code spans", async () => {
    await write("spans.md", [
      "Run the `mdac run @agent` command to verify.",
      "Keep `@claude` and `spaced @codex spans` quiet.",
      "real @agent outside any span",
      "",
    ].join("\n"));

    const matches = await scanPath(tempDir);

    expect(matches).toHaveLength(1);
    expect(matches[0].reasons).toEqual([
      { kind: "inline", line: 3, trigger: "agent" },
    ]);
  });

  it("reports NOTE threads whose latest agent turn is missing the seal", async () => {
    await write("unsealed.md", [
      "> [!NOTE] agent crashed mid-reply",
      ">",
      "> [@user] @claude fix the heading",
      ">",
      "> [@claude] Working on it now",
      "",
    ].join("\n"));

    const matches = await scanPath(tempDir);

    expect(matches).toHaveLength(1);
    expect(matches[0].reasons).toEqual([
      { kind: "unsealed", line: 1, trigger: "claude" },
    ]);
  });

  it("rejects a single non-markdown file target", async () => {
    const file = await write("notes.txt", "@agent hi\n");

    await expect(scanPath(file)).rejects.toThrow(/Not a markdown file/);
  });

  it("ignores triggers and callout examples inside fenced code blocks", async () => {
    await write("examples.md", [
      "```markdown",
      "@claude example only",
      "> [!NOTE] example",
      ">",
      "> @agent example",
      "```",
      "",
      "~~~md",
      "@codex also an example",
      "~~~",
      "",
      "real @agent outside",
      "",
    ].join("\n"));

    const matches = await scanPath(tempDir);

    expect(matches).toHaveLength(1);
    expect(matches[0].reasons).toEqual([
      { kind: "inline", line: 12, trigger: "agent" },
    ]);
  });

  it("ignores fenced code blocks while deciding whether a callout is unsealed", async () => {
    await write("thread.md", [
      "> [!DONE]- documented example",
      ">",
      "> @claude add the example",
      ">",
      "> [@claude] done <!--mdac:eot-->",
      ">",
      "> ```md",
      "> @claude example inside fenced code",
      "> ```",
      "",
    ].join("\n"));

    const matches = await scanPath(tempDir);

    expect(matches).toEqual([]);
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
      "> [@sam] punchier",
      "",
      "> [!NOTE] placeholder only",
      ">",
      "> @claude sharpen title",
      ">",
      "> [@claude] Which direction should I take? <!--mdac:eot-->",
      ">",
      "> [@sam]",
      "",
    ].join("\n"));

    const matches = await scanPath(tempDir, { humanLabel: "Sam" });

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
      "> [@sam]",
      "",
    ].join("\n"));

    const matches = await scanPath(tempDir, { humanLabel: "Sam McLoughlin" });

    expect(matches).toEqual([]);
  });

  it("treats unknown label-only human placeholders as parked", async () => {
    await write("name.md", [
      "> [!NOTE] awaiting clarification",
      ">",
      "> [@sam] @claude tighten this",
      ">",
      "> [@claude] Which paragraph should I edit? <!--mdac:eot-->",
      ">",
      "> [@sam]",
      "",
    ].join("\n"));

    const matches = await scanPath(tempDir);

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

  it("ignores generated directories while walking", async () => {
    await write(".generated/output.md", "@agent generated scratch should stay quiet\n");
    await write("note.md", "@agent live note\n");

    const matches = await scanPath(tempDir);

    expect(matches.map((match) => match.relativePath)).toEqual(["note.md"]);
  });

  it("uses the basename when scanning a single markdown file", async () => {
    const file = await write("single.md", "@codex fix this\n");

    const matches = await scanPath(file);

    expect(matches).toHaveLength(1);
    expect(matches[0].relativePath).toBe("single.md");
  });
});

function toExpectedShape(match) {
  return {
    relativePath: match.relativePath,
    reasons: match.reasons,
  };
}

async function write(relativePath, contents) {
  const path = join(tempDir, relativePath);
  await mkdir(join(path, ".."), { recursive: true });
  await writeFile(path, contents);
  return path;
}
