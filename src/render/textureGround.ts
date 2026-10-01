/**
 * Natural ground texels (pure; round 32): meadow grass, dirt, mud, blighted earth, sand, snow, gravel
 * and leaf litter, each a function of (u, v) in [0, 1) that tiles across the edges, 128 texels square
 * (about 4 m of ground). They carry the ground's own colours, muted; the realm's grade (data/looks.ts)
 * and the biome's tint give the rest. Round 32: the old ones were dark red-brown with pale mottling (a
 * heath looked like earth littered with cigarette ends: "pink-white blotches on dirt"), and one
 * pattern repeated all over a field. These are built of fine grain over a few soft fields at several
 * scales, with no hard-edged pale patch anywhere; world materials also mix a second ground in by
 * patches and vary the tone across the land (shaders/world.ts).
 */

import { fbm, valueNoise } from '../core/noise';
import { hash2 } from '../core/rng';
import { mixRgb, scaleRgb, type Rgb } from './palette';
import type { TexelFn } from './textureMasonry';

const clamp01 = (x: number): number => Math.min(1, Math.max(0, x));

/** A colour along `stops`, `t` in 0..1 from the first to the last. */
function ramp(stops: readonly Rgb[], t: number): Rgb {
  const x = clamp01(t) * (stops.length - 1);
  const i = Math.min(stops.length - 2, Math.floor(x));
  return mixRgb(stops[i], stops[i + 1], x - i);
}

const px = (u: number, v: number): [number, number] => [Math.floor(u * 128), Math.floor(v * 128)];

/** Meadow grass: soft clumps of dark and bright blades, bare soil in the hollows, a few straw stalks. */
export const grass: TexelFn = (u, v, seed) => {
  const clump = fbm(u * 3, v * 3, seed, 3, 3);
  const mid = fbm(u * 10, v * 10, seed + 2, 3, 10);
  const blade = valueNoise(u * 64, v * 14, seed + 5, 64, 14); // short upright strokes
  const [x, y] = px(u, v);
  const speck = hash2(x, y, seed + 9);
  const f = 0.42 * clump + 0.33 * mid + 0.25 * blade;
  let c = ramp([[0.12, 0.16, 0.09], [0.2, 0.27, 0.13], [0.3, 0.38, 0.17], [0.42, 0.46, 0.22], [0.5, 0.46, 0.28]], (f - 0.25) * 1.9);
  if (clump < 0.3) c = mixRgb(c, [0.21, 0.16, 0.11], Math.min(0.8, (0.3 - clump) * 3)); // bare soil in the hollows
  c = scaleRgb(c, 0.88 + 0.24 * valueNoise(u * 128, v * 128, seed + 11, 128, 128));
  if (speck > 0.975) c = scaleRgb(c, 1.28);
  else if (speck < 0.03) c = scaleRgb(c, 0.7);
  return c;
};

/** Dirt: brown earth in grain and clods, a few small stones, soft dry hollows. */
export const dirt: TexelFn = (u, v, seed) => {
  const broad = fbm(u * 5, v * 5, seed, 3, 5);
  const clod = fbm(u * 20, v * 20, seed + 3, 3, 20);
  const hollow = fbm(u * 8, v * 8, seed + 13, 3, 8);
  const [x, y] = px(u, v);
  const grain = hash2(x, y, seed + 7);
  let c = ramp([[0.17, 0.12, 0.08], [0.29, 0.21, 0.14], [0.42, 0.33, 0.23]], 0.45 * broad + 0.4 * clod + 0.15 * grain);
  const cell = 18; // stones: one in eight cells holds a small brown one
  const [cx, cy] = [Math.floor(u * cell), Math.floor(v * cell)];
  if (hash2(cx % cell, cy % cell, seed + 21) < 0.125) {
    const [sx, sy] = [(cx + 0.25 + 0.5 * hash2(cx % cell, cy % cell, seed + 22)) / cell, (cy + 0.25 + 0.5 * hash2(cx % cell, cy % cell, seed + 23)) / cell];
    const d = Math.hypot(u - sx, v - sy) * 128;
    if (d < 1.5 + 1.1 * hash2(cx % cell, cy % cell, seed + 24)) c = mixRgb(c, [0.4, 0.35, 0.29], 0.8);
    else if (d < 2.6 && u > sx) c = scaleRgb(c, 0.74); // its shadow
  }
  if (hollow < 0.3) c = scaleRgb(c, 0.8 + (hollow / 0.3) * 0.2); // a hollow, darker
  return c;
};

