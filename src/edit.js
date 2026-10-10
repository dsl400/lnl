import { createServer } from 'node:http';
import { readFileSync, writeFileSync, realpathSync } from 'node:fs';
import { lint } from './lint.js';
import { model, toMermaid } from './graph.js';
import { openDocument, replaceBlock, digestOf, toSections } from './document.js';
import { PAGE } from './editor-ui.js';

// The local server of `lnl edit` (engine.md, Visual editor). Routes:
//   GET  /            the page
//   GET  /api/doc     { file, rows, header, sections, blockStart, digest, diagnostics, mermaid }
//   POST /api/check   { rows } -> { diagnostics, mermaid }        lint of the unsaved rows
//   POST /api/save    { rows, digest } -> 200 as /api/doc, or 409 with the disk document
//                     when the file changed since `digest` (RFC 9110 §13.1.1, If-Match)
// Returns the listening server; `server.url` is its address.
export function serve(entryPath, root, port = 0) {
  const real = realpathSync(entryPath);
  const read = () => readFileSync(real, 'utf8');

  const analyse = (text) => {
    const closure = lint(entryPath, root, new Map([[real, text]]));
    return { diagnostics: closure.diagnostics, mermaid: closure.ok ? toMermaid(model(closure)) : null };
  };
  const document = (text) => {
    const doc = openDocument(text);
    const a = analyse(text);
    return { file: entryPath, rows: doc.rows, ...toSections(doc.rows), blockStart: doc.blockStart, digest: doc.digest, diagnostics: a.diagnostics, mermaid: a.mermaid };
  };
  const json = (res, status, body) => {
    res.writeHead(status, { 'content-type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify(body));
  };
  const body = (req) =>
    new Promise((resolve, reject) => {
      let data = '';
      req.on('data', (c) => (data += c));
      req.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(e);
        }
      });
    });

  const server = createServer(async (req, res) => {
    try {
      if (req.method === 'GET' && req.url === '/') {
        res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
        return res.end(PAGE);
      }
      if (req.method === 'GET' && req.url === '/favicon.ico') return res.writeHead(204).end();
      if (req.method === 'GET' && req.url === '/api/doc') return json(res, 200, document(read()));
      if (req.method === 'POST' && req.url === '/api/check') {
        const { rows } = await body(req);
        const a = analyse(replaceBlock(read(), rows));
        return json(res, 200, { diagnostics: a.diagnostics, mermaid: a.mermaid });
      }
      if (req.method === 'POST' && req.url === '/api/save') {
        const { rows, digest } = await body(req);
        const disk = read();
        if (digestOf(disk) !== digest) return json(res, 409, document(disk));
        const next = replaceBlock(disk, rows);
        if (next !== disk) writeFileSync(real, next);
        return json(res, 200, document(next));
      }
      json(res, 404, { error: 'not found' });
    } catch (e) {
      json(res, 500, { error: e.message });
    }
  });
  return new Promise((resolve) => {
    server.listen(port, '127.0.0.1', () => {
      server.url = `http://127.0.0.1:${server.address().port}/`;
      resolve(server);
    });
  });
}
