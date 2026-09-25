/**
 * Built-surface texels (pure): masonry, flagstones, brick, cobbles, clapboard, shingles and planks,
 * each a function of (u, v) in [0, 1) that tiles across the edges. The textures are 128 texels
 * square (textures.ts), about 4 m of ground: blocks and slabs vary in tone, cracks, moss and wear.
 */

import { fbm } from '../core/noise';
import { hash2 } from '../core/rng';
import { BASE, mixRgb, scaleRgb, type Rgb } from './palette';

/** Colour at texture coordinate (u, v) in [0, 1). Must tile across the edges. */
export type TexelFn = (u: number, v: number, seed: number) => Rgb;

/** Distance in texels from `t` (0..1 across a cell `px` texels wide) to the nearest cell edge. */
export const edgePx = (t: number, px: number): number => Math.min(t, 1 - t) * px;

const MOSS: Rgb = mixRgb(BASE.seaGrey, BASE.charcoal, 0.45);

/** Staggered masonry: 4 blocks × 8 rows of 32 × 16 texels, mortar, per-block tone and chips, grain, cracks, damp. */
export const stone: TexelFn = (u, v, seed) => {
  const y = v * 8;
  const row = Math.floor(y);
  const x = u * 4 + (row % 2) * 0.5 + 0.13 * (hash2(0, row, seed + 3) - 0.5) * (row % 2 ? 0 : 1);
  const col = Math.floor(x);
  const [fx, fy] = [x - col, y - row];
  const chip = hash2(col % 4, row, seed + 9) < 0.25 && fx + fy < 0.18;
  const mortar = Math.min(edgePx(fx, 32), edgePx(fy, 16));
  const tone = hash2(col % 4, row, seed);
  const grain = fbm(u * 16, v * 16, seed, 3, 16);
  const crack = 1 - Math.abs(2 * fbm(u * 8, v * 8, seed + 7, 3, 8) - 1);
  const damp = fbm(u * 2, v * 2, seed + 21, 2, 2);
  let c = mixRgb(BASE.charcoal, BASE.seaGrey, 0.3 + 0.4 * tone);
  c = mixRgb(c, BASE.bone, 0.28 * grain);
  c = mixRgb(c, MOSS, Math.max(0, damp - 0.55) * 1.2);
  if (crack > 0.94) c = scaleRgb(c, 0.55);
  if (mortar < 1.4 || chip) c = scaleRgb(BASE.charcoal, 0.75 + 0.2 * grain);
  else if (mortar < 2.4) c = scaleRgb(c, 0.82); // bevelled edge
  return c;
};

/** Flagstones: 4 rows of 32-texel slabs, each row shifted by its own amount; grout (never black), tone, wear, cracks, moss in the joints. */
export const slab: TexelFn = (u, v, seed) => {
  const y = v * 4;
  const row = Math.floor(y);
  const x = u * 4 + hash2(row, 1, seed + 4) * 0.8;
  const col = Math.floor(x);
  const [fx, fy] = [x - col, y - row];
  const grout = Math.min(edgePx(fx, 32), edgePx(fy, 32));
  const tone = hash2(col % 4, row, seed);
  const grain = fbm(u * 16, v * 16, seed, 2, 16);
  const wear = fbm(u * 4, v * 4, seed + 13, 3, 4);
  const crack = 1 - Math.abs(2 * fbm(u * 8, v * 8, seed + 7, 3, 8) - 1);
  let c = mixRgb(BASE.seaGrey, BASE.bone, 0.12 + 0.24 * tone);
  c = scaleRgb(c, 0.86 + 0.18 * grain);
  c = mixRgb(c, BASE.charcoal, Math.max(0, wear - 0.6) * 0.8);
  if (crack > 0.972 && hash2(col % 4, row, seed + 5) < 0.55) c = scaleRgb(c, 0.78);
  if (grout < 1.2) c = mixRgb(scaleRgb(c, 0.55), MOSS, 0.35 * grain);
  return c;
};

/** Small bricks, 16 × 8 texels in running bond, with pale mortar and burnt headers. */
export const brick: TexelFn = (u, v, seed) => {
  const y = v * 16;
  const row = Math.floor(y);
  const x = u * 8 + (row % 2) * 0.5;
  const col = Math.floor(x);
  const mortar = Math.min(edgePx(x - col, 16), edgePx(y - row, 8));
  const tone = hash2(col % 8, row, seed);
  const soot = fbm(u * 3, v * 3, seed + 2, 2, 3);
  let c = mixRgb(scaleRgb(BASE.rust, 0.7), mixRgb(BASE.rust, BASE.bone, 0.3), tone);
  if (tone > 0.9) c = scaleRgb(BASE.rust, 0.45); // an overfired brick
  c = mixRgb(c, BASE.charcoal, Math.max(0, soot - 0.5));
  c = scaleRgb(c, 0.9 + 0.2 * fbm(u * 32, v * 32, seed, 2, 32));
  if (mortar < 1.1) c = mixRgb(BASE.seaGrey, BASE.bone, 0.3);
  return c;
};

