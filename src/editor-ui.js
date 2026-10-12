// The page of `lnl edit`: a Rete.js 2 node canvas (docs/tmp.md D5) with one node per
// label of the lnl block. The node holds the rows of its label in a text area; its
// output sockets are the JUMP rows, the STOP rows (to REVIEW), and the fall-through
// to the next label; the wires are the targets. The text stays the source of truth
// (engine.md, Purpose and scope): a wire dragged from a JUMP output to a node rewrites
// the target of that JUMP row. Lint diagnostics are shown in the node of their row.
// The libraries load from esm.sh without a build, so the bundle stays one file
// (docs/tmp.md D4): rete, rete-area-plugin, rete-connection-plugin, rete-react-plugin
// with React 18, and @dagrejs/dagre for the layout (the file keeps no positions).
// Three view modes share the header (docs/reference/engine.md, Visual editor): Nodes is
// the editable canvas; Blocks (basic blocks drawn by Mermaid) and Listing (the rows with
// a jump column, as a disassembler shows them) are read-only views the server derives
// from the same lint, refreshed after each check.
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
  #views { position: relative; overflow: hidden; }
  #rete { height: 100%; background: #f4f4f6; }
  #blocks, #listing { position: absolute; inset: 0; overflow: auto; background: #fff; }
  #blocks { padding: 1rem; box-sizing: border-box; }
  #blocks svg { display: block; margin: 0 auto; max-width: 100%; height: auto; }
  .views button[aria-pressed=true] { background: #335; color: #fff; }
  .stale { padding: 1rem; color: #a00; font-family: monospace; }
  .lst { display: flex; font: 12px/20px ui-monospace, monospace; }
  .lst svg { flex: none; }
  .lst svg path { fill: none; stroke: #8a9bb5; stroke-width: 1.4; }
  .lst svg path.back { stroke: #9b59c9; }
  .lst svg path.stop { stroke: #d99; stroke-dasharray: 3 3; }
  .lst svg path.on { stroke: #e08a00 !important; stroke-width: 3; stroke-dasharray: none; }
  .lst .rows { flex: 1; min-width: 0; }
  .lst .row { display: flex; gap: 10px; height: 20px; white-space: pre; padding-right: 10px; }
  .lst .row:hover { background: #f2f4f8; }
  .lst .row.hit { background: #fff3c4; }
  .lst .row.lab { border-top: 1px solid #e3e3e8; font-weight: bold; }
  .lst .ln { color: #999; width: 34px; text-align: right; flex: none; }
  .lst .code { overflow: hidden; text-overflow: ellipsis; }
  .lst .xref { margin-left: auto; color: #999; font-size: 11px; }
  .lst a { color: #1a5fb4; cursor: pointer; text-decoration: none; }
  .lst a:hover { text-decoration: underline; }
  .lst .op-ASK { color: #b06d00; } .lst .op-JUMP { color: #1a5fb4; } .lst .op-STOP { color: #c00; }
  .lst .op-CHECK { color: #08779b; } .lst .op-END, .lst .op-SAY { color: #2a7d2a; } .lst .op-CALL { color: #7a3fb0; }
  .lst h4 { margin: .6rem 0 .2rem 1rem; font: bold 12px monospace; color: #555; }
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
  <span class="views">
    <button data-view="rete" aria-pressed="true">Nodes</button>
    <button data-view="blocks" aria-pressed="false">Blocks</button>
    <button data-view="listing" aria-pressed="false">Listing</button>
  </span>
  <label title="draw the jump of each STOP to REVIEW in Listing"><input type="checkbox" id="stops"> STOP→REVIEW</label>
  <span id="status"></span>
  <button id="add">+ label</button>
  <button id="arrange">Arrange</button>
  <button id="reload">Reload</button>
  <button id="save">Save</button>
</header>
<main>
  <div id="views">
    <div id="rete"></div>
    <div id="blocks" hidden></div>
    <div id="listing" hidden></div>
  </div>
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
    <p>Nodes edits; Blocks (Ctrl+wheel zooms) and Listing show the last valid lint. In Listing, hover a row or an arrow to trace it, click a target or an arrow to follow it, Alt+← to go back.</p>
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
  const a = await r.json();
  mark(a.diagnostics);
  setViews(a);
}
async function take(doc) {
  Object.assign(state, { file: doc.file, rows: doc.rows, header: doc.header, blockStart: doc.blockStart, digest: doc.digest, dirty: false, disk: null });
  $('file').textContent = state.file;
  $('header-rows').value = doc.header.join('\\n');
  $('conflict').hidden = true;
  await show(doc);
  generate();
  mark(doc.diagnostics);
  setViews(doc);
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
// View modes. state.view is the shown one; state.views holds what the server derived.
state.view = 'rete';
state.views = { blocks: null, listing: null, drawn: '' };
let mermaid = null;
function setViews(a) {
  if (a.blocks !== undefined) { state.views.blocks = a.blocks; state.views.listing = a.listing; state.views.drawn = ''; }
  drawView();
}
async function drawView() {
  const v = state.view;
  if (v === 'rete' || state.views.drawn === v) return;
  state.views.drawn = v;
  const el = $(v);
  if (v === 'blocks') {
    if (!state.views.blocks) { el.innerHTML = '<div class="stale">The flow has errors: fix them in Nodes to draw Blocks.</div>'; return; }
    mermaid ??= (await import('${ESM}/mermaid@11.4.1')).default;
    mermaid.initialize({ startOnLoad: false, securityLevel: 'strict', themeVariables: { fontSize: '12px' }, flowchart: { htmlLabels: true, nodeSpacing: 25, rankSpacing: 30 } });
    const { svg } = await mermaid.render('lnl-blocks', state.views.blocks);
    el.innerHTML = svg;
    zoom(el, Math.min(1, (el.clientWidth - 32) / el.querySelector("svg").viewBox.baseVal.width));
  } else {
    if (!state.views.listing) { el.innerHTML = '<div class="stale">The flow has errors: fix them in Nodes to draw Listing.</div>'; return; }
    drawListing(el, state.views.listing);
  }
}
// Ctrl+wheel zooms the block diagram; the panel scrolls it.
let scale = 1;
function zoom(el, to) {
  scale = Math.min(3, Math.max(0.2, to));
  const svg = el.querySelector('svg');
  if (!svg) return;
  const w = svg.viewBox.baseVal.width;
  svg.style.width = w * scale + 'px';
  svg.style.maxWidth = 'none';
}
$('blocks').addEventListener('wheel', (e) => { if (!e.ctrlKey) return; e.preventDefault(); zoom($('blocks'), scale * (e.deltaY < 0 ? 1.1 : 0.9)); }, { passive: false });
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
// One file of the listing: an SVG jump column beside the rows. A jump runs from the
// row that transfers to the row of its label; its lane is the distance from the text.
function drawListing(el, files) {
  const R = 20, L = 11, NS = 'http://www.w3.org/2000/svg';
  el.innerHTML = '';
  files.forEach((f, fi) => {
    const lanes = Math.max(0, ...f.jumps.map((j) => j.lane + 1));
    const W = lanes * L + 14;
    const refs = f.rows.map(() => []);
    f.jumps.forEach((j, k) => refs[j.to].push(k));
    const rowId = (r) => 'L' + fi + '_' + r;
    const html = f.rows.map((row, r) => {
      const code = row.text.replace(/\\s;.*$/, '');
      let body = esc(code).replace(/^(\\s*)([A-Z]+)(?=\\s|$)/, (m, sp, op) => sp + '<span class="op-' + op + '">' + op + '</span>');
      for (const k of f.jumps.keys()) {
        const j = f.jumps[k];
        if (j.from !== r) continue;
        if (j.stop) body += ' <a data-go="' + j.to + '" data-j="' + k + '" class="op-STOP">→ ' + j.label + '</a>';
        else body = body.replace(new RegExp('\\\\b' + j.label + '\\\\b(?![^<]*>)'), '<a data-go="' + j.to + '" data-j="' + k + '">' + j.label + '</a>');
      }
      const xr = row.label && refs[r].length ? '<span class="xref">from ' + refs[r].map((k) => '<a data-go="' + f.jumps[k].from + '">' + f.rows[f.jumps[k].from].line + '</a>').join(' ') + '</span>' : '';
      return '<div class="row' + (row.label ? ' lab' : '') + '" id="' + rowId(r) + '" data-r="' + r + '"><span class="ln">' + row.line + '</span><span class="code">' + body + '</span>' + xr + '</div>';
    }).join('');
    const box = document.createElement('div');
    if (files.length > 1) box.insertAdjacentHTML('beforeend', '<h4>' + esc(f.file) + '</h4>');
    const lst = document.createElement('div');
    lst.className = 'lst';
    lst.innerHTML = '<svg width="' + W + '" height="' + f.rows.length * R + '"></svg><div class="rows">' + html + '</div>';
    box.appendChild(lst);
    el.appendChild(box);
    const svg = lst.firstChild;
    const y = (r) => r * R + R / 2;
    const paths = f.jumps.map((j, k) => {
      const x = W - 8 - (j.lane + 1) * L, p = document.createElementNS(NS, 'path');
      p.setAttribute('d', 'M' + W + ' ' + y(j.from) + 'H' + x + 'V' + y(j.to) + 'H' + (W - 1) + 'm-5 -4l5 4l-5 4');
      p.setAttribute('class', (j.back ? 'back ' : '') + (j.stop ? 'stop' : ''));
      if (j.stop && !$('stops').checked) p.style.display = 'none';
      p.dataset.stop = j.stop ? '1' : '';
      p.addEventListener('mouseenter', () => on([k]));
      p.addEventListener('mouseleave', () => on([]));
      p.addEventListener('click', () => go(j.to));
      svg.appendChild(p);
      return p;
    });
    const on = (ks) => paths.forEach((p, k) => p.classList.toggle('on', ks.includes(k)));
    const go = (r, push = true) => {
      const target = lst.querySelector('[data-r="' + r + '"]');
      if (!target) return;
      if (push) history.pushState({ lnl: target.id }, '');
      el.querySelectorAll('.hit').forEach((e) => e.classList.remove('hit'));
      target.classList.add('hit');
      target.scrollIntoView({ block: 'center', behavior: 'smooth' });
    };
    lst.querySelectorAll('.row').forEach((row) => {
      const r = Number(row.dataset.r);
      row.addEventListener('mouseenter', () => on(f.jumps.flatMap((j, k) => (j.from === r || j.to === r ? [k] : []))));
      row.addEventListener('mouseleave', () => on([]));
    });
    lst.querySelectorAll('a[data-go]').forEach((a) => a.addEventListener('click', () => go(Number(a.dataset.go))));
  });
}
window.addEventListener('popstate', (e) => {
  const t = e.state?.lnl && document.getElementById(e.state.lnl);
  if (!t) return;
  $('listing').querySelectorAll('.hit').forEach((x) => x.classList.remove('hit'));
  t.classList.add('hit');
  t.scrollIntoView({ block: 'center' });
});
$('stops').addEventListener('change', (e) => $('listing').querySelectorAll('path[data-stop="1"]').forEach((p) => { p.style.display = e.target.checked ? '' : 'none'; }));
document.querySelectorAll('[data-view]').forEach((b) => b.addEventListener('click', () => {
  state.view = b.dataset.view;
  document.querySelectorAll('[data-view]').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
  for (const v of ['blocks', 'listing']) $(v).hidden = v !== state.view;
  drawView();
}));
window.addEventListener('beforeunload', (e) => { if (state.dirty) e.preventDefault(); });
load();
</script>
</body>
</html>
`;
