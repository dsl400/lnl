import test from 'node:test';
import assert from 'node:assert/strict';
import { openDocument, replaceBlock, toSections } from '../src/document.js';

const TEXT = '# Doc\n\nprose ; with ; semicolons\n\n```lnl\nSTART:\n  SAY hi ; comment\n  END\n```\n\nafter\n';

test('open and replace without change keep the file identical', () => {
  const doc = openDocument(TEXT);
  assert.deepEqual(doc.rows, ['START:', '  SAY hi ; comment', '  END']);
  assert.equal(doc.blockStart, 6);
  assert.equal(replaceBlock(TEXT, doc.rows), TEXT);
});

test('replace changes only the block and keeps CRLF', () => {
  const crlf = TEXT.replace(/\n/g, '\r\n');
  const doc = openDocument(crlf);
  assert.deepEqual(doc.rows, ['START:', '  SAY hi ; comment', '  END']);
  assert.equal(replaceBlock(crlf, doc.rows), crlf);
  const changed = replaceBlock(crlf, ['START:', '  END']);
  assert.equal(changed, '# Doc\r\n\r\nprose ; with ; semicolons\r\n\r\n```lnl\r\nSTART:\r\n  END\r\n```\r\n\r\nafter\r\n');
});

test('a file without a block reports the error and cannot be replaced', () => {
  assert.equal(openDocument('# none\n').error, 'NO_BLOCK');
  assert.throws(() => replaceBlock('# none\n', []), /NO_BLOCK/);
});

test('toSections splits the rows at labels and keeps them as written', () => {
  const rows = ['; head', '', 'START:  ; entry', '  ASK is it? ; why', '  JUMP WORK IF yes', '', 'WORK:', '  END'];
  const { header, sections } = toSections(rows);
  assert.deepEqual(header, ['; head', '']);
  assert.deepEqual(sections.map((s) => s.label), ['START', 'WORK']);
  assert.equal(sections[0].row, 'START:  ; entry');
  assert.deepEqual(sections[0].rows, ['  ASK is it? ; why', '  JUMP WORK IF yes', '']);
  assert.deepEqual([...header, ...sections.flatMap((s) => [s.row, ...s.rows])], rows);
});

test('mixed line endings survive an unchanged save; a changed row takes the fence ending', () => {
  const mixed = '```lnl\r\nSTART:\n  SAY hi\r\n  END\n```\r\n';
  const doc = openDocument(mixed);
  assert.equal(replaceBlock(mixed, doc.rows), mixed);
  assert.equal(replaceBlock(mixed, ['START:', '  SAY bye', '  END']), '```lnl\r\nSTART:\n  SAY bye\r\n  END\n```\r\n');
  assert.equal(replaceBlock(mixed, ['START:', '  END']), '```lnl\r\nSTART:\n  END\r\n```\r\n');
});
