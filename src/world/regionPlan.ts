/**
 * A region's plan (spec §3D): what lies between its sites, laid out once from the world seed. Roads
 * join its Elder Signs, legacy dungeons, gates, towns and borders (roads.ts); towns line their streets
 * with houses and lamps; New England field walls follow the roads; groves, graveyards, stone circles,
 * ruins, outcrops and camps fill open ground (features.ts); a light scatter of the biome's props lies
 * between; and foes are posted around it all (planSpawns.ts). Everything is bucketed by chunk. Pure.
 */

import type { XZ } from '../core/geom';
import { createRng, hash2, type Rng } from '../core/rng';
import { LAIRS } from '../data/lairs';
import { REGION_LAYOUTS, type RegionLayout } from '../data/regionFeatures';
import type { PropKind, RegionDef } from '../data/regions';
import { WORLD } from '../data/tuning';
import { colliderBounds, type Collider } from './colliders';
import { FEATURE_KINDS, FEATURE_RADIUS, featureProps, type Feature } from './features';
import { worldLayout, type SpawnPoint } from './placements';
import { planSpawns } from './planSpawns';
import { makeProp, propCollider, type Prop } from './props';
import { borderPoints, planRoads, segmentDistance, type Road } from './roads';
import { chunkKey, chunkOf, DIRS, rectDistance, regionRect, toWorld, type Rect } from './worldMap';

export interface RoadSeg {
  a: XZ;
  b: XZ;
  width: number;
}

export interface RegionPlan {
  layout: RegionLayout;
  roads: Road[];
  features: Feature[];
  props: Map<number, Prop[]>; // by chunk (the prop's centre)
  colliders: Map<number, Collider[]>; // by every chunk a collider touches
  spawns: Map<number, SpawnPoint[]>;
  segs: Map<number, RoadSeg[]>; // road pieces touching each chunk (for the ground's road texture)
}

const CELL = 4; // metres per occupancy cell
const DEFAULT: RegionLayout = { road: 'mud', width: 3.5, towns: [], groves: 0, graveyards: 0, circles: 0, ruins: 0, outcrops: 0, camps: 0, walls: false };

/** Which cells of the region are taken: sites, roads, houses and features. */
function occupancy(rect: Rect) {
  const taken = new Set<number>();
  const key = (x: number, z: number): number => Math.floor((x - rect.x0) / CELL) * 4096 + Math.floor((z - rect.z0) / CELL);
  const inside = (x: number, z: number, m: number): boolean => x > rect.x0 + m && x < rect.x1 - m && z > rect.z0 + m && z < rect.z1 - m;
  return {
    free: (x: number, z: number): boolean => inside(x, z, 3) && !taken.has(key(x, z)),
    disk(x: number, z: number, r: number, mark: boolean): boolean {
      for (let dx = -r; dx <= r; dx += CELL / 2) {
        for (let dz = -r; dz <= r; dz += CELL / 2) {
          if (dx * dx + dz * dz > r * r) continue;
          if (mark) taken.add(key(x + dx, z + dz));
          else if (!inside(x + dx, z + dz, 8) || taken.has(key(x + dx, z + dz))) return false;
        }
      }
      return true;
    },
    rect(r: Rect, m: number): void {
      for (let x = r.x0 - m; x <= r.x1 + m; x += CELL / 2) for (let z = r.z0 - m; z <= r.z1 + m; z += CELL / 2) taken.add(key(x, z));
    },
  };
}

/** Where a region's roads must go: its signs, gates, legacy dungeons' doors, towns and borders. */
function stops(region: RegionDef, layout: RegionLayout): XZ[] {
  const w = worldLayout();
  const lesser = new Set(LAIRS.map((d) => d.id));
  const out: XZ[] = [...w.signs.filter((s) => s.region === region.id).map((s) => s.rest), ...w.gates.filter((g) => g.region === region.id).map((g) => g.arrive)];
  for (const d of w.dungeons) {
    if (d.layout.region !== region.id || lesser.has(d.layout.def.id) || d.layout.def.sealed) continue;
    const door = d.layout.doors.find((x) => x.b === null);
    if (door) out.push({ x: door.x + DIRS[door.side].x * 6, z: door.z + DIRS[door.side].z * 6 });
  }
  out.push(...layout.towns.map((t) => toWorld(region, t.at)), ...borderPoints(region));
  return out;
}

