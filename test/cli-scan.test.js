import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

const CLI = new URL("../src/cli.js", import.meta.url).pathname;

let tempDir;

beforeEach(async () => {
  tempDir = await mkdtemp(join(tmpdir(), "mdac-cli-"));
});

afterEach(async () => {
  await rm(tempDir, { recursive: true, force: true });
});

describe("mdac scan", () => {
  it("prints actionable files without invoking an agent", async () => {
    await write("note.md", "@claude tighten this\n");

    const result = runCli(["scan", tempDir]);

    expect(result.exitCode).toBe(0);
    expect(result.stderr).toBe("");
    expect(result.stdout).toBe([
      "Found 1 actionable file:",
      "- note.md",
      "  - inline line 1 @claude",
      "",
    ].join("\n"));
  });

  it("prints a quiet no-match message", async () => {
    await write("note.md", "plain markdown\n");

    const result = runCli(["scan", tempDir]);

    expect(result.exitCode).toBe(0);
    expect(result.stderr).toBe("");
    expect(result.stdout).toBe("No actionable mdac comments found.\n");
  });

  it("uses custom triggers instead of defaults", async () => {
    await write("note.md", [
      "@codex default",
      "@pi custom",
      "",
    ].join("\n"));

    const result = runCli(["scan", tempDir, "--trigger", "@pi"]);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("inline line 2 @pi");
    expect(result.stdout).not.toContain("@codex");
  });
});

function runCli(args) {
  const proc = Bun.spawnSync({
    cmd: ["node", CLI, ...args],
    stdout: "pipe",
    stderr: "pipe",
  });
  return {
    exitCode: proc.exitCode,
    stdout: new TextDecoder().decode(proc.stdout),
    stderr: new TextDecoder().decode(proc.stderr),
  };
}

async function write(relativePath, contents) {
  const file = join(tempDir, relativePath);
  await mkdir(join(file, ".."), { recursive: true });
  await writeFile(file, contents);
}
