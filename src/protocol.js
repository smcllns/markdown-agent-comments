export const DEFAULT_TRIGGERS = ["agent", "claude", "codex"];
export const DEFAULT_HUMAN_LABEL = "human";
export const ACTIVE_CALLOUT = "[!NOTE]";
export const DONE_CALLOUT = "[!DONE]-";
export const EOT_SEAL = "<!--mdac:eot-->";

export function normalizeHumanLabel(label) {
  const first = String(label ?? "").trim().split(/\s+/)[0] || "user";
  return first.toLowerCase().replace(/[^a-z0-9_]+/g, "_").replace(/^_+|_+$/g, "") || "user";
}
