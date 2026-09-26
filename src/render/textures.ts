/**
 * Procedural 128×128 world textures (spec §2): natural ground (rot, grass, mud, sand, snow), rock
 * all of a piece (standing stones, playtest round 7), wet flesh, water and figure cloth here; masonry, flagstones, brick, cobbles, clapboard, shingles and
 * wood in textureMasonry.ts. Pure (no Three.js): tileable RGBA8 pixels built only from the muted base
 * palette. A texture spans twice the texels of the old 64-texel set at the same density, so it repeats
 * half as often; world materials also vary it in world space (shaders/world.ts).
 */

import { fbm } from '../core/noise';
import { hash2 } from '../core/rng';
import { BASE, mixRgb, scaleRgb } from './palette';
import { brick, clapboard, cobble, shingle, slab, stone, wood, type TexelFn } from './textureMasonry';

export const TEXTURE_SIZE = 128;
/** UV units per texture repeat: geometry UVs count 64 texels to the unit, as they always have. */
export const UV_PER_TEXTURE = TEXTURE_SIZE / 64;
export const TEXTURE_KINDS = [
  'stone', 'slab', 'wood', 'rot', 'flesh', 'water', 'cloth', 'grass', 'mud', 'sand', 'snow', 'cobble', 'brick', 'clapboard', 'shingle', 'rock',
] as const;
export type TextureKind = (typeof TEXTURE_KINDS)[number];

/** Rotting ground: mottled earth, dark wet patches, a scatter of pale fungus that never forms a pattern. */
const rot: TexelFn = (u, v, seed) => {
  const blot = fbm(u * 8, v * 8, seed, 4, 8);
  const fine = fbm(u * 32, v * 32, seed + 5, 2, 32);
  let c = mixRgb(BASE.charcoal, BASE.rust, 0.25 + 0.35 * blot);
  c = mixRgb(c, BASE.seaGrey, 0.35 * (1 - blot));
  c = scaleRgb(c, 0.8 + 0.35 * fine);
  if (blot < 0.38) c = scaleRgb(c, 0.7);
  if (fine > 0.8 && hash2(Math.floor(u * 64), Math.floor(v * 64), seed) < 0.5) c = mixRgb(c, BASE.bone, 0.3);
  return c;
};

/** Dead grass: tufts of pale straw over bare earth, darker hollows, a few bright stalks. */
const grass: TexelFn = (u, v, seed) => {
  const clump = fbm(u * 6, v * 6, seed, 3, 6);
  const tuft = fbm(u * 40, v * 40, seed + 3, 2, 40);
  const stalk = hash2(Math.floor(u * 128), Math.floor(v * 128), seed + 9);
  const earth = mixRgb(BASE.charcoal, BASE.rust, 0.3);
  const straw = mixRgb(mixRgb(BASE.seaGrey, BASE.bone, 0.3), BASE.rust, 0.18);
  let c = mixRgb(earth, straw, Math.min(1, Math.max(0, (clump - 0.3) * 1.8 + (tuft - 0.5) * 0.9)));
  c = scaleRgb(c, 0.8 + 0.35 * tuft);
  if (stalk > 0.96 && clump > 0.42) c = mixRgb(c, BASE.bone, 0.25);
  return c;
};

/** Mud: dark wet earth, tracks of standing water with pale glints, clods. */
const mud: TexelFn = (u, v, seed) => {
  const wet = fbm(u * 4, v * 4, seed, 4, 4);
  const clod = fbm(u * 24, v * 24, seed + 4, 2, 24);
  let c = mixRgb(scaleRgb(BASE.charcoal, 0.9), BASE.rust, 0.25 + 0.2 * clod);
  if (wet > 0.58) c = mixRgb(scaleRgb(BASE.seaGrey, 0.35), BASE.seaGrey, 0.25 * clod);
  if (wet > 0.58 && clod > 0.72) c = mixRgb(c, BASE.bone, 0.35);
  return scaleRgb(c, 0.85 + 0.3 * clod);
};

