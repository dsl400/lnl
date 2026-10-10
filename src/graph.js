import path from 'node:path';

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

const mermaidText = (s) => s.replace(/&/g, '#amp;').replace(/"/g, '#quot;').replace(/</g, '#lt;').replace(/>/g, '#gt;').replace(/\|/g, '#124;').replace(/\n/g, '<br/>');

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
