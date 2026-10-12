import path from 'node:path';
import { splitLines } from './parse.js';

// Builds the diagram model of a linted closure (engine.md, Graph):
// one node per instruction, one cluster per file, JUMPs folded into edges.
export function model(closure) {
  const clusters = [];
  const nodes = [];
  const edges = [];
  const fileId = new Map(closure.order.map((real, k) => [real, `f${k}`]));
  const id = (real, i) => `${fileId.get(real)}_i${i}`;
  const humanId = 'halt';
  let anyStop = false;
  const returned = new Set(); // ids of CALL nodes whose continuation the return edges draw

  for (const real of closure.order) {
    const flow = closure.files.get(real);
    const ins = flow.program.instructions;
    const cluster = { id: fileId.get(real), title: path.relative(closure.root, real) || path.basename(real), nodes: [] };
    clusters.push(cluster);
    const hasStop = ins.some((x) => x.op === 'STOP');
    anyStop ||= hasStop;
    for (const i of flow.nodes) {
      const x = ins[i];
      const labels = flow.labelAt.get(i) ?? [];
      const node = { id: id(real, i), shape: shapeOf(x.op), text: [...labels.map((l) => `${l}:`), render(x)].join('\n') };
      cluster.nodes.push(node);
      nodes.push(node);
      if (x.op === 'CALL') {
        const callee = closure.files.get(x.resolved);
        edges.push({ from: node.id, to: id(x.resolved, callee.start), label: 'call', style: 'solid' });
        for (const j of callee.nodes) {
          if (callee.program.instructions[j].op === 'END') {
            edges.push({ from: id(x.resolved, j), to: id(real, i + 1), label: 'return', style: 'dotted' });
            returned.add(i);
          }
        }
      }
      if (x.op === 'END' && hasStop) edges.push({ from: node.id, to: humanId, label: 'after STOP', style: 'dotted' });
    }
    for (const e of flow.edges) {
      // The subflow is not optional (engine.md, Subflows): its return edges replace the local CALL->next edge.
      if (returned.has(e.from) && e.to === e.from + 1) continue;
      const guard = flow.guards.get(`${e.from}->${e.to}`);
      const label = [e.label, guard && `back edge ${[...guard].sort().join(', ')}`].filter(Boolean).join('; ');
      edges.push({ from: id(real, e.from), to: id(real, e.to), label, style: e.stop ? 'thick' : e.implicit ? 'dotted' : 'solid' });
    }
  }
  if (anyStop) nodes.push({ id: humanId, shape: 'hexagon', text: 'waiting_human' });
  return { clusters, nodes, edges, humanId: anyStop ? humanId : null };
}

function shapeOf(op) {
  if (op === 'ASK') return 'diamond';
  if (op === 'END') return 'terminal';
  if (op === 'CALL') return 'subroutine';
  return 'box';
}

function render(x) {
  switch (x.op) {
    case 'ASK':
    case 'DO':
    case 'CHECK':
    case 'SAY':
      return `${x.op} ${x.text}`;
    case 'JUMP':
      return `JUMP ${x.target}`;
    case 'WRITE':
      return `WRITE ${x.path} "${x.description}"`;
    case 'ADD':
      return `ADD 1 to <${x.counter}>`;
    case 'STOP':
      return `STOP ${x.text} IF ${x.counter ? `<${x.counter}> >= ${x.limit}` : x.answer}`;
    case 'CALL':
      return `CALL ${x.path}`;
    default:
      return x.op;
  }
}

