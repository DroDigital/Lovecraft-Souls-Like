/**
 * The shared behaviour state machine (spec §3C). Every creature runs it; its archetype params give
 * it a temperament. States:
 * - hidden: lying in ambush or burrowed; strikes when a hostile comes within `reveal`.
 * - idle: waits at home until it perceives a hostile (allies follow the player instead).
 * - engage: keeps its preferred range to the target (approach, back off, circle), attacks from
 *   data when the cooldown allows, and keeps its distance while below its `flee` health fraction.
 * - return: gave up (target lost or leash exceeded); walks home, keeping its wounds (only the
 *   investigator resting or dying makes a foe whole: death.ts).
 * - follow: allies trail the player (once met) until something threatens.
 * A boss is bound to its arena instead of a leash (bossArena.ts): it wakes as the investigator
 * steps into its ring, holds them while they stay near it, backs off only a little and never
 * past its rim.
 */

import type { Entity } from '../core/ecs';
import { distXZ, yawOf, type XZ } from '../core/geom';
import type { BrainDef } from '../data/archetypes';
import type { Rng } from '../core/rng';
import { startMove } from './actions';
import { arenaOf, evade, holdInside, rimGap, within } from './bossArena';
import { isAbsent, type ArenaCircle, type Brain, type Game, type Mover } from './components';
import { targetsOf } from './combat';
import { perceive } from './perception';
import { BOSS } from '../data/tuning';

const LOSE_FRAMES = 120; // frames without perceiving the target before giving up
const FOLLOW = [2.5, 4] as const; // allies: stop within, walk beyond (metres from the player)

/** Weighted pick among the attacks whose range bracket contains `d`; null when none fits. */
export function chooseAttack(def: BrainDef, d: number, rng: Rng): string | null {
  const fits = def.attacks.filter((a) => d >= a.range[0] && d <= a.range[1]);
  let roll = rng() * fits.reduce((sum, a) => sum + a.weight, 0);
  for (const a of fits) if ((roll -= a.weight) < 0) return a.move;
  return null;
}

function walk(m: Mover, from: XZ, to: XZ, speed: number, away = false): void {
  const dx = (to.x - from.x) * (away ? -1 : 1);
  const dz = (to.z - from.z) * (away ? -1 : 1);
  const d = Math.hypot(dx, dz);
  if (d < 1e-6) return;
  m.vx = (dx / d) * speed;
  m.vz = (dz / d) * speed;
  if (!away) m.face = yawOf(dx, dz);
}

/** Sidesteps around `to` while facing it. */
function circle(m: Mover, from: XZ, to: XZ, speed: number, dir: 1 | -1): void {
  const dx = to.x - from.x;
  const dz = to.z - from.z;
  const d = Math.hypot(dx, dz);
  if (d < 1e-6) return;
  m.vx = (-dz / d) * speed * dir;
  m.vz = (dx / d) * speed * dir;
}

function engage(g: Game, id: Entity, br: Brain, m: Mover, target: Entity, arena: ArenaCircle | undefined): void {
  const p = br.def.params;
  const pos = g.ecs.c.transform.get(id)!.pos;
  const tp = g.ecs.c.transform.get(target)!.pos;
  const d = distXZ(pos, tp);
  const h = g.ecs.c.health.get(id)!;
  const fleeing = h.hp < h.max * p.flee;
  if (evade(g, id, br)) return;
  if (br.cooldown === 0) {
    const attack = chooseAttack(br.def, d, g.rng);
    if (attack) {
      startMove(g.ecs.c.actor.get(id)!, attack);
      const [lo, hi] = p.cooldown;
      br.cooldown = lo + Math.floor(g.rng() * (hi - lo + 1));
      return;
    }
  }
  if (!p.mobile) return;
  // A boss gives little ground: it backs off only from close by, slowly, and circles at its rim.
  const [near, far] = fleeing ? [arena ? Math.min(p.range[1], 5) : p.range[1], p.range[1] + (arena ? 1 : 4)] : [arena ? Math.min(p.range[0], 4) : p.range[0], p.range[1]];
  const cornered = arena !== undefined && rimGap(arena, pos) < BOSS.rim + 2;
  if (d > far) walk(m, pos, tp, br.speed);
  else if (d < near && !cornered) walk(m, pos, tp, br.speed * (arena ? 0.6 : 1), true);
  else if (p.strafe > 0 || (d < near && cornered)) {
    if (g.rng() < 0.01) br.strafe = br.strafe === 1 ? -1 : 1;
    circle(m, pos, tp, br.speed * Math.max(p.strafe, 0.5), br.strafe);
  }
  if (arena) holdInside(arena, pos, m, br.speed);
}

