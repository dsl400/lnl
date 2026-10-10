---
name: lnl
description: Write and validate an lnl flow (agent instructions as a flow in an `lnl` block of a Markdown file). Use when writing or editing a skill, a rule, or AGENTS.md that holds an `lnl` block, and before saving it, to run `lnl lint` and repair its diagnostics.
---

# lnl skill

The language is in `README.md` ("The language"); its contract is in
`docs/reference/engine.md`. The validation script is `lnl.mjs`, delivered
next to this file: run `node <dir of this SKILL.md>/lnl.mjs lint <file.md>`.
In a checkout of this project without a build, run `node src/cli.js lint <file.md>`
instead. It exits
0 for a valid flow, 1 for an invalid flow, 2 for a usage or file access error.
Each diagnostic reads `<file>:<line>:<column>: error LNLnnn: <message>`;
`--format json` gives the same fields as JSON. `lnl graph <file.md> --format mermaid`
draws the flow when you want to see it.

```lnl
START:
  DO    write the flow in one lnl block of the Markdown file: each ASK followed by its JUMP or STOP IF yes|no, each loop with ADD 1 to <c> and one STOP ... IF <c> >= n
LINT:
  ADD   1 to <l>
  STOP  show the last diagnostics and ask the human how to continue IF <l> >= 4
  DO    run node <dir of this SKILL.md>/lnl.mjs lint <file.md> from the project root
  ASK   does lint print a diagnostic?
  JUMP  REPAIR IF yes
  END
REPAIR:
  DO    change the line that the diagnostic names so that it holds the instruction the message asks for
  JUMP  LINT
REVIEW:
  CHECK the file holds one lnl block that lnl lint accepts
REPLY:
  SAY   the lint result and the open diagnostics
  END
```
