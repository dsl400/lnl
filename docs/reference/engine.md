# Proposed specification for the lnl engine

Status: proposed contract. The sources are `README.md` and the `lnl` block of `AGENTS.md` at the project root; the flow is the first acceptance test of the linter. 

The term "must" marks a verifiable requirement. Judgements about the meaning of questions and actions belong to the agent that follows the flow.

## Purpose and scope

The engine must read flows from the `lnl` blocks of Markdown files, check their structure, generate diagrams, and allow editing them.

The Markdown file must remain the source of truth for the flow. Diagrams and internal representations are derived from the file and must not introduce rules absent from it.

The initial version must provide `lint` and `graph`. The visual editor is a later stage, with its contract defined in this document. The engine must not include semantic validation of free text.

## File format

Each file must contain exactly one block delimited by lines that contain only ` ```lnl ` and ` ``` `, without the spaces around these examples. Markdown text outside the block is documentation and takes no part in the flow. The parser must not guess which block holds the flow.

Within the block, each non-empty line must be a comment, a label, or a complete instruction. Multi-line continuations are not accepted. Indentation does not change semantics. Files must be UTF-8; LF and CRLF must be accepted.

Labels must match `[A-Z][A-Z0-9_]*`, be unique in the file, and end with `:`. Each file must declare `START`. Instruction names must be written in uppercase.

A semicolon outside a double-quoted string starts a comment that continues to the end of the line. In strings, `\"` and `\\` stand for a double quote and a backslash. Questions and action texts may be free text; texts that contain `;` or a reserved suffix must be enclosed in double quotes. The description of a WRITE is always a double-quoted string, so that the comment rule stays unique.

The parser must keep the position of each instruction and the original comments. An error must name the file, line, and column.

## Instructions

| Form | Meaning for the agent |
|---|---|
| `ASK <text>` | Answer the question with yes or no; the answer is kept for the branches that immediately follow. |
| `JUMP <LABEL>` | Continue at the local label. |
| `JUMP <LABEL> IF yes\|no` | Continue at the label if the last ASK of the current group has the given answer. |
| `DO <text>` | Perform the action. |
| `WRITE <path> "<description>"` | Write the given file; the description is the second operand, a double-quoted string. |
| `CHECK <text>` | Check the property and give a verdict and evidence. |
| `ADD 1 to <counter>` | Increment the local counter by one. |
| `STOP <text> IF yes\|no` | Suspend the work if the ASK answer has the given value and continue at REVIEW. |
| `STOP <text> IF <counter> >= <integer>` | Suspend the work when the counter reaches the limit and continue at REVIEW. |
| `CALL <relative-path.md>` | Follow the subflow from START and come back to the next instruction after its END. |
| `SAY <text>` | Tell the user the message. |
| `END` | End the root flow or return to the caller. |

The notation `yes|no` in the table means two alternatives; the `|` character is not part of the instruction. Counters must have the form `<name>`, where the name matches `[a-z][a-z0-9_]*`. Limits must be positive integers.

In the initial version, `IF` must be allowed only on JUMP and STOP. Conditional `DO`, `WRITE`, `CHECK`, `CALL`, and `SAY` must be expressed through labels and JUMP. The language has no arbitrary expressions, interpolations, or code embedded in text.

`WRITE` must have an explicit path and a non-empty description. Placeholders such as `<task>` in the path and in texts are free text for the agent, not variables of the language.

## Branches and traversal

The flow starts at the first instruction after START. After an instruction without a transfer, the flow continues with the next instruction, including across a label. Consecutive labels may designate the same instruction. The end of the file without END must be an error.

Each ASK must be immediately followed, ignoring comments and empty lines, by one or two conditional JUMP/STOP instructions that use `yes` or `no`. A label ends this group and must not appear between an ASK and its branches.

A group must have at most one branch for each answer. If an answer has no explicit branch, the flow continues after the whole group. After the group, the answer is consumed; another instruction cannot reuse it.

The engine must reject `IF yes/no` branches without an ASK in the same group. For an ASK, the graph must include both outcomes, including the implicit continuation.

CHECK produces no answer for JUMP. The flow may explicitly ask, through an ASK, for a decision about checks.

## Subflows

The target of CALL must be an explicit relative path to a Markdown file that holds an `lnl` block, resolved against the directory of the calling file. The initial version has no implicit skill registry; a name without a path is an error.

The engine must accept calls only within the configured project root, after resolving symbolic links. Absolute paths and paths that leave the root must be rejected with a diagnostic.

The engine must check all subflows with the calling file. Cycles in the call graph must be rejected in the initial version. Each call has its own counters and its own ASK result; returning does not change the counters of the caller.

## Counters and loops

Each counter starts at zero on entry into a file and is changed only by ADD. Re-entering a label does not reset counters.

An edge to an instruction at a lower or equal position in the file must be represented as a back edge. The engine must also detect cycles that this textual classification does not fully describe.

For each possible cycle, the linter must prove that each repetition passes both an ADD for the same counter and a STOP with a numeric limit for that counter. The guarantee must not depend on ASK answers. A cycle that can avoid the increment or the limit must be rejected.

