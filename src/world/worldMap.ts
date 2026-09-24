/**
 * The world map (spec §3D): a grid of 64 m chunks under 256 m region tiles. Which region owns a
 * point, which ground is walkable (any chunk inside a region; the rest is sea or abyss), how far a
 * point lies from land, and the compass directions sites and rooms face. Pure: no Three.js.
 */

import type { XZ } from '../core/geom';
import type { Dir } from '../data/dungeons';
import { REGIONS, type RegionDef } from '../data/regions';
import type { At } from '../data/sites';
import { WORLD } from '../data/tuning';

export const TILE = WORLD.chunk * WORLD.regionChunks;

export interface Rect {
  x0: number;
  z0: number;
  x1: number;
  z1: number;
}

/** A chunk's numeric key (chunk coordinates stay within ±2048). */
export const chunkKey = (cx: number, cz: number): number => (cx + 2048) * 4096 + (cz + 2048);
export const keyChunk = (key: number): readonly [cx: number, cz: number] => [Math.floor(key / 4096) - 2048, (key % 4096) - 2048];
export const chunkOf = (v: number): number => Math.floor(v / WORLD.chunk);

export const chunkRect = (cx: number, cz: number): Rect => {
  const s = WORLD.chunk;
  return { x0: cx * s, z0: cz * s, x1: (cx + 1) * s, z1: (cz + 1) * s };
};

export function regionRect(r: RegionDef): Rect {
  const [tx, tz, w, h] = r.area;
  return { x0: tx * TILE, z0: tz * TILE, x1: (tx + w) * TILE, z1: (tz + h) * TILE };
}

const OWNER = new Map<number, RegionDef>();
for (const r of REGIONS) {
  const rc = regionRect(r);
  for (let cx = chunkOf(rc.x0); cx < chunkOf(rc.x1); cx++) for (let cz = chunkOf(rc.z0); cz < chunkOf(rc.z1); cz++) OWNER.set(chunkKey(cx, cz), r);
}

export const regionOfChunk = (cx: number, cz: number): RegionDef | undefined => OWNER.get(chunkKey(cx, cz));
export const regionAt = (x: number, z: number): RegionDef | undefined => regionOfChunk(chunkOf(x), chunkOf(z));
export const walkableChunk = (cx: number, cz: number): boolean => OWNER.has(chunkKey(cx, cz));

/** Distance from (x, z) to a rectangle (0 inside). */
export function rectDistance(r: Rect, x: number, z: number): number {
  const dx = Math.max(r.x0 - x, 0, x - r.x1);
  const dz = Math.max(r.z0 - z, 0, z - r.z1);
  return Math.hypot(dx, dz);
}

/** Metres from (x, z) to the nearest walkable chunk: 0 on land, at most one chunk's width. */
export function voidDistance(x: number, z: number): number {
  const cx = chunkOf(x);
  const cz = chunkOf(z);
  if (walkableChunk(cx, cz)) return 0;
  let best = WORLD.chunk;
  for (let dx = -1; dx <= 1; dx++) {
    for (let dz = -1; dz <= 1; dz++) if (walkableChunk(cx + dx, cz + dz)) best = Math.min(best, rectDistance(chunkRect(cx + dx, cz + dz), x, z));
  }
  return best;
}

/** Regions whose tiles lie within `margin` of the chunk (the ones whose terrain may blend into it). */
export function regionsNearChunk(cx: number, cz: number, margin: number): RegionDef[] {
  const c = chunkRect(cx, cz);
  return REGIONS.filter((r) => {
    const rr = regionRect(r);
    return rr.x0 - margin < c.x1 && rr.x1 + margin > c.x0 && rr.z0 - margin < c.z1 && rr.z1 + margin > c.z0;
  });
}

/** Unit steps of the compass: north is +z, east is +x. */
export const DIRS: Readonly<Record<Dir, XZ>> = { n: { x: 0, z: 1 }, e: { x: 1, z: 0 }, s: { x: 0, z: -1 }, w: { x: -1, z: 0 } };
export const OPPOSITE: Readonly<Record<Dir, Dir>> = { n: 's', e: 'w', s: 'n', w: 'e' };
/** Yaw facing a direction (yaw 0 faces +z). */
export const yawOfDir = (d: Dir): number => Math.atan2(DIRS[d].x, DIRS[d].z);

/** World position of a point given in metres from a region's south-west corner. */
export function toWorld(r: RegionDef, at: At): XZ {
  const rc = regionRect(r);
  return { x: rc.x0 + at[0], z: rc.z0 + at[1] };
}
