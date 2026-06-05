import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { scanPath } from "../../scripts/scanner.js";

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const FIXTURES_DIR = join(SCRIPT_DIR, "..", "fixtures");
const DEMO_PATH = join(FIXTURES_DIR, "demo.md");
const PROCESSED_PATH = join(FIXTURES_DIR, "demo.processed.md");

const demoMatches = await scanPath(DEMO_PATH);
const processedMatches = await scanPath(PROCESSED_PATH);

console.log("Markdown Agent Comments demo fixtures");
console.log("");
console.log(`Input: ${DEMO_PATH}`);
printMatches(demoMatches);
console.log("");
console.log(`Processed: ${PROCESSED_PATH}`);
printMatches(processedMatches);

if (processedMatches.length > 0) {
  console.error("");
  console.error("Processed demo still contains actionable comments.");
  process.exitCode = 1;
}

function printMatches(matches) {
  if (matches.length === 0) {
    console.log("- No actionable mdac comments found.");
    return;
  }

  for (const match of matches) {
    console.log(`- ${match.relativePath}`);
    for (const reason of match.reasons) {
      console.log(`  - ${reason.kind} line ${reason.line} @${reason.trigger}`);
    }
  }
}
