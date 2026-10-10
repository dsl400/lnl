import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

// Writes { 'a.md': 'flow lines' } as lnl blocks under a fresh root; returns the root.
export function project(files) {
  const root = mkdtempSync(path.join(tmpdir(), 'lnl-'));
  for (const [name, body] of Object.entries(files)) {
    const file = path.join(root, name);
    mkdirSync(path.dirname(file), { recursive: true });
    writeFileSync(file, body.startsWith('#') ? body : `# Flow\n\n\`\`\`lnl\n${body}\n\`\`\`\n`);
  }
  return root;
}

export const codes = (closure) => closure.diagnostics.map((d) => d.code);

// The normative example of engine.md.
export const NORMATIVE = `START:
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
  END`;
