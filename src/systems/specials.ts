/**
 * The attack library's special effects (spec §3E), on the frames their moves name: a teleport
 * lands near the target, a summon calls up one of its summoner's servants (a boss's phase decides
 * which; never more than BOSS.minions at once), a gaze in sight builds up on the investigator until
 * the mind reels, darkness snuffs the light for a while, and the pool attack spreads a pool under
 * its target. Pure: no Three.js.
 */

import type { Entity } from '../core/ecs';
import { distXZ, yawOf, type XZ } from '../core/geom';
import type { MoveDef } from '../data/moves';
import { BOSS } from '../data/tuning';
import { hasLineOfSight, resolveCapsule } from '../world/colliders';
import { inWindow, moveDef, startMove } from './actions';
import { isAbsent, type Game } from './components';
import { defOf, spawnCreature } from './creatures';
import { spawnPool } from './hazards';
import { playerEye } from './lockOn';
import { loseSanity } from './sanity';

/** Who the creature is after: its brain's target, else the investigator. */
export const targetOf = (g: Game, id: Entity): Entity => g.ecs.c.brain.get(id)?.target ?? g.player.id;

/** A point on the ground `[lo, hi]` metres from `around`, out of walls and inside `arena` (when given). */
export function groundNear(g: Game, around: XZ, [lo, hi]: readonly [number, number], r: number, arena?: { x: number; z: number; radius: number }): XZ {
  const yaw = g.rng() * Math.PI * 2;
  const d = lo + (hi - lo) * g.rng();
  const p = { x: around.x + Math.sin(yaw) * d, y: 0, z: around.z + Math.cos(yaw) * d };
  if (arena) {
    const [dx, dz] = [p.x - arena.x, p.z - arena.z];
    const far = Math.hypot(dx, dz);
    const max = Math.max(0, arena.radius - r - 0.5);
    if (far > max) [p.x, p.z] = [arena.x + (dx / far) * max, arena.z + (dz / far) * max];
  }
  p.y = g.world.ground(p.x, p.z);
  resolveCapsule(g.world, p, r, 2);
  return { x: p.x, z: p.z };
}

/** Moves a creature to a spot near its target, facing it, with no in-between frame. */
export function teleport(g: Game, id: Entity, range: readonly [number, number] = BOSS.teleport): void {
  const tr = g.ecs.c.transform.get(id)!;
  const tp = g.ecs.c.transform.get(targetOf(g, id))?.pos;
  if (!tp) return;
  const r = g.ecs.c.body.get(id)?.radius ?? 0.5;
  const to = groundNear(g, tp, range, r, g.ecs.c.fight.get(id)?.arena);
  const from = { ...tr.pos };
  tr.pos = { x: to.x, y: g.world.ground(to.x, to.z), z: to.z };
  tr.prev = { ...tr.pos };
  tr.yaw = tr.prevYaw = yawOf(tp.x - to.x, tp.z - to.z);
  g.events.emit('Teleported', { entity: id, from, to: { ...tr.pos } });
}

/** What a summoner calls up: its boss phase's summons (or its first phase with any), else its own list. */
export function summonsOf(g: Game, id: Entity): readonly string[] {
  const f = g.ecs.c.fight.get(id);
  const phases = f?.script.phases ?? [];
  return phases[f?.phase ?? 0]?.summons ?? phases.find((p) => p.summons)?.summons ?? defOf(g, id)?.behavior.summons ?? [];
}

/** The summoner's servants still standing. */
export const minionsOf = (g: Game, id: Entity): Entity[] =>
  [...g.ecs.c.minion].filter(([m, by]) => by === id && (g.ecs.c.health.get(m)?.hp ?? 0) > 0).map(([m]) => m);

