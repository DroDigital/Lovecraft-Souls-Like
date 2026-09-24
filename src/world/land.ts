/**
 * The bare land (spec §3D): each region's seeded noise heightfield from its biome, blended across
 * region borders so the ground stays continuous, and sinking to the sea floor beyond the coast.
 * Sites and dungeons flatten it afterwards (terrain.ts). Pure: no Three.js.
 */

import { fbm } from '../core/noise';
import { REGIONS, type RegionDef } from '../data/regions';
import { WORLD } from '../data/tuning';
import { chunkKey, chunkOf, regionRect, regionsNearChunk, voidDistance, type Rect } from './worldMap';

export const smoothstep = (a: number, b: number, x: number): number => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

interface Near {
  region: RegionDef;
  rect: Rect;
  seed: number;
}

const near = new Map<number, readonly Near[]>();

/** Regions whose terrain reaches into this chunk, cached per chunk. */
function nearOf(cx: number, cz: number): readonly Near[] {
  const key = chunkKey(cx, cz);
  let list = near.get(key);
  if (!list) {
    list = regionsNearChunk(cx, cz, WORLD.blend).map((region) => ({ region, rect: regionRect(region), seed: WORLD.seed + REGIONS.indexOf(region) * 101 }));
    near.set(key, list);
  }
  return list;
}

/** A region's own heightfield at (x, z). */
function biomeHeight(n: Near, x: number, z: number): number {
  const b = n.region.biome;
  return b.base + b.amp * (fbm(x / b.scale, z / b.scale, n.seed, b.octaves) * 2 - 1);
}

/** How much a region owns (x, z): 1 inside, 0.5 on its border, fading over WORLD.blend either side. */
function share(r: Rect, x: number, z: number): number {
  const b = WORLD.blend;
  const s = (d: number): number => smoothstep(-b, b, d);
  return s(x - r.x0) * s(r.x1 - x) * s(z - r.z0) * s(r.z1 - z);
}

/** Ground height before sites and dungeons flatten it. */
export function landHeight(x: number, z: number): number {
  let sum = 0;
  let weight = 0;
  for (const n of nearOf(chunkOf(x), chunkOf(z))) {
    const w = share(n.rect, x, z);
    if (w <= 1e-4) continue;
    sum += w * biomeHeight(n, x, z);
    weight += w;
  }
  const h = weight > 0 ? sum / weight : WORLD.seaFloor;
  const off = voidDistance(x, z);
  return off > 0 ? h + (WORLD.seaFloor - h) * smoothstep(0, WORLD.coast, off) : h;
}