function buildPlan(region: RegionDef): RegionPlan {
  const layout = REGION_LAYOUTS[region.id] ?? DEFAULT;
  const rect = regionRect(region);
  const rng = createRng((hash2(rect.x0, rect.z0, WORLD.seed + 77) * 4294967296) >>> 0);
  const occ = occupancy(rect);
  const w = worldLayout();
  for (const p of w.pads) {
    if (p.kind === 'circle' && rectDistance(rect, p.x, p.z) < p.radius + 20) occ.disk(p.x, p.z, p.radius + 4, true);
    if (p.kind === 'rect') occ.rect(p.rect, 5);
  }
  const towns = layout.towns.map((t) => ({ ...toWorld(region, t.at), radius: t.radius, town: t }));
  const roads = planRoads(stops(region, layout), towns, layout.width, (rng() * 1e9) >>> 0);
  const roadClear = (x: number, z: number, m: number): boolean => roads.every((r) => r.pts.every((p, i) => i === 0 || segmentDistance(x, z, r.pts[i - 1], p) >= r.width / 2 + m));

  const props: Prop[] = [];
  const put = (p: Prop, r: number): void => {
    props.push(p);
    occ.disk(p.x, p.z, r, true);
  };
  // Towns: houses face their streets, lamps light them; decayed towns have ruins among the houses.
  for (const t of towns) {
    for (const road of roads) {
      let run = 0;
      for (let i = 1; i < road.pts.length; i++) {
        const [a, b] = [road.pts[i - 1], road.pts[i]];
        const len = Math.hypot(b.x - a.x, b.z - a.z);
        run += len;
        if (run < 11) continue;
        run = 0;
        const [nx, nz] = [-(b.z - a.z) / len, (b.x - a.x) / len];
        for (const side of [1, -1]) {
          const house = makeProp('house', 0, 0, rng, 0, undefined, t.town.style);
          const off = road.width / 2 + 3 + house.d;
          const [x, z] = [(a.x + b.x) / 2 + nx * side * off, (a.z + b.z) / 2 + nz * side * off];
          const reach = Math.max(house.w, house.d) + 1;
          if (Math.hypot(x - t.x, z - t.z) > t.radius || rng() < 0.15 || !occ.disk(x, z, reach, false) || !roadClear(x, z, 1.5 + Math.min(house.w, house.d))) continue;
          const yaw = Math.atan2(-nx * side, -nz * side);
          const ruined = rng() < (t.town.decay ?? 0);
          put(ruined ? makeProp('ruin', x, z, rng, yaw, [house.w, 0.35, 1 + 2 * rng()]) : { ...makeProp('house', x, z, rng, yaw, [house.w, house.d, house.h], t.town.style) }, reach);
        }
        if (road.street && rng() < 0.6) {
          const side = rng() < 0.5 ? 1 : -1;
          const [x, z] = [(a.x + b.x) / 2 + nx * side * (road.width / 2 + 1), (a.z + b.z) / 2 + nz * side * (road.width / 2 + 1)];
          if (Math.hypot(x - t.x, z - t.z) < t.radius) props.push(makeProp('lamp', x, z, rng, 0));
        }
      }
    }
  }
  // Field walls along the country roads, with gaps.
  if (layout.walls) {
    for (const road of roads) {
      if (road.street) continue;
      const side = rng() < 0.5 ? 1 : -1;
      for (let i = 1; i < road.pts.length; i++) {
        const [a, b] = [road.pts[i - 1], road.pts[i]];
        if (hash2(i, Math.floor(a.x), 5) < 0.45) continue;
        const len = Math.hypot(b.x - a.x, b.z - a.z);
        const [nx, nz] = [-(b.z - a.z) / len, (b.x - a.x) / len];
        const [x, z] = [(a.x + b.x) / 2 + nx * side * (road.width / 2 + 4), (a.z + b.z) / 2 + nz * side * (road.width / 2 + 4)];
        if (towns.some((t) => Math.hypot(x - t.x, z - t.z) < t.radius + 10) || !occ.disk(x, z, 1.5, false) || !roadClear(x, z, 2)) continue;
        put(makeProp('wall', x, z, rng, Math.atan2(b.x - a.x, b.z - a.z) - Math.PI / 2, [len / 2, 0.3, 0.8 + 0.3 * rng()]), Math.max(1.5, len / 2));
      }
    }
  }
  for (const r of roads) for (let i = 1; i < r.pts.length; i++) occ.disk((r.pts[i - 1].x + r.pts[i].x) / 2, (r.pts[i - 1].z + r.pts[i].z) / 2, r.width / 2 + 3, true);
  const features = placeFeatures(layout, rect, rng, roads, occ, props);
  scatterBiome(region, rect, rng, occ, props);
  const spawns = planSpawns(region, features, roads, towns, props, rng);
  return bucket(layout, roads, features, props, spawns);
}

function nearestRoad(roads: readonly Road[], x: number, z: number): XZ | null {
  let best: [number, XZ | null] = [Infinity, null];
  for (const r of roads) for (const p of r.pts) {
    const d = Math.hypot(p.x - x, p.z - z);
    if (d < best[0]) best = [d, p];
  }
  return best[1];
}