/** Mud: dark wet earth, faint ruts, a dull sheen where the water stands. */
export const mud: TexelFn = (u, v, seed) => {
  const wet = fbm(u * 4, v * 4, seed, 4, 4);
  const clod = fbm(u * 24, v * 24, seed + 4, 2, 24);
  const warp = fbm(u * 3, v * 3, seed + 6, 2, 3);
  const rut = 0.5 + 0.5 * Math.sin((u * 5 + warp * 1.4) * Math.PI * 2);
  const [x, y] = px(u, v);
  let c = ramp([[0.08, 0.06, 0.045], [0.18, 0.14, 0.105], [0.31, 0.24, 0.18]], 0.55 * clod + 0.3 * wet + 0.15 * hash2(x, y, seed + 2));
  if (rut < 0.25) c = scaleRgb(c, 0.8);
  if (wet > 0.56) c = mixRgb(c, [0.24, 0.24, 0.24], Math.min(0.5, (wet - 0.56) * 3)); // standing water, dull
  return c;
};

/** Blighted earth: ash and sick olive over black soil, pale spores in the hollows. */
export const rot: TexelFn = (u, v, seed) => {
  const blot = fbm(u * 6, v * 6, seed, 4, 6);
  const fine = fbm(u * 28, v * 28, seed + 5, 2, 28);
  const [x, y] = px(u, v);
  let c = ramp([[0.08, 0.07, 0.07], [0.17, 0.15, 0.13], [0.25, 0.25, 0.16], [0.33, 0.32, 0.27]], 0.6 * blot + 0.4 * fine);
  if (blot < 0.34) c = scaleRgb(c, 0.88);
  if (fine > 0.74 && hash2(x, y, seed + 3) < 0.3) c = mixRgb(c, [0.42, 0.46, 0.34], 0.5);
  return c;
};

/** Sand: soft wind ripples of varied wavelength, fine grain, a slow drift of tone. */
export const sand: TexelFn = (u, v, seed) => {
  const warp = fbm(u * 3, v * 3, seed, 3, 3);
  const warp2 = fbm(u * 6, v * 6, seed + 8, 2, 6);
  const ripple = 0.5 + 0.5 * Math.sin((v * 11 + warp * 2.6 + warp2 * 0.8) * Math.PI * 2);
  const drift = fbm(u * 4, v * 4, seed + 4, 3, 4);
  const [x, y] = px(u, v);
  const grain = hash2(x, y, seed + 1);
  let c = ramp([[0.5, 0.39, 0.25], [0.64, 0.52, 0.34], [0.76, 0.64, 0.44]], 0.35 * drift + 0.4 * ripple + 0.25 * grain);
  c = scaleRgb(c, 0.92 + 0.12 * grain);
  if (ripple < 0.08) c = scaleRgb(c, 0.86);
  return c;
};

/** Snow: bright drifts shaded blue in the hollows, a soft crust, glitter, a few specks of grit. */
export const snow: TexelFn = (u, v, seed) => {
  const drift = fbm(u * 4, v * 4, seed, 4, 4);
  const crust = fbm(u * 32, v * 32, seed + 6, 2, 32);
  const [x, y] = px(u, v);
  const h = hash2(x, y, seed + 1);
  let c = ramp([[0.5, 0.58, 0.72], [0.66, 0.73, 0.85], [0.82, 0.87, 0.95]], 0.15 + 0.7 * drift + 0.15 * crust);
  if (h > 0.996) c = [1, 1, 1];
  else if (h < 0.0015) c = [0.36, 0.38, 0.44];
  return c;
};

