import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { lint } from '../src/lint.js';
import { toBlockMermaid, listing } from '../src/graph.js';
import { project, NORMATIVE } from './helpers.js';

const closureOf = (files) => {
  const root = project(files);
  return lint(path.join(root, 'a.md'), root);
};

test('block view: one node per basic block, counter STOP inside its block, back edge guard', () => {
  const out = toBlockMermaid(closureOf({ 'a.md': NORMATIVE }));
  const nodes = out.split('\n').filter((l) => /^ {2}f0_\d+[[{(]/.test(l));
  assert.equal(nodes.length, 5, 'START ask, WORK, ask, REVIEW, REPLY');
  assert.match(out, /f0_2\["WORK<br\/>ADD 1 to #lt;work#gt;<br\/>■ STOP #lt;work#gt; #gt;= 4<br\/>DO/);
  assert.match(out, /f0_6 -.->\|"yes · back · #lt;work#gt; #gt;= 4"\| f0_2/);
  assert.match(out, /f0_9 -.->\|after STOP\| halt/);
  assert.equal(toBlockMermaid(closureOf({ 'a.md': NORMATIVE })), out, 'deterministic');
});

test('block view: a run of CHECKs is counted, a STOP after an ASK is a stub', () => {
  const out = toBlockMermaid(closureOf({ 'a.md': 'START:\n  ASK go?\n  STOP "halt" IF no\n  CHECK a\n  CHECK b\n  CHECK c\nREVIEW:\n  CHECK r\nREPLY:\n  SAY s\n  END' }));
  assert.match(out, /3× CHECK/);
  assert.match(out, /f0_1\(\("STOP"\)\):::stop/);
  assert.match(out, /f0_0 -->\|"no"\| f0_1/);
});

test('listing view: rows as written, jumps with lanes that never overlap', () => {
  const [f] = listing(closureOf({ 'a.md': NORMATIVE }));
  assert.equal(f.rows[0].label, 'START');
  assert.equal(f.rows[2].text, '  JUMP REVIEW IF yes');
  assert.equal(f.jumps.length, 3);
  const back = f.jumps.find((j) => j.back);
  assert.deepEqual([back.label, f.rows[back.to].label], ['WORK', 'WORK']);
  const stop = f.jumps.find((j) => j.stop);
  assert.ok(stop.lane > Math.max(...f.jumps.filter((j) => !j.stop).map((j) => j.lane)), 'STOP jumps take the outer lanes');
  for (const a of f.jumps) for (const b of f.jumps) {
    if (a === b || a.lane !== b.lane) continue;
    const [a0, a1] = [Math.min(a.from, a.to), Math.max(a.from, a.to)];
    const [b0, b1] = [Math.min(b.from, b.to), Math.max(b.from, b.to)];
    assert.ok(a1 < b0 || b1 < a0, 'jumps on one lane do not overlap');
  }
});