A counter must have a single numeric limit in the file. A cyclic region may contain several counters, one for each simple cycle it guards; the linter checks the rule for each simple cycle, not for the maximal region.

An ASK worded "is the counter above 3?" is not a limit the engine can prove and must be rejected as an uncontrolled cycle.

## STOP and review

A file that contains STOP must declare REVIEW and REPLY. After a STOP, the flow continues at REVIEW in the same file, in stop mode: only ASK, CHECK, JUMP, SAY, and END are allowed, and the flow ends waiting for the human. The flow chooses the allowed path through an ASK, for example "did a STOP bring me here?".

The linter must check that from REVIEW there is at least one path to REPLY and END that uses only the instructions allowed in stop mode and contains no cycles.

## Lint

`lnl lint <entry.md> [--format text|json]` must check the entry file and the transitive closure of its calls.

The linter must report unknown instructions, missing operands, duplicate labels, missing START, nonexistent targets, invalid ASK branches, unreachable labels, paths that leave the file without END, uncontrolled cycles, and recursive calls. Comments and Markdown prose must be excluded from the reachability analysis.

For each reachable structural path, the linter must check that the flow reaches END or a stop followed by REVIEW, REPLY, and END. A single path to END must not be enough.

JSON diagnostics must contain at least `code`, `severity`, `file`, `line`, `column`, and `message`. Positions must be one-based. Diagnostic codes must stay stable within the same major version.

## Graph

`lnl graph <entry.md> --format mermaid|dot` must emit the graph on stdout and diagnostics on stderr. An invalid flow must produce diagnostics without a partial diagram.

The diagram must show labels as nodes, transfers as edges, ASK conditions as `yes/no`, implicit continuations, and END as a terminal. A CALL must have a distinct node with its target and a visible return. STOP must show the transfer to REVIEW and the halt for human intervention.

A back edge must show the counter and the limit proven by lint. Diagram identifiers must be unique across files, and user texts must be escaped for the output format.

Lint and graph must use the same interpretation of the flow. A change to the file must invalidate any reused diagram or analysis.

## Visual editor

`lnl edit <entry.md>` must use the same syntax and the same diagnostics as lint. The editor must be able to show and change labels, instructions, branches, and calls without altering the Markdown text outside the `lnl` block.

Opening and saving without changes must keep the file identical. A change must keep unaffected comments. The editor must detect external changes before saving and ask for the conflict to be resolved, without silent overwriting.

The editor must offer two read-only views of the same lint beside the editable one: a block view, with one node per basic block of the flow (Aho et al., Compilers, section 8.4), and a listing view, with the rows of the block as written and each jump drawn beside them from its row to its label. Both views must follow the unsaved rows and must show nothing while the flow is invalid. In the listing view, the user must be able to follow a jump to its label and go back.

An invalid document may be saved as a draft, with visible diagnostics. The editor must not automatically turn free text into conditions.

## CLI contract

Commands must return `0` for success, `1` for an invalid flow, and `2` for a usage or file access error.

JSON outputs and diagrams must be deterministic for the same files and options.

## Normative example

The following block is an example of a valid flow. The file that contains it must use the `lnl` delimiter.

```lnl
START:
  ASK is the request read-only?
  JUMP REVIEW IF yes
WORK:
  ADD 1 to <work>
  STOP "Work limit reached; ask the human how to continue" IF <work> >= 4
  DO perform the next planned change
  CHECK the change meets its acceptance criteria
  ASK is there another planned change?
  JUMP WORK IF yes
REVIEW:
  CHECK report the checks and their evidence
REPLY:
  SAY report the outcome and any question for the human
  END
```

The counter allows three DO; on the fourth entry into WORK, STOP sends the flow to REVIEW. A `yes` answer to the first ASK bypasses WORK. A `no` answer to the last ASK continues to REVIEW. The stop path checks and replies before it waits for the human.

## Acceptance criteria

| Scenario | Required result |
|---|---|
| Normative example | No diagnostic; the graph shows the back edge to WORK with `<work> >= 4`. |
| ASK with only JUMP IF no | No diagnostic; the graph shows the yes answer continuing after the group. |
| JUMP IF yes without ASK | Diagnostic with position. |
| Missing JUMP target or unreachable label | Lint error and graph without partial output. |
| Cycle with an ASK about the limit, without a numeric STOP | Uncontrolled loop error. |
| Cycle that can bypass ADD or the numeric STOP | Error, even if a valid exit path exists. |
| CALL with a valid subflow | No diagnostic; the graph shows the call and the return. |
| Recursive CALL or CALL outside the root | Lint error. |
| REVIEW without an allowed stop-mode path to REPLY and END | Lint error. |
| Open and save in the editor without editing | Identical file, including comments and documentation. |

## Proposed decisions that need product validation

The `lnl` delimiter, conditions only on JUMP/STOP, explicit paths for CALL, counters initialized to zero, numeric STOP limits, the WRITE description as a string, and stop mode are decided.

The editor technology is decided (`docs/tmp.md`, decision D5). Support for nested loops remains open; this choice does not block implementing the parser, the linter, and the graph export on the proposed contract.
