/**
 * Procedural 64×64 world textures (spec §2): stone, floor slabs, wood, rot, wet flesh, water,
 * figure cloth. Pure (no Three.js): tileable RGBA8 pixels built only from the muted base palette.
 */

import { fbm } from '../core/noise';
import { hash2 } from '../core/rng';
import { BASE, mixRgb, scaleRgb, type Rgb } from './palette';

export const TEXTURE_SIZE = 64;
export const TEXTURE_KINDS = ['stone', 'slab', 'wood', 'rot', 'flesh', 'water', 'cloth'] as const;
export type TextureKind = (typeof TEXTURE_KINDS)[number];

/** Colour at texture coordinate (u, v) in [0, 1). Must tile across the edges. */
type TexelFn = (u: number, v: number, seed: number) => Rgb;

/** Distance in pixels from `t` (0..1 across a cell `px` pixels wide) to the nearest cell edge. */
const edgePx = (t: number, px: number): number => Math.min(t, 1 - t) * px;

/** Staggered masonry: 2 blocks × 4 rows, mortar, per-block tone, grain, cracks. */
const stone: TexelFn = (u, v, seed) => {
  const y = v * 4;
  const row = Math.floor(y);
  const x = u * 2 + (row % 2) * 0.5;
  const col = Math.floor(x);
  const mortar = Math.min(edgePx(x - col, 32), edgePx(y - row, 16));
  const tone = hash2(col % 2, row, seed);
  const grain = fbm(u * 8, v * 8, seed, 3, 8);
  const crack = 1 - Math.abs(2 * fbm(u * 4, v * 4, seed + 7, 3, 4) - 1);
  let c = mixRgb(BASE.charcoal, BASE.seaGrey, 0.35 + 0.35 * tone);
  c = mixRgb(c, BASE.bone, 0.3 * grain);
  if (crack > 0.93) c = scaleRgb(c, 0.55);
  if (mortar < 1.2) c = scaleRgb(BASE.charcoal, 0.7);
  return c;
};

/** Floor flagstones: 2 × 2 slabs of 32 texels in staggered rows, grout darker than the slab (never black),
 *  faint grain, and a few thin, low-contrast cracks. */
const slab: TexelFn = (u, v, seed) => {
  const y = v * 2;
  const row = Math.floor(y);
  const x = u * 2 + (row % 2) * 0.5;
  const col = Math.floor(x);
  const grout = Math.min(edgePx(x - col, 32), edgePx(y - row, 32));
  const tone = hash2(col % 2, row, seed);
  const grain = fbm(u * 8, v * 8, seed, 2, 8);
  const crack = 1 - Math.abs(2 * fbm(u * 4, v * 4, seed + 7, 3, 4) - 1);
  let c = mixRgb(BASE.seaGrey, BASE.bone, 0.15 + 0.2 * tone);
  c = scaleRgb(c, 0.88 + 0.16 * grain);
  if (crack > 0.975 && hash2(col % 2, row, seed + 5) < 0.5) c = scaleRgb(c, 0.8);
  if (grout < 1) c = scaleRgb(c, 0.55);
  return c;
};

/** Four vertical planks with dark seams and wavy grain. */
const wood: TexelFn = (u, v, seed) => {
  const x = u * 4;
  const plank = Math.floor(x);
  const fx = x - plank;
  const warp = fbm(u * 16, v * 2, seed + plank * 31, 3, 16, 2);
  const grain = 0.5 + 0.5 * Math.sin((fx * 5 + warp * 2.5) * Math.PI * 2);
  let c = mixRgb(scaleRgb(BASE.rust, 0.55), BASE.rust, 0.3 + 0.4 * hash2(plank, 0, seed));
  c = mixRgb(c, BASE.bone, 0.08 + 0.14 * grain);
  if (edgePx(fx, 16) < 1) c = scaleRgb(BASE.charcoal, 0.6);
  return c;
};

/** Rotting ground: mottled earth, dark wet patches, pale fungus specks. */
const rot: TexelFn = (u, v, seed) => {
  const blot = fbm(u * 4, v * 4, seed, 4, 4);
  const fine = fbm(u * 16, v * 16, seed + 5, 2, 16);
  let c = mixRgb(BASE.charcoal, BASE.rust, 0.25 + 0.35 * blot);
  c = mixRgb(c, BASE.seaGrey, 0.35 * (1 - blot));
  c = scaleRgb(c, 0.75 + 0.5 * fine);
  if (blot < 0.38) c = scaleRgb(c, 0.6);
  if (fine > 0.74) c = mixRgb(c, BASE.bone, 0.45);
  return c;
};

/** Wet flesh: pale meat, dark branching veins, glossy glints. */
const flesh: TexelFn = (u, v, seed) => {
  const vein = 1 - Math.abs(2 * fbm(u * 4, v * 4, seed, 4, 4) - 1);
  const meat = fbm(u * 8, v * 8, seed + 3, 3, 8);
  const gloss = fbm(u * 16, v * 16, seed + 9, 2, 16);
  let c = mixRgb(BASE.rust, BASE.bone, 0.35 + 0.35 * meat);
  if (vein > 0.86) c = scaleRgb(BASE.rust, 0.45);
  if (gloss > 0.72) c = mixRgb(c, BASE.bone, 0.6);
  return c;
};

/** Dark still water: wavy horizontal ripples with pale crests. */
const water: TexelFn = (u, v, seed) => {
  const warp = fbm(u * 4, v * 4, seed, 3, 4);
  const wave = 0.5 + 0.5 * Math.sin((v * 5 + warp * 1.2) * Math.PI * 2);
  let c = mixRgb(scaleRgb(BASE.seaGrey, 0.3), BASE.seaGrey, 0.2 + 0.5 * wave * warp);
  if (wave > 0.93) c = mixRgb(c, BASE.bone, 0.3);
  return c;
};

/** Figure cloth: near-flat mid grey in broad value blocks (4-texel folds, 8-texel patches), so tinted parts read as shapes. */
const cloth: TexelFn = (u, v, seed) => {
  const fold = hash2(Math.floor(u * 16), 0, seed);
  const patch = hash2(Math.floor(u * 8), Math.floor(v * 8), seed + 1);
  const k = 0.5 * (0.86 + 0.16 * fold + 0.12 * patch);
  return [k, k, k];
};

const TEXELS: Record<TextureKind, TexelFn> = { stone, slab, wood, rot, flesh, water, cloth };

const to8 = (x: number): number => Math.round(Math.min(1, Math.max(0, x)) * 255);

/** RGBA8 pixels, TEXTURE_SIZE × TEXTURE_SIZE, row-major. */
export function generateTexture(kind: TextureKind, seed: number): Uint8Array {
  const s = TEXTURE_SIZE;
  const out = new Uint8Array(s * s * 4);
  const texel = TEXELS[kind];
  for (let y = 0; y < s; y++) {
    for (let x = 0; x < s; x++) {
      const c = texel((x + 0.5) / s, (y + 0.5) / s, seed);
      const i = (y * s + x) * 4;
      out[i] = to8(c[0]);
      out[i + 1] = to8(c[1]);
      out[i + 2] = to8(c[2]);
      out[i + 3] = 255;
    }
  }
  return out;
}
