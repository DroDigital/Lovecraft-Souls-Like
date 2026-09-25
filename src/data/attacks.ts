/**
 * The shared attack library (spec §3E): ~20 parameterised attacks that every creature draws from.
 * `compileAttack` turns one into a MoveDef scaled by the creature's damage and body size. Bolts fly
 * as real projectiles (systems/projectiles.ts), spit lands as a pool, the pool attack spreads one
 * under its target (systems/hazards.ts), wind shoves and grabs ignore a guard; roar and gaze take
 * sanity (Phase 3) and the special effects (teleport, summon, gaze buildup, darkness) run in
 * systems/specials.ts. The beam stays a hitscan ray.
 */

import type { EffectKind, MoveDef } from './moves';
import type { AttackId, Stats } from './schema';

export interface AttackDef {
  kind: 'melee' | 'ranged' | 'area' | 'special';
  windup: number; // frames before the blow lands
  active: number;
  recovery: number;
  power: number; // damage = power × stats.damage
  poise: number; // poise damage = poise × stats.damage
  range: readonly [min: number, max: number]; // metres, for a human-sized body; the AI's bracket
  reach?: number; // hitbox (see HitDef), metres for a human-sized body
  radius?: number;
  height?: number; // fraction of body height
  arc?: readonly [from: number, to: number];
  lunge?: number; // metres travelled while striking
  shot?: number; // metres: hitscan range (the beam)
  bolts?: { count: number; spread: number; speed: number; radius: number; lob?: boolean }; // a volley (spread in degrees, speed m/s)
  pool?: { radius: number; life: number; tick: number; power: number }; // lingering: frames, frames per tick, damage per tick = power × stats.damage
  push?: number; // metres a blow shoves its victim, guarded or not
  unblockable?: boolean;
  sanity?: number; // sanity damage = sanity × stats.sanityDamage, over the active frames
  effect?: EffectKind;
  marks?: { count: number; ring: readonly [number, number]; delay: number; stagger: number; radius: number }; // the eruption (see MarksDef)
  wave?: { speed: number; width: number; reach: number }; // the quake (see WaveDef)
  sweep?: { arc: readonly [number, number]; length: number; width: number }; // the sweeping beam, over the active frames
  barrage?: { arms: number; every: number; spin: number; speed: number; radius: number }; // over the active frames
  pull?: { speed: number; range: number }; // the vortex draws its prey in over the active frames
  follow?: AttackId; // runs straight on into this attack as it ends (a chain)
  tight?: boolean; // its hit grows only with the root of the body's size (a burst at a colossus's heart stays dodgeable)
}

const melee = (d: Omit<AttackDef, 'kind'>): AttackDef => ({ kind: 'melee', ...d });

