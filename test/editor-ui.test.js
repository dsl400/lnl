import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { PAGE } from '../src/editor-ui.js';

// Pulls one top-level function of the page script by name.
const fn = (name) => {
  const m = new RegExp(`^(async )?function ${name}\\([^)]*\\) \\{[\\s\\S]*?^\\}`, 'm').exec(PAGE);
  assert.ok(m, `function ${name} in PAGE`);
  return m[0];
};

test('reconnecting a JUMP wire rewrites only the target', () => {
  const JUMP = vm.runInNewContext(/const JUMP = (\/.*\/);/.exec(PAGE)[1]);
  const rewire = (row, label) => row.replace(JUMP, (r, pre, target, post) => pre + label + post);
  assert.equal(rewire('  JUMP JUMP IF yes ; c', 'DONE'), '  JUMP DONE IF yes ; c');
  assert.equal(rewire('  JUMP J', 'UMP'), '  JUMP UMP');
  assert.equal(JUMP.exec('  JUMP WORK IF no')[2], 'WORK');
});

test('a save acknowledges the revision it sent, not the edits made while it was pending', async () => {
  let resolveSave;
  const taken = [];
  const ctx = {
    state: { rows: ['  SAY first'], digest: 'd1', dirty: true, disk: null, rev: 0 },
    $: () => ({ hidden: false }),
    rows: () => ctx.state.rows,
    take: (doc) => taken.push(doc),
    setStatus: () => {},
    check: () => {},
    timer: null,
    clearTimeout: () => {},
    setTimeout: () => 0,
    JSON,
    Object,
    fetch: () => new Promise((r) => { resolveSave = r; }),
  };
  vm.createContext(ctx);
  vm.runInContext(`${fn('touch')}\n${fn('save')}`, ctx);
  const pending = vm.runInContext('save()', ctx);
  ctx.state.rows = ['  SAY second'];
  vm.runInContext('touch()', ctx);
  resolveSave({ status: 200, json: async () => ({ rows: ['  SAY first'], digest: 'd2' }) });
  await pending;
  assert.deepEqual(taken, [], 'the stale response does not replace the state');
  assert.deepEqual([ctx.state.rows, ctx.state.digest, ctx.state.dirty], [['  SAY first'], 'd2', true]);
  const quiet = vm.runInContext('save()', ctx);
  resolveSave({ status: 200, json: async () => ({ rows: ['  SAY second'], digest: 'd3' }) });
  await quiet;
  assert.equal(taken.length, 1, 'a save with no edit in flight adopts the document');
});

test('the page offers the Nodes, Blocks, and Listing view modes', () => {
  for (const v of ['rete', 'blocks', 'listing']) assert.match(PAGE, new RegExp(`data-view="${v}"`));
  assert.match(PAGE, /function drawListing\(/);
});
