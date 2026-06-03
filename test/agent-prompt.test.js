import { describe, expect, it } from "bun:test";
import { buildAgentPrompt } from "../src/cli.js";

describe("agent prompt contract", () => {
  it("preserves V1 agent behavior requirements from the historic atag skill", () => {
    const prompt = buildAgentPrompt({
      triggers: null,
      humanLabel: "Human",
    }, [{
      relativePath: "note.md",
      reasons: [{ kind: "inline", line: 3, trigger: "claude" }],
    }]);

    expect(prompt).toContain("Trigger set: @agent, @claude, @codex");
    expect(prompt).toContain("Human speaker label: [@human]");
    expect(prompt).toContain("- note.md");

    expect(prompt).toContain("Read the full file and enough surrounding context");
    expect(prompt).toContain("Use any better-matching skill or tool first");
    expect(prompt).toContain("document body, not the callout");
    expect(prompt).toContain("For discussion-only asks");
    expect(prompt).toContain("If the ask sits on a task item, update the checkbox too");
    expect(prompt).toContain("Preserve the original request verbatim");
    expect(prompt).toContain("create a new callout immediately after the affected block");
    expect(prompt).toContain("remove the live trigger from the body");
    expect(prompt).toContain("single blank quoted line");
    expect(prompt).toContain("[!DONE]-");
    expect(prompt).toContain("past-tense action + scope");
    expect(prompt).toContain("[!NOTE]");
    expect(prompt).toContain("do not guess");
    expect(prompt).toContain("Do not invent facts, benefits, metrics, names, dates, or other specifics");
    expect(prompt).toContain("prefill the human reply label");
    expect(prompt).toContain("End every agent reply with <!--mdac:eot-->");
    expect(prompt).toContain("Do not self-reply to parked threads");
  });

  it("does not carry forward historical scanner or protocol markers", () => {
    const prompt = buildAgentPrompt({
      triggers: ["pi"],
      humanLabel: "Human",
    }, [{
      relativePath: "custom.md",
      reasons: [{ kind: "note", line: 10, trigger: "pi" }],
    }]);

    expect(prompt).toContain("Trigger set: @pi");
    expect(prompt).not.toContain("[!NOTE]+");
    expect(prompt).not.toContain("<!--atag:eot-->");
    expect(prompt).not.toContain("atag-poll");
    expect(prompt).not.toContain("grep");
    expect(prompt).not.toContain("awk");
    expect(prompt).not.toContain("#agent");
  });
});
