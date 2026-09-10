#!/usr/bin/env node
/* Inline public/favicon.ico into index.html as a base64 data URI so the
   single-file dist/index.html (vite-plugin-singlefile) carries the tab icon
   with it even when deployed as just one HTML file (no separate .ico to 404).

   Re-run after replacing public/favicon.ico:
     node scripts/inline-favicon.mjs && npm run build
*/
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const htmlPath = join(root, 'index.html');
const icoPath = join(root, 'public', 'favicon.ico');

const ico = readFileSync(icoPath);
const b64 = ico.toString('base64');
let html = readFileSync(htmlPath, 'utf8');

const re = /<link\s+rel="icon"[^>]*>/;
if (!re.test(html)) {
  console.error('No <link rel="icon"> found in index.html');
  process.exit(1);
}

html = html.replace(re, `<link rel="icon" type="image/x-icon" href="data:image/x-icon;base64,${b64}" />`);
writeFileSync(htmlPath, html);

console.log(`OK — favicon.ico inlined (${b64.length} base64 chars).`);