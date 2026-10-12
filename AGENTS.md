<project-rules enforcement="strict, no exceptions allowed">

<rule name="entrypoint">This program is how you work. WHEN a user message
arrives, you SHALL run the program below from `START`, before any other
action, and follow it line by line until `END`.</rule>

<rule name="same-language">WHEN you write a skill or a rule, use the
language below and `CALL ./skills/lnl/SKILL.md`: that skill holds
the validation script and how to run it.</rule>

```lnl
; Read from top to bottom. Each line asks one question or does one thing.
; Each ASK is followed by the JUMP or STOP its answer leads to.
; <task> is the kebab-case name of the user request.
; Each loop has its own counter: <r> for RESEARCH, <p> for PLAN, <w> for WORK,
; <v> for REVIEW. Each counter starts at 0 when the turn starts and grows only
; by its ADD; a jump from another loop does not reset it.
; STOP does no more work: it keeps its message for REPLY and jumps to REVIEW,
; so each turn, whatever its path, ends with REVIEW and then REPLY.

START:                                              ; entrypoint: each user message
  ASK   does the user ask me to prevent a repeated error?   ; for example "never do
                                                    ; this again", "how do we
                                                    ; prevent this from happening"
  JUMP  PREVENT IF yes
  ASK   is the request a question that changes no file?
  JUMP  REVIEW IF yes
  ASK   is the request a minor change?              ; it touches only the files
                                                    ; the request names and changes
                                                    ; no behaviour it does not name
  JUMP  MINOR IF yes
  JUMP  RESEARCH

PREVENT:
  ASK   can a lint rule of the file that shows the error catch it?
  JUMP  PREVENT_RULE IF no
  WRITE ./reports/<task>/proposal.md "rung 1: the lint rule, one input that breaks it, one that passes"
  JUMP  REVIEW
PREVENT_RULE:
  ASK   can one EARS sentence in .claude/rules/<topic>.md, with a `paths` list of the files where the error happens, guide the agent away from it?
  JUMP  PREVENT_CHECK IF no
  WRITE ./reports/<task>/proposal.md "rung 2: the sentence, and why a lint rule cannot catch it"
  JUMP  REVIEW
PREVENT_CHECK:
  WRITE ./reports/<task>/proposal.md "rung 3: one CHECK line for REVIEW, and why rungs 1 and 2 cannot catch the error"
  JUMP  REVIEW

MINOR:
  ADD   1 to <p>
  WRITE ./reports/<task>/plan-<p>.md "one line: file, what, how to verify"
  ASK   is the change irreversible or outward-facing?
  STOP  ask the human to approve the change IF yes
  JUMP  WORK

RESEARCH:
  ADD   1 to <r>
  STOP  ask the human the open questions IF <r> >= 4
  ASK   do I have, with a source, each fact the plan needs?
  JUMP  PLAN IF yes
  WRITE ./reports/<task>/research-<r>.md "each fact with file:line or URL; the established system, standard, or library that already solves the need, with the section that covers it, when one exists"
  JUMP  RESEARCH

PLAN:
  ADD   1 to <p>
  STOP  ask the human, with the last plan IF <p> >= 4
  WRITE ./reports/<task>/plan-<p>.md "one line per change: file, what, why, how to verify; the plan is as big as the work"
PLAN_CHECK:
  ASK   does each part of the user request have its line in the plan?
  JUMP  PLAN IF no
  ASK   does the plan leave a question without a sourced answer?
  JUMP  RESEARCH IF yes
  ASK   does the plan hold an irreversible or outward-facing action?
  STOP  ask the human to approve the plan IF yes
  JUMP  WORK

WORK:
  ADD   1 to <w>
  STOP  report the lines of the plan not done and ask the human how to continue IF <w> >= 21
  ASK   does the plan hold a line that is not done?
  JUMP  REVIEW IF no
  ASK   does the line hold the information it needs: file, what, how to verify?
  STOP  report that the plan does not cover this change, the change, and its reason IF no
  DO    the change of the line
  DO    verify the change and mark the line done
  JUMP  WORK

REVIEW:
  ; Check the changes of the turn, each file they use or that uses them,
  ; and each file read in the turn; their content is already in your context.
  ; A turn without changes gets [N/A] on the checks of code.
  ; Append to ./reports/<task>/audit.md one entry:
  ;   ## <date> <time> · session <id>
  ;   Turn: "<user message>"
  ;   - [OK] <check> ? <file>:<line>
  ;   - [N/A] <check> ? <reason the changes give>
  ;   - [NOT OK] <check>
  ;     - <file>:<line> <what breaks the check>
  ;       Proof: <evidence>
  ;       Repair: <what changed> | Rejected: <reason from the discussion>
  ;   - [NOT OK] correction ? <what the earlier turn did> ? <what the user wanted>
  ;     Proposal: rung <n>, <file> ? <the mitigation>
  ;     Rung <n-1>: <why it cannot catch the error>
  ;   - [OK] decision ? docs/tmp.md marker <marker>
  CHECK code moved out of a loop when it does not change inside the loop (LICM)
  CHECK values known early are computed once, not on each run (binding-time analysis)
  CHECK each specialized path stays valid for the inputs it serves (specialization validity)
  CHECK each cache is invalidated when its source changes (cache invalidation)
  CHECK each file, function, and rule has one responsibility (SRP)
  CHECK each fact, rule, and piece of code lives in one place (DRY)
  CHECK each derived value matches the state it derives from (derived-state consistency)
  CHECK each change keeps the contract of what it implements or calls (contract conformance)
  CHECK each count or numbered heading matches the structure near it
  CHECK each report of the turn lives in ./reports/<task>/
  CHECK each requirement of docs/reference/ reads complete alone: it names in words what it uses and puts a pointer to another identifier in parentheses at the end of a sentence
  CHECK each text of docs/reference/ speaks about what is required, not about its implementation
  CHECK each design, rule, or mechanism the turn invents either uses the established system, standard, or library that already defines it, naming its section, or states why that system does not fit
  CHECK a user decision of the turn is appended to docs/tmp.md
  CHECK a user correction of the turn that repeats an earlier one is recorded in ~/agent-problems/
  ASK   does a [NOT OK] lack a Repair, a Rejected with its reason, or a Proposal?
  JUMP  REPLY IF no
  ASK   did a STOP bring me here?
  JUMP  REPLY IF yes                                ; REPLY lists the open [NOT OK]
  ADD   1 to <v>
  STOP  ask the human, with the open [NOT OK] lines IF <v> >= 4
  WRITE ./reports/<task>/plan-<p>.md "append each missing Repair as a new line, not done"
  JUMP  WORK

REPLY:
  ASK   did a STOP bring me here?
  JUMP  REPLY_SAY IF yes
  ASK   is the report, plan, or handover of the turn longer than one sentence?
  JUMP  REPLY_SAY IF no
  WRITE ./reports/<task>/<kebab-title>.md "the report, plan, or handover of the turn"
REPLY_SAY:
  SAY   "the message of the STOP when a STOP brought me here; the answer, as short as it can be while it holds the limits and the questions the user needs; the proposal when PREVENT wrote one; a link to the report when REPLY wrote one; a link to the audit.md entry and its [NOT OK] lines when REVIEW ran"
  END
```

</project-rules>
