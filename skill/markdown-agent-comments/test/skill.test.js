import { describe, expect, it } from "bun:test";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

const SKILL = new URL("../SKILL.md", import.meta.url);
const CLI_PREPROMPT = new URL("../../../cli/cli-preprompt.md", import.meta.url);
const SCAN_SCRIPT = new URL("../scripts/scanner.js", import.meta.url);

describe("SKILL.md", () => {
  it("has required skill frontmatter", async () => {
    const contents = await readFile(SKILL, "utf8");
    const frontmatter = contents.match(/^---\n([\s\S]*?)\n---\n/);

    expect(frontmatter).not.toBeNull();
    expect(frontmatter[1]).toMatch(/^name:\s*markdown-agent-comments\s*$/m);
    expect(frontmatter[1]).toMatch(/^description:\s*.+markdown.+@agent.+$/im);
  });

  it("keeps CLI-only prompt guidance outside the base skill", async () => {
    const skill = await readFile(SKILL, "utf8");
    const cliPreprompt = await readFile(CLI_PREPROMPT, "utf8");

    expect(skill).toContain("For CLI invocations, follow the adapter prompt in `cli/cli-preprompt.md`.");
    expect(skill).not.toContain("final stdout plain");
    expect(cliPreprompt).toContain("You were invoked by the `mdac` CLI.");
    expect(cliPreprompt).toContain("Use these instructions only as CLI-specific context.");
    expect(cliPreprompt).toContain("Keep final stdout plain and concise");
  });

  it("ships a scanner helper for manual skill use", async () => {
    const tempDir = await mkdtemp(join(tmpdir(), "mdac-skill-"));
    try {
      await mkdir(join(tempDir, "notes"), { recursive: true });
      await writeFile(join(tempDir, "notes", "note.md"), [
        "Please fix this @claude",
        "Mention `@agent` as syntax only",
        "",
      ].join("\n"));

      const proc = Bun.spawnSync({
        cmd: ["node", SCAN_SCRIPT.pathname, join(tempDir, "notes")],
        stdout: "pipe",
        stderr: "pipe",
      });

      expect(proc.exitCode).toBe(0);
      expect(new TextDecoder().decode(proc.stdout)).toContain("inline line 1 @claude");
      expect(new TextDecoder().decode(proc.stderr)).toBe("");
    } finally {
      await rm(tempDir, { recursive: true, force: true });
    }
  });
});
