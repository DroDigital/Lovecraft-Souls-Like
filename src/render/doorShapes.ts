/**
 * The shapes of the dungeons' doors (round 27; data/doors.ts): each kind's leaves, built in the
 * frame of their hinge (a leaf runs from its pivot along +x toward the doorway's middle; the
 * doorway's local +z runs through it), with a frame that stays still. A look's parts are made once
 * and shared by every door of it. Render only.
 */

import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import type { DoorLook } from '../data/doors';
import type { Vec3 } from '../data/tuning';
import { box, tileUv } from './meshKit';
import type { Rgb } from './palette';
import { createWorldMaterial } from './worldMaterial';
import type { TextureKind } from './textures';

export interface LeafPart {
  geo: THREE.BufferGeometry;
  glow?: THREE.BufferGeometry; // what shines on it
}

export interface DoorParts {
  left: LeafPart; // pivot at the doorway's -x jamb, extends +x
  right: LeafPart; // pivot at its +x jamb, extends -x
  frame: THREE.BufferGeometry | null; // what stays still
  solid: THREE.ShaderMaterial;
  shine: THREE.ShaderMaterial;
}

const cache = new Map<string, DoorParts>();
/** Doors are seen by a lantern against lit walls, and the wood and iron of the kits' tones went black beside them: every colour is lifted by this much. */
const LIFT = 1.9;
const vary = (c: Vec3, k: number): Rgb => [Math.min(1, c[0] * k), Math.min(1, c[1] * k), Math.min(1, c[2] * k)];
const lifted = (look: DoorLook): DoorLook => ({ ...look, tone: vary(look.tone, LIFT), trim: vary(look.trim, LIFT) });
const wrap = (list: THREE.BufferGeometry[], w: number, h: number): THREE.BufferGeometry => tileUv(mergeGeometries(list), w, h, 1.5);
const merged = (list: THREE.BufferGeometry[]): THREE.BufferGeometry => mergeGeometries(list);

/** A box from x0..x1 (in the leaf's frame), y0..y1, and z ±d/2. */
const slab = (x0: number, x1: number, y0: number, y1: number, d: number, c: Rgb, z = 0): THREE.BufferGeometry => box(x1 - x0, y1 - y0, d, (x0 + x1) / 2, (y0 + y1) / 2, z, c);

function plank(look: DoorLook, lw: number, h: number, s: 1 | -1): LeafPart {
  const at = (a: number, b: number): [number, number] => (s === 1 ? [a, b] : [-b, -a]);
  const planks = Array.from({ length: 4 }, (_, i) => slab(...at((i * lw) / 4 + 0.012, ((i + 1) * lw) / 4 - 0.012), 0, h, 0.14, vary(look.tone, 0.88 + 0.06 * ((i * 7) % 3))));
  const bands = [0.5, h / 2, h - 0.55].map((y) => slab(...at(0.02, lw - 0.02), y - 0.07, y + 0.07, 0.2, look.trim));
  const pull = slab(...at(lw - 0.3, lw - 0.22), 1.2, 1.5, 0.3, look.trim);
  const glow = look.glow ? [slab(...at(lw * 0.45, lw * 0.45 + 0.07), 0.6, h - 0.6, 0.23, look.glow), slab(...at(lw * 0.2, lw * 0.7), h * 0.5 - 0.04, h * 0.5 + 0.04, 0.23, look.glow)] : [];
  return { geo: wrap([...planks, ...bands, pull], lw, h), ...(glow.length && { glow: merged(glow) }) };
}

function grille(look: DoorLook, lw: number, h: number, s: 1 | -1): LeafPart {
  const at = (a: number, b: number): [number, number] => (s === 1 ? [a, b] : [-b, -a]);
  const bars = Array.from({ length: Math.floor(lw / 0.3) }, (_, i) => slab(...at(0.15 + i * 0.3 - 0.035, 0.15 + i * 0.3 + 0.035), 0.05, h - 0.05, 0.08, look.tone));
  const rails = [0.3, h / 2, h - 0.3].map((y) => slab(...at(0.02, lw - 0.02), y - 0.06, y + 0.06, 0.14, look.trim));
  const stiles = [slab(...at(0.02, 0.12), 0, h, 0.14, look.trim), slab(...at(lw - 0.12, lw - 0.02), 0, h, 0.14, look.trim)];
  return { geo: wrap([...bars, ...rails, ...stiles], lw, h) };
}

