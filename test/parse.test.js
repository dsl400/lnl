import test from 'node:test';
import assert from 'node:assert/strict';
import { parse } from '../src/parse.js';

const block = (body) => `prose\n\`\`\`lnl\n${body}\n\`\`\`\nmore prose\n`;

test('parses each instruction form with positions', () => {
  const p = parse(block([
    'START:',
    '  ASK is it read-only?  ; a comment',
    '  JUMP DONE IF yes',
    '  WRITE ./r/<task>/x.md "a; \\"quoted\\" description"',
    '  ADD 1 to <work>',
    '  STOP "limit; reached" IF <work> >= 4',
    '  CALL ./sub.md',
    'DONE:',
    '  SAY done',
    '  END',
  ].join('\n')), 'f.md');
  assert.deepEqual(p.diagnostics, []);
  const [ask, jump, write, add, stop, call] = p.instructions;
  assert.equal(ask.text, 'is it read-only?');
  assert.equal(ask.line, 4);
  assert.equal(ask.column, 3);
  assert.deepEqual([jump.target, jump.answer], ['DONE', 'yes']);
  assert.deepEqual([write.path, write.description], ['./r/<task>/x.md', 'a; "quoted" description']);
  assert.equal(add.counter, 'work');
  assert.deepEqual([stop.text, stop.counter, stop.limit], ['limit; reached', 'work', 4]);
  assert.equal(call.path, './sub.md');
  assert.deepEqual(p.labels.map((l) => [l.name, l.index]), [['START', 0], ['DONE', 6]]);
});

test('accepts CRLF', () => {
  const p = parse(block('START:\n  END').replace(/\n/g, '\r\n'), 'f.md');
  assert.deepEqual(p.diagnostics, []);
  assert.equal(p.instructions.length, 1);
});

test('requires exactly one lnl block', () => {
  assert.equal(parse('no block', 'f.md').diagnostics[0].code, 'LNL001');
  assert.equal(parse(block('END') + block('END'), 'f.md').diagnostics[0].code, 'LNL002');
  assert.equal(parse('```lnl\nEND\n', 'f.md').diagnostics[0].code, 'LNL003');
});

test('rejects unknown instructions, IF on DO, bad operands', () => {
  const p = parse(block('START:\n  FOO bar\n  DO x IF yes\n  ADD 2 to <c>\n  WRITE x.md desc\n  STOP no condition\n  start:'), 'f.md');
  assert.deepEqual(p.diagnostics.map((d) => [d.code, d.line]), [
    ['LNL010', 4], ['LNL014', 5], ['LNL011', 6], ['LNL011', 7], ['LNL011', 8], ['LNL012', 9],
  ]);
});

test('free text may end with a colon; a row without an opcode that ends with a colon is a bad label', () => {
  const p = parse(block('START:\n  SAY hello:\n  ASK is it done:\n  DO list:\n  CHECK this:\n  END\n  start:'), 'f.md');
  assert.deepEqual(p.diagnostics.map((d) => [d.code, d.line]), [['LNL012', 9]]);
  assert.deepEqual(p.instructions.map((i) => i.text ?? i.op), ['hello:', 'is it done:', 'list:', 'this:', 'END']);
});
