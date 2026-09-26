/**
 * Perception for the archetype brains (spec §3C; reworked in playtest round 8). A creature sees
 * along its sight cone out to its `aggro` metres, given a clear line: at once within AI.sure, and
 * farther a glimpse it takes a moment to be sure of (brain.ts builds its awareness); beside and
 * behind it, it glimpses only what is close (AI.side), and slowly. What is within its `hearing` it
 * knows at once, walls or no. It hears the investigator's sounds — footsteps, running, a roll, a
 * blow, a shot — as far as each carries, half as far through a wall. Struck, it turns on whoever
 * struck it, and a creature that takes up a hunt rouses its kind about it. Hunting, it keeps its
 * quarry while it can see it anywhere about it (out to AI.track × its sight) or hear it.
 */

import type { Entity } from '../core/ecs';
import { distXZ, wrapAngle, yawOf, type V3 } from '../core/geom';
import type { ArchetypeParams } from '../data/schema';
import { AI } from '../data/tuning';
import { hasLineOfSight } from '../world/colliders';
import { inWindow, moveDef } from './actions';
import { isAbsent, type Game } from './components';
import { targetsOf } from './targets';

const DEG = Math.PI / 180;

function eye(g: Game, id: Entity): V3 {
  const p = g.ecs.c.transform.get(id)!.pos;
  const h = g.ecs.c.body.get(id)?.aimHeight ?? 1.5;
  return { x: p.x, y: p.y + h, z: p.z };
}

/** How plainly `self` sees `other` now: 1 sure, 0 not at all; between, a glimpse it takes time to be sure of. */
export function sight(g: Game, self: Entity, other: Entity, p: ArchetypeParams): number {
  const a = g.ecs.c.transform.get(self)!;
  const b = g.ecs.c.transform.get(other)!.pos;
  const d = distXZ(a.pos, b);
  if (d <= p.hearing) return 1;
  if (d > Math.max(p.aggro, AI.side)) return 0;
  const off = Math.abs(wrapAngle(yawOf(b.x - a.pos.x, b.z - a.pos.z) - a.yaw));
  const inCone = d <= p.aggro && off <= (p.fov * DEG) / 2;
  if ((!inCone && d > AI.side) || !hasLineOfSight(g.world, eye(g, self), eye(g, other))) return 0;
  if (!inCone) return 0.3;
  return d <= AI.sure ? 1 : 0.5 + 0.5 * (1 - (d - AI.sure) / Math.max(1, p.aggro - AI.sure));
}

/** Whether `self` knows `other` is there at once. */
export const notices = (g: Game, self: Entity, other: Entity, p: ArchetypeParams): boolean => sight(g, self, other, p) >= 1;

/** How far the investigator's sound carries this step (0: none): footsteps, running, a roll, a blow, a shot. */
export function noiseOf(g: Game): number {
  const id = g.player.id;
  const a = g.ecs.c.actor.get(id);
  const m = g.ecs.c.mover.get(id);
  if (!a || !m || isAbsent(g, id) || (g.ecs.c.health.get(id)?.hp ?? 0) <= 0) return 0;
  const def = moveDef(a);
  let r = Math.hypot(m.vx, m.vz) > 0.5 ? (g.player.sprinting ? AI.noise.sprint : AI.noise.walk) : 0;
  if (a.move === 'roll' || a.move === 'backstep') r = Math.max(r, AI.noise.roll);
  if (def?.hit && inWindow(def.hit.window, a.frame)) r = Math.max(r, AI.noise.blow);
  if (def?.shot && a.frame >= def.shot.frame && a.frame < def.shot.frame + 3) r = Math.max(r, AI.noise.shot);
  return r;
}

/** Whether `self` hears a sound from `at` that carries `radius` metres (a wall between halves it). */
export function hears(g: Game, self: Entity, at: V3, radius: number): boolean {
  if (radius <= 0) return false;
  const d = distXZ(g.ecs.c.transform.get(self)!.pos, at);
  if (d > radius) return false;
  return d <= radius * AI.muffle || hasLineOfSight(g.world, eye(g, self), { x: at.x, y: at.y + 1.2, z: at.z });
}

/** Whether a hunter still knows where its quarry is: in sight anywhere about it (out to AI.track × its sight), close, or heard. */
export function tracks(g: Game, self: Entity, target: Entity, p: ArchetypeParams, noise: number): boolean {
  const tp = g.ecs.c.transform.get(target)?.pos;
  if (!tp || !targetsOf(g, self).includes(target)) return false;
  const d = distXZ(g.ecs.c.transform.get(self)!.pos, tp);
  if (d <= p.hearing) return true;
  if (d <= Math.max(p.aggro * AI.track, p.hearing) && hasLineOfSight(g.world, eye(g, self), eye(g, target))) return true;
  return target === g.player.id && hears(g, self, tp, noise);
}

/** The brain's target (allies and bosses): the current one while it stays in pursuit range, else the nearest noticed hostile. */
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

/** Takes `self` straight into the hunt for `target` (struck by it, or called to it by its kind). Not a boss, nor an ally; true when it does. */
export function rouse(g: Game, self: Entity, target: Entity): boolean {
  const br = g.ecs.c.brain.get(self);
  const at = g.ecs.c.transform.get(target)?.pos;
  if (!br || !at || br.def.archetype === 'ally' || g.ecs.c.fight.has(self)) return false;
  Object.assign(br, { state: 'engage', target, aware: 1, last: { x: at.x, z: at.z }, lost: 0 });
  return true;
}

/** A creature taking up the hunt for `target` rouses its kind about it: the near ones come at once, the farther come to look. */
export function callPack(g: Game, self: Entity, target: Entity): void {
  const c = g.ecs.c;
  const faction = c.combatant.get(self)?.faction;
  const pos = c.transform.get(self)!.pos;
  const at = c.transform.get(target)!.pos;
  for (const [id, br] of c.brain) {
    if (id === self || br.state === 'engage' || br.state === 'hidden' || br.def.archetype === 'ally' || c.fight.has(id) || isAbsent(g, id)) continue;
    if (c.combatant.get(id)?.faction !== faction || !targetsOf(g, id).includes(target)) continue;
    const d = distXZ(c.transform.get(id)!.pos, pos);
    if (d <= AI.call / 2) rouse(g, id, target);
    else if (d <= AI.call) Object.assign(br, { state: 'alert', target, aware: Math.max(br.aware ?? 0, 0.6), last: { x: at.x, z: at.z } });
  }
}

/** Struck by a foe, a creature turns on it at once, and rouses its kind. */
export function registerPerception(g: Game): void {
  g.events.on('Hit', ({ attacker, target, lingering }) => {
    const br = g.ecs.c.brain.get(target);
    if (lingering || !br || br.state === 'engage' || !targetsOf(g, target).includes(attacker)) return;
    if (rouse(g, target, attacker)) callPack(g, target, attacker);
  });
}
