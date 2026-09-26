/**
 * How a creature fights once it hunts (spec §3C; playtest round 8). Only a few close in on the
 * investigator at once (AI.tokens, the nearest; one holding its place keeps it unless another is
 * much nearer): the rest keep off beyond their reach, circling and waiting their turn, so a crowd
 * comes on in waves rather than all together. A hunter keeps its preferred range (approach, back
 * off, circle) and strikes from its attacks when its cooldown allows, and sooner into an opening —
 * the investigator swallowing a dose, recovering from a blow, staggered; a quick one (strafe ≥ 0.8)
 * falls back after its blow. Hunters keep apart, and one that pushes without getting anywhere
 * steps aside a moment to get round what blocks it. A boss holds its ring (bossArena.ts): it gives
 * little ground, backs off only from close by, slowly, and circles at its rim.
 */

import type { Entity } from '../core/ecs';
import { distXZ, yawOf, type XZ } from '../core/geom';
import type { Rng } from '../core/rng';
import type { BrainDef } from '../data/archetypes';
import { AI, BOSS, SIM } from '../data/tuning';
import { moveDef, startMove } from './actions';
import { evade, holdInside, rimGap } from './bossArena';
import { isAbsent, type ArenaCircle, type Brain, type Game, type Mover, type Transform } from './components';

/** Weighted pick among the attacks whose range bracket contains `d`; null when none fits. */
export function chooseAttack(def: BrainDef, d: number, rng: Rng): string | null {
  const fits = def.attacks.filter((a) => d >= a.range[0] && d <= a.range[1]);
  let roll = rng() * fits.reduce((sum, a) => sum + a.weight, 0);
  for (const a of fits) if ((roll -= a.weight) < 0) return a.move;
  return null;
}