/** Calls up `what` beside its summoner, already on the summoner's quarry. Undefined at the cap. */
export function summon(g: Game, by: Entity, what: string): Entity | undefined {
  if (minionsOf(g, by).length >= BOSS.minions) return undefined;
  const c = g.ecs.c;
  const at = c.transform.get(by)!.pos;
  const p = groundNear(g, at, BOSS.summonRing, 0.6, c.fight.get(by)?.arena);
  const quarry = targetOf(g, by);
  const qp = c.transform.get(quarry)?.pos ?? at;
  const e = spawnCreature(g, what, { ...p, yaw: yawOf(qp.x - p.x, qp.z - p.z) });
  if (e === undefined) return undefined;
  c.minion.set(e, by);
  c.home.delete(e); // it does not go home: it goes with its summoner
  c.fight.delete(e); // a summoned boss fights as a servant, not a fight of its own
  c.combatant.get(e)!.bounty = 0;
  const br = c.brain.get(e);
  if (br && quarry !== by) Object.assign(br, { state: 'engage', target: quarry });
  c.fight.get(by)?.minions.push(e);
  g.events.emit('Summoned', { entity: e, by });
  return e;
}

function summonOne(g: Game, id: Entity): void {
  const list = summonsOf(g, id);
  if (list.length) summon(g, id, list[Math.floor(g.rng() * list.length)]);
}

/** One frame of a gaze: the buildup grows while the investigator is in range and sight; full, the mind reels. */
function gaze(g: Game, id: Entity, range: number): boolean {
  const c = g.ecs.c;
  const me = c.transform.get(id)!.pos;
  const pp = c.transform.get(g.player.id)!.pos;
  if (distXZ(me, pp) > range || c.actor.get(g.player.id)!.move === 'death') return false;
  const eye = { x: me.x, y: me.y + (c.body.get(id)?.aimHeight ?? 1.5), z: me.z };
  if (!hasLineOfSight(g.world, eye, playerEye(g))) return false;
  const r = g.reality;
  r.gaze = Math.min(1, r.gaze + BOSS.gazeRate);
  if (r.gaze < 1) return true;
  r.gaze = 0;
  loseSanity(g, BOSS.gazeSanity);
  const a = c.actor.get(g.player.id)!;
  if (a.move !== 'death') startMove(a, 'stagger');
  g.events.emit('GazeBurst', { sanity: BOSS.gazeSanity });
  return true;
}

function poolUnder(g: Game, id: Entity, def: MoveDef): void {
  const pool = def.pool!;
  const tr = g.ecs.c.transform.get(id)!;
  const tp = g.ecs.c.transform.get(targetOf(g, id))?.pos;
  const ahead = { x: tr.pos.x + Math.sin(tr.yaw) * 4, z: tr.pos.z + Math.cos(tr.yaw) * 4 };
  const at = tp && distXZ(tp, tr.pos) <= 14 ? tp : ahead;
  spawnPool(g, id, g.ecs.c.combatant.get(id)?.faction ?? 'enemy', at, pool);
}

export function specialSystem(g: Game): void {
  let gazed = false;
  for (const [id, a] of g.ecs.c.actor) {
    const def = moveDef(a);
    if (!def || a.frozen || isAbsent(g, id)) continue;
    const ef = def.effect;
    if (ef && a.frame === ef.window[0]) {
      if (ef.kind === 'teleport') teleport(g, id);
      else if (ef.kind === 'summon') summonOne(g, id);
      else if (ef.kind === 'darkness') {
        g.reality.dark = BOSS.darkFrames;
        g.events.emit('Darkened', { by: id });
      }
    }
    if (ef?.kind === 'gaze' && inWindow(ef.window, a.frame) && id !== g.player.id) gazed = gaze(g, id, ef.range) || gazed;
    if (def.pool && a.frame === def.pool.frame) poolUnder(g, id, def);
  }
  if (!gazed) g.reality.gaze = Math.max(0, g.reality.gaze - BOSS.gazeDecay);
  if (g.reality.dark > 0) g.reality.dark--;
}
