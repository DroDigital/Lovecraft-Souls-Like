/**
 * Chunk content (spec §3D), drawn from the region's biome and the world seed: props (dead trees,
 * rocks, pillars, monoliths, graves, ruined walls) with their colliders, and open-ground spawns from
 * the region's spawn table, plus the chunk's share of the fixed sites. Deterministic; cached until
 * the streamer forgets the chunk. Pure: no Three.js.
 */

import { createRng, hash2, type Rng } from '../core/rng';
import type { PropKind, RegionDef } from '../data/regions';
import { WORLD } from '../data/tuning';
import type { Collider } from './colliders';
import { worldLayout, type ChunkStatics, type SpawnPoint } from './placements';
import { surface } from './terrain';
import { chunkKey, chunkRect, keyChunk, rectDistance, regionOfChunk } from './worldMap';

/** A prop: `w` × `d` are half extents (round props use `w` as their radius), `h` its height. */
export interface Prop {
  kind: PropKind;
  x: number;
  y: number;
  z: number;
  w: number;
  d: number;
  h: number;
  yaw: number;
  seed: number;
}

export interface ChunkContent {
  cx: number;
  cz: number;
  region: RegionDef | undefined;
  props: Prop[];
  colliders: Collider[]; // the props' and the fixed sites'
  spawns: SpawnPoint[]; // open ground and fixed sites
}

const ROUND = new Set<PropKind>(['tree', 'rock', 'pillar']);

/** A weighted choice; `roll` in [0, 1). */
function pick<T extends string>(weights: Partial<Record<T, number>>, roll: number): T | undefined {
  const entries = Object.entries(weights) as [T, number][];
  let r = roll * entries.reduce((s, [, w]) => s + w, 0);
  for (const [k, w] of entries) if ((r -= w) < 0) return k;
  return entries.at(-1)?.[0];
}

/** Whether (x, z) keeps `margin` metres clear of every site pad and dungeon in the chunk. */
function clear(st: ChunkStatics, x: number, z: number, margin: number): boolean {
  for (const p of st.pads) {
    const d = p.kind === 'circle' ? Math.hypot(x - p.x, z - p.z) - p.radius : rectDistance(p.rect, x, z);
    if (d < margin) return false;
  }
  return true;
}

function makeProp(kind: PropKind, x: number, z: number, rng: Rng): Prop {
  const r = (lo: number, hi: number): number => lo + (hi - lo) * rng();
  const yaw = ROUND.has(kind) ? r(0, Math.PI * 2) : rng() < 0.5 ? 0 : Math.PI / 2;
  const seed = Math.floor(rng() * 1e6);
  const y = surface(x, z);
  const size: Record<PropKind, () => [number, number, number]> = {
    tree: () => [r(0.25, 0.4), 0, r(5, 9)],
    rock: () => {
      const s = r(0.8, 2.2);
      return [s, 0, s * 0.8];
    },
    pillar: () => [r(0.5, 0.75), 0, r(3, 7)],
    monolith: () => [r(0.5, 0.9), r(0.35, 0.5), r(3, 6)],
    grave: () => [0.35, 0.12, r(0.8, 1.2)],
    ruin: () => [r(1.5, 3.5), 0.35, r(1, 3)],
  };
  const [w, d, h] = size[kind]();
  return { kind, x, y, z, w, d, h, yaw, seed };
}

function propCollider(p: Prop): Collider {
  if (ROUND.has(p.kind)) {
    const radius = p.kind === 'rock' ? p.w * 0.8 : p.w + 0.05;
    return { kind: 'cylinder', x: p.x, z: p.z, radius, y0: p.y - 0.5, y1: p.y + p.h };
  }
  const [hx, hz] = p.yaw === 0 ? [p.w, p.d] : [p.d, p.w];
  return { kind: 'box', min: { x: p.x - hx, y: p.y - 0.5, z: p.z - hz }, max: { x: p.x + hx, y: p.y + p.h, z: p.z + hz } };
}

function generate(cx: number, cz: number): ChunkContent {
  const region = regionOfChunk(cx, cz);
  const st = worldLayout().chunk(cx, cz);
  const content: ChunkContent = { cx, cz, region, props: [], colliders: [...st.colliders], spawns: [...st.spawns] };
  if (!region) return content;
  const rng = createRng((hash2(cx, cz, WORLD.seed + 17) * 4294967296) >>> 0);
  const c = chunkRect(cx, cz);
  const spot = (): [number, number] => [c.x0 + 2 + rng() * (WORLD.chunk - 4), c.z0 + 2 + rng() * (WORLD.chunk - 4)];
  const { biome, spawns } = region;
  const props = Math.round(biome.density * (0.75 + 0.5 * rng()));
  for (let k = 0; k < props; k++) {
    const [x, z] = spot();
    const kind = pick(biome.props, rng());
    if (!kind || !clear(st, x, z, 3)) continue;
    const p = makeProp(kind, x, z, rng);
    content.props.push(p);
    content.colliders.push(propCollider(p));
  }
  const n = Math.floor(spawns.density + rng());
  for (let k = 0; k < n; k++) {
    const [x, z] = spot();
    const entity = pick(spawns.table, rng());
    const yaw = rng() * Math.PI * 2;
    if (!entity || !clear(st, x, z, 14)) continue;
    content.spawns.push({ id: `w:${cx},${cz}:${k}`, entity, region: region.id, at: { x, z, yaw }, unique: false });
  }
  return content;
}

const cache = new Map<number, ChunkContent>();

/** A chunk's content, generated on first use. */
export function chunkContent(cx: number, cz: number): ChunkContent {
  const k = chunkKey(cx, cz);
  let c = cache.get(k);
  if (!c) cache.set(k, (c = generate(cx, cz)));
  return c;
}

/** Drops cached chunks the predicate rejects (they regenerate identically when needed again). */
export function forgetChunks(keep: (cx: number, cz: number) => boolean): void {
  for (const k of cache.keys()) if (!keep(...keyChunk(k))) cache.delete(k);
}
