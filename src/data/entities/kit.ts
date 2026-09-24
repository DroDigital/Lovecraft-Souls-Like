/** Shorthands that keep each roster entry a few lines of data. */

import type { ArchetypeParams, AttackId, BossScript, EntityDef, RealityHook, Stats, Tier } from '../schema';

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

interface StubExtras {
  summons?: readonly string[];
  hooks?: readonly RealityHook[];
  arena?: string;
}

/** A one-phase boss script (Phase 5 writes the real phases). */
export function stub(attacks: readonly AttackId[], x: StubExtras = {}): BossScript {
  return {
    phases: [
      {
        hpBelow: 1,
        attacks: attacks.map((id) => ({ id, weight: 1 })),
        ...(x.summons && { summons: x.summons }),
        ...(x.hooks && { realityHooks: x.hooks }),
        ...(x.arena && { arenaChange: x.arena }),
      },
    ],
  };
}

/** A boss: the boss archetype plus a one-phase script over the same attacks. */
export const boss = (attacks: readonly AttackId[], x: StubExtras = {}, params?: Partial<ArchetypeParams>): Pick<Entry, 'behavior' | 'bossScript'> => ({
  behavior: { archetype: 'boss', attacks, ...(params && { params }) },
  bossScript: stub(attacks, x),
});
