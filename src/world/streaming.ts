/**
 * Chunk streaming (spec §3D): the 5 × 5 chunks around the player are loaded, and a loaded chunk is
 * dropped once it lies beyond the 7 × 7 around them, so walking back and forth over a chunk border
 * does not thrash. Pure: the renderer (meshes) and population (creatures) both stream with it.
 */

import { WORLD } from '../data/tuning';
import { chunkKey, keyChunk } from './worldMap';

export interface ChunkRef {
  cx: number;
  cz: number;
  key: number;
}

/** Chunks between two chunk coordinates, counted like a king's moves. */
export const chunkSpan = (ax: number, az: number, bx: number, bz: number): number => Math.max(Math.abs(ax - bx), Math.abs(az - bz));

/** The chunks within `radius` of (cx, cz), nearest first. */
export function chunksAround(cx: number, cz: number, radius: number): ChunkRef[] {
  const out: ChunkRef[] = [];
  for (let dx = -radius; dx <= radius; dx++) for (let dz = -radius; dz <= radius; dz++) out.push({ cx: cx + dx, cz: cz + dz, key: chunkKey(cx + dx, cz + dz) });
  return out.sort((a, b) => Math.hypot(a.cx - cx, a.cz - cz) - Math.hypot(b.cx - cx, b.cz - cz));
}

/** What to load (nearest first) and what to unload for a player in chunk (cx, cz). */
export function streamDiff(loaded: ReadonlySet<number>, cx: number, cz: number, load = WORLD.load, keep = WORLD.keep): { load: ChunkRef[]; unload: number[] } {
  return {
    load: chunksAround(cx, cz, load).filter((c) => !loaded.has(c.key)),
    unload: [...loaded].filter((k) => {
      const [x, z] = keyChunk(k);
      return chunkSpan(x, z, cx, cz) > keep;
    }),
  };
}
