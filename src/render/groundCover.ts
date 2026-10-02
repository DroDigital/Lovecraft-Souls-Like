/**
 * Ground cover (render only): what lies about on open ground, fifty to a hundred and thirty to a chunk by its ground (round 32: it was a few dozen, and the fields looked bare) —
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
type Kind = 'tuft' | 'reed' | 'dry' | 'litter' | 'pebble' | 'nodule' | 'fern' | 'tallgrass' | 'flower' | 'mushroom' | 'bramble';

/** Pieces a chunk holds, by its ground, and what they are. */
const COVER: Readonly<Record<GroundTexture, { count: number; mix: readonly [Kind, number][] }>> = {
  // Round 35 (more foliage, where it would grow): ferns, brambles and toadstools under the trees, tall seeding grass and a few wildflowers in the meadows, reeds along the mud.
  grass: { count: 190, mix: [['tuft', 0.34], ['tallgrass', 0.18], ['fern', 0.08], ['flower', 0.06], ['bramble', 0.06], ['litter', 0.12], ['mushroom', 0.04], ['pebble', 0.12]] },
  rot: { count: 110, mix: [['dry', 0.4], ['mushroom', 0.2], ['bramble', 0.15], ['pebble', 0.25]] },
  mud: { count: 130, mix: [['reed', 0.6], ['tallgrass', 0.12], ['mushroom', 0.06], ['pebble', 0.22]] },
  sand: { count: 60, mix: [['dry', 0.6], ['tallgrass', 0.15], ['pebble', 0.25]] },
  stone: { count: 26, mix: [['pebble', 0.6], ['dry', 0.25], ['bramble', 0.15]] },
  slab: { count: 24, mix: [['pebble', 0.75], ['dry', 0.15], ['bramble', 0.1]] },
  snow: { count: 12, mix: [['pebble', 1]] },
  flesh: { count: 36, mix: [['nodule', 0.8], ['mushroom', 0.2]] },
  dirt: { count: 90, mix: [['dry', 0.45], ['bramble', 0.15], ['tallgrass', 0.1], ['pebble', 0.3]] },
  gravel: { count: 56, mix: [['pebble', 0.7], ['dry', 0.2], ['bramble', 0.1]] },
  leaves: { count: 170, mix: [['fern', 0.22], ['tuft', 0.2], ['litter', 0.22], ['mushroom', 0.06], ['bramble', 0.1], ['tallgrass', 0.08], ['pebble', 0.12]] },
  water: { count: 0, mix: [] },
};

const COLORS: Readonly<Record<Kind, readonly Rgb[]>> = {
  tuft: [[0.5, 0.52, 0.34], [0.58, 0.55, 0.36], [0.44, 0.47, 0.32]],
  reed: [[0.4, 0.44, 0.34], [0.5, 0.5, 0.36]],
  dry: [[0.7, 0.62, 0.44], [0.62, 0.56, 0.42]],
  litter: [[0.72, 0.4, 0.22], [0.78, 0.58, 0.28], [0.56, 0.3, 0.2]],
  pebble: [[0.72, 0.72, 0.7], [0.62, 0.62, 0.6]],
  nodule: [[0.6, 0.44, 0.44], [0.5, 0.36, 0.38]],
  fern: [[0.34, 0.5, 0.32], [0.4, 0.54, 0.34], [0.3, 0.44, 0.3]],
  tallgrass: [[0.62, 0.6, 0.38], [0.5, 0.56, 0.34], [0.68, 0.62, 0.42]],
  flower: [[0.8, 0.78, 0.7], [0.62, 0.52, 0.72], [0.82, 0.68, 0.36]],
  mushroom: [[0.78, 0.74, 0.66], [0.66, 0.52, 0.42]],
  bramble: [[0.34, 0.3, 0.24], [0.4, 0.34, 0.26]],
};

class Builder {
  constructor(private readonly swaying = false) {} // a geometry that is blown carries aSway for it; one that is not (stones) must not, or it will not merge with the props' (propMeshes.ts)
  pos: number[] = [];
  col: number[] = [];
  nor: number[] = [];
  uv: number[] = [];
  sway: number[] = [];
  /** A triangle seen from both sides (the world's materials cull back faces); `sway`: how far each corner is blown (metres: the tip of a blade, nothing at its foot). */
  tri(a: readonly number[], b: readonly number[], c: readonly number[], ca: Rgb, cb: Rgb, cc: Rgb, sway: readonly [number, number, number] = [0, 0, 0]): void {
    for (const [p, col, s] of [[a, ca, sway[0]], [b, cb, sway[1]], [c, cc, sway[2]], [b, cb, sway[1]], [a, ca, sway[0]], [c, cc, sway[2]]] as const) {
      this.sway.push(s);
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
    if (this.swaying) g.setAttribute('aSway', new THREE.Float32BufferAttribute(this.sway, 1));
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
    b.tri(base0, base1, tip, dark, dark, c, [0, 0, 0.16 * len]); // the tip is blown, the foot is not
  }
}

/** A fern: a crown of arching fronds, each rising and bending over to its tip. */
function fern(b: Builder, rng: Rng, x: number, y: number, z: number, c: Rgb): void {
  const n = 6 + Math.floor(rng() * 4);
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + rng() * 0.5;
    const [s, co] = [Math.sin(a), Math.cos(a)];
    const len = 0.55 + 0.35 * rng();
    const w = 0.06;
    const rise = [x + s * len * 0.4, y + len * 0.7, z + co * len * 0.4];
    const tip = [x + s * len, y + len * 0.5, z + co * len];
    const [dark, light] = [shade(c, 0.6), shade(c, 1.1)];
    b.tri([x - co * w, y, z + s * w], [x + co * w, y, z - s * w], rise, dark, dark, c, [0, 0, 0.05 * len]);
    b.tri([rise[0] - co * w * 1.6, rise[1], rise[2] + s * w * 1.6], [rise[0] + co * w * 1.6, rise[1], rise[2] - s * w * 1.6], tip, c, c, light, [0.05 * len, 0.05 * len, 0.2 * len]);
  }
}