function placeFeatures(layout: RegionLayout, rect: Rect, rng: Rng, roads: readonly Road[], occ: ReturnType<typeof occupancy>, props: Prop[]): Feature[] {
  const out: Feature[] = [];
  const counts: Record<(typeof FEATURE_KINDS)[number], number> = {
    grove: layout.groves, graveyard: layout.graveyards, circle: layout.circles, ruin: layout.ruins, outcrop: layout.outcrops, camp: layout.camps,
  };
  for (const kind of FEATURE_KINDS) {
    for (let k = 0; k < counts[kind]; k++) {
      for (let tries = 0; tries < 60; tries++) {
        const [lo, hi] = FEATURE_RADIUS[kind];
        const r = lo + (hi - lo) * rng();
        const [x, z] = [rect.x0 + 24 + rng() * (rect.x1 - rect.x0 - 48), rect.z0 + 24 + rng() * (rect.z1 - rect.z0 - 48)];
        if (!occ.disk(x, z, r + 3, false)) continue;
        const road = nearestRoad(roads, x, z);
        const f: Feature = { kind, x, z, r, yaw: road ? Math.atan2(road.x - x, road.z - z) : rng() * 6.28, seed: (rng() * 1e9) >>> 0 };
        props.push(...featureProps(f, { pines: !!layout.pines, free: occ.free }));
        occ.disk(x, z, r + 2, true);
        out.push(f);
        break;
      }
    }
  }
  return out;
}

/** A light scatter of the biome's own props over open ground, a few per chunk. */
function scatterBiome(region: RegionDef, rect: Rect, rng: Rng, occ: ReturnType<typeof occupancy>, props: Prop[]): void {
  const chunks = ((rect.x1 - rect.x0) * (rect.z1 - rect.z0)) / (WORLD.chunk * WORLD.chunk);
  const entries = Object.entries(region.biome.props) as [PropKind, number][];
  const total = entries.reduce((s, [, n]) => s + n, 0);
  const n = Math.round(chunks * region.biome.density * 0.35);
  for (let k = 0; k < n; k++) {
    const [x, z] = [rect.x0 + rng() * (rect.x1 - rect.x0), rect.z0 + rng() * (rect.z1 - rect.z0)];
    let roll = rng() * total;
    const kind = entries.find(([, wt]) => (roll -= wt) < 0)?.[0] ?? entries[0]?.[0];
    if (!kind || !occ.free(x, z)) continue;
    props.push(makeProp(kind, x, z, rng));
    occ.disk(x, z, 2, true);
  }
}

function bucket(layout: RegionLayout, roads: Road[], features: Feature[], props: Prop[], spawns: SpawnPoint[]): RegionPlan {
  const plan: RegionPlan = { layout, roads, features, props: new Map(), colliders: new Map(), spawns: new Map(), segs: new Map() };
  const add = <T>(m: Map<number, T[]>, k: number, v: T): void => void (m.get(k)?.push(v) ?? m.set(k, [v]));
  for (const p of props) {
    add(plan.props, chunkKey(chunkOf(p.x), chunkOf(p.z)), p);
    const c = propCollider(p);
    if (!c) continue;
    const b = colliderBounds(c);
    for (let cx = chunkOf(b.x0); cx <= chunkOf(b.x1); cx++) for (let cz = chunkOf(b.z0); cz <= chunkOf(b.z1); cz++) add(plan.colliders, chunkKey(cx, cz), c);
  }
  for (const s of spawns) add(plan.spawns, chunkKey(chunkOf(s.at.x), chunkOf(s.at.z)), s);
  for (const r of roads) {
    for (let i = 1; i < r.pts.length; i++) {
      const seg = { a: r.pts[i - 1], b: r.pts[i], width: r.width };
      const m = r.width;
      const [x0, x1, z0, z1] = [Math.min(seg.a.x, seg.b.x) - m, Math.max(seg.a.x, seg.b.x) + m, Math.min(seg.a.z, seg.b.z) - m, Math.max(seg.a.z, seg.b.z) + m];
      for (let cx = chunkOf(x0); cx <= chunkOf(x1); cx++) for (let cz = chunkOf(z0); cz <= chunkOf(z1); cz++) add(plan.segs, chunkKey(cx, cz), seg);
    }
  }
  return plan;
}

const plans = new Map<string, RegionPlan>();

/** A region's plan, built on first use. */
export function regionPlan(region: RegionDef): RegionPlan {
  let p = plans.get(region.id);
  if (!p) plans.set(region.id, (p = buildPlan(region)));
  return p;
}

/** How much of the road texture shows at (x, z), 0..1, from the road pieces of its chunk. */
export function roadShare(segs: readonly RoadSeg[] | undefined, x: number, z: number): number {
  if (!segs) return 0;
  let best = 0;
  for (const s of segs) {
    const d = segmentDistance(x, z, s.a, s.b);
    const k = 1 - Math.min(1, Math.max(0, (d - s.width / 2 + 1) / 2));
    if (k > best) best = k;
  }
  return best;
}