export const ATTACKS: Readonly<Record<AttackId, AttackDef>> = {
  sweep: melee({ windup: 18, active: 6, recovery: 22, power: 1, poise: 0.8, range: [0, 2.2], reach: 1.3, radius: 0.5, height: 0.6, arc: [80, -60] }),
  slam: melee({ windup: 30, active: 5, recovery: 30, power: 1.6, poise: 1.6, range: [0, 2.4], reach: 1.4, radius: 0.8, height: 0.4, arc: [0, 0] }),
  lunge: melee({ windup: 24, active: 10, recovery: 34, power: 1.3, poise: 1.2, range: [2.5, 5.5], reach: 1.1, radius: 0.55, height: 0.55, arc: [15, -15], lunge: 4.2 }),
  charge: melee({ windup: 30, active: 18, recovery: 36, power: 1.5, poise: 2, range: [4, 10], reach: 1.2, radius: 0.8, height: 0.5, arc: [0, 0], lunge: 8 }),
  grab: melee({ windup: 22, active: 6, recovery: 40, power: 1.4, poise: 0.6, range: [0, 1.8], reach: 1, radius: 0.5, height: 0.6, arc: [30, -30], unblockable: true }),
  bite: melee({ windup: 14, active: 5, recovery: 20, power: 0.9, poise: 0.6, range: [0, 1.8], reach: 1.1, radius: 0.45, height: 0.5, arc: [10, -10], lunge: 0.6 }),
  tentacle_burst: melee({ windup: 26, active: 12, recovery: 30, power: 1.2, poise: 1, range: [0, 3.5], reach: 2.2, radius: 0.7, height: 0.5, arc: [120, -120] }),
  projectile: { kind: 'ranged', windup: 26, active: 1, recovery: 30, power: 0.9, poise: 0.5, range: [4, 18], bolts: { count: 1, spread: 0, speed: 16, radius: 0.3 } },
  projectile_fan: { kind: 'ranged', windup: 34, active: 1, recovery: 34, power: 0.7, poise: 0.4, range: [3, 14], bolts: { count: 5, spread: 56, speed: 12, radius: 0.3 } },
  beam: { kind: 'ranged', windup: 40, active: 1, recovery: 36, power: 1.4, poise: 1, range: [5, 22], shot: 24 },
  spit: { kind: 'ranged', windup: 20, active: 1, recovery: 26, power: 0.7, poise: 0.3, range: [2, 9], bolts: { count: 1, spread: 0, speed: 9, radius: 0.35, lob: true }, pool: { radius: 1.3, life: 240, tick: 30, power: 0.2 } },
  wind_push: { kind: 'ranged', windup: 24, active: 8, recovery: 30, power: 0.4, poise: 2, range: [0, 5], reach: 2.5, radius: 1.2, height: 0.5, arc: [60, -60], push: 3.5 },
  aoe_ring: { kind: 'area', windup: 36, active: 6, recovery: 36, power: 1.3, poise: 1.5, range: [0, 3.5], reach: 0, radius: 3, height: 0.3, arc: [180, -180] },
  pool: { kind: 'area', windup: 30, active: 1, recovery: 30, power: 0, poise: 0, range: [2, 9], pool: { radius: 1.8, life: 300, tick: 30, power: 0.3 } },
  dive: { kind: 'area', windup: 30, active: 10, recovery: 40, power: 1.6, poise: 2, range: [3, 9], reach: 1, radius: 1, height: 0.4, arc: [0, 0], lunge: 6 },
  teleport: { kind: 'special', windup: 20, active: 1, recovery: 20, power: 0, poise: 0, range: [6, 30], effect: 'teleport' },
  summon: { kind: 'special', windup: 40, active: 1, recovery: 30, power: 0, poise: 0, range: [4, 30], effect: 'summon' },
  roar: { kind: 'special', windup: 24, active: 12, recovery: 30, power: 0, poise: 0, range: [0, 12], sanity: 1.5 },
  gaze: { kind: 'special', windup: 30, active: 20, recovery: 30, power: 0, poise: 0, range: [0, 20], sanity: 0.5, effect: 'gaze' },
  darkness: { kind: 'special', windup: 36, active: 1, recovery: 30, power: 0, poise: 0, range: [4, 30], effect: 'darkness' },
  // The dodging game: marked ground, rings and beams to roll through, patterns to weave between, chains to read.
  eruption: { kind: 'area', windup: 28, active: 1, recovery: 44, power: 1.3, poise: 1.6, range: [0, 16], marks: { count: 5, ring: [2.5, 5.5], delay: 42, stagger: 7, radius: 1.7 } },
  quake: { kind: 'area', windup: 32, active: 1, recovery: 42, power: 1.1, poise: 1.4, range: [0, 11], wave: { speed: 8, width: 1.1, reach: 15 } },
  sweep_beam: { kind: 'ranged', windup: 46, active: 44, recovery: 34, power: 1.2, poise: 1.2, range: [3, 15], sweep: { arc: [75, -75], length: 17, width: 0.7 } },
  barrage: { kind: 'ranged', windup: 30, active: 70, recovery: 30, power: 0.55, poise: 0.4, range: [0, 14], barrage: { arms: 4, every: 9, spin: 13, speed: 7.5, radius: 0.35 } },
  vortex: { kind: 'special', windup: 24, active: 54, recovery: 1, power: 0, poise: 0, range: [3, 11], pull: { speed: 3, range: 12 }, follow: 'vortex_burst' },
  vortex_burst: { kind: 'area', windup: 8, active: 6, recovery: 44, power: 1.5, poise: 2, range: [0, 0], reach: 0, radius: 4.2, height: 0.3, arc: [180, -180], tight: true },
  combo: melee({ windup: 16, active: 6, recovery: 6, power: 0.8, poise: 0.7, range: [0, 2.4], reach: 1.3, radius: 0.5, height: 0.6, arc: [80, -60], lunge: 0.8, follow: 'combo_2' }),
  combo_2: melee({ windup: 10, active: 6, recovery: 8, power: 0.8, poise: 0.7, range: [0, 0], reach: 1.3, radius: 0.5, height: 0.55, arc: [-70, 80], lunge: 0.6, follow: 'combo_3' }),
  combo_3: melee({ windup: 34, active: 5, recovery: 36, power: 1.5, poise: 1.6, range: [0, 0], reach: 1.5, radius: 0.8, height: 0.4, arc: [0, 0], lunge: 1.4 }),
  delayed_slam: melee({ windup: 54, active: 5, recovery: 34, power: 1.8, poise: 2, range: [0, 2.6], reach: 1.5, radius: 0.9, height: 0.4, arc: [0, 0] }),
};

