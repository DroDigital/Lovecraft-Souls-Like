/**
 * Where a region's foes stand (spec §3D): around the fires of its camps, among ruins, groves, stone
 * circles and graveyards, guarding every dungeon door and the approach to every boss's ring, in
 * pairs along its roads, wandering its towns' streets, and a thin scatter over open ground. Never
 * near an Elder Sign or a gate, inside a site, or in a prop. Pure.
 */

import type { XZ } from '../core/geom';
import type { Rng } from '../core/rng';
import type { RegionDef } from '../data/regions';
import { WORLD } from '../data/tuning';
import { colliderBounds, toBoxFrame, type Collider } from './colliders';
import type { Feature } from './features';
import { worldLayout, type SpawnPoint } from './placements';
import { propCollider, type Prop } from './props';
import type { Road } from './roads';
import { DIRS, rectDistance, regionRect } from './worldMap';

const SAFE = 30; // metres of peace around every Elder Sign and gate
const PATROL = 95; // metres of road between patrols

/** A weighted pick from a spawn table. */
function pick(table: Readonly<Record<string, number>>, roll: number): string | undefined {
  const entries = Object.entries(table);
  let r = roll * entries.reduce((s, [, w]) => s + w, 0);
  for (const [k, w] of entries) if ((r -= w) < 0) return k;
  return entries.at(-1)?.[0];
}

export function planSpawns(region: RegionDef, features: readonly Feature[], roads: readonly Road[], towns: readonly (XZ & { radius: number })[], props: readonly Prop[], rng: Rng): SpawnPoint[] {
  const table = region.spawns.table;
  if (Object.keys(table).length === 0) return [];
  const w = worldLayout();
  const rect = regionRect(region);
  const safe = [...w.signs.filter((s) => s.region === region.id).map((s) => s.rest), ...w.gates.filter((g) => g.region === region.id).map((g) => g.arrive)];
  const grid = new Map<number, Collider[]>(); // colliders by 8 m cell
  const cell = (x: number, z: number): number => Math.floor(x / 8) * 65536 + Math.floor(z / 8);
  for (const p of props) {
    const c = propCollider(p);
    if (!c) continue;
    const b = colliderBounds(c);
    for (let x = Math.floor(b.x0 / 8); x <= Math.floor(b.x1 / 8); x++) for (let z = Math.floor(b.z0 / 8); z <= Math.floor(b.z1 / 8); z++) {
      const k = x * 65536 + z;
      grid.get(k)?.push(c) ?? grid.set(k, [c]);
    }
  }
  const solid = (x: number, z: number): boolean =>
    (grid.get(cell(x, z)) ?? []).some((c) => {
      if (c.kind === 'cylinder') return Math.hypot(x - c.x, z - c.z) < c.radius + 0.8;
      if (c.kind === 'obox') {
        const l = toBoxFrame(c, x, z);
        return Math.abs(l.x) < c.hx + 0.8 && Math.abs(l.z) < c.hz + 0.8;
      }
      return false;
    });
  const clear = (x: number, z: number): boolean =>
    x > rect.x0 + 6 && x < rect.x1 - 6 && z > rect.z0 + 6 && z < rect.z1 - 6 &&
    safe.every((p) => Math.hypot(p.x - x, p.z - z) >= SAFE) &&
    w.pads.every((p) => (p.kind === 'circle' ? Math.hypot(x - p.x, z - p.z) > p.radius + 1 : rectDistance(p.rect, x, z) > 2)) &&
    !solid(x, z);

  const out: SpawnPoint[] = [];
  const post = (x: number, z: number, yaw: number): boolean => {
    const entity = pick(table, rng());
    if (!entity || !clear(x, z)) return false;
    out.push({ id: `p:${region.id}:${out.length}`, entity, region: region.id, at: { x, z, yaw }, unique: false });
    return true;
  };
  /** `n` foes around (cx, cz), between r0 and r1 metres out, facing outward. */
  const group = (cx: number, cz: number, n: number, r0: number, r1: number): void => {
    for (let k = 0, tries = 0; k < n && tries < n * 8; tries++) {
      const a = rng() * Math.PI * 2;
      const d = r0 + (r1 - r0) * rng();
      if (post(cx + Math.sin(a) * d, cz + Math.cos(a) * d, a)) k++;
    }
  };

  for (const f of features) {
    const chance = { camp: 1, ruin: 0.55, grove: 0.45, circle: 0.5, graveyard: 0.6, outcrop: 0.25 }[f.kind];
    if (rng() >= chance) continue;
    const n = f.kind === 'camp' ? 3 + Math.floor(rng() * 3) : 2 + Math.floor(rng() * 2);
    group(f.x, f.z, n, f.kind === 'camp' ? 3 : 1.5, Math.max(3.5, f.r * 0.7));
  }
  for (const d of w.dungeons) {
    if (d.layout.region !== region.id || d.layout.def.sealed) continue;
    const door = d.layout.doors.find((x) => x.b === null);
    if (!door) continue;
    const [ox, oz] = [door.x + DIRS[door.side].x * 10, door.z + DIRS[door.side].z * 10];
    group(ox, oz, d.layout.rooms.some((r) => r.def.boss) && d.layout.rooms.length <= 4 ? 3 : 2, 1, 5);
  }
  for (const a of w.arenas) if (a.region === region.id) group(a.x, a.z, 3 + Math.floor(rng() * 2), a.radius + 7, a.radius + 14);
  for (const road of roads) {
    if (road.street) continue;
    let run = PATROL * rng();
    for (let i = 1; i < road.pts.length; i++) {
      const [a, b] = [road.pts[i - 1], road.pts[i]];
      const len = Math.hypot(b.x - a.x, b.z - a.z);
      run += len;
      if (run < PATROL) continue;
      run = 0;
      const [nx, nz] = [-(b.z - a.z) / len, (b.x - a.x) / len];
      const side = rng() < 0.5 ? 1 : -1;
      const off = road.width / 2 + 2;
      const yaw = Math.atan2(b.x - a.x, b.z - a.z);
      post(a.x + nx * side * off, a.z + nz * side * off, yaw);
      post(a.x + nx * side * (off + 1.5) + (b.x - a.x) * 0.15, a.z + nz * side * (off + 1.5) + (b.z - a.z) * 0.15, yaw);
    }
  }
  for (const t of towns) group(t.x, t.z, 3 + Math.floor(t.radius / 25), 10, t.radius * 0.9);
  const chunks = ((rect.x1 - rect.x0) * (rect.z1 - rect.z0)) / (WORLD.chunk * WORLD.chunk);
  const scatter = Math.round(chunks * region.spawns.density * 0.45);
  for (let k = 0; k < scatter; k++) post(rect.x0 + rng() * (rect.x1 - rect.x0), rect.z0 + rng() * (rect.z1 - rect.z0), rng() * Math.PI * 2);
  return out;
}