/** A boss's quarry: the investigator while they are in reach of its ring (awake: its margin too); nothing beyond it. */
function arenaSight(g: Game, id: Entity, br: Brain, arena: ArenaCircle, seen: Entity | null): Entity | null {
  const c = g.ecs.c;
  const pp = c.transform.get(g.player.id)?.pos;
  const margin = br.state === 'engage' ? BOSS.margin : 0;
  const inPlay = (e: Entity | null): boolean => e !== null && within(arena, c.transform.get(e)!.pos, margin);
  if (inPlay(seen)) return seen;
  return pp && within(arena, pp, margin) && targetsOf(g, id).includes(g.player.id) ? g.player.id : null;
}

export function brainSystem(g: Game): void {
  const { brain, actor, mover, transform, home, health, poise } = g.ecs.c;
  for (const [id, br] of brain) {
    const a = actor.get(id)!;
    const m = mover.get(id)!;
    const tr = transform.get(id)!;
    const p = br.def.params;
    m.vx = 0;
    m.vz = 0;
    if (isAbsent(g, id) || a.frozen || (health.get(id)?.hp ?? 0) <= 0) continue;
    const ally = br.def.archetype === 'ally';
    const anchor: XZ = ally ? transform.get(g.player.id)!.pos : home.get(id) ?? tr.pos;
    const arena = arenaOf(g, id);
    const perceived = perceive(g, id, br.target, p);
    const seen = arena ? arenaSight(g, id, br, arena, perceived) : perceived;
    br.lost = seen === null ? br.lost + 1 : 0;
    if (br.evadeIn) br.evadeIn--;
    if (seen !== null) br.target = seen;
    const target = br.target;
    const tp = target === null ? undefined : transform.get(target)?.pos;
    if (br.state === 'engage' && tp) m.face = yawOf(tp.x - tr.pos.x, tp.z - tr.pos.z); // also steers wind-ups
    if (a.move !== null) continue;
    if (br.cooldown > 0) br.cooldown--;

    if (br.state === 'hidden') {
      if (seen !== null && tp && distXZ(tr.pos, tp) <= p.reveal) [br.state, br.cooldown] = ['engage', 0];
    } else if (br.state === 'idle' || br.state === 'follow') {
      if (seen !== null) br.state = 'engage';
      else if (p.hide === 'ambush' || p.hide === 'burrow') br.state = 'hidden';
      else if (ally && (br.state === 'follow' || distXZ(tr.pos, anchor) <= p.aggro)) {
        br.state = 'follow'; // an ally waits where it stands until the investigator comes within sight
        if (distXZ(tr.pos, anchor) > FOLLOW[1]) walk(m, tr.pos, anchor, br.speed);
        else if (distXZ(tr.pos, anchor) < FOLLOW[0]) m.face = null;
      }
    } else if (br.state === 'engage') {
      const lose = arena ? BOSS.grace : LOSE_FRAMES;
      if (target === null || !tp || br.lost > lose || (!ally && !arena && distXZ(tr.pos, anchor) > p.leash)) {
        [br.state, br.target] = [ally ? 'follow' : 'return', null];
        continue;
      }
      engage(g, id, br, m, target, arena);
    } else if (distXZ(tr.pos, anchor) > 0.3 && p.mobile) {
      walk(m, tr.pos, anchor, br.speed);
    } else {
      br.state = 'idle';
      const h = home.get(id);
      if (h) m.face = h.yaw;
      const po = poise.get(id)!;
      po.value = po.max; // it gathers itself, but its wounds stay
    }
  }
}
