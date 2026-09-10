/* ── AFTER CREDITS — static host + library store ─────────────────────────
   Zero-dependency Node server. Serves the built single-file app from
   dist/ and persists the imported library to data/user-library.json via
   a tiny JSON API:

     GET    /api/library   → stored entries (404 when none yet)
     POST   /api/library   → body: Entry[]  → written to disk
     DELETE /api/library   → removes the stored library

   Run:   node server.mjs        (or PORT=8080 node server.mjs)
   Then open http://localhost:4173 — the site detects the API and stores
   everything server-side. Hosted statically instead? The site silently
   falls back to localStorage. No npm deps, no config. */

import { createServer } from 'node:http';
import { mkdir, readFile, writeFile, rm, stat } from 'node:fs/promises';
import { extname, join, normalize, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DIST = join(__dirname, 'dist');
const DATA_DIR = join(__dirname, 'data');
const DATA_FILE = join(DATA_DIR, 'user-library.json');
const PORT = Number(process.env.PORT) || 4173;
const MAX_BODY = 12 * 1024 * 1024; // 12 MB — plenty for a few thousand titles

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.map': 'application/json',
};

const send = (res, code, body, headers = {}) => {
  res.writeHead(code, headers);
  res.end(body);
};

const json = (res, code, obj) =>
  send(res, code, JSON.stringify(obj), {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
  });

function readBody(req) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', (c) => {
      size += c.length;
      if (size > MAX_BODY) {
        reject(new Error('payload too large'));
        req.destroy();
        return;
      }
      chunks.push(c);
    });
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf-8')));
    req.on('error', reject);
  });
}

async function handleApi(req, res) {
  try {
    if (req.method === 'GET') {
      const raw = await readFile(DATA_FILE, 'utf-8');
      const entries = JSON.parse(raw);
      return json(res, 200, { entries, savedAt: (await stat(DATA_FILE)).mtime.toISOString() });
    }
    if (req.method === 'POST') {
      const raw = await readBody(req);
      const entries = JSON.parse(raw);
      if (!Array.isArray(entries)) return json(res, 400, { error: 'expected a JSON array' });
      await mkdir(DATA_DIR, { recursive: true });
      await writeFile(DATA_FILE, JSON.stringify(entries), 'utf-8');
      console.log(`[store] library saved — ${entries.length} titles`);
      return json(res, 200, { ok: true, count: entries.length });
    }
    if (req.method === 'DELETE') {
      await rm(DATA_FILE, { force: true });
      console.log('[store] library cleared');
      return json(res, 200, { ok: true });
    }
    return json(res, 405, { error: 'method not allowed' });
  } catch (err) {
    if (err.code === 'ENOENT') return json(res, 404, { error: 'no library stored yet' });
    console.error('[store] error:', err.message);
    return json(res, 500, { error: 'store failure' });
  }
}

async function serveStatic(req, res, url) {
  let rel = decodeURIComponent(url.pathname);
  if (rel === '/' || rel === '') rel = '/index.html';
  let file = normalize(join(DIST, rel));
  if (!file.startsWith(DIST)) return send(res, 403, 'forbidden');

  try {
    let s = await stat(file);
    if (s.isDirectory()) file = join(file, 'index.html');
  } catch {
    // SPA fallback — the app is a single page
    file = join(DIST, 'index.html');
  }

  try {
    const body = await readFile(file);
    const type = MIME[extname(file).toLowerCase()] ?? 'application/octet-stream';
    const cache = extname(file) === '.html' ? 'no-cache' : 'public, max-age=31536000, immutable';
    send(res, 200, body, { 'Content-Type': type, 'Cache-Control': cache });
  } catch {
    send(res, 404, 'not found — run `npm run build` first');
  }
}

createServer(async (req, res) => {
  const url = new URL(req.url ?? '/', `http://${req.headers.host ?? 'localhost'}`);
  if (url.pathname === '/api/library') return handleApi(req, res);
  return serveStatic(req, res, url);
}).listen(PORT, () => {
  console.log(`\n  AFTER CREDITS — serving dist/ with server-side library store`);
  console.log(`  → http://localhost:${PORT}   (POST/GET/DELETE /api/library)\n`);
});
