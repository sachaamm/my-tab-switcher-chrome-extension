// Génère les icônes PNG de l'extension sans dépendance externe.
// Dessin : carré arrondi indigo + deux chevrons (gauche/droite) blancs,
// symbolisant la navigation précédent/suivant. Lancer : node tools/generate-icons.mjs
import { deflateSync } from 'node:zlib';
import { writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const SIZES = [16, 32, 48, 128];
const BRAND = [79, 70, 229]; // #4F46E5
const WHITE = [255, 255, 255];

function crc32(buf) {
  let c = ~0;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
  }
  return (~c) >>> 0;
}

function chunk(type, data) {
  const typeBuf = Buffer.from(type, 'ascii');
  const lenBuf = Buffer.alloc(4);
  lenBuf.writeUInt32BE(data.length, 0);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([lenBuf, typeBuf, data, crcBuf]);
}

function encodePng(size, rgba) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type RGBA
  // 10,11,12 = compression/filter/interlace = 0
  const stride = size * 4;
  const raw = Buffer.alloc((stride + 1) * size);
  for (let y = 0; y < size; y++) {
    raw[y * (stride + 1)] = 0; // filtre 0 (None)
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, y * stride + stride);
  }
  return Buffer.concat([
    sig,
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

// Triangle plein pointant vers la gauche (◀) ou la droite (▶).
function inTriangle(px, py, tipX, baseX, cy, halfH, pointLeft) {
  const lo = Math.min(tipX, baseX);
  const hi = Math.max(tipX, baseX);
  if (px < lo || px > hi) return false;
  const w = hi - lo || 1;
  // Fraction de la largeur depuis la pointe (0 à la pointe, 1 à la base).
  const frac = pointLeft ? (px - tipX) / w : (tipX - px) / w;
  return Math.abs(py - cy) <= halfH * frac;
}

function makeIcon(size) {
  const rgba = Buffer.alloc(size * size * 4);
  const radius = size * 0.22;
  const cy = size / 2;
  const halfH = size * 0.2;
  // ◀ à gauche, ▶ à droite, avec un espace au centre.
  const leftTipX = size * 0.18;
  const leftBaseX = size * 0.42;
  const rightTipX = size * 0.82;
  const rightBaseX = size * 0.58;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      // Coin arrondi : transparent en dehors du rectangle arrondi.
      const inside = insideRoundRect(x + 0.5, y + 0.5, size, radius);
      if (!inside) {
        rgba[i] = rgba[i + 1] = rgba[i + 2] = rgba[i + 3] = 0;
        continue;
      }
      let color = BRAND;
      if (
        inTriangle(x + 0.5, y + 0.5, leftTipX, leftBaseX, cy, halfH, true) ||
        inTriangle(x + 0.5, y + 0.5, rightTipX, rightBaseX, cy, halfH, false)
      ) {
        color = WHITE;
      }
      rgba[i] = color[0];
      rgba[i + 1] = color[1];
      rgba[i + 2] = color[2];
      rgba[i + 3] = 255;
    }
  }
  return encodePng(size, rgba);
}

function insideRoundRect(x, y, size, r) {
  const min = r;
  const max = size - r;
  const cx = Math.max(min, Math.min(x, max));
  const cy = Math.max(min, Math.min(y, max));
  return Math.hypot(x - cx, y - cy) <= r;
}

const outDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'icons');
mkdirSync(outDir, { recursive: true });
for (const size of SIZES) {
  writeFileSync(join(outDir, `icon${size}.png`), makeIcon(size));
  console.log(`icons/icon${size}.png`);
}
