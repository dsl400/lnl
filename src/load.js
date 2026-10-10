import { readFileSync, realpathSync } from 'node:fs';
import path from 'node:path';
import { CODES, diag } from './diagnostics.js';
import { parse } from './parse.js';
import { buildFlow } from './flow.js';

// Loads the entry file and the transitive closure of its calls (engine.md, Subflows).
// Each file is read once; `sources` (Map realpath -> text) replaces the disk text of
// a file, so the editor can lint an unsaved document.
// Returns { root, entry, files: Map<realpath, flow>, order: [realpath], diagnostics }.
export function load(entryPath, root = process.cwd(), sources = new Map()) {
  const diagnostics = [];
  const files = new Map();
  const order = [];
  let rootReal;
  try {
    rootReal = realpathSync(root);
  } catch {
    diagnostics.push(diag(CODES.FILE_ACCESS, root, 1, 1, 'cannot resolve the project root'));
    return { root, entry: null, files, order, diagnostics };
  }

  const read = (real, shown) => {
    let source = sources.get(real);
    try {
      source ??= readFileSync(real, 'utf8');
    } catch (e) {
      diagnostics.push(diag(CODES.FILE_ACCESS, shown, 1, 1, `cannot read file: ${e.code ?? e.message}`));
      return null;
    }
    const program = parse(source, shown);
    program.real = real;
    const flow = buildFlow(program);
    diagnostics.push(...program.diagnostics, ...flow.diagnostics);
    return flow;
  };

  const visit = (real, shown, stack) => {
    if (files.has(real)) return;
    const flow = read(real, shown);
    if (!flow) return;
    files.set(real, flow);
    order.push(real);
    for (const ins of flow.program.instructions) {
      if (ins.op !== 'CALL') continue;
      const resolved = resolveCall(ins, real, rootReal, diagnostics);
      if (!resolved) continue;
      ins.resolved = resolved;
      if (stack.includes(resolved)) {
        diagnostics.push(diag(CODES.RECURSIVE_CALL, ins.file, ins.line, ins.column, `recursive CALL of ${ins.path}`));
        continue;
      }
      visit(resolved, path.relative(rootReal, resolved), [...stack, resolved]);
    }
  };

  let entryReal;
  try {
    entryReal = realpathSync(entryPath);
  } catch (e) {
    diagnostics.push(diag(CODES.FILE_ACCESS, entryPath, 1, 1, `cannot read file: ${e.code ?? e.message}`));
    return { root: rootReal, entry: null, files, order, diagnostics };
  }
  visit(entryReal, entryPath, [entryReal]);
  return { root: rootReal, entry: entryReal, files, order, diagnostics };
}

function resolveCall(ins, callerReal, rootReal, diagnostics) {
  const where = [ins.file, ins.line, ins.column];
  if (path.isAbsolute(ins.path) || !ins.path.endsWith('.md') || !/^\.\.?\//.test(ins.path)) {
    diagnostics.push(diag(CODES.CALL_PATH, ...where, `CALL needs a relative path to a .md file, such as ./flow.md; got ${ins.path}`));
    return null;
  }
  let real;
  try {
    real = realpathSync(path.resolve(path.dirname(callerReal), ins.path));
  } catch {
    diagnostics.push(diag(CODES.CALL_MISSING, ...where, `CALL target ${ins.path} does not exist`));
    return null;
  }
  if (real !== rootReal && !real.startsWith(rootReal + path.sep)) {
    diagnostics.push(diag(CODES.CALL_OUTSIDE_ROOT, ...where, `CALL target ${ins.path} is outside the project root`));
    return null;
  }
  return real;
}
