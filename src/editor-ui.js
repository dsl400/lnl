// The page of `lnl edit`: a Rete.js 2 node canvas (docs/tmp.md D5) with one node per
// label of the lnl block. The node holds the rows of its label in a text area; its
// output sockets are the JUMP rows, the STOP rows (to REVIEW), and the fall-through
// to the next label; the wires are the targets. The text stays the source of truth
// (engine.md, Purpose and scope): a wire dragged from a JUMP output to a node rewrites
// the target of that JUMP row. Lint diagnostics are shown in the node of their row.
// The libraries load from esm.sh without a build, so the bundle stays one file
// (docs/tmp.md D4): rete, rete-area-plugin, rete-connection-plugin, rete-react-plugin
// with React 18, and @dagrejs/dagre for the layout (the file keeps no positions).
// The server splits the rows into sections (src/document.js toSections); the page joins
// them back, so an unchanged document saves byte for byte.
const ESM = 'https://esm.sh';
const REACT = 'react@18.3.1';
const DEPS = `?deps=${REACT},react-dom@18.3.1`;

export const PAGE = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>lnl edit</title>
<style>
  body { font: 14px/1.4 system-ui, sans-serif; margin: 0; display: grid; grid-template-rows: auto 1fr; height: 100vh; }
  header { display: flex; gap: .6rem; align-items: center; padding: .4rem 1rem; border-bottom: 1px solid #ddd; }
  header .file { font-family: monospace; flex: 1; }
  main { display: grid; grid-template-columns: 1fr 22rem; overflow: hidden; }
  #rete { height: 100%; background: #f4f4f6; }
  aside { overflow: auto; padding: .5rem 1rem; border-left: 1px solid #ddd; font-size: 13px; }
  aside h3 { margin: .8rem 0 .3rem; font-size: 13px; }
  #problems { color: #c00; font-family: monospace; font-size: 12px; white-space: pre-wrap; }
  #header-rows { width: 100%; box-sizing: border-box; font: 12px/1.4 monospace; min-height: 6em; }
  #conflict { background: #fff3cd; border: 1px solid #e0c060; padding: .5rem; margin: .5rem 0; }
  [hidden] { display: none !important; }
  .dirty { color: #a60; }
  .lnl-body { display: grid; gap: 4px; padding: 2px 0; }
  .lnl-body .head { display: flex; gap: 4px; align-items: center; }
  .lnl-body .head input { flex: 1; font: bold 13px monospace; padding: 2px 4px; border: 1px solid #aaa; border-radius: 4px; min-width: 0; }
  .lnl-body .head button { font-size: 11px; padding: 0 5px; }
  .lnl-body textarea { width: 100%; box-sizing: border-box; font: 12px/1.35 monospace; border: 1px solid #aaa; border-radius: 4px; padding: 4px; resize: vertical; white-space: pre; overflow-wrap: normal; overflow-x: auto; }
  .lnl-body .errors { color: #fff; background: #c33; border-radius: 4px; padding: 2px 6px; font: 11px/1.3 monospace; white-space: pre-wrap; }
</style>
</head>
<body>
<header>
  <span class="file" id="file"></span>
  <span id="status"></span>
  <button id="add">+ label</button>
  <button id="arrange">Arrange</button>
  <button id="reload">Reload</button>
  <button id="save">Save</button>
</header>
<main>
  <div id="rete"></div>
  <aside>
    <div id="conflict" hidden>
      The file changed on disk since it was opened.
      <button id="take-disk">Load the disk version</button>
      <button id="keep-mine">Keep mine and save over it</button>
    </div>
    <h3>Problems</h3>
    <div id="problems">none</div>
    <h3>Rows before the first label</h3>
    <textarea id="header-rows" spellcheck="false"></textarea>
    <h3>How to</h3>
    <p>Each node is a label with its rows. Edit the rows in the node. Drag a wire from a JUMP output onto a node to change the target of that JUMP. The "next" wire is the fall-through to the label that follows in the file: use ↑ ↓ to reorder. Ctrl+S saves.</p>
  </aside>
</main>
<script type="module">
const React = (await import('${ESM}/${REACT}')).default;
const { createRoot } = await import('${ESM}/react-dom@18.3.1/client');
const { NodeEditor, ClassicPreset } = await import('${ESM}/rete@2.0.6');
const { AreaPlugin, AreaExtensions } = await import('${ESM}/rete-area-plugin@2.3.2');
const { ConnectionPlugin, Presets: ConnectionPresets } = await import('${ESM}/rete-connection-plugin@2.0.5');
const { ReactPlugin, Presets } = await import('${ESM}/rete-react-plugin@2.1.2${DEPS}');
const dagre = (await import('${ESM}/@dagrejs/dagre@1.1.4')).default;
const h = React.createElement;
const $ = (id) => document.getElementById(id);

const state = { file: '', rows: [], header: [], blockStart: 1, digest: '', dirty: false, disk: null, nodes: [], loading: false, rowOwner: [], rev: 0 };
// state.rev counts the local edits; a save acknowledges the revision it sent, not a later one.
// state.nodes: [{ node, section: { label, row, rows }, control }] in file order.

// Rows the picture derives its wires from (engine.md, Instructions). Lint is the authority:
// these patterns only draw the sockets.
// JUMP captures the opcode prefix, the target, and the suffix, so a rewrite touches only the target.
const JUMP = /^(\\s*JUMP\\s+)([A-Z][A-Z0-9_]*)((?:\\s+IF\\s+(?:yes|no))?\\s*(?:;.*)?)$/;
const STOP = /^\\s*STOP\\s/;
const ENDS = /^\\s*(END|JUMP\\s+[A-Z][A-Z0-9_]*)\\s*(;.*)?$/;
const LABEL_ROW = /^([A-Z][A-Z0-9_]*):(.*)$/;

const socket = new ClassicPreset.Socket('flow');
const editor = new NodeEditor();
const area = new AreaPlugin($('rete'));
const connection = new ConnectionPlugin();
const render = new ReactPlugin({ createRoot });
connection.addPreset(ConnectionPresets.classic.setup());

// The body of a node: label name, rows, errors.
function Body({ data }) {
  const stop = (e) => e.stopPropagation();
  return h('div', { className: 'lnl-body', onPointerDown: stop, onWheel: stop, onKeyDown: stop },
    h('div', { className: 'head' },
      h('input', { defaultValue: data.name, spellCheck: false, onChange: (e) => data.rename(e.target.value) }),
      h('button', { title: 'move up in the file', onClick: () => data.move(-1) }, '↑'),
      h('button', { title: 'move down in the file', onClick: () => data.move(1) }, '↓'),
      h('button', { title: 'delete the label and its rows', onClick: () => data.remove() }, '✕')),
    h('textarea', { defaultValue: data.rows.join('\\n'), rows: Math.min(24, Math.max(3, data.rows.length + 1)), spellCheck: false, onChange: (e) => data.edit(e.target.value.split('\\n')) }),
    data.errors.length ? h('div', { className: 'errors' }, data.errors.join('\\n')) : null);
}
render.addPreset(Presets.classic.setup({
  customize: {
    control(context) { return context.payload.isBody ? Body : Presets.classic.Control; },
  },
}));
editor.use(area);
area.use(render);
area.use(connection);
AreaExtensions.selectableNodes(area, AreaExtensions.selector(), { accumulating: AreaExtensions.accumulateOnCtrl() });
AreaExtensions.simpleNodesOrder(area);

// A wire made by the user from a JUMP output rewrites that JUMP's target; other wires
// (next, STOP, or removals) are refused: the text is the source of truth.
editor.addPipe((ctx) => {
  if (state.loading) return ctx;
  if (ctx.type === 'connectioncreate') {
    const c = ctx.data;
    const from = state.nodes.find((n) => n.node.id === c.source);
    const to = state.nodes.find((n) => n.node.id === c.target);
    const m = /^j(\\d+)$/.exec(c.sourceOutput);
    if (from && to && m) {
      const i = Number(m[1]);
      from.section.rows[i] = from.section.rows[i].replace(JUMP, (row, pre, label, post) => pre + to.section.label + post);
      queueMicrotask(async () => { await rebuild(from); await wire(); touch(); });
    }
    return undefined;
  }
  if (ctx.type === 'connectionremove') return undefined;
  if (ctx.type === 'noderemove') {
    const k = state.nodes.findIndex((n) => n.node.id === ctx.data.id);
    if (k >= 0) {
      state.nodes.splice(k, 1);
      queueMicrotask(async () => { await wire(); touch(); });
    }
  }
  return ctx;
});
document.addEventListener('keydown', async (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key === 's') { e.preventDefault(); save(); return; }
  if (e.key === 'Delete' && document.activeElement === document.body) {
    for (const n of editor.getNodes().filter((n) => n.selected)) await editor.removeNode(n.id);
  }
});

// Outputs of a section: one per JUMP row, one per STOP row, and "next" unless the
// last row ends the label.
function outputsOf(rows) {
  const out = [];
  rows.forEach((row, i) => {
    const j = JUMP.exec(row);
    if (j) out.push({ key: 'j' + i, label: row.trim().replace(/\\s*;.*$/, ''), target: j[2] });
    else if (STOP.test(row)) out.push({ key: 's' + i, label: 'STOP → REVIEW', target: 'REVIEW' });
  });
  const last = [...rows].reverse().find((r) => r.trim() && !r.trim().startsWith(';'));
  if (!last || !ENDS.test(last)) out.push({ key: 'next', label: 'next', target: null });
  return out;
}
function makeNode(section) {
  const node = new ClassicPreset.Node(section.label);
  node.width = 420;
  node.addInput('in', new ClassicPreset.Input(socket, ''));
  const entry = { node, section, control: null };
  const control = {
    isBody: true, id: 'body-' + node.id, name: section.label, rows: section.rows, errors: [],
    rename: (name) => { section.label = name.trim(); section.row = section.label + ':' + (LABEL_ROW.exec(section.row)?.[2] ?? ''); node.label = section.label; rebuildAll().then(touch); },
    edit: (rows) => { section.rows = rows; control.rows = rows; rebuild(entry).then(wire).then(touch); },
    move: (by) => { const k = state.nodes.indexOf(entry); const j = k + by; if (j < 0 || j >= state.nodes.length) return; state.nodes.splice(k, 1); state.nodes.splice(j, 0, entry); wire().then(touch); },
    remove: () => editor.removeNode(node.id),
  };
  entry.control = control;
  node.addControl('body', control);
  for (const o of outputsOf(section.rows)) node.addOutput(o.key, new ClassicPreset.Output(socket, o.label));
  return entry;
}
// Resets the outputs of a node after its rows changed, then redraws it.
async function rebuild(entry) {
  const { node, section } = entry;
  for (const key of Object.keys(node.outputs)) node.removeOutput(key);
  for (const o of outputsOf(section.rows)) node.addOutput(o.key, new ClassicPreset.Output(socket, o.label));
  await area.update('node', node.id);
}
async function rebuildAll() {
  for (const e of state.nodes) await rebuild(e);
  await wire();
}
// Replaces every wire with the ones the rows describe.
async function wire() {
  state.loading = true;
  for (const c of editor.getConnections()) await editor.removeConnection(c.id);
  const byLabel = new Map(state.nodes.map((e) => [e.section.label, e]));
  for (const [k, e] of state.nodes.entries()) {
    for (const o of outputsOf(e.section.rows)) {
      const to = o.target ? byLabel.get(o.target) : state.nodes[k + 1];
      if (to) await editor.addConnection(new ClassicPreset.Connection(e.node, o.key, to.node, 'in'));
    }
  }
  state.loading = false;
}
async function layout() {
  const g = new dagre.graphlib.Graph();
  g.setGraph({ rankdir: 'LR', nodesep: 40, ranksep: 120 });
  g.setDefaultEdgeLabel(() => ({}));
  for (const e of state.nodes) {
    const el = area.nodeViews.get(e.node.id)?.element;
    g.setNode(e.node.id, { width: el?.offsetWidth || 420, height: el?.offsetHeight || 200 });
  }
  for (const c of editor.getConnections()) g.setEdge(c.source, c.target);
  dagre.layout(g);
  for (const e of state.nodes) {
    const p = g.node(e.node.id);
    await area.translate(e.node.id, { x: p.x - p.width / 2, y: p.y - p.height / 2 });
  }
  AreaExtensions.zoomAt(area, editor.getNodes());
}
async function show(doc) {
  state.loading = true;
  await editor.clear();
  state.nodes = doc.sections.map(makeNode);
  for (const e of state.nodes) await editor.addNode(e.node);
  state.loading = false;
  await wire();
  await new Promise((r) => setTimeout(r, 50));
  await layout();
}

// Rows to send: the original rows while nothing changed, so open + save keeps the
// file identical; the joined sections after a change. rowOwner maps each row to its node.
function generate() {
  const rows = [];
  state.rowOwner = [];
  const put = (row, owner) => { rows.push(row); state.rowOwner.push(owner); };
  for (const r of state.header) put(r, null);
  for (const e of state.nodes) {
    put(e.section.row, e);
    for (const r of e.section.rows) put(r, e);
  }
  return rows;
}
const rows = () => { const g = generate(); return state.dirty ? g : state.rows; };

function setStatus() {
  $('status').textContent = state.dirty ? 'unsaved changes' : 'saved';
  $('status').className = state.dirty ? 'dirty' : '';
  document.title = (state.dirty ? '* ' : '') + 'lnl edit · ' + state.file;
}
let timer = null;
function touch() {
  state.dirty = true;
  state.rev++;
  setStatus();
  clearTimeout(timer);
  timer = setTimeout(check, 300);
}
async function mark(diagnostics) {
  const other = [];
  for (const e of state.nodes) e.control.errors = [];
  for (const d of diagnostics) {
    const owner = d.file === state.file ? state.rowOwner[d.line - state.blockStart] : null;
    const text = d.code + ' ' + d.message;
    if (owner) owner.control.errors.push(text);
    else other.push(d.file + ':' + d.line + ':' + d.column + ': ' + text);
  }
  for (const e of state.nodes) await area.update('control', e.control.id);
  $('problems').textContent = diagnostics.length ? [diagnostics.length + ' problem' + (diagnostics.length > 1 ? 's' : '')].concat(other).join('\\n') : 'none';
}
async function check() {
  const r = await fetch('/api/check', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ rows: rows() }) });
  mark((await r.json()).diagnostics);
}
async function take(doc) {
  Object.assign(state, { file: doc.file, rows: doc.rows, header: doc.header, blockStart: doc.blockStart, digest: doc.digest, dirty: false, disk: null });
  $('file').textContent = state.file;
  $('header-rows').value = doc.header.join('\\n');
  $('conflict').hidden = true;
  await show(doc);
  generate();
  mark(doc.diagnostics);
  setStatus();
}
async function load() { take(await (await fetch('/api/doc')).json()); }
async function save(digest = state.digest) {
  const sent = state.rev;
  const r = await fetch('/api/save', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ rows: rows(), digest }) });
  const doc = await r.json();
  if (r.status === 409) { state.disk = doc; $('conflict').hidden = false; return; }
  if (r.status !== 200) { alert('save failed: ' + doc.error); return; }
  if (state.rev === sent) { take(doc); return; }
  // Edits arrived while the save was pending: keep them, adopt the saved document as the new baseline.
  Object.assign(state, { rows: doc.rows, digest: doc.digest, disk: null });
  $('conflict').hidden = true;
}
$('save').addEventListener('click', () => save());
$('reload').addEventListener('click', () => { if (!state.dirty || confirm('Discard the unsaved changes?')) load(); });
$('arrange').addEventListener('click', () => layout());
$('add').addEventListener('click', async () => {
  const name = (prompt('Name of the new label (A-Z, 0-9, _):') ?? '').trim();
  if (!/^[A-Z][A-Z0-9_]*$/.test(name)) return;
  const entry = makeNode({ label: name, row: name + ':', rows: ['  END'] });
  state.nodes.push(entry);
  await editor.addNode(entry.node);
  await wire();
  touch();
});
$('header-rows').addEventListener('change', (e) => { state.header = e.target.value === '' ? [] : e.target.value.split('\\n'); touch(); });
$('take-disk').addEventListener('click', () => take(state.disk));
$('keep-mine').addEventListener('click', () => save(state.disk.digest));
window.addEventListener('beforeunload', (e) => { if (state.dirty) e.preventDefault(); });
load();
</script>
</body>
</html>
`;
