/**
 * Melee combat (spec §3B): each active frame a hitbox sphere sweeps its slice of the attack arc
 * (a capsule) against the hurt capsules of hostile bodies. Resolution order: i-frames, parry,
 * block / guard break, damage (riposte bonus), interrupt, poise / stagger; then hitstop (2–4
 * frames on attacker and victim) and events. The sanity band scales the investigator's blows both
 * ways; a hallucination's blows carry no damage (their sanity cost is hallucinations.ts); a boss's
 * ward (its hooks and signature) scales what it takes. Grabs pass a guard; wind shoves.
 */

import type { Entity } from '../core/ecs';
import { segSegDist2, wrapAngle, yawOf, type V3 } from '../core/geom';
import type { HitDef } from '../data/moves';
import { COMBAT } from '../data/tuning';
import { inWindow, moveDef, startMove } from './actions';
import { isAbsent, isConcealed, type Actor, type Combatant, type Game, type Health, type HitOutcome, type Poise, type Stamina } from './components';
import { damageScale } from './sanity';
import { absorb } from './stamina';

/** What a blow carries into resolution; melee hits and revolver shots both fit. */
export interface Blow {
  damage: number;
  poise: number;
  guard: number; // stamina damage when blocked
  hitstop: number;
  parryable: boolean;
  interrupts: boolean; // breaks a foe's wind-up (the revolver)
  unblockable?: boolean; // a grab, or a pool: no guard stops it
  lingering?: boolean; // a pool's or the void's tick: it hurts, but it is no blow on the mind
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
  if (frontal && d.actor.guard && !blow.unblockable) {
    if (!d.stamina || !absorb(d.stamina, blow.guard)) return { outcome: 'blocked', damage: 0 };
    startMove(d.actor, 'guardBreak');
    return { outcome: 'guardBreak', damage: 0 };
  }
  const riposte = d.actor.move === 'parried';
  const damage = blow.damage * (riposte ? COMBAT.riposte : 1);
  d.health.hp = Math.max(d.health.immortal ? 1 : d.health.floor ?? 0, d.health.hp - damage);
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

/** Who a blow from `faction` can touch: living, present, unconcealed combatants of the other side with a body. Hallucinations and the investigator touch only each other. */
export function hostiles(g: Game, faction: Combatant['faction'] | undefined, conjured: boolean, byPlayer: boolean): Entity[] {
  const { combatant, health, body, phantom } = g.ecs.c;
  const out: Entity[] = [];
  for (const [t, c] of combatant) {
    if (c.faction === faction || isAbsent(g, t) || !body.has(t) || isConcealed(g, t)) continue;
    if (phantom.has(t) ? !byPlayer : conjured && t !== g.player.id) continue;
    if ((health.get(t)?.hp ?? 0) > 0) out.push(t);
  }
  return out;
}

export const targetsOf = (g: Game, id: Entity): Entity[] => hostiles(g, g.ecs.c.combatant.get(id)?.faction, g.ecs.c.phantom.has(id), id === g.player.id);

/** Distance² from a segment to a body's hurt capsule, and the capsule radius. */
export function capsuleGap2(g: Game, target: Entity, a: V3, b: V3): { gap2: number; radius: number } {
  const p = g.ecs.c.transform.get(target)!.pos;
  const { radius, height } = g.ecs.c.body.get(target)!;
  const bottom = { x: p.x, y: p.y + radius, z: p.z };
  const top = { x: p.x, y: p.y + height - radius, z: p.z };
  return { gap2: segSegDist2(a, b, bottom, top), radius };
}

/**
 * Applies a blow from `attacker` to `target`: resolution, parry recoil, hitstop, events. `from` is
 * where it comes from, for the guard arc (a bolt or a pool; else the attacker, who may be gone).
 */
export function strike(g: Game, attacker: Entity, target: Entity, blow: Blow, from?: V3): HitOutcome {
  const { actor, health, poise, stamina, transform } = g.ecs.c;
  const aa = actor.get(attacker);
  const ta = actor.get(target)!;
  const tt = transform.get(target)!;
  const frontal = isFrontal(tt.pos, tt.yaw, from ?? transform.get(attacker)?.pos ?? tt.pos);
  const h = health.get(target)!;
  const defender = { actor: ta, health: h, poise: poise.get(target)!, stamina: stamina.get(target) };
  const felt = g.ecs.c.phantom.has(attacker)
    ? { ...blow, damage: 0, poise: 0, guard: 0 }
    : { ...blow, damage: Math.round(blow.damage * damageScale(g, attacker, target) * (h.ward ?? 1)) };
  const { outcome, damage } = resolveHit(defender, felt, frontal);
  if (outcome === 'parried' && aa) startMove(aa, 'parried');
  if (outcome !== 'dodged' && blow.hitstop > 0) {
    if (aa && !from) aa.hitstop = blow.hitstop;
    ta.hitstop = blow.hitstop;
  }
  g.events.emit('Hit', { attacker, target, outcome, damage, ...(blow.lingering && { lingering: true }) });
  if (outcome === 'kill') g.events.emit('Died', { entity: target, killer: attacker, at: { ...tt.pos } });
  return outcome;
}

const SHOVE_FRAMES = 12;

/** Pushes a body `metres` straight away from `from`, over a few frames (movement.ts moves it). */
export function shove(g: Game, target: Entity, from: V3, metres: number): void {
  const p = g.ecs.c.transform.get(target)?.pos;
  if (!p || g.ecs.c.body.get(target)?.fixed) return;
  const [dx, dz] = [p.x - from.x, p.z - from.z];
  const d = Math.hypot(dx, dz) || 1;
  g.ecs.c.shove.set(target, { x: (dx / d) * (metres / SHOVE_FRAMES), z: (dz / d) * (metres / SHOVE_FRAMES), frames: SHOVE_FRAMES });
}

export function meleeSystem(g: Game): void {
  const { actor, transform } = g.ecs.c;
  for (const [id, a] of actor) {
    const hit = moveDef(a)?.hit;
    if (!hit || a.frozen || isAbsent(g, id) || !inWindow(hit.window, a.frame)) continue;
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
      const outcome = strike(g, id, t, { ...hit, parryable: !hit.unblockable, interrupts: false });
      if (hit.push && outcome !== 'dodged' && outcome !== 'parried') shove(g, t, tr.pos, hit.push);
      if (a.move === 'parried') break; // recoiled off a parry
    }
  }
}
