import { CODES, diag, compareDiagnostics } from './diagnostics.js';
import { load } from './load.js';

const STOP_MODE_OPS = new Set(['ASK', 'CHECK', 'JUMP', 'SAY', 'END']);
const MAX_CYCLES = 10000;

// Lints the entry file and the closure of its calls (engine.md, Lint).
// Returns the loaded closure with `diagnostics` sorted and `guards`:
// per file, a Map "from->to" of back edges to the counters that bound them.
// `sources` replaces the disk text of files, as in load().
export function lint(entryPath, root, sources) {
  const closure = load(entryPath, root, sources);
  for (const real of closure.order) {
    const flow = closure.files.get(real);
    flow.guards = new Map();
    // The analyses below assume a well-formed file; skipping them avoids cascades.
    if (flow.program.diagnostics.length === 0 && flow.diagnostics.length === 0) closure.diagnostics.push(...analyse(flow));
  }
  closure.diagnostics.sort(compareDiagnostics);
  closure.ok = !closure.diagnostics.some((d) => d.severity === 'error');
  return closure;
}

function analyse(flow) {
  const { program, nodes, edges, start, labelIndex } = flow;
  const { file, instructions: ins, labels } = program;
  const out = [];
  if (start === null) return out;
  const n = ins.length;
  if (start === n) {
    // START designates the position after the last instruction (engine.md, Branches and traversal).
    const l = labels.find((x) => x.name === 'START');
    out.push(diag(CODES.FALLS_OFF_END, file, l.line, l.column, 'control leaves the file without END'));
    return out;
  }
  const at = (i, code, message) => {
    const x = ins[i] ?? ins[n - 1] ?? { line: 1, column: 1 };
    out.push(diag(code, file, x.line, x.column, message));
  };

  const succ = new Map(nodes.map((i) => [i, []]));
  for (const e of edges) succ.get(e.from).push(e);

  // Reachability from START, over every edge.
  const reached = new Set([start]);
  const queue = [start];
  while (queue.length) {
    const i = queue.shift();
    if (i === n) continue;
    for (const e of succ.get(i) ?? []) {
      if (!reached.has(e.to)) {
        reached.add(e.to);
        queue.push(e.to);
      }
    }
  }
  for (const l of labels) {
    if (!reached.has(l.index) && labelIndex.get(l.name) === l.index) {
      out.push(diag(CODES.UNREACHABLE_LABEL, file, l.line, l.column, `label ${l.name} is unreachable`));
    }
  }
  for (const e of edges) {
    if (e.to === n && reached.has(e.from)) at(e.from, CODES.FALLS_OFF_END, 'control leaves the file without END');
  }

  // Each reachable node must reach END; a stop edge leads to REVIEW, then REPLY and END.
  const pred = new Map();
  for (const e of edges) {
    if (!pred.has(e.to)) pred.set(e.to, []);
    pred.get(e.to).push(e.from);
  }
  const ends = nodes.filter((i) => ins[i].op === 'END');
  const coreached = new Set(ends);
  const back = [...ends];
  while (back.length) {
    for (const p of pred.get(back.pop()) ?? []) {
      if (!coreached.has(p)) {
        coreached.add(p);
        back.push(p);
      }
    }
  }
  for (const i of nodes) {
    if (reached.has(i) && !coreached.has(i)) at(i, CODES.NO_PATH_TO_END, `no path from ${ins[i].op} to END`);
  }

  // A counter has a single numeric limit in the file.
  const limits = new Map();
  for (let i = 0; i < n; i++) {
    const x = ins[i];
    if (x.op !== 'STOP' || !x.counter) continue;
    if (limits.has(x.counter)) at(i, CODES.DUPLICATE_LIMIT, `counter <${x.counter}> already has a limit`);
    else limits.set(x.counter, i);
  }

  // Each simple cycle, without stop edges, must pass an ADD and the limit STOP of one counter.
  const loopEdges = edges.filter((e) => !e.stop && e.to !== n);
  const cycles = simpleCycles(nodes, loopEdges, MAX_CYCLES);
  if (cycles === null) {
    at(start, CODES.TOO_MANY_CYCLES, `more than ${MAX_CYCLES} simple cycles; split the flow`);
  } else {
    for (const cycle of cycles) {
      const inCycle = new Set(cycle);
      const counter = [...limits.keys()].find(
        (c) => inCycle.has(limits.get(c)) && cycle.some((i) => ins[i].op === 'ADD' && ins[i].counter === c),
      );
      if (counter === undefined) {
        const first = Math.min(...cycle);
        at(first, CODES.UNCONTROLLED_CYCLE, `uncontrolled cycle through ${describe(flow, cycle)}: it needs ADD 1 to <c> and STOP ... IF <c> >= n on each repetition`);
        continue;
      }
      for (let k = 0; k < cycle.length; k++) {
        const from = cycle[k];
        const to = cycle[(k + 1) % cycle.length];
        if (to > from) continue;
        const key = `${from}->${to}`;
        if (!flow.guards.has(key)) flow.guards.set(key, new Set());
        flow.guards.get(key).add(`<${counter}> >= ${ins[limits.get(counter)].limit}`);
      }
    }
  }

  // From REVIEW, a path through REPLY to END that uses only stop-mode instructions, without cycles.
  if (ins.some((x) => x.op === 'STOP') && labelIndex.has('REVIEW') && labelIndex.has('REPLY')) {
    const review = labelIndex.get('REVIEW');
    const reply = labelIndex.get('REPLY');
    const allowed = (i) => i < n && STOP_MODE_OPS.has(ins[i].op) && !ins[i].answer;
    const onPath = new Set();
    const search = (i, sawReply) => {
      if (!allowed(i) || onPath.has(i)) return false;
      sawReply ||= i === reply;
      if (ins[i].op === 'END') return sawReply;
      onPath.add(i);
      const found = (succ.get(i) ?? []).some((e) => !e.stop && search(e.to, sawReply));
      onPath.delete(i);
      return found;
    };
    if (!search(review, false)) {
      const l = labels.find((x) => x.name === 'REVIEW');
      out.push(diag(CODES.NO_STOP_MODE_PATH, file, l.line, l.column, 'no path from REVIEW through REPLY to END that uses only ASK, CHECK, JUMP, SAY, and END'));
    }
  }
  return out;
}

