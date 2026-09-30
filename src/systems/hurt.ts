/**
 * Where a colossus may be struck (playtest round 24; data/assemblyShape.ts): its legs take a blow
 * whole, its body soaks it, and its head, the weak spot, takes it several times over. On its feet the
 * head is far above a blade (the revolver aims for it); after each blow of its own the colossus
 * recovers stooped, and the head is down within reach for a moment; a staggered or parried one is
 * stooped too. A body of spheres is struck where its spheres are. Bodies that are not colossi have
 * one capsule (combat.ts). Pure: no Three.js.
 */

import type { Entity } from '../core/ecs';
import type { V3 } from '../core/geom';
import { zoneShapes, type ZoneShape } from '../data/assemblyShape';
import { ZONES } from '../data/bossTuning';
import { moveDef } from './actions';
import type { Game } from './components';

/** What is struck: its gap to a blade or a bullet's line, and what the place takes of the blow. */
export interface ZoneHit {
  gap2: number;
  damage: number;
}

/** Whether a colossus is stooped: recovering from its own blow, or reeling. */
export function stooped(g: Game, e: Entity): boolean {
  const c = g.ecs.c;
  const move = c.actor.get(e)?.move;
  return move === 'stagger' || move === 'parried' || (c.fight.get(e)?.stoopUntil ?? 0) > g.frame;
}

/** Each step: a colossus that has got past its blow's active frames stays stooped until its recovery ends and a little after. */
export function refreshStoops(g: Game): void {
  for (const [e, f] of g.ecs.c.fight) {
    const a = g.ecs.c.actor.get(e);
    const open = a ? moveDef(a)?.open : undefined;
    if (a && open !== undefined && a.frame >= open) f.stoopUntil = g.frame + ZONES.linger;
  }
}

/** Its zones, in the body's own frame (see assemblyShape.ts); null for a body that has none. */
export function zonesOf(g: Game, e: Entity): ZoneShape[] | null {
  const b = g.ecs.c.body.get(e);
  return b?.assembly ? zoneShapes(b.assembly, b.radius, b.height, e, stooped(g, e)) : null;
}

/** A zone's place in the world: the body at `pos` turned by `yaw` (a figure's local +x is its left). */
function place(z: ZoneShape, pos: V3, yaw: number): { x: number; z: number } {
  const [s, c] = [Math.sin(yaw), Math.cos(yaw)];
  return { x: pos.x + z.x * c + z.z * s, z: pos.z - z.x * s + z.z * c };
}

/** The gap from a point to a zone (0 inside it). */
function gapTo(z: ZoneShape, at: { x: number; z: number }, y0: number, p: V3): number {
  const radial = Math.hypot(p.x - at.x, p.z - at.z);
  if (z.ball) return Math.max(0, Math.hypot(radial, p.y - (y0 + z.y0)) - z.r);
  const up = Math.max(0, y0 + z.y0 - p.y, p.y - (y0 + z.y1));
  return Math.hypot(Math.max(0, radial - z.r), up);
}

const STEP = 0.4; // metres between the points a line is tried at

/**
 * The best place a line from `a` to `b` touches within `reach` (the blow's own radius): the one that
 * takes most of it; else the nearest, which is out of reach. Null for a body with no zones.
 */
export function zoneGap(g: Game, e: Entity, a: V3, b: V3, reach: number): ZoneHit | null {
  const zones = zonesOf(g, e);
  const tr = g.ecs.c.transform.get(e);
  if (!zones || !tr) return null;
  const n = Math.min(160, Math.max(1, Math.ceil(Math.hypot(b.x - a.x, b.y - a.y, b.z - a.z) / STEP)));
  let touch: { gap: number; damage: number } | null = null; // the zone that takes most of the blow of those it reaches
  let nearest = { gap: Infinity, damage: 0 }; // else the nearest, out of reach
  for (const z of zones) {
    const at = place(z, tr.pos, tr.yaw);
    let gap = Infinity;
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      gap = Math.min(gap, gapTo(z, at, tr.pos.y, { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t, z: a.z + (b.z - a.z) * t }));
    }
    if (gap < nearest.gap) nearest = { gap, damage: z.damage };
    if (gap <= reach && (!touch || z.damage > touch.damage)) touch = { gap, damage: z.damage };
  }
  const hit = touch ?? nearest;
  return { gap2: hit.gap * hit.gap, damage: hit.damage };
}

/** Where a shot aims at a colossus: its head, the weak spot; null when it has none to aim for. */
export function weakSpot(g: Game, e: Entity): V3 | null {
  const tr = g.ecs.c.transform.get(e);
  const z = zonesOf(g, e)?.find((x) => x.weak);
  if (!tr || !z || (z.y0 + z.y1) / 2 > ZONES.aimReach) return null;
  const at = place(z, tr.pos, tr.yaw);
  return { x: at.x, y: tr.pos.y + (z.y0 + z.y1) / 2, z: at.z };
}
