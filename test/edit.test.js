import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { serve } from '../src/edit.js';
import { project, NORMATIVE } from './helpers.js';

const api = async (url, route, body) => {
  const r = await fetch(new URL(route, url), body ? { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) } : {});
  return { status: r.status, body: await r.json() };
};

test('edit server: open, check, save unchanged, conflict, draft', async (t) => {
  const root = project({ 'a.md': NORMATIVE });
  const file = path.join(root, 'a.md');
  const before = readFileSync(file, 'utf8');
  const server = await serve(file, root);
  t.after(() => server.close());
  const { url } = server;

  const page = await (await fetch(url)).text();
  assert.match(page, /<title>lnl edit<\/title>/);

  const doc = (await api(url, '/api/doc')).body;
  assert.equal(doc.rows[0], 'START:');
  assert.equal(doc.blockStart, 4);
  assert.equal(doc.sections[0].label, 'START');
  assert.deepEqual(doc.header, []);
  assert.deepEqual(doc.diagnostics, []);
  assert.match(doc.mermaid, /flowchart TD/);
  assert.match(doc.blocks, /flowchart TD/);
  assert.equal(doc.listing[0].rows[0].label, 'START');

  const saved = await api(url, '/api/save', { rows: doc.rows, digest: doc.digest });
  assert.equal(saved.status, 200);
  assert.equal(readFileSync(file, 'utf8'), before, 'open and save without editing keeps the file identical');

  const check = (await api(url, '/api/check', { rows: ['START:', '  JUMP NOPE'] })).body;
  assert.equal(check.diagnostics[0].code, 'LNL022');
  assert.equal(check.diagnostics[0].line, 5);
  assert.equal(check.mermaid, null);
  assert.deepEqual([check.blocks, check.listing], [null, null], 'an invalid flow draws no view');
  const unsaved = (await api(url, '/api/check', { rows: ['START:', '  SAY unsaved', '  END'] })).body;
  assert.equal(unsaved.listing[0].rows[1].text, '  SAY unsaved', 'the views use the unsaved rows');
  assert.equal(readFileSync(file, 'utf8'), before, 'check writes nothing');

  writeFileSync(file, before.replace('SAY report', 'SAY tell'));
  const conflict = await api(url, '/api/save', { rows: doc.rows, digest: doc.digest });
  assert.equal(conflict.status, 409);
  assert.ok(conflict.body.rows.some((r) => r.includes('SAY tell')), 'the 409 carries the disk document');

  const draft = await api(url, '/api/save', { rows: ['START:', '  JUMP NOPE'], digest: conflict.body.digest });
  assert.equal(draft.status, 200);
  assert.equal(draft.body.diagnostics[0].code, 'LNL022');
  assert.match(readFileSync(file, 'utf8'), /```lnl\nSTART:\n  JUMP NOPE\n```\n/);
});
