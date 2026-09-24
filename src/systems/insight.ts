/**
 * Insight (spec §3A): gained from the first sight of named and boss horrors and from tomes, and
 * spent on upgrades — which re-hides whatever that insight revealed, since the HiddenLayer hook
 * listens to `InsightChanged`. First sight also shocks sanity, by tier, from greater horrors up.
 * Pure: no Three.js.
 */

import type { Entity } from '../core/ecs';
import { dist3, distXZ } from '../core/geom';
import { PLAYER, SANITY, UPGRADES, type UpgradeId } from '../data/tuning';
import { hasLineOfSight } from '../world/colliders';
import { isAbsent, isConcealed, isUnseen, type Game, type GameEvents } from './components';
import { aimPoint, playerEye, viewAngle } from './lockOn';
import { loseSanity } from './sanity';

const DEG = Math.PI / 180;

/** Adds (or with a negative `change`, takes) insight, never below 0, announcing the change. */
export function changeInsight(g: Pick<Game, 'mind' | 'events'>, change: number, cause: GameEvents['InsightChanged']['cause'], source: string): void {
  const m = g.mind;
  const insight = Math.max(0, Math.round(m.insight + change));
  if (insight === m.insight) return;
  const delta = insight - m.insight;
  m.insight = insight;
  g.events.emit('InsightChanged', { insight, change: delta, cause, source });
}

/**
 * Whether the investigator sees `id` now: it is in the world and not lying in wait (an invisible
 * stalker only while it moves to strike), within sight range, on screen (inside the cone around
 * the camera's forward) and in line of sight of the investigator's eye.
 */
export function inSight(g: Game, id: Entity): boolean {
  const c = g.ecs.c;
  if (isAbsent(g, id) || isConcealed(g, id) || isUnseen(g, id)) return false;
  if (c.brain.get(id)?.def.params.hide === 'invisible' && c.actor.get(id)?.move === null) return false;
  const from = playerEye(g);
  const to = aimPoint(g, id)!;
  if (dist3(from, to) > SANITY.sightRange) return false;
  if (Math.abs(viewAngle({ x: g.camera.pos.x, z: g.camera.pos.z, yaw: g.camera.yaw }, to)) > SANITY.sightCone * DEG) return false;
  return hasLineOfSight(g.world, from, to);
}

/** One step: the first sight of each horror not yet beheld, and tomes read by touch. */
export function insightSystem(g: Game): void {
  const { dread, tome, transform, combatant, actor } = g.ecs.c;
  for (const [id, d] of dread) {
    if (g.mind.seen.has(d.id) || !inSight(g, id)) continue;
    g.mind.seen.add(d.id);
    const name = combatant.get(id)?.name ?? d.id;
    const sanity = SANITY.firstSight[d.tier];
    loseSanity(g, sanity);
    changeInsight(g, d.insight, 'sight', name);
    g.events.emit('FirstSight', { entity: id, name, sanity, insight: d.insight });
  }
  if (actor.get(g.player.id)!.move === 'death') return;
  const pp = transform.get(g.player.id)!.pos;
  for (const [id, t] of tome) {
    if (distXZ(transform.get(id)!.pos, pp) > PLAYER.pickupRadius) continue;
    g.ecs.despawn(id);
    changeInsight(g, t.insight, 'tome', t.name);
  }
}

export const upgradeName = (id: UpgradeId): string => id[0].toUpperCase() + id.slice(1);

/** Spends insight on one level of an upgrade (spec §3A); false when short of insight or at the top level. */
export function buyUpgrade(g: Game, id: UpgradeId): boolean {
  const u = UPGRADES[id];
  const m = g.mind;
  if (m.insight < u.cost || m.upgrades[id] >= u.max) return false;
  m.upgrades[id]++;
  const h = g.ecs.c.health.get(g.player.id)!;
  const s = g.ecs.c.stamina.get(g.player.id)!;
  if (u.hp) [h.max, h.hp] = [h.max + u.hp, h.hp + u.hp];
  if (u.stamina) [s.max, s.value] = [s.max + u.stamina, s.value + u.stamina];
  changeInsight(g, -u.cost, 'upgrade', upgradeName(id));
  return true;
}

/** Puts a tome in the world. */
export function spawnTome(g: Pick<Game, 'ecs' | 'world'>, t: { x: number; z: number; yaw: number; name: string; insight: number }): Entity {
  const e = g.ecs.spawn();
  const pos = { x: t.x, y: g.world.ground(t.x, t.z), z: t.z };
  g.ecs.c.transform.set(e, { pos, prev: { ...pos }, yaw: t.yaw, prevYaw: t.yaw });
  g.ecs.c.tome.set(e, { name: t.name, insight: t.insight });
  g.ecs.c.model.set(e, 'tome');
  return e;
}
