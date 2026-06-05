# Protocol constants review handoff

## Review result

A subagent reviewed the CLI/scanner code for maintainability and overengineering risk. A later dogfood pass folded the small protocol module back into the scanner implementation, now owned by `skill/markdown-agent-comments/scripts/scanner.js`, to avoid an extra file that only held constants.

## Fixed

- Kept machine-significant protocol values in `skill/markdown-agent-comments/scripts/scanner.js`:
  - default triggers
  - default human label
  - active/resolved callout markers
  - end-of-turn seal
  - human label normalization
- Updated scanner and CLI to share those values through `skill/markdown-agent-comments/scripts/scanner.js`.
- Fixed split human-label normalization: `--name "Human Person"` now normalizes to `human` consistently in both prompt generation and scanner placeholder detection.
- Added a regression test so `> [@user]` placeholders stay parked when the configured human name is multi-word.
- Made `--agent-command` fail clearly on an unterminated quote instead of falling through to a spawn error.

## Deliberately not changed

- Prompt prose lives in the canonical skill plus CLI preprompt; scanner markers/defaults stay with scan logic.
- No config layer or dependency was added.
- The lightweight command splitter remains for V1, with a clearer failure mode for malformed quoting.
