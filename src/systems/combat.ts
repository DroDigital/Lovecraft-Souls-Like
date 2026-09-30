/**
 * Melee combat (spec §3B): each active frame a hitbox sphere sweeps its slice of the attack arc
 * (a capsule) against the hurt capsules of hostile bodies. Resolution order: i-frames, parry,
 * block / guard break, damage (riposte bonus, and a backstab's), interrupt, poise / stagger (none again within a
 * staggered investigator's respite); then hitstop (2–4
 * frames on attacker and victim) and events. A blow comes down to a body too short for it. The sanity band scales the investigator's blows both
 * ways; a hallucination's blows carry no damage (their sanity cost is hallucinations.ts); a boss's
 * ward (its hooks and signature) scales what it takes, and the investigator's reinforced weapon what they
 * deal (arms.ts). Grabs pass a guard; wind shoves.
 */

import type { Entity } from '../core/ecs';
import { segSegDist2, wrapAngle, yawOf, type V3 } from '../core/geom';
import type { HitDef } from '../data/moves';
import { COMBAT, IMPACT } from '../data/tuning';
import { inWindow, moveDef, startMove } from './actions';
import { isAbsent, type Actor, type Game, type Health, type HitOutcome, type Poise, type Stamina } from './components';
import { edge } from './arms';
import { foeDamage } from './cycles';
import { might } from './levels';
import { damageScale } from './sanity';
import { absorb } from './stamina';
import { live, targetsOf } from './targets';

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
  critical?: boolean; // struck into an unguarded back: it lands as a riposte does (round 12)
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
  const riposte = d.actor.move === 'parried' || !!blow.critical;
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
  d.poise.calm = 0;
  if ((d.poise.grace ?? 0) > 0) return { outcome: 'hit', damage }; // just staggered: it hurts, but it does not hold them down
  d.poise.value -= blow.poise;
  if (d.poise.value > 0) return { outcome: 'hit', damage };
  d.poise.value = d.poise.max;
  d.poise.grace = d.poise.respite;
  startMove(d.actor, 'stagger');
  return { outcome: 'stagger', damage };
}

/** True when `from` lies inside the guard arc of a body at `pos` facing `yaw`. */
export function isFrontal(pos: V3, yaw: number, from: V3): boolean {
  const off = wrapAngle(yawOf(from.x - pos.x, from.z - pos.z) - yaw);
  return Math.abs(off) <= (COMBAT.guardArcDeg * Math.PI) / 360;
}

/**
 * A backstab (round 12: parry and riposte were the only criticals): the investigator's blow into the
 * back of a foe no bigger than a man and a half, not a boss, not already reeling. Such a blow lands
 * as a riposte does.
 */
export function backstab(g: Game, attacker: Entity, target: Entity): boolean {
  const c = g.ecs.c;
  if (attacker !== g.player.id || c.fight.has(target) || (c.body.get(target)?.height ?? 99) > COMBAT.backstab.height) return false;
  const move = c.actor.get(target)?.move;
  if (move === 'stagger' || move === 'death' || move === 'parried') return false;
  const [at, from] = [c.transform.get(target)!, c.transform.get(attacker)!.pos];
  const off = Math.abs(wrapAngle(yawOf(from.x - at.pos.x, from.z - at.pos.z) - at.yaw));
  return off >= Math.PI - (COMBAT.backstab.arcDeg * Math.PI) / 360;
}

/** Hitbox centre at progress `p` (0..1) through the active window. */
export function hitCentre(pos: V3, yaw: number, hit: HitDef, p: number): V3 {
  const a = yaw - ((hit.arc[0] + (hit.arc[1] - hit.arc[0]) * p) * Math.PI) / 180;
  return { x: pos.x + Math.sin(a) * hit.reach, y: pos.y + hit.height, z: pos.z + Math.cos(a) * hit.reach };
}

export { hostiles, targetsOf } from './targets';

/**
 * Distance² from a segment to a body's hurt capsule, and the capsule radius. A wide body's capsule
 * stands on a flat foot (COMBAT.foot): its lower cap was centred a radius up, so a colossus was a
 * sphere touching the ground at a point, a few metres across at the height of a blade, while its
 * body kept the investigator a whole radius away (round 24: nothing that size could be struck).
 */
