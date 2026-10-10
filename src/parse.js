import { CODES, diag } from './diagnostics.js';

const LABEL = /^([A-Z][A-Z0-9_]*):$/;
const LABEL_NAME = /^[A-Z][A-Z0-9_]*$/;
const COUNTER = /^<([a-z][a-z0-9_]*)>$/;
const SUFFIX = /\s+IF\s+(yes|no|<([a-z][a-z0-9_]*)>\s*>=\s*(\d+))$/;
const OPS = new Set(['ASK', 'JUMP', 'DO', 'WRITE', 'CHECK', 'ADD', 'STOP', 'CALL', 'SAY', 'END']);
const TEXT_OPS = new Set(['ASK', 'DO', 'CHECK', 'SAY']);

// Parses the single `lnl` block of a Markdown file (engine.md, File format).
// Returns { labels: [{name, index, line, column}], instructions: [...], diagnostics }.
// A label's index is the position of the instruction it designates.
export function parse(source, file) {
  const diagnostics = [];
  const lines = splitLines(source);
  const program = { file, labels: [], instructions: [], diagnostics };
  const block = locateBlock(lines);
  if (block.error) {
    diagnostics.push(diag(CODES[block.error], file, block.line, 1, BLOCK_ERRORS[block.error]));
    return program;
  }
  for (let i = block.open + 1; i < block.close; i++) parseLine(lines[i], i + 1, program);
  return program;
}

const BLOCK_ERRORS = { NO_BLOCK: 'no ```lnl block', MANY_BLOCKS: 'more than one ```lnl block', UNCLOSED_BLOCK: '```lnl block is not closed' };

// Splits a source into lines without their LF or CRLF ending.
export function splitLines(source) {
  return source.split('\n').map((l) => (l.endsWith('\r') ? l.slice(0, -1) : l));
}

// Finds the single ```lnl block (engine.md, File format).
// Returns { open, close } as zero-based line indices of the fences,
// or { error, line } with error NO_BLOCK, MANY_BLOCKS, or UNCLOSED_BLOCK.
export function locateBlock(lines) {
  const opens = [];
  for (let i = 0; i < lines.length; i++) if (lines[i] === '```lnl') opens.push(i);
  if (opens.length === 0) return { error: 'NO_BLOCK', line: 1 };
  if (opens.length > 1) return { error: 'MANY_BLOCKS', line: opens[1] + 1 };
  let close = opens[0] + 1;
  while (close < lines.length && lines[close] !== '```') close++;
  if (close === lines.length) return { error: 'UNCLOSED_BLOCK', line: opens[0] + 1 };
  return { open: opens[0], close };
}

function parseLine(raw, line, program) {
  const { file, diagnostics } = program;
  const row = parseRow(raw);
  switch (row.kind) {
    case 'blank':
    case 'comment':
      return;
    case 'label':
      program.labels.push({ name: row.name, index: program.instructions.length, line, column: row.column });
      return;
    case 'instruction':
      program.instructions.push({ ...row.ins, line, column: row.column, file });
      return;
    default:
      diagnostics.push(diag(row.code, file, line, row.column, row.message));
  }
}

// Classifies one row of the block (engine.md, File format). Returns one of
//   { kind: 'blank' } | { kind: 'comment', comment } | { kind: 'label', name, column, comment }
//   { kind: 'instruction', ins, column, comment } | { kind: 'error', code, column, message }
// where `comment` is the text after the `;` of the row, when there is one.
export function parseRow(raw) {
  const code = stripComment(raw);
  if (code === null) return { kind: 'error', code: CODES.UNTERMINATED_STRING, column: raw.indexOf('"') + 1, message: 'unterminated string' };
  const comment = code.length < raw.length ? raw.slice(code.length + 1) : undefined;
  const text = code.trim();
  if (text === '') return comment === undefined ? { kind: 'blank' } : { kind: 'comment', comment };
  const column = code.indexOf(text) + 1;
  const label = LABEL.exec(text);
  if (label) return { kind: 'label', name: label[1], column, comment };
  const op = /^\S+/.exec(text)[0];
  if (!OPS.has(op)) {
    // Free text may end with ':' (engine.md, File format); only a row without an opcode is a malformed label.
    if (text.endsWith(':')) return { kind: 'error', code: CODES.BAD_LABEL, column, message: `invalid label "${text}"` };
    return { kind: 'error', code: CODES.UNKNOWN_INSTRUCTION, column, message: `unknown instruction "${op}"` };
  }
  const ins = { op };
  const error = parseOperands(ins, text.slice(op.length).trim());
  if (error) return { kind: 'error', code: error.code ?? CODES.BAD_OPERAND, column, message: `${op}: ${error.message}` };
  return { kind: 'instruction', ins, column, comment };
}