interface Piece {
  x: number;
  y: number;
  rx: number; // half length and half width, as shares of the texture
  ry: number;
  cos: number;
  sin: number;
  tone: number; // which colour
  shade: number;
}

const scattered = new Map<string, readonly Piece[]>();

/** `n` pieces, long in a random direction, seeded: later ones lie over the earlier. */
function scatter(kind: string, seed: number, n: number, [rmin, rmax]: readonly [number, number], flat: number, tones: number): readonly Piece[] {
  const key = `${kind}:${seed}`;
  let list = scattered.get(key);
  if (!list) {
    list = Array.from({ length: n }, (_, i): Piece => {
      const h = (k: number): number => hash2(i, k, seed + 777);
      const rx = (rmin + (rmax - rmin) * h(1)) / 128;
      const a = h(2) * Math.PI;
      return { x: h(3), y: h(4), rx, ry: rx * (flat + (1 - flat) * h(5)), cos: Math.cos(a), sin: Math.sin(a), tone: Math.floor(h(6) * tones), shade: 0.85 + 0.3 * h(7) };
    });
    scattered.set(key, list);
  }
  return list;
}

/** The topmost piece covering (u, v) (wrapping at the edges), and how far in (0 at its rim, 1 at its heart); across (-1..1): the offset from its long axis. */
function topmost(pieces: readonly Piece[], u: number, v: number): { piece: Piece; inside: number; across: number } | null {
  for (let i = pieces.length - 1; i >= 0; i--) {
    const p = pieces[i];
    const dx = ((u - p.x + 1.5) % 1) - 0.5;
    const dy = ((v - p.y + 1.5) % 1) - 0.5;
    const along = (dx * p.cos + dy * p.sin) / p.rx;
    const across = (-dx * p.sin + dy * p.cos) / p.ry;
    const q = along * along + across * across;
    if (q < 1) return { piece: p, inside: 1 - Math.sqrt(q), across };
  }
  return null;
}

const STONES: readonly Rgb[] = [[0.42, 0.39, 0.35], [0.5, 0.46, 0.4], [0.35, 0.35, 0.36], [0.46, 0.41, 0.32], [0.31, 0.29, 0.28], [0.54, 0.5, 0.45]];

/** Gravel: stones of many sizes thrown down, grey, brown and ochre, each rounded and shaded, dark between. */
export const gravel: TexelFn = (u, v, seed) => {
  const hit = topmost(scatter('gravel', seed, 360, [2, 7], 0.55, STONES.length), u, v);
  const between = scaleRgb([0.17, 0.16, 0.14], 0.8 + 0.4 * fbm(u * 30, v * 30, seed, 2, 30));
  if (!hit) return between;
  const dome = 0.7 + 0.45 * Math.min(1, hit.inside * 1.7) + 0.12 * (hit.across < 0 ? 1 : -1) * (1 - hit.inside); // lit from one side
  return scaleRgb(STONES[hit.piece.tone], hit.piece.shade * dome);
};

const LEAVES: readonly Rgb[] = [[0.46, 0.3, 0.15], [0.5, 0.38, 0.18], [0.38, 0.23, 0.12], [0.33, 0.27, 0.14], [0.27, 0.2, 0.12], [0.41, 0.33, 0.17]];

/** Leaf litter: fallen leaves of russet, gold and brown lying over each other, each veined along its length. */
export const leaves: TexelFn = (u, v, seed) => {
  const hit = topmost(scatter('leaves', seed, 340, [3.5, 8], 0.4, LEAVES.length), u, v);
  const ground = scaleRgb([0.2, 0.15, 0.1], 0.8 + 0.4 * fbm(u * 24, v * 24, seed, 2, 24));
  if (!hit) return ground;
  const vein = Math.abs(hit.across) < 0.1 ? 0.78 : 1;
  const edge = 0.78 + 0.3 * Math.min(1, hit.inside * 2.2);
  return scaleRgb(LEAVES[hit.piece.tone], hit.piece.shade * vein * edge);
};