export function capsuleGap2(g: Game, target: Entity, a: V3, b: V3): { gap2: number; radius: number } {
  const p = g.ecs.c.transform.get(target)!.pos;
  const { radius, height } = g.ecs.c.body.get(target)!;
  const bottom = { x: p.x, y: p.y + Math.min(radius, COMBAT.foot), z: p.z };
  const top = { x: p.x, y: p.y + height - radius, z: p.z };
  return { gap2: segSegDist2(a, b, bottom, top), radius };
}

/**
 * Applies a blow from `attacker` to `target`: resolution, parry recoil, hitstop, events. `from` is
 * where it comes from, for the guard arc (a bolt or a pool; else the attacker, who may be gone).
 */
export function strike(g: Game, attacker: Entity, target: Entity, blow: Blow, from?: V3): HitOutcome {
  if (blow.lingering && target === g.player.id && g.player.mended > 0) return 'dodged'; // the Reagent holds: a pool's or the void's tick does nothing
  const { actor, health, poise, stamina, transform } = g.ecs.c;
  const aa = actor.get(attacker);
  const ta = actor.get(target)!;
  const tt = transform.get(target)!;
  const frontal = isFrontal(tt.pos, tt.yaw, from ?? transform.get(attacker)?.pos ?? tt.pos);
  const h = health.get(target)!;
  const defender = { actor: ta, health: h, poise: poise.get(target)!, stamina: stamina.get(target) };
  const felt = g.ecs.c.phantom.has(attacker)
    ? { ...blow, damage: 0, poise: 0, guard: 0 }
    : { ...blow, damage: Math.round(blow.damage * damageScale(g, attacker, target) * might(g, attacker) * foeDamage(g, attacker) * (h.ward ?? 1)) };
  const { outcome, damage } = resolveHit(defender, felt, frontal);
  if (outcome === 'parried' && aa) startMove(aa, 'parried');
  if (outcome !== 'dodged' && blow.hitstop > 0) {
    const stop = blow.hitstop + (attacker === g.player.id && (outcome === 'kill' || outcome === 'riposte') ? IMPACT.finisher : 0); // the moment a finishing blow lands hangs (round 20)
    if (aa && !from) aa.hitstop = stop;
    ta.hitstop = stop;
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

/**
 * A blow swung over a short body comes down to it (playtest round 7: a cane's slash at chest height
 * passed over the Zoogs, the Cat from Saturn and Brown Jenkin): the sweep drops to just under the
 * target's top, never below the attacker's knee.
 */
export function aimAt(g: Game, target: Entity, feet: number, s: V3): V3 {
  const top = g.ecs.c.transform.get(target)!.pos.y + g.ecs.c.body.get(target)!.height - 0.1;
  return s.y > top ? { ...s, y: Math.max(feet + 0.25, top) } : s;
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
    const root = hit.reach > COMBAT.limb ? { x: tr.pos.x, y: s1.y, z: tr.pos.z } : null; // a long limb, swept from the body out
    for (const t of live(g, targetsOf(g, id))) {
      if (a.hits.has(t)) continue;
      const tip = capsuleGap2(g, t, aimAt(g, t, tr.pos.y, s0), aimAt(g, t, tr.pos.y, s1));
      const gap2 = root ? Math.min(tip.gap2, capsuleGap2(g, t, aimAt(g, t, tr.pos.y, root), aimAt(g, t, tr.pos.y, s1)).gap2) : tip.gap2;
      const radius = tip.radius;
      if (gap2 > (hit.radius + radius) ** 2) continue;
      a.hits.add(t);
      const crit = backstab(g, id, t);
      const outcome = strike(g, id, t, { ...hit, damage: hit.damage * edge(g, id), parryable: !hit.unblockable, interrupts: false, ...(crit && { critical: true }) });
      if (hit.push && outcome !== 'dodged' && outcome !== 'parried') shove(g, t, tr.pos, hit.push);
      if (a.move === 'parried') break; // recoiled off a parry
    }
  }
}
