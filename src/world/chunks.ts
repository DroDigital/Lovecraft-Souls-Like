/**
 * Chunk content (spec §3D): a chunk's share of its region's plan (regionPlan.ts: roads, towns,
 * features, scattered props and posted foes) and of the fixed sites (placements.ts), with the
 * colliders of both. Deterministic; cached until the streamer forgets the chunk. Pure: no Three.js.
 */

import type { RegionDef } from '../data/regions';
import type { Collider } from './colliders';
import { worldLayout, type SpawnPoint } from './placements';
import type { Prop } from './props';
import { regionPlan, type RoadSeg } from './regionPlan';
import { chunkKey, keyChunk, regionOfChunk } from './worldMap';

export type { Prop } from './props';

export interface ChunkContent {
  cx: number;
  cz: number;
  region: RegionDef | undefined;
  props: Prop[];
  colliders: Collider[]; // the props' and the fixed sites'
  spawns: SpawnPoint[]; // posted foes and fixed sites
  roads: readonly RoadSeg[]; // road pieces touching the chunk
}

function generate(cx: number, cz: number): ChunkContent {
  const region = regionOfChunk(cx, cz);
  const st = worldLayout().chunk(cx, cz);
  const key = chunkKey(cx, cz);
  const plan = region ? regionPlan(region) : undefined;
  return {
    cx,
    cz,
    region,
    props: plan?.props.get(key) ?? [],
    colliders: [...st.colliders, ...(plan?.colliders.get(key) ?? [])],
    spawns: [...st.spawns, ...(plan?.spawns.get(key) ?? [])],
    roads: plan?.segs.get(key) ?? [],
  };
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
