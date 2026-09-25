import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname, extname, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync, spawn } from 'node:child_process';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
process.chdir(root);
function runNpm(args) {
  const result = process.platform === 'win32'
    ? spawnSync('cmd.exe', ['/d', '/s', '/c', `npm.cmd ${args.join(' ')}`], { cwd: root, stdio: 'inherit', windowsHide: true })
    : spawnSync('npm', args, { cwd: root, stdio: 'inherit' });
  if (result.status !== 0) process.exit(result.status || 1);
}
if (!existsSync(join(root, 'dist', 'index.html')) || process.argv.includes('--rebuild')) {
  if (!existsSync(join(root, 'node_modules'))) runNpm(['ci']);
  runNpm(['run', 'build']);
}
function openBrowser(url) {
  if (process.argv.includes('--no-open')) return;
  const child = process.platform === 'win32'
    ? spawn('cmd.exe', ['/d', '/c', 'start', '', url], { detached: true, stdio: 'ignore', windowsHide: true })
    : spawn(process.platform === 'darwin' ? 'open' : 'xdg-open', [url], { detached: true, stdio: 'ignore' });
  child.on('error', () => console.log(`Open ${url} in your browser.`));
  child.unref();
}
try {
  const response = await fetch('http://127.0.0.1:5188/__catapult_health', { signal: AbortSignal.timeout(700) });
  const body = await response.json();
  if (body.app === 'cat-a-pult') {
    console.log('\n  CAT-A-PULT is already running: http://127.0.0.1:5188\n');
    openBrowser('http://127.0.0.1:5188');
    process.exit(0);
  }
} catch { /* No existing game server. */ }
const directory = join(root, 'dist');
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.png': 'image/png', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.json': 'application/json' };
const server = createServer(async (req, res) => {
  if (!['GET', 'HEAD'].includes(req.method ?? '')) { res.writeHead(405); res.end(); return; }
  if (req.url === '/__catapult_health') { res.writeHead(200, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ app: 'cat-a-pult', version: '1.0.0' })); return; }
  try {
    const path = decodeURIComponent(new URL(req.url ?? '/', 'http://localhost').pathname);
    const file = resolve(directory, `.${path === '/' ? '/index.html' : path}`);
    if (!file.startsWith(directory + sep)) { res.writeHead(403); res.end(); return; }
    const info = await stat(file); if (!info.isFile()) throw new Error('Not a file');
    res.writeHead(200, { 'Content-Type': types[extname(file)] ?? 'application/octet-stream', 'Content-Length': info.size, 'Cache-Control': 'no-cache', 'X-Content-Type-Options': 'nosniff' });
    if (req.method === 'HEAD') res.end(); else res.end(await readFile(file));
  } catch { res.writeHead(404); res.end('Not found'); }
});
let port = 5188;
server.on('error', error => { if (error.code === 'EADDRINUSE' && port < 5200) { port++; server.listen(port, '127.0.0.1'); } else { console.error(error); process.exitCode = 1; } });
server.listen(port, '127.0.0.1');
server.on('listening', () => {
  const url = `http://127.0.0.1:${port}`;
  console.log(`\n  CAT-A-PULT is ready!\n  ${url}\n\n  Keep this window open. Ctrl+C to stop.\n`);
  openBrowser(url);
});
process.on('SIGINT', () => server.close(() => process.exit(0)));
