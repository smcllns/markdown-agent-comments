// Entrypoint for the standalone `bun build --compile` binary.
//
// This file is ONLY ever fed to Bun, never to node — it uses Bun's `with { type:
// "text" }` import attributes to embed the skill assets into the executable.
// node never parses it (the npm package keeps running cli/cli.js off disk).
import prepromptText from "./cli-preprompt.md" with { type: "text" };
import skillMarkdown from "../skill/markdown-agent-comments/SKILL.md" with { type: "text" };
import { configureAssets, main } from "./cli.js";
import { defaultSkillDir, materializeSkill } from "./materialize-skill.js";

// Note: only SKILL.md is materialized. scripts/scanner.js cannot be embedded as
// text here because cli.js imports it as a code module, and Bun resolves a given
// path with a single loader. In CLI mode the binary pre-scans and supplies the
// matched files, so the agent does not need the on-disk scanner (SKILL.md runs
// it only "when available").
configureAssets({
  preprompt: () => prepromptText,
  skillPath: () =>
    materializeSkill({
      targetDir: defaultSkillDir(),
      files: { "SKILL.md": skillMarkdown },
    }),
});

process.exitCode = await main();
