/**
 * Roads (spec §3D): each region's network joins its Elder Signs, legacy dungeons, gates, towns and
 * the middles of the borders it shares with its neighbours (the same point on both sides, so roads
 * run on across), as a minimum spanning tree of gently wandering polylines. Lairs and the lesser
 * dungeons lie off the roads: they are found by exploring. Towns add short streets of their own.
 * Pure: no Three.js.
 */

import type { XZ } from '../core/geom';
import { createRng, type Rng } from '../core/rng';
import { REGIONS, type RegionDef } from '../data/regions';
import { regionRect } from './worldMap';

export interface Road {
  pts: XZ[];
  width: number;
  street: boolean; // a town street (lined with houses and lamps)
}

/** Points where this region's roads meet its neighbours': the middle of each shared border, pulled a little inside. */
export function borderPoints(region: RegionDef): XZ[] {
  const a = regionRect(region);
  const out: XZ[] = [];
  for (const other of REGIONS) {
    if (other === region) continue;
    const b = regionRect(other);
    const [z0, z1] = [Math.max(a.z0, b.z0), Math.min(a.z1, b.z1)];
    const [x0, x1] = [Math.max(a.x0, b.x0), Math.min(a.x1, b.x1)];
    if (z1 > z0 && (a.x1 === b.x0 || a.x0 === b.x1)) out.push({ x: a.x1 === b.x0 ? a.x1 - 2 : a.x0 + 2, z: (z0 + z1) / 2 });
    if (x1 > x0 && (a.z1 === b.z0 || a.z0 === b.z1)) out.push({ x: (x0 + x1) / 2, z: a.z1 === b.z0 ? a.z1 - 2 : a.z0 + 2 });
  }
  return out;
}

/** The edges of a minimum spanning tree over `pts` (Prim's), as index pairs. */
export function spanningTree(pts: readonly XZ[]): [number, number][] {
  if (pts.length < 2) return [];
  const inTree = new Set([0]);
  const edges: [number, number][] = [];
  while (inTree.size < pts.length) {
    let best: [number, number, number] = [Infinity, -1, -1];
    for (const i of inTree) {
      for (let j = 0; j < pts.length; j++) {
        if (inTree.has(j)) continue;
        const d = Math.hypot(pts[i].x - pts[j].x, pts[i].z - pts[j].z);
        if (d < best[0]) best = [d, i, j];
      }
    }
    edges.push([best[1], best[2]]);
    inTree.add(best[2]);
  }
  return edges;
}

/** A wandering line from a to b: points every ~10 m, pushed sideways by smooth seeded waves that vanish at both ends. */
export function wander(a: XZ, b: XZ, rng: Rng, sway = 0.08): XZ[] {
  const len = Math.hypot(b.x - a.x, b.z - a.z);
  const n = Math.max(1, Math.ceil(len / 10));
  const [nx, nz] = [-(b.z - a.z) / (len || 1), (b.x - a.x) / (len || 1)];
  const amp = Math.min(16, len * sway);
  const [p1, p2] = [rng() * 6.28, rng() * 6.28];
  const pts: XZ[] = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const off = amp * Math.sin(Math.PI * t) * (0.7 * Math.sin(t * 5.1 + p1) + 0.3 * Math.sin(t * 11.3 + p2));
    pts.push({ x: a.x + (b.x - a.x) * t + nx * off, z: a.z + (b.z - a.z) * t + nz * off });
  }
  return pts;
}

/** The region's roads between `stops`, plus each town's radiating streets. */
export function planRoads(stops: readonly XZ[], towns: readonly { x: number; z: number; radius: number }[], width: number, seed: number): Road[] {
  const rng = createRng(seed);
  const roads: Road[] = spanningTree(stops).map(([i, j]) => ({ pts: wander(stops[i], stops[j], rng), width, street: false }));
  for (const t of towns) {
    const streets = 3 + Math.floor(rng() * 3);
    const turn = rng() * Math.PI * 2;
    for (let k = 0; k < streets; k++) {
      const a = turn + (k / streets) * Math.PI * 2 + (rng() - 0.5) * 0.5;
      const len = t.radius * (0.75 + 0.2 * rng());
      const end = { x: t.x + Math.sin(a) * len, z: t.z + Math.cos(a) * len };
      roads.push({ pts: wander({ x: t.x, z: t.z }, end, rng, 0.04), width, street: true });
    }
  }
  return roads;
}

/** Distance from (x, z) to the segment a–b. */
export function segmentDistance(x: number, z: number, a: XZ, b: XZ): number {
  const [dx, dz] = [b.x - a.x, b.z - a.z];
  const t = Math.max(0, Math.min(1, ((x - a.x) * dx + (z - a.z) * dz) / (dx * dx + dz * dz || 1)));
  return Math.hypot(x - (a.x + dx * t), z - (a.z + dz * t));
}
