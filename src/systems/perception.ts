/**
 * Perception for the archetype brains (spec §3C): a hostile is noticed when it is heard (inside
 * `hearing`, through walls) or seen (inside `aggro`, the sight cone and line of sight). Once
 * engaged, a brain keeps its target until it dies or gets well out of range.
 */

import type { Entity } from '../core/ecs';
import { distXZ, wrapAngle, yawOf, type V3 } from '../core/geom';
import type { ArchetypeParams } from '../data/schema';
import { hasLineOfSight } from '../world/colliders';
import { targetsOf } from './combat';
import type { Game } from './components';

const DEG = Math.PI / 180;

function eye(g: Game, id: Entity): V3 {
  const p = g.ecs.c.transform.get(id)!.pos;
  const h = g.ecs.c.body.get(id)?.aimHeight ?? 1.5;
  return { x: p.x, y: p.y + h, z: p.z };
}

/** Whether `self` notices `other` right now. */
export function notices(g: Game, self: Entity, other: Entity, p: ArchetypeParams): boolean {
  const a = g.ecs.c.transform.get(self)!;
  const b = g.ecs.c.transform.get(other)!.pos;
  const d = distXZ(a.pos, b);
  if (d <= p.hearing) return true;
  if (d > p.aggro) return false;
  const off = Math.abs(wrapAngle(yawOf(b.x - a.pos.x, b.z - a.pos.z) - a.yaw));
  return off <= (p.fov * DEG) / 2 && hasLineOfSight(g.world, eye(g, self), eye(g, other));
}

/** The brain's target: the current one while it stays in pursuit range, else the nearest noticed hostile. */
export function perceive(g: Game, self: Entity, current: Entity | null, p: ArchetypeParams): Entity | null {
  const foes = targetsOf(g, self);
  const pos = g.ecs.c.transform.get(self)!.pos;
  if (current !== null && foes.includes(current)) {
    const d = distXZ(pos, g.ecs.c.transform.get(current)!.pos);
    if (d <= Math.max(p.aggro * 1.5, p.hearing)) return current;
  }
  let best: Entity | null = null;
  let bestD = Infinity;
  for (const f of foes) {
    const d = distXZ(pos, g.ecs.c.transform.get(f)!.pos);
    if (d < bestD && notices(g, self, f, p)) [best, bestD] = [f, d];
  }
  return best;
}