/** A slab: one piece across the whole doorway (the left holds it, the right is nothing), wider and taller than the opening so its edges lie in the wall. */
function stone(look: DoorLook, w: number, h: number): LeafPart {
  const [sw, sh] = [w + 0.6, h + 0.2];
  const body = slab(-sw / 2, sw / 2, 0, sh, 0.5, look.tone);
  const bands = [0.18, 0.5, 0.82].map((k) => slab(-w / 2 + 0.1, w / 2 - 0.1, sh * k - 0.05, sh * k + 0.05, 0.56, look.trim));
  const glow = look.glow ? [slab(-0.05, 0.05, 0.4, sh - 0.4, 0.58, look.glow), ...[0.3, 0.5, 0.7].map((k) => slab(-0.7, 0.7, sh * k - 0.04, sh * k + 0.04, 0.58, look.glow!))] : [];
  return { geo: wrap([body, ...bands], sw, sh), ...(glow.length && { glow: merged(glow) }) };
}

/** A valve: slices that swell toward the middle of its height, their edge drawn thin. */
function valve(look: DoorLook, lw: number, h: number, s: 1 | -1): LeafPart {
  const n = 12;
  const at = (a: number, b: number): [number, number] => (s === 1 ? [a, b] : [-b, -a]);
  const slices = Array.from({ length: n }, (_, i) => {
    const y = (i / n) * h;
    const bulge = Math.sin(((i + 0.5) / n) * Math.PI);
    return slab(...at(0.02, lw - 0.02 * (1 - bulge)), y, y + h / n + 0.02, 0.22 + 0.34 * bulge, vary(i % 2 ? look.tone : look.trim, 0.9 + 0.1 * bulge));
  });
  const vein = look.glow ? [slab(...at(lw - 0.14, lw - 0.06), 0.2, h - 0.2, 0.7, look.glow)] : [];
  return { geo: wrap(slices, lw, h), ...(vein.length && { glow: merged(vein) }) };
}

/** A drape: slats with their folds toward and away. */
function drape(look: DoorLook, lw: number, h: number, s: 1 | -1): LeafPart {
  const n = 7;
  const at = (a: number, b: number): [number, number] => (s === 1 ? [a, b] : [-b, -a]);
  const folds = Array.from({ length: n }, (_, i) => slab(...at((i * lw) / n, ((i + 1) * lw) / n + 0.01), 0.1, h - 0.15, 0.06, vary(look.tone, 0.82 + 0.22 * (i % 2)), i % 2 ? 0.05 : -0.05));
  const hem = slab(...at(0, lw), 0.06, 0.2, 0.14, look.trim);
  return { geo: wrap([...folds, hem], lw, h) };
}

/** The frame that stays: posts and a lintel beam (timber or iron), a rod (drapes), none (slabs, valves). */
function frameOf(look: DoorLook, w: number, h: number): THREE.BufferGeometry | null {
  const c = vary(look.kind === 'grille' ? look.trim : look.tone, 0.72);
  if (look.kind === 'plank' || look.kind === 'grille') return wrap([slab(-w / 2 - 0.16, -w / 2 + 0.02, 0, h, 0.34, c), slab(w / 2 - 0.02, w / 2 + 0.16, 0, h, 0.34, c), slab(-w / 2 - 0.16, w / 2 + 0.16, h - 0.22, h, 0.38, c)], w, h);
  if (look.kind === 'curtain') return wrap([slab(-w / 2 - 0.1, w / 2 + 0.1, h - 0.16, h - 0.04, 0.16, look.trim)], w, h);
  return null;
}

const TEXTURE: Record<DoorLook['kind'], TextureKind> = { plank: 'wood', grille: 'stone', slab: 'slab', membrane: 'flesh', curtain: 'cloth' };

/** The parts of a door of `look`, for a doorway `w` wide and `h` high; made once. */
export function doorParts(given: DoorLook, w: number, h: number): DoorParts {
  const look = lifted(given);
  const key = `${given.kind}${given.tone}${given.trim}${given.glow ?? ''}${w}${h}`;
  let p = cache.get(key);
  if (p) return p;
  const lw = w / 2 - 0.02;
  const build = { plank, grille, slab: null, membrane: valve, curtain: drape }[look.kind];
  const [left, right]: [LeafPart, LeafPart] = build ? [build(look, lw, h - 0.03, 1), build(look, lw, h - 0.03, -1)] : [stone(look, w, h), { geo: new THREE.BufferGeometry() }];
  const uv: [number, number] = look.kind === 'plank' ? [0.5, 0.5] : [1, 1];
  p = {
    left, right, frame: frameOf(look, w, h),
    solid: createWorldMaterial({ texture: TEXTURE[look.kind], seed: 8, vertexColors: true, vary: 0.4, uvScale: uv }),
    shine: createWorldMaterial({ texture: 'cloth', seed: 8, vertexColors: true, emissive: 1 }),
  };
  cache.set(key, p);
  return p;
}
