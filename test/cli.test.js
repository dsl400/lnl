import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { main } from '../src/cli.js';
import { project, NORMATIVE } from './helpers.js';

const sink = () => {
  const s = { text: '', write: (t) => { s.text += t; } };
  return s;
};
const cli = async (...argv) => {
  const out = sink();
  const err = sink();
  const status = await main(argv, out, err);
  return { status, out: out.text, err: err.text };
};

test('lint json gives the diagnostic fields and exit 1', async () => {
  const root = project({ 'a.md': 'START:\n JUMP NOPE' });
  const r = await cli('lint', path.join(root, 'a.md'), '--root', root, '--format', 'json');
  assert.equal(r.status, 1);
  const [d] = JSON.parse(r.out).diagnostics;
  assert.deepEqual(Object.keys(d).sort(), ['code', 'column', 'file', 'line', 'message', 'severity']);
});

test('usage and file access errors exit 2', async () => {
  assert.equal((await cli('nope')).status, 2);
  assert.equal((await cli('graph', 'a.md')).status, 2);
  assert.equal((await cli('lint', '/nonexistent.md')).status, 2);
  assert.equal((await cli('edit', '/nonexistent.md')).status, 2);
  assert.equal((await cli('edit', 'a.md', '--port', 'x')).status, 2);
});

test('graph of an invalid flow has no partial output', async () => {
  const root = project({ 'a.md': 'START:\n JUMP NOPE' });
  const r = await cli('graph', path.join(root, 'a.md'), '--root', root, '--format', 'mermaid');
  assert.equal(r.status, 1);
  assert.equal(r.out, '');
  assert.match(r.err, /LNL022/);
});

test('mermaid graph: conditions, implicit continuation, stop, back edge guard, halt', async () => {
  const root = project({ 'a.md': NORMATIVE });
  const r = await cli('graph', path.join(root, 'a.md'), '--root', root, '--format', 'mermaid');
  assert.equal(r.status, 0);
  assert.match(r.out, /f0_i0 -->\|"yes"\| f0_i8/);
  assert.match(r.out, /f0_i0 -.->\|"no"\| f0_i2/);
  assert.match(r.out, /f0_i3 ==>\|"#lt;work#gt; #gt;= 4"\| f0_i8/);
  assert.match(r.out, /f0_i6 -->\|"yes; back edge #lt;work#gt; #gt;= 4"\| f0_i2/);
  assert.match(r.out, /f0_i10 -.->\|"after STOP"\| halt/);
  const again = await cli('graph', path.join(root, 'a.md'), '--root', root, '--format', 'mermaid');
  assert.equal(again.out, r.out, 'deterministic');
});

test('dot graph: CALL with call and return edges, escaped text', async () => {
  const root = project({ 'a.md': 'START:\n CALL ./b.md\n SAY "say \\"hi\\""\n END', 'b.md': 'START:\n END' });
  const r = await cli('graph', path.join(root, 'a.md'), '--root', root, '--format', 'dot');
  assert.equal(r.status, 0);
  assert.match(r.out, /"f0_i0" -> "f1_i0" \[style=solid, label="call"\]/);
  assert.match(r.out, /"f1_i0" -> "f0_i1" \[style=dashed, label="return"\]/);
  assert.doesNotMatch(r.out, /"f0_i0" -> "f0_i1"/, 'the subflow is not drawn as optional');
  assert.match(r.out, /label="SAY say \\"hi\\""/);
});

test('the flows the project ships lint clean', async () => {
  const root = path.resolve(import.meta.dirname, '..');
  for (const file of ['AGENTS.md', '.claude/skills/lnl/SKILL.md']) {
    const r = await cli('lint', path.join(root, file), '--root', root);
    assert.equal(r.status, 0, `${file}: ${r.out}`);
  }
});
