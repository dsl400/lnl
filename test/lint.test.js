import test from 'node:test';
import assert from 'node:assert/strict';
import { symlinkSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { lint } from '../src/lint.js';
import { project, codes, NORMATIVE } from './helpers.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const lintFiles = (files, entry = 'a.md') => {
  const root = project(files);
  return lint(path.join(root, entry), root);
};


test('the normative example is valid', () => {
  assert.deepEqual(codes(lintFiles({ 'a.md': NORMATIVE })), []);
});

test('the lnl block of AGENTS.md is valid (first acceptance test)', () => {
  const root = path.join(here, '..');
  assert.deepEqual(lint(path.join(root, 'AGENTS.md'), root).diagnostics, []);
});

test('ASK with only JUMP IF no is valid', () => {
  assert.deepEqual(codes(lintFiles({ 'a.md': 'START:\n ASK x?\n JUMP B IF no\n SAY yes path\nB:\n END' })), []);
});

test('JUMP IF yes without ASK is reported with its position', () => {
  const [d] = lintFiles({ 'a.md': 'START:\n DO x\n JUMP START IF yes\n END' }).diagnostics;
  assert.deepEqual([d.code, d.line, d.column], ['LNL031', 6, 2]);
});

test('a label between ASK and its branch breaks the group', () => {
  assert.deepEqual(codes(lintFiles({ 'a.md': 'START:\n ASK x?\nB:\n JUMP B IF yes\n END' })), ['LNL030', 'LNL031']);
});

test('two branches for the same answer are rejected', () => {
  assert.ok(codes(lintFiles({ 'a.md': 'START:\n ASK x?\n JUMP E IF yes\n JUMP E IF yes\nE:\n END' })).includes('LNL032'));
});

test('missing target and unreachable label', () => {
  assert.deepEqual(codes(lintFiles({ 'a.md': 'START:\n JUMP NOPE\nX:\n END' })), ['LNL022']);
  assert.deepEqual(codes(lintFiles({ 'a.md': 'START:\n END\nX:\n END' })), ['LNL040']);
});

test('falling off the end of the file', () => {
  assert.ok(codes(lintFiles({ 'a.md': 'START:\n DO x' })).includes('LNL041'));
});

test('missing START', () => {
  assert.deepEqual(codes(lintFiles({ 'a.md': 'A:\n END' })), ['LNL021']);
});

test('cycle with an ASK about the limit and no numeric STOP is uncontrolled', () => {
  const ds = lintFiles({ 'a.md': 'START:\nW:\n ADD 1 to <w>\n ASK is <w> above 3?\n JUMP E IF yes\n JUMP W\nE:\n END' }).diagnostics;
  assert.deepEqual(ds.map((d) => d.code), ['LNL050']);
});

test('a cycle that can bypass ADD is rejected even with a valid exit', () => {
  const flow = `START:
W:
  ADD 1 to <w>
L:
  STOP limit IF <w> >= 3
  ASK again?
  JUMP L IF yes
  ASK more?
  JUMP W IF yes
REVIEW:
REPLY:
  END`;
  assert.deepEqual(codes(lintFiles({ 'a.md': flow })), ['LNL050']);
});

test('a counter has a single limit', () => {
  const flow = 'START:\n ADD 1 to <w>\n STOP a IF <w> >= 3\n STOP b IF <w> >= 4\nREVIEW:\nREPLY:\n END';
  assert.deepEqual(codes(lintFiles({ 'a.md': flow })), ['LNL051']);
});

test('STOP needs REVIEW and REPLY', () => {
  assert.deepEqual(codes(lintFiles({ 'a.md': 'START:\n ASK x?\n STOP s IF yes\n END' })), ['LNL023', 'LNL023']);
});

test('REVIEW without a stop-mode path to REPLY and END', () => {
  const flow = 'START:\n ASK x?\n STOP s IF yes\nREVIEW:\n DO something\nREPLY:\n END';
  assert.deepEqual(codes(lintFiles({ 'a.md': flow })), ['LNL060']);
});

test('valid CALL; recursive CALL; CALL outside the root; bare name', () => {
  assert.deepEqual(codes(lintFiles({ 'a.md': 'START:\n CALL ./sub/b.md\n END', 'sub/b.md': 'START:\n END' })), []);
  assert.deepEqual(codes(lintFiles({ 'a.md': 'START:\n CALL ./b.md\n END', 'b.md': 'START:\n CALL ./a.md\n END' })), ['LNL073']);
  assert.deepEqual(codes(lintFiles({ 'a.md': 'START:\n CALL ../x.md\n END' })), ['LNL072']);
  assert.deepEqual(codes(lintFiles({ 'a.md': 'START:\n CALL b.md\n END' })), ['LNL070']);
  const root = project({ 'a.md': 'START:\n CALL ./link.md\n END' });
  const outside = project({ 'o.md': 'START:\n END' });
  symlinkSync(path.join(outside, 'o.md'), path.join(root, 'link.md'));
  assert.deepEqual(codes(lint(path.join(root, 'a.md'), root)), ['LNL071']);
});

test('a missing entry file is a file access error', () => {
  assert.deepEqual(codes(lint('/nonexistent/x.md', '/')), ['LNL080']);
});

test('a START with no instruction after it falls off the end of the file', () => {
  const [d] = lintFiles({ 'a.md': 'START:' }).diagnostics;
  assert.deepEqual([d.code, d.line, d.column], ['LNL041', 4, 1]);
});

test('a long acyclic flow of ASK diamonds lints in linear time', { timeout: 5000 }, () => {
  const rows = ['START:'];
  for (let k = 0; k < 60; k++) rows.push(`  ASK x${k}?`, `  JUMP N${k} IF yes`, `  DO x${k}`, `N${k}:`);
  rows.push('  END');
  assert.deepEqual(codes(lintFiles({ 'a.md': rows.join('\n') })), []);
});

test('nested cycles are each guarded and listed once', () => {
  const flow = `START:
OUTER:
  ADD 1 to <o>
  STOP outer IF <o> >= 3
INNER:
  ADD 1 to <i>
  STOP inner IF <i> >= 3
  ASK again?
  JUMP INNER IF yes
  ASK more?
  JUMP OUTER IF yes
REVIEW:
REPLY:
  END`;
  const closure = lintFiles({ 'a.md': flow });
  assert.deepEqual(codes(closure), []);
  const guards = closure.files.get([...closure.files.keys()][0]).guards;
  assert.deepEqual(Object.fromEntries([...guards].map(([k, g]) => [k, [...g]])), { '4->2': ['<i> >= 3'], '6->0': ['<o> >= 3'] });
});
