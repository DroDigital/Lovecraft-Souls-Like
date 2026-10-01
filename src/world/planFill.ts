/**
 * What fills a region's plan between its sites (playtest round 32: "props are sparse, and there is
 * little to walk toward between settlements": a region held about three props a chunk, a few groves
 * and some ruins, and the land between was bare). A biome's own props lie scattered as before; over
 * them lies a fill of the ground's own kinds (bushes, trees, rocks, stumps, logs; broken pillars on
 * slabs), thick where slow noise says the land is wooded or strewn and thin in its clearings; copses,
 * wayside stones and farmsteads (features.ts) dot it; and the country roads are lined with crosses,
 * lamps, stones and stumps every thirty or forty metres, so there is always something ahead.
 * Everything keeps to open ground (the plan's occupancy). Pure: no Three.js.
 */

import type { XZ } from '../core/geom';
import { fbm } from '../core/noise';
import type { Rng } from '../core/rng';
import type { RegionLayout } from '../data/regionFeatures';
import type { GroundTexture, PropKind, RegionDef } from '../data/regions';
import { WORLD } from '../data/tuning';
import { FEATURE_RADIUS, FILLER_KINDS, featureProps, type Filler, type FillerKind } from './features';
import { makeProp, type Prop } from './props';
import type { Road } from './roads';
import type { Rect } from './worldMap';

/** The plan's occupancy: which ground is free, and a disk of it taken. */
export interface Occ {
  free(x: number, z: number): boolean;
  disk(x: number, z: number, r: number, mark: boolean): boolean;
}

/** What each ground fills with, by weight: the kinds that grow or lie on it. */
const FILL: Readonly<Record<GroundTexture, readonly (readonly [PropKind, number])[]>> = {
  grass: [['bush', 4], ['tree', 3], ['rock', 1.5], ['stump', 1], ['log', 0.7]],
  leaves: [['tree', 4], ['bush', 3], ['rock', 1.2], ['stump', 1.2], ['log', 1]],
  dirt: [['rock', 3], ['bush', 2], ['stump', 1], ['tree', 1]],
  gravel: [['rock', 4], ['bush', 1]],
  mud: [['rock', 3], ['bush', 2], ['log', 1], ['stump', 1]],
  sand: [['rock', 4], ['bush', 1.2], ['monolith', 0.3]],
  snow: [['rock', 5], ['stump', 0.3]],
  slab: [['rock', 3], ['pillar', 1.2], ['ruin', 1]],
  stone: [['rock', 3], ['pillar', 1], ['ruin', 0.8]],
  rot: [['stump', 2], ['rock', 2], ['bush', 1.5], ['log', 1]],
  flesh: [['rock', 2], ['monolith', 1]],
  water: [['monolith', 1]],
};

/** Metres a fill prop keeps free about it. */
const ROOM: Partial<Record<PropKind, number>> = { tree: 2.4, bush: 1.2, rock: 1.8, stump: 1.2, log: 1.6, pillar: 2.2, ruin: 2.4, monolith: 2 };
const FILL_PER_CHUNK = 3.6; // × the biome's density: candidate fill props a chunk, before the land's noise and the occupancy turn some away

/** How wooded or strewn the land is at (x, z), 0 in a clearing to 1 in a thicket: slow noise, so each is a hundred metres across. */
export const strewn = (x: number, z: number): number => Math.min(1, Math.max(0, (fbm(x * 0.012, z * 0.012, 33, 3) - 0.36) / 0.3));

/** A weighted pick from `entries`, `roll` in 0..1. */
function weighted<T>(entries: readonly (readonly [T, number])[], roll: number): T {
  let r = roll * entries.reduce((s, [, w]) => s + w, 0);
  for (const [k, w] of entries) if ((r -= w) < 0) return k;
  return entries[entries.length - 1][0];
}

/** The biome's own props, as before (a light scatter), and the ground's fill over them. */
export function scatterBiome(region: RegionDef, rect: Rect, rng: Rng, occ: Occ, props: Prop[]): void {
  const chunks = ((rect.x1 - rect.x0) * (rect.z1 - rect.z0)) / (WORLD.chunk * WORLD.chunk);
  const entries = Object.entries(region.biome.props) as [PropKind, number][];
  const n = Math.round(chunks * region.biome.density * 0.35);
  for (let k = 0; k < n && entries.length; k++) {
    const [x, z] = [rect.x0 + rng() * (rect.x1 - rect.x0), rect.z0 + rng() * (rect.z1 - rect.z0)];
    const kind = weighted(entries, rng());
    if (!occ.free(x, z)) continue;
    props.push(makeProp(kind, x, z, rng));
    occ.disk(x, z, 2, true);
  }
  const fill = FILL[region.biome.texture];
  const m = Math.round(chunks * region.biome.density * FILL_PER_CHUNK);
  for (let k = 0; k < m; k++) {
    const [x, z] = [rect.x0 + rng() * (rect.x1 - rect.x0), rect.z0 + rng() * (rect.z1 - rect.z0)];
    const f = strewn(x, z);
    if (rng() > 0.12 + 0.88 * f) continue; // a clearing keeps a few
    const kind = weighted(fill.map(([p, w]) => [p, p === 'tree' ? w * (0.3 + 2.2 * f) : p === 'rock' ? w * (1.6 - 1.2 * f) : w] as const), rng());
    if (!occ.free(x, z)) continue;
    props.push(makeProp(kind, x, z, rng));
    occ.disk(x, z, ROOM[kind] ?? 1.6, true);
  }
}

