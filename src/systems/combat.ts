/**
 * Melee combat (spec §3B): each active frame a hitbox sphere sweeps its slice of the attack arc
 * (a capsule) against the hurt capsules of hostile bodies. Resolution order: i-frames, parry,
 * block / guard break, damage (riposte bonus), interrupt, poise / stagger; then hitstop (2–4
 * frames on attacker and victim) and events.
 */

import type { Entity } from '../core/ecs';
import { segSegDist2, wrapAngle, yawOf, type V3 } from '../core/geom';
import type { HitDef } from '../data/moves';
import { COMBAT } from '../data/tuning';
import { inWindow, moveDef, startMove } from './actions';
import { isConcealed, type Actor, type Game, type Health, type HitOutcome, type Poise, type Stamina } from './components';
import { absorb } from './stamina';

/** What a blow carries into resolution; melee hits and revolver shots both fit. */
export interface Blow {
  damage: number;
  poise: number;
  guard: number; // stamina damage when blocked
  hitstop: number;
  parryable: boolean;
  interrupts: boolean; // breaks a foe's wind-up (the revolver)
}

export interface Defender {
  actor: Actor;
  health: Health;
  poise: Poise;
  stamina?: Stamina;
}

/**
 * Resolves one blow and applies it to the defender's components.
 * `frontal`: the attacker is inside the defender's guard arc (block and parry need it).
 */
export function resolveHit(d: Defender, blow: Blow, frontal: boolean): { outcome: HitOutcome; damage: number } {
  const def = moveDef(d.actor);
  const f = d.actor.frame;
  if (inWindow(def?.iframes, f)) return { outcome: 'dodged', damage: 0 };
  if (blow.parryable && frontal && inWindow(def?.parry, f)) return { outcome: 'parried', damage: 0 };
  if (frontal && d.actor.guard) {
    if (!d.stamina || !absorb(d.stamina, blow.guard)) return { outcome: 'blocked', damage: 0 };
    startMove(d.actor, 'guardBreak');
    return { outcome: 'guardBreak', damage: 0 };
  }
  const riposte = d.actor.move === 'parried';
  const damage = blow.damage * (riposte ? COMBAT.riposte : 1);
  d.health.hp = Math.max(d.health.immortal ? 1 : 0, d.health.hp - damage);
  d.health.calm = 0;
  if (d.health.hp <= 0) {
    startMove(d.actor, 'death');
    return { outcome: 'kill', damage };
  }
  if (riposte) {
    startMove(d.actor, 'stagger');
    return { outcome: 'riposte', damage };
  }
  if (blow.interrupts && inWindow(def?.interrupt, f)) {
    startMove(d.actor, 'parried');
    return { outcome: 'interrupted', damage };
  }
  d.poise.value -= blow.poise;
  d.poise.calm = 0;
  if (d.poise.value > 0) return { outcome: 'hit', damage };
  d.poise.value = d.poise.max;
  startMove(d.actor, 'stagger');
  return { outcome: 'stagger', damage };
}

/** True when `from` lies inside the guard arc of a body at `pos` facing `yaw`. */
export function isFrontal(pos: V3, yaw: number, from: V3): boolean {
  const off = wrapAngle(yawOf(from.x - pos.x, from.z - pos.z) - yaw);
  return Math.abs(off) <= (COMBAT.guardArcDeg * Math.PI) / 360;
}

/** Hitbox centre at progress `p` (0..1) through the active window. */
export function hitCentre(pos: V3, yaw: number, hit: HitDef, p: number): V3 {
  const a = yaw - ((hit.arc[0] + (hit.arc[1] - hit.arc[0]) * p) * Math.PI) / 180;
  return { x: pos.x + Math.sin(a) * hit.reach, y: pos.y + hit.height, z: pos.z + Math.cos(a) * hit.reach };
}

/** Living, hostile, unconcealed combatants with a body. */
export function targetsOf(g: Game, id: Entity): Entity[] {
  const { combatant, health, dead, body } = g.ecs.c;
  const faction = combatant.get(id)?.faction;
  const out: Entity[] = [];
  for (const [t, c] of combatant) {
    if (c.faction === faction || dead.has(t) || !body.has(t) || isConcealed(g, t)) continue;
    if ((health.get(t)?.hp ?? 0) > 0) out.push(t);
  }
  return out;
}

/** Distance² from a segment to a body's hurt capsule, and the capsule radius. */
export function capsuleGap2(g: Game, target: Entity, a: V3, b: V3): { gap2: number; radius: number } {
  const p = g.ecs.c.transform.get(target)!.pos;
  const { radius, height } = g.ecs.c.body.get(target)!;
  const bottom = { x: p.x, y: p.y + radius, z: p.z };
  const top = { x: p.x, y: p.y + height - radius, z: p.z };
  return { gap2: segSegDist2(a, b, bottom, top), radius };
}

/** Applies a blow from `attacker` to `target`: resolution, parry recoil, hitstop, events. */
export function strike(g: Game, attacker: Entity, target: Entity, blow: Blow): HitOutcome {
  const { actor, health, poise, stamina, transform } = g.ecs.c;
  const aa = actor.get(attacker)!;
  const ta = actor.get(target)!;
  const tt = transform.get(target)!;
  const frontal = isFrontal(tt.pos, tt.yaw, transform.get(attacker)!.pos);
  const defender = { actor: ta, health: health.get(target)!, poise: poise.get(target)!, stamina: stamina.get(target) };
  const { outcome, damage } = resolveHit(defender, blow, frontal);
  if (outcome === 'parried') startMove(aa, 'parried');
  if (outcome !== 'dodged') {
    aa.hitstop = blow.hitstop;
    ta.hitstop = blow.hitstop;
  }
  g.events.emit('Hit', { attacker, target, outcome, damage });
  if (outcome === 'kill') g.events.emit('Died', { entity: target, killer: attacker, at: { ...tt.pos } });
  return outcome;
}

export function meleeSystem(g: Game): void {
  const { actor, transform, dead } = g.ecs.c;
  for (const [id, a] of actor) {
    const hit = moveDef(a)?.hit;
    if (!hit || a.frozen || dead.has(id) || !inWindow(hit.window, a.frame)) continue;
    const tr = transform.get(id)!;
    const n = hit.window[1] - hit.window[0];
    const k = a.frame - hit.window[0];
    const s0 = hitCentre(tr.pos, tr.yaw, hit, k / n);
    const s1 = hitCentre(tr.pos, tr.yaw, hit, (k + 1) / n);
    for (const t of targetsOf(g, id)) {
      if (a.hits.has(t)) continue;
      const { gap2, radius } = capsuleGap2(g, t, s0, s1);
      if (gap2 > (hit.radius + radius) ** 2) continue;
      a.hits.add(t);
      strike(g, id, t, { ...hit, parryable: true, interrupts: false });
      if (a.move === 'parried') break; // recoiled off a parry
    }
  }
}
