/**
 * Ground cover (render only): what lies about on open ground, a few dozen to a chunk by its ground —
 * tufts of grass and October leaf litter on New England turf, reeds on the Innsmouth mud, dry grass
 * on sand, pebbles on stone and snow, nodules on Yuggoth's flesh — never on a road, a site or a
 * dungeon floor. Seeded by the chunk, so it is the same each visit. Blades are lit as the ground is
 * (their normals face up), so the cover sits in the ground's light. Nothing collides with it.
 */

import * as THREE from 'three';
import { createRng, type Rng } from '../core/rng';
import type { GroundTexture, RegionDef } from '../data/regions';
import { WORLD } from '../data/tuning';
import { worldLayout } from '../world/placements';
import { roadShare, type RoadSeg } from '../world/regionPlan';
import { inDungeon, surface } from '../world/terrain';
import { chunkKey, rectDistance } from '../world/worldMap';
import type { PropMat } from './propShapes';

type Rgb = readonly [number, number, number];
type Kind = 'tuft' | 'reed' | 'dry' | 'litter' | 'pebble' | 'nodule';

/** Pieces a chunk holds, by its ground, and what they are. */
const COVER: Readonly<Record<GroundTexture, { count: number; mix: readonly [Kind, number][] }>> = {
  grass: { count: 70, mix: [['tuft', 0.7], ['litter', 0.18], ['pebble', 0.12]] },
  rot: { count: 45, mix: [['dry', 0.7], ['pebble', 0.3]] },
  mud: { count: 45, mix: [['reed', 0.65], ['pebble', 0.35]] },
  sand: { count: 30, mix: [['dry', 0.6], ['pebble', 0.4]] },
  stone: { count: 22, mix: [['pebble', 0.7], ['dry', 0.3]] },
  slab: { count: 22, mix: [['pebble', 0.8], ['dry', 0.2]] },
  snow: { count: 12, mix: [['pebble', 1]] },
  flesh: { count: 30, mix: [['nodule', 1]] },
  water: { count: 0, mix: [] },
};

const COLORS: Readonly<Record<Kind, readonly Rgb[]>> = {
  tuft: [[0.5, 0.52, 0.34], [0.58, 0.55, 0.36], [0.44, 0.47, 0.32]],
  reed: [[0.4, 0.44, 0.34], [0.5, 0.5, 0.36]],
  dry: [[0.7, 0.62, 0.44], [0.62, 0.56, 0.42]],
  litter: [[0.72, 0.4, 0.22], [0.78, 0.58, 0.28], [0.56, 0.3, 0.2]],
  pebble: [[0.72, 0.72, 0.7], [0.62, 0.62, 0.6]],
  nodule: [[0.6, 0.44, 0.44], [0.5, 0.36, 0.38]],
};