export function walk(m: Mover, from: XZ, to: XZ, speed: number, away = false): void {
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

/** Whether the investigator is open to a blow: swallowing a dose, recovering from their own, staggered. */
export function opening(g: Game): boolean {
  const a = g.ecs.c.actor.get(g.player.id);
  const def = a && moveDef(a);
  if (!a || !def) return false;
  if (a.move === 'drink' || a.move === 'inject' || a.move === 'stagger' || a.move === 'guardBreak' || a.move === 'parried') return true;
  return (def.hit !== undefined && a.frame >= def.hit.window[1]) || (def.shot !== undefined && a.frame > def.shot.frame);
}

/** Hands the few closing-in places to the investigator's hunters nearest them; those that work from afar need none. */
export function assignTokens(g: Game): void {
  const c = g.ecs.c;
  const pp = c.transform.get(g.player.id)?.pos;
  const hunters: { br: Brain; key: number }[] = [];
  for (const [id, br] of c.brain) {
    const held = br.token === true;
    br.token = false;
    const p = br.def.params;
    if (!pp || br.state !== 'engage' || br.target !== g.player.id || c.fight.has(id) || !p.mobile || p.range[1] > AI.wait || isAbsent(g, id)) continue;
    hunters.push({ br, key: distXZ(c.transform.get(id)!.pos, pp) - (held ? 1.5 : 0) });
  }
  hunters.sort((a, b) => a.key - b.key);
  for (const h of hunters.slice(0, AI.tokens)) h.br.token = true;
}

/** Hunters keep a little room between them: a push away from any too near. */
function keepApart(g: Game, id: Entity, pos: XZ, m: Mover, speed: number): void {
  const c = g.ecs.c;
  const r = c.body.get(id)?.radius ?? 0.5;
  let [px, pz] = [0, 0];
  for (const o of c.brain.keys()) {
    if (o === id || isAbsent(g, o)) continue;
    const q = c.transform.get(o)!.pos;
    const [dx, dz] = [pos.x - q.x, pos.z - q.z];
    const want = r + (c.body.get(o)?.radius ?? 0.5) + AI.space;
    const d = Math.hypot(dx, dz);
    if (d >= want || d < 1e-4) continue;
    const k = (want - d) / want;
    [px, pz] = [px + (dx / d) * k, pz + (dz / d) * k];
  }
  [m.vx, m.vz] = [m.vx + px * speed, m.vz + pz * speed];
}

/** A hunter pushing without getting anywhere steps aside a moment (a quarter turn from its push), to get round what blocks it. */
function unstick(g: Game, br: Brain, tr: Transform, m: Mover): void {
  const want = Math.hypot(m.vx, m.vz);
  if (br.detour) {
    const s = Math.sign(br.detour);
    [m.vx, m.vz] = [-m.vz * s, m.vx * s];
    br.detour -= s;
    return;
  }
  const moved = Math.hypot(tr.pos.x - tr.prev.x, tr.pos.z - tr.prev.z) * SIM.hz;
  br.stuck = want > 0.5 && moved < want * 0.25 ? (br.stuck ?? 0) + 1 : 0;
  if (br.stuck < AI.stuck * SIM.hz) return;
  br.stuck = 0;
  br.detour = Math.round(AI.detour * SIM.hz) * (g.rng() < 0.5 ? 1 : -1);
}

/** One step of the hunt for `target` (the creature is free: no move under way). */
export function fight(g: Game, id: Entity, br: Brain, m: Mover, target: Entity, arena: ArenaCircle | undefined): void {
  const c = g.ecs.c;
  const p = br.def.params;
  const tr = c.transform.get(id)!;
  const pos = tr.pos;
  const tp = c.transform.get(target)!.pos;
  const d = distXZ(pos, tp);
  const h = c.health.get(id)!;
  const fleeing = h.hp < h.max * p.flee;
  if (evade(g, id, br)) return;
  const waiting = !arena && target === g.player.id && !br.token && p.mobile && p.range[1] <= AI.wait;
  const [lo, hi] = p.cooldown;
  const ready = br.cooldown === 0 || (!arena && target === g.player.id && br.cooldown <= hi * (1 - AI.punish) && opening(g));
  if (ready && !(waiting && d > p.range[1] + 1)) { // one waiting its turn strikes only what comes to it
    const attack = chooseAttack(br.def, d, g.rng);
    if (attack) {
      startMove(c.actor.get(id)!, attack);
      br.cooldown = lo + Math.floor(g.rng() * (hi - lo + 1));
      if (!arena && p.strafe >= 0.8) br.fallBack = Math.round(AI.fallBack * SIM.hz);
      return;
    }
  }
  if (!p.mobile) return;
  if (arena) {
    const [near, far] = fleeing ? [Math.min(p.range[1], 5), p.range[1] + 1] : [Math.min(p.range[0], 4), p.range[1]];
    const cornered = rimGap(arena, pos) < BOSS.rim + 2;
    if (d > far) walk(m, pos, tp, br.speed);
    else if (d < near && !cornered) walk(m, pos, tp, br.speed * 0.6, true);
    else if (p.strafe > 0 || (d < near && cornered)) {
      if (g.rng() < 0.01) br.strafe = br.strafe === 1 ? -1 : 1;
      circle(m, pos, tp, br.speed * Math.max(p.strafe, 0.5), br.strafe);
    }
    holdInside(arena, pos, m, br.speed);
    return;
  }
  let [near, far] = fleeing ? [p.range[1], p.range[1] + 4] : [p.range[0], p.range[1]];
  if (waiting) {
    const ring = Math.max(p.range[1] + 2, AI.wait);
    [near, far] = [ring - 1, ring + 1.5];
  }
  if (br.fallBack) {
    br.fallBack--;
    walk(m, pos, tp, br.speed * 0.8, true);
  } else if (d > far) walk(m, pos, tp, br.speed * (waiting ? 0.7 : 1));
  else if (d < near) walk(m, pos, tp, br.speed * (waiting ? 0.6 : 1), true);
  else if (p.strafe > 0 || waiting) {
    if (g.rng() < 0.01) br.strafe = br.strafe === 1 ? -1 : 1;
    circle(m, pos, tp, br.speed * Math.max(p.strafe, 0.45), br.strafe);
  }
  keepApart(g, id, pos, m, br.speed);
  unstick(g, br, tr, m);
}