/** Sand: fine grain in wind ripples, darker grit in the troughs. */
const sand: TexelFn = (u, v, seed) => {
  const warp = fbm(u * 4, v * 4, seed, 3, 4);
  const ripple = 0.5 + 0.5 * Math.sin((v * 12 + warp * 2.2) * Math.PI * 2);
  const grain = hash2(Math.floor(u * 128), Math.floor(v * 128), seed);
  let c = mixRgb(mixRgb(BASE.bone, BASE.rust, 0.3), BASE.bone, 0.3 + 0.4 * ripple);
  c = scaleRgb(c, 0.9 + 0.14 * grain);
  if (ripple < 0.12) c = scaleRgb(c, 0.8);
  return c;
};

/** Snow: bright drifts shaded in soft hollows, a little blown grit. */
const snow: TexelFn = (u, v, seed) => {
  const drift = fbm(u * 4, v * 4, seed, 4, 4);
  const crust = fbm(u * 32, v * 32, seed + 6, 2, 32);
  let c = mixRgb(mixRgb(BASE.seaGrey, BASE.bone, 0.5), BASE.bone, 0.5 + 0.5 * drift);
  c = scaleRgb(c, 0.92 + 0.1 * crust);
  if (hash2(Math.floor(u * 128), Math.floor(v * 128), seed + 1) > 0.992) c = scaleRgb(BASE.charcoal, 1.4);
  return c;
};

/** Weathered rock, all of a piece: faint strata, grain and pits, dark cracks, pale lichen in blotches. */
const rock: TexelFn = (u, v, seed) => {
  const warp = fbm(u * 3, v * 3, seed, 3, 3);
  const strata = 0.5 + 0.5 * Math.sin((v * 6 + warp * 1.5) * Math.PI * 2);
  const grain = fbm(u * 24, v * 24, seed + 3, 3, 24);
  const crack = 1 - Math.abs(2 * fbm(u * 6, v * 6, seed + 7, 4, 6) - 1);
  const lichen = fbm(u * 10, v * 10, seed + 11, 3, 10);
  let c = mixRgb(mixRgb(BASE.charcoal, BASE.seaGrey, 0.6), BASE.bone, 0.1 + 0.14 * strata);
  c = scaleRgb(c, 0.8 + 0.34 * grain);
  if (crack > 0.94) c = scaleRgb(c, 0.55);
  if (lichen > 0.64) c = mixRgb(c, mixRgb(BASE.bone, BASE.seaGrey, 0.35), Math.min(0.6, (lichen - 0.64) * 2.2));
  if (grain < 0.3 && hash2(Math.floor(u * 128), Math.floor(v * 128), seed) < 0.35) c = scaleRgb(c, 0.72); // pits
  return c;
};

/** Wet flesh: pale meat, dark branching veins, glossy glints. */
const flesh: TexelFn = (u, v, seed) => {
  const vein = 1 - Math.abs(2 * fbm(u * 8, v * 8, seed, 4, 8) - 1);
  const meat = fbm(u * 16, v * 16, seed + 3, 3, 16);
  const gloss = fbm(u * 32, v * 32, seed + 9, 2, 32);
  let c = mixRgb(BASE.rust, BASE.bone, 0.35 + 0.35 * meat);
  if (vein > 0.86) c = scaleRgb(BASE.rust, 0.45);
  if (gloss > 0.72) c = mixRgb(c, BASE.bone, 0.6);
  return c;
};

/** Dark still water: wavy ripples with pale crests. */
const water: TexelFn = (u, v, seed) => {
  const warp = fbm(u * 8, v * 8, seed, 3, 8);
  const wave = 0.5 + 0.5 * Math.sin((v * 10 + warp * 1.2) * Math.PI * 2);
  let c = mixRgb(scaleRgb(BASE.seaGrey, 0.3), BASE.seaGrey, 0.2 + 0.5 * wave * warp);
  if (wave > 0.93) c = mixRgb(c, BASE.bone, 0.3);
  return c;
};

/** Figure cloth: near-flat mid grey in broad value blocks (4-texel folds, 8-texel patches), so tinted parts read as shapes. */
const cloth: TexelFn = (u, v, seed) => {
  const fold = hash2(Math.floor(u * 32), 0, seed);
  const patch = hash2(Math.floor(u * 16), Math.floor(v * 16), seed + 1);
  const k = 0.5 * (0.86 + 0.16 * fold + 0.12 * patch);
  return [k, k, k];
};

const TEXELS: Record<TextureKind, TexelFn> = { stone, slab, wood, rot, flesh, water, cloth, grass, mud, sand, snow, cobble, brick, clapboard, shingle, rock };

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
