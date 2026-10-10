import { createHash } from 'node:crypto';
import { splitLines, locateBlock, parseRow } from './parse.js';

// The editable document of a Markdown file (engine.md, Visual editor): the rows of
// its `lnl` block, and the text around the block that the editor never changes.
// `rows` are the block lines without their line ending; `blockStart` is the
// one-based Markdown line of the first row, so a diagnostic at line L is row L - blockStart.
export function openDocument(text) {
  const lines = splitLines(text);
  const block = locateBlock(lines);
  if (block.error) return { error: block.error, line: block.line, rows: [], blockStart: 1, digest: digestOf(text) };
  return { rows: lines.slice(block.open + 1, block.close), blockStart: block.open + 2, digest: digestOf(text) };
}

// Returns `text` with the rows of its block replaced; the bytes outside the block are
// kept as they are. A row that is unchanged at its position keeps its own line ending,
// so an unchanged block stays byte-identical (engine.md, Visual editor); a new or
// changed row takes the line ending of the opening fence.
export function replaceBlock(text, rows) {
  const raw = text.split('\n');
  const block = locateBlock(splitLines(text));
  if (block.error) throw new Error(block.error);
  const endingOf = (line) => (line.endsWith('\r') ? '\r\n' : '\n');
  const fenceEol = endingOf(raw[block.open]);
  const eol = (k) => {
    const old = raw[block.open + 1 + k];
    if (old === undefined || block.open + 1 + k >= block.close) return fenceEol;
    return (old.endsWith('\r') ? old.slice(0, -1) : old) === rows[k] ? endingOf(old) : fenceEol;
  };
  const before = raw.slice(0, block.open + 1).join('\n') + '\n';
  const after = raw.slice(block.close).join('\n');
  return before + rows.map((r, k) => r + eol(k)).join('') + after;
}

export const digestOf = (text) => createHash('sha256').update(text).digest('hex');

// Splits the rows of a block into sections for the editor (engine.md, Visual editor):
// the rows before the first label, then one section per label with its raw label row
// and the raw rows under it. Rows are kept as written, so the sections concatenate back
// to the input: header, then for each section its row and its rows.
export function toSections(rows) {
  const sections = [];
  let header = [];
  let current = null;
  for (const raw of rows) {
    const r = parseRow(raw);
    if (r.kind === 'label') {
      current = { label: r.name, row: raw, rows: [] };
      sections.push(current);
    } else if (current) current.rows.push(raw);
    else header.push(raw);
  }
  return { header, sections };
}