function describe(flow, cycle) {
  const names = [];
  for (const i of [...cycle].sort((a, b) => a - b)) for (const name of flow.labelAt.get(i) ?? []) names.push(name);
  return names.length ? names.join(', ') : `line ${flow.program.instructions[Math.min(...cycle)].line}`;
}

// Enumerates the simple cycles of a directed graph; returns null past `max` cycles.
// Johnson's algorithm (SIAM J. Comput. 4(1), 1975): circuits are searched inside one
// strongly connected component at a time, from its smallest node, with a blocked set
// that is released only on a found circuit, so the work is O((n + e)(c + 1)) and an
// acyclic graph costs one SCC pass. Each cycle is listed once, from its smallest node.
function simpleCycles(nodes, edges, max) {
  const succ = new Map(nodes.map((i) => [i, new Set()]));
  for (const e of edges) succ.get(e.from)?.add(e.to);
  const cycles = [];
  const parts = [new Set(nodes)];
  while (parts.length) {
    const part = parts.shift();
    for (const scc of stronglyConnected(part, succ)) {
      const s = Math.min(...scc);
      if (scc.length === 1 && !succ.get(s).has(s)) continue;
      const inScc = new Set(scc);
      const blocked = new Set();
      const unblockers = new Map(scc.map((v) => [v, new Set()]));
      const path = [];
      let overflow = false;
      const unblock = (u) => {
        blocked.delete(u);
        const ws = [...unblockers.get(u)];
        unblockers.get(u).clear();
        for (const w of ws) if (blocked.has(w)) unblock(w);
      };
      const circuit = (v) => {
        let found = false;
        path.push(v);
        blocked.add(v);
        for (const w of succ.get(v)) {
          if (!inScc.has(w)) continue;
          if (w === s) {
            cycles.push([...path]);
            found = true;
            if (cycles.length > max) overflow = true;
          } else if (!blocked.has(w) && circuit(w)) found = true;
          if (overflow) return true;
        }
        if (found) unblock(v);
        else for (const w of succ.get(v)) if (inScc.has(w)) unblockers.get(w).add(v);
        path.pop();
        return found;
      };
      circuit(s);
      if (overflow) return null;
      inScc.delete(s);
      if (inScc.size) parts.push(inScc);
    }
  }
  return cycles;
}

// Tarjan's strongly connected components (SIAM J. Comput. 1(2), 1972) of the subgraph
// induced by `part`; components come out in a deterministic order.
function stronglyConnected(part, succ) {
  let counter = 0;
  const index = new Map();
  const low = new Map();
  const stack = [];
  const onStack = new Set();
  const out = [];
  const strong = (v) => {
    index.set(v, counter);
    low.set(v, counter++);
    stack.push(v);
    onStack.add(v);
    for (const w of succ.get(v)) {
      if (!part.has(w)) continue;
      if (!index.has(w)) {
        strong(w);
        low.set(v, Math.min(low.get(v), low.get(w)));
      } else if (onStack.has(w)) low.set(v, Math.min(low.get(v), index.get(w)));
    }
    if (low.get(v) === index.get(v)) {
      const scc = [];
      let w;
      do {
        w = stack.pop();
        onStack.delete(w);
        scc.push(w);
      } while (w !== v);
      out.push(scc);
    }
  };
  for (const v of [...part].sort((a, b) => a - b)) if (!index.has(v)) strong(v);
  return out;
}
