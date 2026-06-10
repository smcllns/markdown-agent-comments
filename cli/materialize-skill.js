import { mkdir, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

export function defaultSkillDir() {
  return (
    process.env.MDAC_SKILL_DIR ??
    path.join(os.homedir(), ".agents", "skills", "markdown-agent-comments")
  );
}

// Writes the embedded skill files to disk so the spawned agent can read SKILL.md
// (and run the scanner) from a real location. Only writes files whose content
// differs, so it self-heals on upgrade and stays quiet when nothing changed.
export async function materializeSkill({ targetDir, files, io = process }) {
  let wroteAny = false;
  for (const [relativePath, content] of Object.entries(files)) {
    if (await writeIfChanged(path.join(targetDir, relativePath), content)) {
      wroteAny = true;
    }
  }
  if (wroteAny) {
    io.stdout.write(`mdac: installed Markdown Agent Comments skill to ${targetDir}\n`);
  }
  return path.join(targetDir, "SKILL.md");
}

async function writeIfChanged(dest, content) {
  try {
    if ((await readFile(dest, "utf8")) === content) return false;
  } catch {
    // Missing or unreadable — fall through and write it.
  }
  await mkdir(path.dirname(dest), { recursive: true });
  await writeFile(dest, content, "utf8");
  return true;
}
