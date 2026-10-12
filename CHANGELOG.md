# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.2.0] - 2026-10-12

### Added

- `lnl edit` has three view modes: Nodes (the editable canvas), Blocks (one node per
  basic block, drawn by Mermaid, Ctrl+wheel zooms), and Listing (the rows as written
  with a jump column: hover traces, click follows, Alt+← goes back).

### Changed

- The lnl skill (`SKILL.md`) is rewritten: when and how to use lnl, the vocabulary,
  the frontmatter of skills and rules, and the commands of `lnl.mjs`.

## [0.1.0] - 2026-10-10

### Changed

- `bin/lnl.js` is removed: `src/cli.js` is the entrypoint and the only output is
  the bundle `.claude/skills/lnl/lnl.mjs`, built directly in the skill folder.

### Added

- `.claude/skills/lnl/SKILL.md`: a minimal skill, written in lnl, that tells an
  agent how to write a flow and validate it with the validation script
  `lnl.mjs`, the bundle of `src/cli.js`, built and delivered next to it.

### Fixed

- `lnl edit`: a save no longer discards the edits made while its request was
  pending; the saved document becomes the baseline and the edits stay unsaved.
- `lnl lint`: simple cycles are enumerated with Johnson's algorithm over
  strongly connected components, so a long acyclic flow no longer takes
  exponential time (and no longer blocks `/api/check`).
- Parser: free text of ASK, DO, CHECK, and SAY may end with `:`; only a row
  without an opcode that ends with `:` is a malformed label.
- `lnl lint`: a START that designates the position after the last instruction
  reports LNL041 (control leaves the file without END).
- `lnl edit`: reconnecting a JUMP wire rewrites only the target, never the
  opcode (`JUMP JUMP IF yes` reconnected to `DONE` gives `JUMP DONE IF yes`).
- `lnl graph`: the diagram no longer draws a direct edge from a CALL to its
  next instruction next to the call and return edges, so the subflow is not
  shown as optional.
- `lnl edit`: saving keeps the line ending of each unchanged row, so a file
  with mixed LF and CRLF endings stays identical when opened and saved.