const mermaidText = (s) => s.replace(/&/g, '#amp;').replace(/"/g, '#quot;').replace(/</g, '#lt;').replace(/>/g, '#gt;').replace(/\|/g, '#124;').replace(/`/g, "'").replace(/\n/g, '<br/>');

export function toMermaid(m) {
  const shape = { diamond: ['{', '}'], terminal: ['([', '])'], subroutine: ['[[', ']]'], box: ['[', ']'], hexagon: ['{{', '}}'] };
  const node = (n) => {
    const [a, b] = shape[n.shape];
    return `${n.id}${a}"${mermaidText(n.text)}"${b}`;
  };
  const arrow = { solid: '-->', dotted: '-.->', thick: '==>' };
  const lines = ['flowchart TD'];
  for (const c of m.clusters) {
    lines.push(`  subgraph ${c.id}["${mermaidText(c.title)}"]`);
    for (const n of c.nodes) lines.push(`    ${node(n)}`);
    lines.push('  end');
  }
  if (m.humanId) lines.push(`  ${node(m.nodes.find((n) => n.id === m.humanId))}`);
  for (const e of m.edges) {
    lines.push(`  ${e.from} ${arrow[e.style]}${e.label ? `|"${mermaidText(e.label)}"|` : ''} ${e.to}`);
  }
  return lines.join('\n') + '\n';
}

const dotText = (s) => s.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n');

export function toDot(m) {
  const shape = { diamond: 'diamond', terminal: 'oval', subroutine: 'box3d', box: 'box', hexagon: 'hexagon' };
  const style = { solid: 'solid', dotted: 'dashed', thick: 'bold' };
  const lines = ['digraph lnl {', '  node [fontname="monospace"];'];
  const node = (n) => `"${n.id}" [shape=${shape[n.shape]}, label="${dotText(n.text)}"];`;
  for (const c of m.clusters) {
    lines.push(`  subgraph "cluster_${c.id}" {`, `    label="${dotText(c.title)}";`);
    for (const n of c.nodes) lines.push(`    ${node(n)}`);
    lines.push('  }');
  }
  if (m.humanId) lines.push(`  ${node(m.nodes.find((n) => n.id === m.humanId))}`);
  for (const e of m.edges) {
    lines.push(`  "${e.from}" -> "${e.to}" [style=${style[e.style]}${e.label ? `, label="${dotText(e.label)}"` : ''}];`);
  }
  lines.push('}');
  return lines.join('\n') + '\n';
}

// The block view (engine.md, Visual editor): one node per basic block of the flow graph
// (Aho et al., Compilers, §8.4 "Basic Blocks and Flow Graphs"). A block is a run of
// instructions entered only at its head and left only at its tail; an ASK is its own
// block. A STOP with a counter stays in its block as a line; a STOP after an ASK is a stub.
const cut = (s, n) => (s.length > n ? s.slice(0, n - 1).trimEnd() + '…' : s);
const wrapText = (s, n = 32) =>
  s.split(' ').reduce((a, w) => {
    const l = a[a.length - 1];
    if (l !== undefined && (l + ' ' + w).length <= n) a[a.length - 1] = l + ' ' + w;
    else a.push(w);
    return a;
  }, []).join('\n');

export function toBlockMermaid(closure) {
  const out = ['flowchart TD', '  classDef stop fill:#fdd,stroke:#c00,color:#900', '  classDef human fill:#ffd,stroke:#a80', '  classDef label fill:#eef,stroke:#669'];
  let human = false;
  const multi = closure.order.length > 1;
  closure.order.forEach((real, f) => {
    const flow = closure.files.get(real);
    const ins = flow.program.instructions;
    const id = (i) => `f${f}_${i}`;
    const loose = (e) => !e.stop;
    const succ = new Map();
    const preds = new Map();
    for (const e of flow.edges.filter(loose)) {
      if (!succ.has(e.from)) succ.set(e.from, []);
      succ.get(e.from).push(e);
      preds.set(e.to, (preds.get(e.to) ?? 0) + 1);
    }
    const stub = (i) => ins[i]?.op === 'STOP' && !ins[i].counter;
    const plain = (i) => i < ins.length && ins[i].op !== 'ASK' && !stub(i);
    const head = new Map();
    const blocks = [];
    for (const i of flow.nodes) {
      if (head.has(i)) continue;
      const members = [i];
      head.set(i, i);
      let j = i;
      while (plain(j) && ins[j].op !== 'END' && ins[j].op !== 'JUMP' && ins[j].op !== 'CALL') {
        const s = succ.get(j) ?? [];
        if (s.length !== 1) break;
        const k = s[0].to;
        if (!plain(k) || flow.labelAt.has(k) || preds.get(k) !== 1 || head.has(k)) break;
        members.push(k);
        head.set(k, i);
        j = k;
      }
      blocks.push(members);
    }
    // A block of bare JUMPs draws nothing: edges into it go to where it leads.
    const empty = new Set(blocks.filter((m) => !flow.labelAt.has(m[0]) && m.every((k) => ins[k].op === 'JUMP')).map((m) => m[0]));
    const through = (i) => {
      const seen = new Set();
      while (empty.has(i) && !seen.has(i)) {
        seen.add(i);
        i = succ.get(i)?.[0]?.to ?? i;
      }
      return i;
    };
    if (multi) out.push(`  subgraph f${f}["${mermaidText(path.relative(closure.root, real) || path.basename(real))}"]`);
    for (const m of blocks) {
      if (empty.has(m[0])) continue;
      const x = ins[m[0]];
      const label = (flow.labelAt.get(m[0]) ?? []).join(' ');
      if (x.op === 'ASK') {
        out.push(`  ${id(m[0])}{"${mermaidText((label ? `${label}: ` : '') + wrapText(x.text))}"}`);
        continue;
      }
      if (stub(m[0])) {
        out.push(`  ${id(m[0])}(("STOP")):::stop`);
        continue;
      }
      const lines = [];
      for (const k of m) {
        const y = ins[k];
        if (y.op === 'JUMP') continue;
        const last = lines[lines.length - 1];
        if (y.op === 'CHECK' && last?.op === 'CHECK') last.n++;
        else lines.push({ op: y.op, n: 1, text: y.op === 'STOP' ? `■ STOP <${y.counter}> >= ${y.limit}` : short(y) });
      }
      const body = lines.map((l) => (l.op === 'CHECK' && l.n > 1 ? `${l.n}× CHECK` : wrapText(l.text, 40))).join('\n');
      const text = [label, body].filter(Boolean).join('\n');
      out.push(`  ${id(m[0])}[["${mermaidText(text)}"]]`.replace('[["', x.op === 'CALL' ? '[["' : '["').replace(']]', x.op === 'CALL' ? ']]' : ']'));
      if (label) out.push(`  class ${id(m[0])} label`);
    }
    for (const e of flow.edges.filter(loose)) {
      if (head.get(e.to) !== e.to || empty.has(head.get(e.from))) continue;
      if (e.to >= ins.length) continue;
      const from = head.get(e.from);
      if (ins[from].op !== 'ASK' && e.from !== blocks.find((m) => m[0] === from).at(-1)) continue;
      const to = through(e.to);
      const back = to <= e.from;
      const guard = flow.guards?.get(`${e.from}->${e.to}`);
      const lab = [ins[from].op === 'ASK' ? e.label : '', back && 'back', guard && [...guard].sort().join(', ')].filter(Boolean).join(' · ');
      out.push(`  ${id(from)} ${back ? '-.->' : '-->'}${lab ? `|"${mermaidText(lab)}"|` : ''} ${id(to)}`);
    }
    for (const x of ins) {
      if (x.op !== 'CALL' || !x.resolved) continue;
      const g = closure.order.indexOf(x.resolved);
      const callee = closure.files.get(x.resolved);
      out.push(`  ${id(ins.indexOf(x))} -->|call| f${g}_${callee.start}`);
    }
    if (multi) out.push('  end');
    if (ins.some((x) => x.op === 'STOP')) {
      human = true;
      for (const i of flow.nodes) if (ins[i].op === 'END') out.push(`  ${id(head.get(i))} -.->|after STOP| halt`);
    }
  });
  if (human) out.push('  halt{{"waiting_human"}}:::human');
  return out.join('\n') + '\n';
}

function short(x) {
  switch (x.op) {
    case 'ADD':
      return `ADD 1 to <${x.counter}>`;
    case 'WRITE':
      return `WRITE ${x.path}`;
    case 'CALL':
      return `CALL ${x.path}`;
    case 'END':
      return 'END';
    default:
      return `${x.op} ${cut(x.text ?? '', 120)}`;
  }
}

// The listing view (engine.md, Visual editor): per file, the rows of the lnl block as
// written and its jumps, as the jump column of a disassembler draws them. Each jump gets
// a lane; jumps whose row spans overlap get different lanes, shortest first (greedy
// interval colouring), so short jumps sit next to the text.
export function listing(closure) {
  return closure.order.map((real) => {
    const flow = closure.files.get(real);
    const { instructions: ins, labels, source } = flow.program;
    const text = splitLines(source);
    const lines = [...new Set([...labels.map((l) => l.line), ...ins.map((x) => x.line)])].sort((a, b) => a - b);
    const row = new Map(lines.map((l, k) => [l, k]));
    const labelLine = new Map(labels.map((l) => [l.name, l.line]));
    const jumps = [];
    for (const x of ins) {
      const to = x.op === 'JUMP' ? x.target : x.op === 'STOP' ? 'REVIEW' : null;
      if (!to || !labelLine.has(to)) continue;
      const from = row.get(x.line);
      const target = row.get(labelLine.get(to));
      jumps.push({ from, to: target, label: to, stop: x.op === 'STOP', back: target <= from });
    }
    const lanes = [];
    // STOP jumps take the outer lanes: the view hides them by default.
    for (const j of [...jumps].sort((a, b) => a.stop - b.stop || Math.abs(a.from - a.to) - Math.abs(b.from - b.to) || a.from - b.from)) {
      const lo = Math.min(j.from, j.to);
      const hi = Math.max(j.from, j.to);
      let k = 0;
      while (lanes[k]?.some(([a, b]) => !(hi < a || lo > b))) k++;
      (lanes[k] ??= []).push([lo, hi]);
      j.lane = k;
    }
    return {
      file: path.relative(closure.root, real) || path.basename(real),
      rows: lines.map((l) => ({ line: l, text: text[l - 1], label: labels.find((x) => x.line === l)?.name ?? null })),
      jumps,
    };
  });
}
