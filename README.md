# lnl (Lintable Natural Language) — agent instructions as a flow

lnl is a language for the instructions of an LLM agent: a flow of short
instructions, one per line, read from top to bottom, where each question is
followed by the jump its answer leads to. A flow lives in an `lnl` code block
of an ordinary Markdown file; skills and rules are subflows. A small
engine lints the flows and draws them.

## Why

- A model builds the meaning of each token from the tokens near it (each layer
  adds "annotations" to the vector of the token). A rule whose condition and
  action sit on the same line, next to each other, reads complete alone.
- Prose rules hide the flow: the model must infer which rule applies when.
  A flow states it: one question, then the jump its answer leads to.
- Research: pseudo-code prompts gained 7–16 F1 on older models (Mishra et al.,
  EMNLP 2023); the larger gains (StateFlow, AlphaCodium, AFlow) come when code
  outside the model executes the flow. Hence the engine.

## The language

```lnl
LABEL:                         ; a node
  ASK   <question>?            ; followed by one or two JUMP/STOP lines with IF yes|no
  JUMP  <LABEL> IF yes|no      ; a wire, with its condition
  DO    <action>
  WRITE <file> "<what it holds>"
  CHECK <a property the work must hold>     ; checks are inline, one per line
  ADD   1 to <counter>         ; each loop has its own counter, starting at 0
  STOP  <message for the human> IF yes|no   ; then REVIEW, then REPLY
  STOP  <message for the human> IF <counter> >= <n>  ; the limit of a loop
  CALL  <path>.md              ; a skill or a rule, in its own file
  SAY   <text for the user>
  END
```

Example:

```lnl
START:
  ASK   is the request a question that changes no file?
  JUMP  REVIEW IF yes
PLAN:
  ADD   1 to <p>
  STOP  ask the human, with the last plan IF <p> >= 4
  WRITE ./plans/<task>/plan-<p>.md "one line per change: file, what, why, how to verify"
  ASK   does each part of the request have its line in the plan?
  JUMP  PLAN IF no
  CALL  ./skills/deploy-check.md
  JUMP  WORK
```

## The engine

| Part | Does |
|---|---|
| `lnl lint` | each line starts with a known instruction; each JUMP/CALL target exists; each ASK has its IF; no label is unreachable; each path from START reaches END; each backward jump passes an ADD and a limit STOP |
| `lnl graph` | emits Mermaid or Graphviz: labels are nodes, JUMPs are wires with their condition, CALLs are subflow nodes, back-edges show their counter |
| `lnl edit` | opens a local editor: a Rete.js node canvas with one node per label, its rows in the node, JUMP and STOP rows as output wires, the fall-through as a "next" wire; lint diagnostics show in the node of their row; Save keeps the Markdown around the block byte for byte and stops when the file changed on disk |

The skill `skills/lnl/SKILL.md` tells an agent how to write a flow
and run `lnl lint` on it; a rule or a skill written in lnl calls it.

What it cannot validate: the meaning inside a CHECK or an ASK. That stays the
judgement of the model.

