#!/usr/bin/env node
/* Regenerate public/favicon.ico from the /// AFTERCREDITS. brand mark — the
   three blood-red slanted bars in src/components/Logo.tsx — rasterised into a
   32×32 32-bit ICO (BGRA alpha + AND mask, supersampled for smooth edges),
   then re-run scripts/inline-favicon.mjs to bake it into index.html.

     node scripts/make-favicon.mjs && node scripts/inline-favicon.mjs && npm run build
*/
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const out = join(root, 'public', 'favicon.ico');

const SIZE = 32;
const SS = 4;                             // supersampling factor → anti-aliased edges
const BLOOD = [229, 9, 20];               // --color-blood #e50914

/* logo geometry (Logo.tsx, viewBox 0 0 28 24): three slanted parallelograms */
const BARS = [
  { x0: 3, tw: 3.4 },   // M3 22 L10 2 h3.4 L6.4 22 Z
  { x0: 11, tw: 3.4 },  // M11 22 L18 2 h3.4 L14.4 22 Z
  { x0: 19, tw: 2 },    // M19 22 L26 2 h2 L21 22 Z
];
const TOP = 2;
const BOTTOM = 22;
const SLOPE = 0.35;                       // each bar drifts 7 units over 20 in y
const OX = (SIZE - 25) / 2 - 3;           // centre the 25-wide mark
const OY = (SIZE - 20) / 2 - 2;           // centre the 20-tall mark

function inside(vx, vy) {
  if (vy < TOP || vy > BOTTOM) return false;
  for (const { x0, tw } of BARS) {
    const x1 = x0 + SLOPE * (BOTTOM - vy);
    if (vx >= x1 && vx <= x1 + tw) return true;
  }
  return false;
}

const pixels = Buffer.alloc(SIZE * SIZE * 4); // BGRA, bottom-up rows
for (let y = 0; y < SIZE; y++) {
  for (let x = 0; x < SIZE; x++) {
    let cov = 0;
    for (let sy = 0; sy < SS; sy++) {
      for (let sx = 0; sx < SS; sx++) {
        if (inside(x + (sx + 0.5) / SS - OX, y + (sy + 0.5) / SS - OY)) cov++;
      }
    }
    const a = Math.round((cov * 255) / (SS * SS));
    const o = ((SIZE - 1 - y) * SIZE + x) * 4;
    pixels[o] = BLOOD[2];                 // B
    pixels[o + 1] = BLOOD[1];             // G
    pixels[o + 2] = BLOOD[0];             // R
    pixels[o + 3] = a;                    // A (transparent outside the mark)
  }
}
const mask = Buffer.alloc((SIZE * SIZE) / 8); // AND mask — all zero, alpha drives

const u32 = (b, o, v) => { b[o] = v & 255; b[o + 1] = (v >> 8) & 255; b[o + 2] = (v >> 16) & 255; b[o + 3] = (v >> 24) & 255; };
const u16 = (b, o, v) => { b[o] = v & 255; b[o + 1] = (v >> 8) & 255; };

const ico = Buffer.alloc(22);             // ICONDIR + 1 ICONDIRENTRY
u16(ico, 2, 1);                           // type = icon
u16(ico, 4, 1);                           // count
ico[6] = SIZE;                            // width
ico[7] = SIZE;                            // height
u16(ico, 10, 1);                          // planes
u16(ico, 12, 32);                         // bit count
u32(ico, 14, 40 + pixels.length + mask.length);
u32(ico, 18, 22);                         // offset to pixel data

const bmp = Buffer.alloc(40);             // BITMAPINFOHEADER
u32(bmp, 0, 40);
u32(bmp, 4, SIZE);
u32(bmp, 8, SIZE * 2);                    // height double-counts the AND mask
u16(bmp, 12, 1);
u16(bmp, 14, 32);
u32(bmp, 16, 0);                          // biCompression = BI_RGB

writeFileSync(out, Buffer.concat([ico, bmp, pixels, mask]));
console.log(`OK — wrote ${out} (${22 + 40 + pixels.length + mask.length} bytes).`);