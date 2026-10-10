import { CODES, diag } from './diagnostics.js';

// The one interpretation of a parsed file that lint and graph share
// (engine.md, Graph).
//
// Nodes are instruction indices. A conditional JUMP is folded into its ASK;
// a conditional STOP stays a node reached from its ASK. Edges:
//   { from, to, label, implicit, stop }
// `to === instructions.length` means control leaves the file without END.
// `stop` edges enter REVIEW in stop mode.
export function buildFlow(program) {
  const { file, instructions: ins, labels } = program;
  const diagnostics = [];
  const n = ins.length;

  const labelAt = new Map();
  const labelIndex = new Map();
  for (const l of labels) {
    if (labelIndex.has(l.name)) {
      diagnostics.push(diag(CODES.DUPLICATE_LABEL, file, l.line, l.column, `duplicate label ${l.name}`));
      continue;
    }
    labelIndex.set(l.name, l.index);
    if (!labelAt.has(l.index)) labelAt.set(l.index, []);
    labelAt.get(l.index).push(l.name);
  }
  if (!labelIndex.has('START')) diagnostics.push(diag(CODES.MISSING_START, file, 1, 1, 'missing START label'));
  const stop = ins.find((i) => i.op === 'STOP');
  if (stop) {
    for (const name of ['REVIEW', 'REPLY']) {
      if (!labelIndex.has(name)) {
        diagnostics.push(diag(CODES.MISSING_REVIEW_REPLY, file, stop.line, stop.column, `a file with STOP must declare ${name}`));
      }
    }
  }

  // ASK groups: an ASK and the yes/no branches right after it, with no label between.
  const branchOf = new Map(); // branch index -> ASK index
  const groups = new Map(); // ASK index -> { branches, after }
  for (let i = 0; i < n; i++) {
    if (ins[i].op !== 'ASK') continue;
    const branches = [];
    let j = i + 1;
    while (j < n && !labelAt.has(j) && ins[j].answer) {
      const dup = branches.find((b) => ins[b].answer === ins[j].answer);
      if (dup !== undefined) {
        diagnostics.push(diag(CODES.DUPLICATE_BRANCH, file, ins[j].line, ins[j].column, `second branch for answer ${ins[j].answer}`));
      }
      branches.push(j);
      branchOf.set(j, i);
      j++;
    }
    if (branches.length === 0) {
      diagnostics.push(diag(CODES.ASK_WITHOUT_BRANCH, file, ins[i].line, ins[i].column, 'ASK must be followed by JUMP or STOP with IF yes|no'));
    }
    groups.set(i, { branches, after: j });
  }
  for (let i = 0; i < n; i++) {
    if (ins[i].answer && !branchOf.has(i)) {
      diagnostics.push(diag(CODES.BRANCH_WITHOUT_ASK, file, ins[i].line, ins[i].column, `IF ${ins[i].answer} without an ASK in the same group`));
    }
  }

  const target = (i, name) => {
    if (labelIndex.has(name)) return labelIndex.get(name);
    diagnostics.push(diag(CODES.MISSING_TARGET, file, ins[i].line, ins[i].column, `label ${name} does not exist`));
    return null;
  };
  const review = labelIndex.get('REVIEW') ?? null;

  const nodes = [];
  const edges = [];
  const add = (from, to, label = '', extra = {}) => {
    if (to !== null) edges.push({ from, to, label, implicit: false, stop: false, ...extra });
  };
  for (let i = 0; i < n; i++) {
    const x = ins[i];
    if (x.op === 'JUMP' && branchOf.has(i)) continue;
    if (x.answer && !branchOf.has(i)) continue;
    nodes.push(i);
    switch (x.op) {
      case 'ASK': {
        const { branches, after } = groups.get(i);
        for (const answer of ['yes', 'no']) {
          const b = branches.find((k) => ins[k].answer === answer);
          if (b === undefined) add(i, after, answer, { implicit: true });
          else if (ins[b].op === 'JUMP') add(i, target(b, ins[b].target), answer);
          else add(i, b, answer);
        }
        break;
      }
      case 'JUMP':
        add(i, target(i, x.target));
        break;
      case 'STOP':
        if (x.counter) add(i, i + 1, `<${x.counter}> < ${x.limit}`, { implicit: true });
        add(i, review, x.counter ? `<${x.counter}> >= ${x.limit}` : 'stop', { stop: true });
        break;
      case 'END':
        break;
      default:
        add(i, i + 1);
    }
  }

  return { program, nodes, edges, labelIndex, labelAt, groups, diagnostics, start: labelIndex.get('START') ?? null };
}
