import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { materializeSkill } from "../materialize-skill.js";

let tempDir;
let targetDir;
let out;

function io() {
  return { stdout: { write: (chunk) => out.push(chunk) } };
}

beforeEach(async () => {
  tempDir = await mkdtemp(join(tmpdir(), "mdac-materialize-"));
  targetDir = join(tempDir, "skill");
  out = [];
});

afterEach(async () => {
  await rm(tempDir, { recursive: true, force: true });
});

describe("materializeSkill", () => {
  it("writes embedded files and returns the SKILL.md path", async () => {
    const skillPath = await materializeSkill({
      targetDir,
      files: { "SKILL.md": "# Skill\n" },
      io: io(),
    });

    expect(skillPath).toBe(join(targetDir, "SKILL.md"));
    expect(await readFile(skillPath, "utf8")).toBe("# Skill\n");
    expect(out.join("")).toContain(`installed Markdown Agent Comments skill to ${targetDir}`);
  });

  it("stays silent and rewrites nothing when content is unchanged", async () => {
    await materializeSkill({ targetDir, files: { "SKILL.md": "# Skill\n" }, io: io() });
    out = [];

    await materializeSkill({ targetDir, files: { "SKILL.md": "# Skill\n" }, io: io() });

    expect(out.join("")).toBe("");
  });

  it("rewrites and reports when content changes (upgrade)", async () => {
    await materializeSkill({ targetDir, files: { "SKILL.md": "# v1\n" }, io: io() });
    out = [];

    const skillPath = await materializeSkill({
      targetDir,
      files: { "SKILL.md": "# v2\n" },
      io: io(),
    });

    expect(await readFile(skillPath, "utf8")).toBe("# v2\n");
    expect(out.join("")).toContain("installed Markdown Agent Comments skill");
  });

  it("overwrites a user-modified copy to self-heal", async () => {
    await mkdir(targetDir, { recursive: true });
    await writeFile(join(targetDir, "SKILL.md"), "tampered", "utf8");

    await materializeSkill({ targetDir, files: { "SKILL.md": "# canonical\n" }, io: io() });

    expect(await readFile(join(targetDir, "SKILL.md"), "utf8")).toBe("# canonical\n");
  });
});
