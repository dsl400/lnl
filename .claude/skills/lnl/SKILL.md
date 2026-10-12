---
name: lnl
description: Use when you write or edit a Markdown file that holds, or will hold, an `lnl` block: a skill, a rule, or AGENTS.md.
metadata:
  source: https://github.com/dsl400/lnl
  version: 0.2.0
---

# lnl

A flow is one ` ```lnl ` block in a Markdown file. One line, one instruction; `;` starts a comment.

| Instruction | Meaning |
|---|---|
| `LABEL:` | jump target; `START` is required |
| `ASK <question>` | must be followed by `JUMP`/`STOP ... IF yes\|no` |
| `JUMP <LABEL> [IF yes\|no]` | go to label |
| `DO <text>` | do one thing |
| `WRITE <path> "<description>"` | write a file |
| `ADD 1 to <c>` | grow counter `<c>`; each loop needs one |
| `STOP <message> IF yes\|no\|<c> >= n` | halt to REVIEW, then REPLY; needs `REVIEW:` and `REPLY:` |
| `CHECK <text>` | one review check |
| `CALL ./other.md` | run the flow of another file |
| `SAY <text>` | message to the user |
| `END` | end of flow |

## Frontmatter

Skill, `.claude/skills/<name>/SKILL.md`:

```yaml
---
name: <name>            # kebab-case, same as the folder
description: Use when <trigger>.   # the agent picks the skill by this line; max 256 characters
---
```

Rule, `.claude/rules/<topic>.md`:

```yaml
---
paths:                  # globs; the rule loads only for matching files
  - "src/**/*.js"       # omit paths to load the rule always
---
```

Validator: [lnl.mjs](lnl.mjs) — `lint <file.md>`, `graph <file.md> --format mermaid|dot`, `edit <file.md>`.

```lnl
START:
  DO    write the flow in one lnl block
LINT:
  ADD   1 to <l>
  STOP  show the diagnostics and ask the human how to continue IF <l> >= 4
  DO    run node <dir of this SKILL.md>/lnl.mjs lint <file.md> from the project root
  ASK   does lint print a diagnostic?
  JUMP  REPAIR IF yes
  END
REPAIR:
  DO    fix the line the diagnostic names
  JUMP  LINT
REVIEW:
  CHECK lnl lint accepts the file
REPLY:
  SAY   the lint result and the open diagnostics
  END
```
