/**
 * An arena in the open (spec §3D): its ring (standing stones, or its style's pieces: round 13), the
 * well at its heart, its dressing, and its bosses' spawns about the centre. Pure: no Three.js.
 */

import type { XZ } from '../core/geom';
import { hash2 } from '../core/rng';
import { arenaStyle } from '../data/arenaStyles';
import type { RegionDef } from '../data/regions';
import type { ArenaSite } from '../data/sites';
import { WORLD } from '../data/tuning';
import { arenaProps } from './arenaDecor';
import type { Collider } from './colliders';
import type { SpawnPoint, WorldLayout } from './placements';
import { propCollider, type Prop } from './props';

/** A dressing prop's collider into the world (fires have none). */
export function propCollide(p: Prop, collide: (c: Collider) => void): void {
  const c = propCollider(p);
  if (c) collide(c);
}

/** An arena: its ring of standing stones, the well at its heart, and its bosses. */
export function placeArena(w: WorldLayout, region: RegionDef, p: XZ, a: ArenaSite, y: number, collide: (c: Collider) => void, spawn: (s: SpawnPoint) => void): void {
  const style = arenaStyle(a.bosses[0]);
  const ring = a.radius + 1.5;
  const n = style.ring === 'stones' ? Math.max(6, Math.round((2 * Math.PI * ring) / 5.5)) : 0; // other rings are props (arenaDecor.ts)
  const decor = arenaProps(style, p.x, p.z, y, a.radius, !!a.well);
  for (const d of decor) propCollide(d, collide);
  const stones = Array.from({ length: n }, (_, k) => {
    const t = (k / n) * Math.PI * 2;
    return { x: p.x + Math.cos(t) * ring, z: p.z + Math.sin(t) * ring, radius: 0.7, height: 2.5 + 3 * hash2(k, n, WORLD.seed) };
  });
  for (const s of stones) collide({ kind: 'cylinder', x: s.x, z: s.z, radius: s.radius, y0: y - 0.3, y1: y + s.height });
  if (a.well) collide({ kind: 'cylinder', x: p.x, z: p.z, radius: 2.75, y0: y - 12, y1: y + 0.9 });
  w.arenas.push({ region: region.id, x: p.x, z: p.z, y, radius: a.radius, well: !!a.well, bosses: a.bosses, stones, decor });
  const spread = Math.min(8, a.radius / 3);
  a.bosses.forEach((id, k) => {
    const dx = (k - (a.bosses.length - 1) / 2) * spread;
    const at = { x: p.x + dx, z: p.z + (a.well ? a.radius / 2 : 0), yaw: Math.PI };
    spawn({ id: `boss:${id}`, entity: id, variant: a.variant, region: region.id, at, unique: true, arena: { x: p.x, z: p.z, radius: a.radius } });
  });
}