/** Tall seeding grass: long stems, a pale seed head at the tip of each. */
function tallgrass(b: Builder, rng: Rng, x: number, y: number, z: number, c: Rgb): void {
  blades(b, rng, x, y, z, 5 + Math.floor(rng() * 4), 0.95, 0.04, c);
  const head = shade(c, 1.3);
  for (let i = 0; i < 3; i++) {
    const [hx, hz] = [x + (rng() - 0.5) * 0.3, z + (rng() - 0.5) * 0.3];
    const hy = y + 0.8 + 0.25 * rng();
    b.tri([hx - 0.03, hy, hz], [hx + 0.03, hy, hz], [hx, hy + 0.2, hz + 0.02], head, head, shade(head, 1.1), [0.12, 0.12, 0.2]);
  }
}

/** A few stems and a blossom each, small and pale (a flower here is a speck of colour in the grass, not a bed). */
function flower(b: Builder, rng: Rng, x: number, y: number, z: number, c: Rgb): void {
  const stem = shade([0.4, 0.5, 0.32], GAIN);
  for (let i = 0; i < 3; i++) {
    const [fx, fz] = [x + (rng() - 0.5) * 0.5, z + (rng() - 0.5) * 0.5];
    const h = 0.35 + 0.25 * rng();
    b.tri([fx - 0.012, y, fz], [fx + 0.012, y, fz], [fx, y + h, fz], shade(stem, 0.7), shade(stem, 0.7), stem, [0, 0, 0.08]);
    for (let k = 0; k < 4; k++) {
      const a = (k / 4) * Math.PI * 2;
      b.tri([fx, y + h, fz], [fx + Math.sin(a) * 0.07, y + h + 0.02, fz + Math.cos(a) * 0.07], [fx + Math.sin(a + 1.5) * 0.07, y + h + 0.02, fz + Math.cos(a + 1.5) * 0.07], c, c, shade(c, 0.85), [0.08, 0.08, 0.08]);
    }
  }
}

/** Toadstools: a pale stem and a cap, in a small ring or a cluster. */
function mushroom(b: Builder, rng: Rng, x: number, y: number, z: number, c: Rgb): void {
  const n = 2 + Math.floor(rng() * 4);
  for (let i = 0; i < n; i++) {
    const [mx, mz] = [x + (rng() - 0.5) * 0.5, z + (rng() - 0.5) * 0.5];
    const h = 0.08 + 0.12 * rng();
    const r = 0.05 + 0.07 * rng();
    const stem = shade([0.8, 0.78, 0.7], GAIN * 0.6);
    b.tri([mx - 0.012, y, mz], [mx + 0.012, y, mz], [mx, y + h, mz], stem, stem, stem);
    const top = [mx, y + h + r * 0.55, mz];
    const ring = [0, 1, 2, 3, 4].map((k) => [mx + Math.cos((k / 5) * Math.PI * 2) * r, y + h, mz + Math.sin((k / 5) * Math.PI * 2) * r]);
    for (let k = 0; k < 5; k++) b.tri(ring[k], ring[(k + 1) % 5], top, shade(c, 0.8), shade(c, 0.8), c);
  }
}

/** A tangle of dark thorny stems, low and dense. */
function bramble(b: Builder, rng: Rng, x: number, y: number, z: number, c: Rgb): void {
  blades(b, rng, x, y, z, 11, 0.7, 0.025, c);
  blades(b, rng, x + (rng() - 0.5) * 0.3, y, z + (rng() - 0.5) * 0.3, 7, 0.5, 0.025, shade(c, 0.85));
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
  const [leaf, stone] = [new Builder(true), new Builder()];
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
    else if (kind === 'fern') fern(leaf, rng, x, y, z, c);
    else if (kind === 'tallgrass') tallgrass(leaf, rng, x, y, z, c);
    else if (kind === 'flower') flower(leaf, rng, x, y, z, c);
    else if (kind === 'mushroom') mushroom(leaf, rng, x, y, z, c);
    else if (kind === 'bramble') bramble(leaf, rng, x, y, z, c);
    else pebble(stone, rng, x, y, z, c);
  }
  const out: Partial<Record<PropMat, THREE.BufferGeometry>> = {};
  const [lg, sg] = [leaf.geometry(), stone.geometry()];
  if (lg) out.leaf = lg;
  if (sg) out.stone = sg;
  return out;
}
