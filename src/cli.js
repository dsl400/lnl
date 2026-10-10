import { parseArgs } from 'node:util';
import { realpathSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { lint } from './lint.js';
import { model, toMermaid, toDot } from './graph.js';
import { CODES, formatText } from './diagnostics.js';
import { serve } from './edit.js';

const USAGE = `usage:
  lnl lint <entry.md> [--format text|json] [--root <dir>]
  lnl graph <entry.md> --format mermaid|dot [--root <dir>]
  lnl edit <entry.md> [--root <dir>] [--port <n>]`;

// Exit codes (engine.md, CLI contract): 0 ok, 1 invalid flow, 2 usage or file access.
export async function main(argv, stdout, stderr) {
  const [command, ...rest] = argv;
  let args;
  try {
    args = parseArgs({ args: rest, allowPositionals: true, options: { format: { type: 'string' }, root: { type: 'string' }, port: { type: 'string' } } });
  } catch (e) {
    stderr.write(`${e.message}\n${USAGE}\n`);
    return 2;
  }
  const { positionals, values } = args;
  if (!['lint', 'graph', 'edit'].includes(command) || positionals.length !== 1) {
    stderr.write(`${USAGE}\n`);
    return 2;
  }
  if (command === 'edit') return edit(positionals[0], values, stdout, stderr);
  const formats = command === 'lint' ? ['text', 'json'] : ['mermaid', 'dot'];
  const format = values.format ?? (command === 'lint' ? 'text' : undefined);
  if (!formats.includes(format)) {
    stderr.write(`--format must be ${formats.join('|')}\n${USAGE}\n`);
    return 2;
  }

  const closure = lint(positionals[0], values.root);
  const status = closure.diagnostics.some((d) => d.code === CODES.FILE_ACCESS) ? 2 : closure.ok ? 0 : 1;

  if (command === 'lint') {
    if (format === 'json') stdout.write(JSON.stringify({ diagnostics: closure.diagnostics }, null, 2) + '\n');
    else for (const d of closure.diagnostics) stdout.write(formatText(d) + '\n');
    return status;
  }
  for (const d of closure.diagnostics) stderr.write(formatText(d) + '\n');
  if (status !== 0) return status;
  const m = model(closure);
  stdout.write(format === 'mermaid' ? toMermaid(m) : toDot(m));
  return 0;
}

// Serves the editor until the server closes (Ctrl-C); the first lint decides file access.
async function edit(entry, values, stdout, stderr) {
  const port = values.port === undefined ? 0 : Number(values.port);
  if (!Number.isInteger(port) || port < 0 || port > 65535) {
    stderr.write(`--port must be an integer between 0 and 65535\n${USAGE}\n`);
    return 2;
  }
  const first = lint(entry, values.root);
  if (first.diagnostics.some((d) => d.code === CODES.FILE_ACCESS)) {
    for (const d of first.diagnostics) stderr.write(formatText(d) + '\n');
    return 2;
  }
  const server = await serve(entry, values.root, port);
  stdout.write(`lnl edit: ${server.url}\n`);
  await new Promise((resolve) => server.on('close', resolve));
  return 0;
}

// Runs main when this file is the entrypoint (node src/cli.js or the bundle lnl.mjs), not when a test imports it.
if (process.argv[1] && import.meta.url === pathToFileURL(realpathSync(process.argv[1])).href) {
  process.exitCode = await main(process.argv.slice(2), process.stdout, process.stderr);
}