class Builder {
  pos: number[] = [];
  col: number[] = [];
  nor: number[] = [];
  uv: number[] = [];
  /** A triangle seen from both sides (the world's materials cull back faces). */
  tri(a: readonly number[], b: readonly number[], c: readonly number[], ca: Rgb, cb: Rgb, cc: Rgb): void {
    for (const [p, col] of [[a, ca], [b, cb], [c, cc], [b, cb], [a, ca], [c, cc]] as const) {
      this.pos.push(p[0], p[1], p[2]);
      this.col.push(col[0], col[1], col[2]);
      this.nor.push(0, 1, 0); // lit as the ground is
      this.uv.push(p[0] * 0.5, p[1] * 0.5);
    }
  }
  geometry(): THREE.BufferGeometry | null {
    if (!this.pos.length) return null;
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.pos, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(this.nor, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(this.col, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(this.uv, 2));
    return g;
  }
}

const shade = (c: Rgb, k: number): Rgb => [c[0] * k, c[1] * k, c[2] * k];
const GAIN = 1.8; // textures average about half brightness: vertex colours are raised to show their own

/** Blades from (x, y, z), each a thin triangle leaning out, both faces. */
function blades(b: Builder, rng: Rng, x: number, y: number, z: number, n: number, h: number, w: number, c: Rgb): void {
  for (let i = 0; i < n; i++) {
    const a = rng() * Math.PI * 2;
    const [s, co] = [Math.sin(a), Math.cos(a)];
    const len = h * (0.6 + 0.6 * rng());
    const lean = 0.15 + 0.35 * rng();
    const base0 = [x - co * w, y, z + s * w];
    const base1 = [x + co * w, y, z - s * w];
    const tip = [x + s * len * lean, y + len, z + co * len * lean];
    const dark = shade(c, 0.6);
    b.tri(base0, base1, tip, dark, dark, c);
  }
}

/** A small rounded stone: a squat octahedron. */
function pebble(b: Builder, rng: Rng, x: number, y: number, z: number, c: Rgb): void {
  const r = 0.07 + 0.14 * rng();
  const h = r * (0.5 + 0.4 * rng());
  const a = rng() * Math.PI;
  const ring = [0, 1, 2, 3].map((k) => [x + Math.cos(a + (k * Math.PI) / 2) * r, y + h * 0.3, z + Math.sin(a + (k * Math.PI) / 2) * r]);
  const top = [x, y + h, z];
  for (let k = 0; k < 4; k++) b.tri(ring[k], ring[(k + 1) % 4], top, shade(c, 0.8), shade(c, 0.8), c);
}

/** Fallen leaves lying flat, a few together. */
function litter(b: Builder, rng: Rng, x: number, y: number, z: number): void {
  for (let i = 0; i < 4; i++) {
    const c = shade(COLORS.litter[Math.floor(rng() * COLORS.litter.length)], GAIN);
    const [lx, lz] = [x + (rng() - 0.5) * 0.9, z + (rng() - 0.5) * 0.9];
    const a = rng() * Math.PI;
    const [s, co] = [Math.sin(a) * 0.1, Math.cos(a) * 0.1];
    const ly = y + 0.03;
    b.tri([lx - co, ly, lz - s], [lx + s * 0.6, ly, lz - co * 0.6], [lx + co, ly, lz + s], c, c, c);
    b.tri([lx - co, ly, lz - s], [lx - s * 0.6, ly, lz + co * 0.6], [lx + co, ly, lz + s], c, c, c);
  }
}

/** The chunk's ground cover, as a geometry per material (leaf: blades and leaves; stone: pebbles and nodules). */
export function groundCover(cx: number, cz: number, region: RegionDef, roads: readonly RoadSeg[]): Partial<Record<PropMat, THREE.BufferGeometry>> {
  const cover = COVER[region.biome.texture];
  const rng = createRng(chunkKey(cx, cz) * 7919 + 17);
  const pads = worldLayout().chunk(cx, cz).pads;
  const [leaf, stone] = [new Builder(), new Builder()];
  for (let k = 0; k < cover.count; k++) {
    const [x, z] = [(cx + rng()) * WORLD.chunk, (cz + rng()) * WORLD.chunk];
    let roll = rng();
    const kind = cover.mix.find(([, w]) => (roll -= w) < 0)?.[0] ?? 'pebble';
    if (roadShare(roads, x, z) > 0.05 || inDungeon(x, z)) continue;
    if (pads.some((p) => (p.kind === 'circle' ? Math.hypot(x - p.x, z - p.z) < p.radius + 1 : rectDistance(p.rect, x, z) < 1))) continue;
    const y = surface(x, z);
    if (y < WORLD.seaLevel) continue;
    const c = shade(COLORS[kind][Math.floor(rng() * COLORS[kind].length)], GAIN);
    if (kind === 'tuft') blades(leaf, rng, x, y, z, 4 + Math.floor(rng() * 4), 0.45, 0.05, c);
    else if (kind === 'dry') blades(leaf, rng, x, y, z, 3 + Math.floor(rng() * 3), 0.35, 0.04, c);
    else if (kind === 'reed') blades(leaf, rng, x, y, z, 3 + Math.floor(rng() * 3), 1.1, 0.04, c);
    else if (kind === 'litter') litter(leaf, rng, x, y, z);
    else pebble(stone, rng, x, y, z, c);
  }
  const out: Partial<Record<PropMat, THREE.BufferGeometry>> = {};
  const [lg, sg] = [leaf.geometry(), stone.geometry()];
  if (lg) out.leaf = lg;
  if (sg) out.stone = sg;
  return out;
}
