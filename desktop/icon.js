/**
 * The window's and the package's icon (playtest round 12), drawn in code as everything else is: the
 * Elder Sign's five strokes (as render/signMeshes.ts carves them) in bone on near-black, a faint rim
 * of Cosmic Purple about them, on a rounded square. Encoded as a PNG with node's zlib; `npm run icon`
 * writes it to build/icon.png for packaging.
 */

import { deflateSync } from 'node:zlib';

// Start x and y above the stem's foot, lean from upright (radians), length: the sign's strokes.
const STROKES = [[0, 0, 0, 1.35], [0, 0.88, 0.65, 0.5], [0, 0.88, -0.65, 0.5], [0, 0.46, 0.8, 0.42], [0, 0.46, -0.8, 0.42]];
const BG = [9, 9, 11];
const BONE = [217, 208, 184];
const PURPLE = [106, 13, 173];
const SCALE = 0.5; // of the icon's side per unit of stroke
const FOOT = [0.5, 0.84];
const WIDTH = 0.036; // a stroke's half width

function segDist(px, py, [ax, ay, bx, by]) {
  const [dx, dy] = [bx - ax, by - ay];
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy)));
  return Math.hypot(px - ax - t * dx, py - ay - t * dy);
}

/** RGBA pixels of the icon, `size` square. */
export function iconPixels(size) {
  const segs = STROKES.map(([x0, y0, lean, len]) => {
    const [ax, ay] = [FOOT[0] + x0 * SCALE, FOOT[1] - y0 * SCALE];
    return [ax, ay, ax + Math.sin(lean) * len * SCALE, ay - Math.cos(lean) * len * SCALE];
  });
  const out = new Uint8Array(size * size * 4);
  const px = 1 / size;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const [u, v] = [(x + 0.5) * px, (y + 0.5) * px];
      const d = Math.min(...segs.map((s) => segDist(u, v, s)));
      const ink = Math.max(0, Math.min(1, (WIDTH - d) / (1.5 * px)));
      const glow = 0.55 * Math.exp(-(((d - WIDTH) / 0.09) ** 2)) * (1 - ink);
      const [cx, cy] = [Math.max(0, Math.abs(u - 0.5) - 0.32), Math.max(0, Math.abs(v - 0.5) - 0.32)];
      const inside = Math.max(0, Math.min(1, (0.18 - Math.hypot(cx, cy)) / (1.5 * px))); // the rounded square
      const i = (y * size + x) * 4;
      for (let k = 0; k < 3; k++) out[i + k] = Math.round(BG[k] * (1 - ink) + BONE[k] * ink + PURPLE[k] * glow);
      out[i + 3] = Math.round(255 * inside);
    }
  }
  return out;
}

const CRC = new Uint32Array(256).map((_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
function crc32(buf) {
  let c = 0xffffffff;
  for (const b of buf) c = CRC[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

/** The icon as a PNG, `size` square. */
export function iconPng(size = 256) {
  const rgba = iconPixels(size);
  const rows = Buffer.alloc(size * (size * 4 + 1));
  for (let y = 0; y < size; y++) {
    rows[y * (size * 4 + 1)] = 0; // no filter
    Buffer.from(rgba.buffer, y * size * 4, size * 4).copy(rows, y * (size * 4 + 1) + 1);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr.set([8, 6, 0, 0, 0], 8); // 8 bits, RGBA
  return Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(rows)), chunk('IEND', Buffer.alloc(0))]);
}
