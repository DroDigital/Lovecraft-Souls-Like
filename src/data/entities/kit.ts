/** Shorthands that keep each roster entry a few lines of data. */

import type { ArchetypeId, ArchetypeParams, ArenaChange, AttackId, BossPhase, BossScript, EntityDef, RealityHook, Stats, Tier } from '../schema';

export type Entry = Omit<EntityDef, 'tier'>;

/** hp, poise, damage, speed (m/s), sanityAura (per s), sanityDamage (per hit). */
export const st = (hp: number, poise: number, damage: number, speed: number, sanityAura: number, sanityDamage: number): Stats => ({
  hp,
  poise,
  damage,
  speed,
  sanityAura,
  sanityDamage,
});

export const tier = (t: Tier, entries: readonly Entry[]): EntityDef[] => entries.map((e) => ({ ...e, tier: t }));

/** What a boss phase brings besides its attacks. */
interface PhaseExtras {
  summons?: readonly string[];
  hooks?: readonly RealityHook[];
  arena?: ArenaChange;
}

type Weights = Partial<Record<AttackId, number>>;

/** One boss phase (spec §3E): it begins below `hpBelow` of health, with weighted attacks and its extras. */
export function ph(hpBelow: number, weights: Weights, x: PhaseExtras = {}): BossPhase {
  return {
    hpBelow,
    attacks: (Object.entries(weights) as [AttackId, number][]).map(([id, weight]) => ({ id, weight })),
    ...(x.summons && { summons: x.summons }),
    ...(x.hooks && { realityHooks: x.hooks }),
    ...(x.arena && { arenaChange: x.arena }),
  };
}

const attacksIn = (s: BossScript): AttackId[] => [...new Set(s.phases.flatMap((p) => p.attacks.map((a) => a.id)))];

/** A creature that fights by a boss script, with the given temperament; its attack list is every attack its phases use. */
export const scripted = (archetype: ArchetypeId, s: BossScript, params?: Partial<ArchetypeParams>): Pick<Entry, 'behavior' | 'bossScript'> => ({
  behavior: { archetype, attacks: attacksIn(s), ...(params && { params }) },
  bossScript: s,
});

/** A boss script over its phases (the first begins at full health). */
export const phases = (...list: BossPhase[]): BossScript => ({ phases: list });