/** The road point nearest (x, z), which a feature faces. */
export function nearestRoad(roads: readonly Road[], x: number, z: number): XZ | null {
  let best: [number, XZ | null] = [Infinity, null];
  for (const r of roads) for (const p of r.pts) {
    const d = Math.hypot(p.x - x, p.z - z);
    if (d < best[0]) best = [d, p];
  }
  return best[1];
}

/** Copses, wayside stones and farmsteads: as many of each as the layout says, each on open ground, facing the nearest road. */
export function placeFillers(region: RegionDef, layout: RegionLayout, rect: Rect, rng: Rng, roads: readonly Road[], occ: Occ, props: Prop[]): void {
  const counts: Record<FillerKind, number> = { copse: layout.copses, waymark: layout.waymarks, farm: layout.farms };
  for (const kind of FILLER_KINDS) {
    for (let k = 0; k < counts[kind]; k++) {
      for (let tries = 0; tries < 40; tries++) {
        const [lo, hi] = FEATURE_RADIUS[kind];
        const r = lo + (hi - lo) * rng();
        const [x, z] = [rect.x0 + 24 + rng() * (rect.x1 - rect.x0 - 48), rect.z0 + 24 + rng() * (rect.z1 - rect.z0 - 48)];
        if (kind === 'copse' && rng() > 0.25 + 0.75 * strewn(x, z)) continue; // copses stand where the land is wooded
        if (!occ.disk(x, z, r + 2, false)) continue;
        const road = nearestRoad(roads, x, z);
        const f: Filler = { kind, x, z, r, yaw: road ? Math.atan2(road.x - x, road.z - z) : rng() * 6.28, seed: (rng() * 1e9) >>> 0 };
        props.push(...featureProps(f, { pines: !!layout.pines, free: occ.free, house: layout.farm, marks: marksOf(region) }));
        occ.disk(x, z, r + 1, true);
        break;
      }
    }
  }
}

const WAKING = new Set(['hub', 'arkham', 'dunwich', 'innsmouth', 'providence', 'vermont']);

/** The stones a way is marked by, by realm: crosses, obelisks and lamps in New England; pillars and lamps in the Dreamlands; the realm's own standing stones elsewhere. */
const MARKS: readonly (readonly [PropKind, number])[] = [['cross', 3], ['obelisk', 2], ['monolith', 2.5], ['lamp', 2.5]];
const MARKS_DREAM: readonly (readonly [PropKind, number])[] = [['pillar', 3], ['obelisk', 2], ['lamp', 2.5], ['monolith', 1]];
const MARKS_BEYOND: readonly (readonly [PropKind, number])[] = [['monolith', 3], ['pillar', 2], ['obelisk', 2]];
const marksOf = (region: RegionDef) => (WAKING.has(region.id) ? MARKS : region.id === 'dreamlands' ? MARKS_DREAM : MARKS_BEYOND);

/** What stands by a country road: its marks, with the rocks, bushes and stumps of the verge. */
const VERGE: readonly (readonly [PropKind, number])[] = [['rock', 1.4], ['bush', 2.4], ['stump', 1]];
const roadsideOf = (region: RegionDef) => [...marksOf(region).map(([k, w]) => [k, w * 0.5] as const), ...(WAKING.has(region.id) || region.id === 'dreamlands' ? VERGE : VERGE.slice(0, 1))];

/** Every thirty to fifty metres along each country road, on alternate sides: something to walk toward. */
export function roadside(region: RegionDef, roads: readonly Road[], rng: Rng, occ: Occ, clear: (x: number, z: number) => boolean, props: Prop[]): void {
  const table = roadsideOf(region);
  for (const road of roads) {
    if (road.street) continue;
    let run = 8 + 30 * rng();
    let side = rng() < 0.5 ? 1 : -1;
    for (let i = 1; i < road.pts.length; i++) {
      const [a, b] = [road.pts[i - 1], road.pts[i]];
      const len = Math.hypot(b.x - a.x, b.z - a.z);
      if (len < 0.1) continue;
      const [nx, nz] = [-(b.z - a.z) / len, (b.x - a.x) / len];
      for (let d = run; d < len; d += 30 + 20 * rng()) {
        const off = road.width / 2 + 1.8 + 1.4 * rng();
        const [x, z] = [a.x + ((b.x - a.x) * d) / len + nx * side * off, a.z + ((b.z - a.z) * d) / len + nz * side * off];
        side = -side;
        if (!clear(x, z) || !occ.free(x, z)) continue;
        const kind = weighted(table, rng());
        props.push(makeProp(kind, x, z, rng));
        occ.disk(x, z, 1.4, true);
        run = d + 30 + 20 * rng() - len;
      }
      run = Math.max(0, run - len);
    }
  }
}