/** Distances to the nearest and second-nearest seed point of an n × n tiling cell grid. */
function voronoi(u: number, v: number, n: number, seed: number): readonly [number, number] {
  const [gx, gy] = [Math.floor(u * n), Math.floor(v * n)];
  let [d1, d2] = [9, 9];
  for (let j = -1; j <= 1; j++) {
    for (let i = -1; i <= 1; i++) {
      const [cx, cy] = [gx + i, gy + j];
      const [wx, wy] = [((cx % n) + n) % n, ((cy % n) + n) % n];
      const px = (cx + 0.2 + 0.6 * hash2(wx, wy, seed)) / n;
      const py = (cy + 0.2 + 0.6 * hash2(wx, wy, seed + 1)) / n;
      const d = Math.hypot(u - px, v - py) * n;
      if (d < d1) [d1, d2] = [d, d1];
      else if (d < d2) d2 = d;
    }
  }
  return [d1, d2];
}

/** Cobbles: rounded setts from a tiling Voronoi pattern, dark gaps, worn tops. */
export const cobble: TexelFn = (u, v, seed) => {
  const [d1, d2] = voronoi(u, v, 8, seed);
  const gap = d2 - d1;
  const [gx, gy] = [Math.floor(u * 8), Math.floor(v * 8)];
  const tone = hash2(gx, gy, seed + 3);
  const dome = Math.max(0, 1 - d1 * 1.4);
  let c = mixRgb(BASE.charcoal, BASE.seaGrey, 0.35 + 0.35 * tone);
  c = mixRgb(c, BASE.bone, 0.25 * dome + 0.1 * fbm(u * 32, v * 32, seed, 2, 32));
  if (gap < 0.12) c = mixRgb(scaleRgb(BASE.charcoal, 0.5), MOSS, 0.3);
  else if (gap < 0.2) c = scaleRgb(c, 0.75);
  return c;
};

/** Clapboard siding: horizontal boards 8 texels tall, each lapped over the next, weathered paint peeling to grey wood. */
export const clapboard: TexelFn = (u, v, seed) => {
  const y = v * 16;
  const row = Math.floor(y);
  const fy = y - row;
  const peel = fbm(u * 8, v * 8, seed + 5, 3, 8);
  const streak = fbm(u * 32, v * 2, seed + 1, 2, 32, 2);
  const paint = mixRgb(BASE.bone, BASE.seaGrey, 0.3 + 0.2 * hash2(0, row, seed));
  let c = peel > 0.62 ? mixRgb(BASE.seaGrey, BASE.charcoal, 0.4) : paint;
  c = scaleRgb(c, 0.8 + 0.25 * streak);
  if (fy > 0.82) c = scaleRgb(c, 0.5); // the shadow under the lap
  else c = scaleRgb(c, 0.85 + 0.15 * fy);
  if (Math.floor(u * 2 + hash2(row, 2, seed)) !== Math.floor(u * 2 + hash2(row, 2, seed) + 0.012)) c = scaleRgb(c, 0.6); // a butt joint
  return c;
};

/** Roof shingles: staggered rows of 16 × 13 texel slates, shadowed lower edges, moss and a few gaps. */
export const shingle: TexelFn = (u, v, seed) => {
  const y = v * 10; // an even number of rows, so the stagger tiles
  const row = Math.floor(y);
  const x = u * 8 + (row % 2) * 0.5 + 0.25 * hash2(row, 0, seed);
  const col = Math.floor(x);
  const [fx, fy] = [x - col, y - row];
  const tone = hash2(col % 8, row, seed);
  const moss = fbm(u * 4, v * 4, seed + 8, 3, 4);
  let c = mixRgb(scaleRgb(BASE.charcoal, 0.9), BASE.seaGrey, 0.2 + 0.4 * tone);
  c = mixRgb(c, MOSS, Math.max(0, moss - 0.55) * 1.4);
  c = scaleRgb(c, 1.05 - 0.4 * fy);
  if (edgePx(fx, 16) < 0.9 || tone > 0.96) c = scaleRgb(BASE.charcoal, 0.4);
  return c;
};

/** Eight vertical planks with dark seams, wavy grain and knots. */
export const wood: TexelFn = (u, v, seed) => {
  const x = u * 8;
  const plank = Math.floor(x);
  const fx = x - plank;
  const warp = fbm(u * 32, v * 4, seed + plank * 31, 3, 32, 4);
  const grain = 0.5 + 0.5 * Math.sin((fx * 5 + warp * 2.5) * Math.PI * 2);
  const knot = fbm(u * 16, v * 16, seed + 77, 2, 16);
  let c = mixRgb(scaleRgb(BASE.rust, 0.55), BASE.rust, 0.3 + 0.4 * hash2(plank, 0, seed));
  c = mixRgb(c, BASE.bone, 0.08 + 0.14 * grain);
  if (knot > 0.8) c = scaleRgb(c, 0.6);
  if (edgePx(fx, 16) < 1) c = scaleRgb(BASE.charcoal, 0.6);
  return c;
};