/** Body size relative to a human (1.9 m); big bodies reach further. */
export const sizeFactor = (height: number): number => Math.max(1, height / 1.9);

/** The distance bracket in which a creature of this height uses the attack. */
export function attackRange(id: AttackId, height: number): readonly [number, number] {
  const [lo, hi] = ATTACKS[id].range;
  const k = sizeFactor(height);
  return [lo * k, hi * k];
}

/** A MoveDef for this attack on a body `height` metres tall with these stats. */
export function compileAttack(id: AttackId, stats: Stats, height: number): MoveDef {
  const a = ATTACKS[id];
  const k = sizeFactor(height);
  const frames = a.windup + a.active + a.recovery;
  const damage = Math.round(a.power * stats.damage);
  const poise = Math.round(a.poise * stats.damage);
  const hitstop = a.kind === 'ranged' ? 2 : a.power >= 1.4 ? 4 : 3;
  const pool = a.pool && { radius: a.pool.radius * Math.sqrt(k), life: a.pool.life, tick: a.pool.tick, damage: Math.max(1, Math.round(a.pool.power * stats.damage)) };
  const motion = a.lunge
    ? { window: [Math.max(0, a.windup - 6), a.windup + a.active] as const, distance: a.lunge * Math.sqrt(k), dir: 'facing' as const }
    : undefined;
  const move: MoveDef = { frames, track: { window: [0, Math.max(1, a.windup - 4)], rate: 3 }, motion };
  if (a.sanity && stats.sanityDamage > 0) {
    const range = a.range[1] * k;
    move.sanity = { window: [a.windup, a.windup + a.active], amount: a.sanity * stats.sanityDamage, range, sight: a.effect === 'gaze' };
  }
  if (a.effect) move.effect = { window: [a.windup, a.windup + a.active], kind: a.effect, range: a.range[1] * k };
  if (a.follow) move.then = a.follow;
  if (a.pull) move.pull = { window: [a.windup, a.windup + a.active], speed: a.pull.speed, range: a.pull.range * k };
  if (a.kind === 'special' || stats.damage <= 0 || (damage <= 0 && !pool)) return move;
  move.interrupt = [Math.round(a.windup * 0.3), a.windup];
  const b = a.bolts;
  const s = Math.sqrt(k);
  const active = [a.windup, a.windup + a.active] as const;
  if (a.marks) move.marks = { frame: a.windup, ...a.marks, ring: [a.marks.ring[0] * s, a.marks.ring[1] * s], radius: a.marks.radius * s, damage, poise };
  else if (a.wave) move.wave = { frame: a.windup, speed: a.wave.speed * s, width: a.wave.width * s, reach: a.wave.reach * s, damage, poise };
  else if (a.sweep) move.sweep = { window: active, arc: a.sweep.arc, length: a.sweep.length * s, width: a.sweep.width * s, damage, poise };
  else if (a.barrage) move.barrage = { window: active, ...a.barrage, radius: a.barrage.radius * s, range: a.range[1] * k * 1.6, damage, poise };
  else if (b) {
    const range = a.range[1] * k * 1.5;
    move.volley = { frame: a.windup, count: b.count, spread: b.spread, speed: b.speed, radius: b.radius * Math.sqrt(k), range, damage, poise, lob: !!b.lob, pool };
  } else if (pool) move.pool = { frame: a.windup, ...pool };
  else if (a.shot) move.shot = { frame: a.windup, damage, poise, range: a.shot * Math.sqrt(k), hitstop };
  else {
    move.hit = {
      window: [a.windup, a.windup + a.active],
      damage,
      poise,
      guard: Math.round(damage * 1.3),
      hitstop,
      reach: (a.reach ?? 1) * (a.tight ? s : k),
      radius: (a.radius ?? 0.5) * (a.tight ? s : k),
      height: Math.min(1.3, Math.max(0.3, (a.height ?? 0.5) * height)),
      arc: a.arc ?? [0, 0],
      ...(a.push && { push: a.push * Math.sqrt(k) }),
      ...(a.unblockable && { unblockable: true }),
    };
  }
  return move;
}