// Returns the code part of a line, or null when a string is not closed.
function stripComment(raw) {
  let inString = false;
  for (let i = 0; i < raw.length; i++) {
    const c = raw[i];
    if (inString) {
      if (c === '\\') i++;
      else if (c === '"') inString = false;
    } else if (c === '"') inString = true;
    else if (c === ';') return raw.slice(0, i);
  }
  return inString ? null : raw;
}

// Reads a quoted string at the start of `s`; returns { value, rest } or null.
function readString(s) {
  if (s[0] !== '"') return null;
  let value = '';
  for (let i = 1; i < s.length; i++) {
    const c = s[i];
    if (c === '\\' && (s[i + 1] === '"' || s[i + 1] === '\\')) value += s[++i];
    else if (c === '"') return { value, rest: s.slice(i + 1).trim() };
    else value += c;
  }
  return null;
}

// Splits an IF suffix off the operands: { body, cond } with cond null, {answer}, or {counter, limit}.
function splitCondition(rest) {
  const m = SUFFIX.exec(rest);
  if (!m) return { body: rest, cond: null };
  const body = rest.slice(0, m.index).trim();
  if (m[2]) return { body, cond: { counter: m[2], limit: Number(m[3]) } };
  return { body, cond: { answer: m[1] } };
}

// A free text operand: a quoted string, or the raw text.
function readText(body) {
  if (body.startsWith('"')) {
    const s = readString(body);
    if (!s || s.rest !== '') return { error: 'a quoted text must be the whole operand' };
    return { value: s.value };
  }
  return { value: body };
}

function parseOperands(ins, rest) {
  const { body, cond } = splitCondition(rest);
  if (cond && ins.op !== 'JUMP' && ins.op !== 'STOP') {
    return { code: CODES.IF_NOT_ALLOWED, message: 'IF is allowed only on JUMP and STOP; quote the text if the IF belongs to it' };
  }
  if (TEXT_OPS.has(ins.op)) {
    const t = readText(body);
    if (t.error) return { message: t.error };
    if (t.value === '') return { message: 'missing text' };
    ins.text = t.value;
    return null;
  }
  switch (ins.op) {
    case 'JUMP':
      if (!LABEL_NAME.test(body)) return { message: `expected a label, got "${body}"` };
      if (cond?.counter) return { message: 'JUMP accepts only IF yes|no' };
      ins.target = body;
      ins.answer = cond?.answer ?? null;
      return null;
    case 'STOP': {
      if (!cond) return { message: 'STOP needs IF yes|no or IF <counter> >= <n>' };
      const t = readText(body);
      if (t.error) return { message: t.error };
      if (t.value === '') return { message: 'missing message' };
      ins.text = t.value;
      if (cond.answer) ins.answer = cond.answer;
      else {
        if (cond.limit < 1) return { message: 'the limit must be a positive integer' };
        ins.counter = cond.counter;
        ins.limit = cond.limit;
      }
      return null;
    }
    case 'WRITE': {
      const m = /^(\S+)\s+(".*)$/.exec(body);
      const s = m && readString(m[2]);
      if (!s || s.rest !== '') return { message: 'expected WRITE <path> "<description>"' };
      if (s.value.trim() === '') return { message: 'empty description' };
      ins.path = m[1];
      ins.description = s.value;
      return null;
    }
    case 'ADD': {
      const m = /^1\s+to\s+(\S+)$/.exec(body);
      const c = m && COUNTER.exec(m[1]);
      if (!c) return { message: 'expected ADD 1 to <counter>' };
      ins.counter = c[1];
      return null;
    }
    case 'CALL':
      if (!/^\S+$/.test(body)) return { message: 'expected CALL <relative-path.md>' };
      ins.path = body;
      return null;
    case 'END':
      if (body !== '') return { message: 'END takes no operand' };
      return null;
  }
  return null;
}
