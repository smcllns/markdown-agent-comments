# Protocol constants review handoff

## Review result

A subagent reviewed the CLI/scanner code for maintainability and overengineering risk. The useful extraction was a small protocol module, not a broader config layer.

## Fixed

- Added `src/protocol.js` for machine-significant protocol values:
  - default triggers
  - default human label
  - active/resolved callout markers
  - end-of-turn seal
  - human label normalization
- Updated scanner and CLI to share those values.
- Fixed split human-label normalization: `--name "Human Person"` now normalizes to `human` consistently in both prompt generation and scanner placeholder detection.
- Added a regression test so `> [@human]` placeholders stay parked when the configured human name is multi-word.
- Made `--agent-command` fail clearly on an unterminated quote instead of falling through to a spawn error.

## Deliberately not changed

- Prompt prose remains inline in `src/cli.js`; only protocol markers/defaults moved.
- No config layer or dependency was added.
- The lightweight command splitter remains for V1, with a clearer failure mode for malformed quoting.
