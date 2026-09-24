/**
 * The shared attack library (spec §3E): ~20 parameterised attacks that every creature draws from.
 * `compileAttack` turns one into a Phase 1 MoveDef scaled by the creature's damage and body size.
 * Ranged attacks are hitscan shots until Phase 5 adds projectiles; special effects (teleport,
 * summon, gaze, darkness) and sanity damage are data here and run in later phases.
 */

import type { MoveDef } from './moves';
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
  shot?: number; // metres: hitscan range
  sanity?: number; // sanity damage = sanity × stats.sanityDamage (Phase 3)
  effect?: 'teleport' | 'summon' | 'gaze' | 'darkness'; // Phase 5
}

const melee = (d: Omit<AttackDef, 'kind'>): AttackDef => ({ kind: 'melee', ...d });

export const ATTACKS: Readonly<Record<AttackId, AttackDef>> = {
  sweep: melee({ windup: 18, active: 6, recovery: 22, power: 1, poise: 0.8, range: [0, 2.2], reach: 1.3, radius: 0.5, height: 0.6, arc: [80, -60] }),
  slam: melee({ windup: 30, active: 5, recovery: 30, power: 1.6, poise: 1.6, range: [0, 2.4], reach: 1.4, radius: 0.8, height: 0.4, arc: [0, 0] }),
  lunge: melee({ windup: 24, active: 10, recovery: 34, power: 1.3, poise: 1.2, range: [2.5, 5.5], reach: 1.1, radius: 0.55, height: 0.55, arc: [15, -15], lunge: 4.2 }),
  charge: melee({ windup: 30, active: 18, recovery: 36, power: 1.5, poise: 2, range: [4, 10], reach: 1.2, radius: 0.8, height: 0.5, arc: [0, 0], lunge: 8 }),
  grab: melee({ windup: 22, active: 6, recovery: 40, power: 1.4, poise: 0.6, range: [0, 1.8], reach: 1, radius: 0.5, height: 0.6, arc: [30, -30] }),
  bite: melee({ windup: 14, active: 5, recovery: 20, power: 0.9, poise: 0.6, range: [0, 1.8], reach: 1.1, radius: 0.45, height: 0.5, arc: [10, -10], lunge: 0.6 }),
  tentacle_burst: melee({ windup: 26, active: 12, recovery: 30, power: 1.2, poise: 1, range: [0, 3.5], reach: 2.2, radius: 0.7, height: 0.5, arc: [120, -120] }),
  projectile: { kind: 'ranged', windup: 26, active: 1, recovery: 30, power: 0.9, poise: 0.5, range: [4, 18], shot: 20 },
  projectile_fan: { kind: 'ranged', windup: 34, active: 1, recovery: 34, power: 0.7, poise: 0.4, range: [3, 14], shot: 16 },
  beam: { kind: 'ranged', windup: 40, active: 1, recovery: 36, power: 1.4, poise: 1, range: [5, 22], shot: 24 },
  spit: { kind: 'ranged', windup: 20, active: 1, recovery: 26, power: 0.7, poise: 0.3, range: [2, 9], shot: 10 },
  wind_push: { kind: 'ranged', windup: 24, active: 8, recovery: 30, power: 0.4, poise: 2, range: [0, 5], reach: 2.5, radius: 1.2, height: 0.5, arc: [60, -60] },
  aoe_ring: { kind: 'area', windup: 36, active: 6, recovery: 36, power: 1.3, poise: 1.5, range: [0, 3.5], reach: 0, radius: 3, height: 0.3, arc: [180, -180] },
  pool: { kind: 'area', windup: 30, active: 20, recovery: 30, power: 0.6, poise: 0.3, range: [2, 7], reach: 4, radius: 1.6, height: 0.2, arc: [0, 0] },
  dive: { kind: 'area', windup: 30, active: 10, recovery: 40, power: 1.6, poise: 2, range: [3, 9], reach: 1, radius: 1, height: 0.4, arc: [0, 0], lunge: 6 },
  teleport: { kind: 'special', windup: 20, active: 1, recovery: 20, power: 0, poise: 0, range: [6, 30], effect: 'teleport' },
  summon: { kind: 'special', windup: 40, active: 1, recovery: 30, power: 0, poise: 0, range: [4, 30], effect: 'summon' },
  roar: { kind: 'special', windup: 24, active: 12, recovery: 30, power: 0, poise: 0, range: [0, 12], sanity: 1.5 },
  gaze: { kind: 'special', windup: 30, active: 20, recovery: 30, power: 0, poise: 0, range: [0, 20], sanity: 0.5, effect: 'gaze' },
  darkness: { kind: 'special', windup: 36, active: 1, recovery: 30, power: 0, poise: 0, range: [4, 30], effect: 'darkness' },
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
  const strikes = a.kind !== 'special' && damage > 0;
  const motion = a.lunge
    ? { window: [Math.max(0, a.windup - 6), a.windup + a.active] as const, distance: a.lunge * Math.sqrt(k), dir: 'facing' as const }
    : undefined;
  const move: MoveDef = { frames, track: { window: [0, Math.max(1, a.windup - 4)], rate: 3 }, motion };
  if (!strikes) return move;
  const interrupt = [Math.round(a.windup * 0.3), a.windup] as const;
  if (a.shot) return { ...move, interrupt, shot: { frame: a.windup, damage, poise, range: a.shot * Math.sqrt(k), hitstop } };
  return {
    ...move,
    interrupt,
    hit: {
      window: [a.windup, a.windup + a.active],
      damage,
      poise,
      guard: Math.round(damage * 1.3),
      hitstop,
      reach: (a.reach ?? 1) * k,
      radius: (a.radius ?? 0.5) * k,
      height: Math.min(1.3, Math.max(0.3, (a.height ?? 0.5) * height)),
      arc: a.arc ?? [0, 0],
    },
  };
}
