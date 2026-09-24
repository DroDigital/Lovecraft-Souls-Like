/**
 * Behaviour archetypes (spec §3C): every creature runs the same perception-driven state machine
 * (systems/brain.ts); an archetype is the set of parameters that gives it a temperament. Entities
 * pick one and override individual params.
 */

import type { ArchetypeId, ArchetypeParams } from './schema';

const BASE: ArchetypeParams = {
  aggro: 16,
  fov: 140,
  hearing: 4,
  leash: 30,
  range: [0, 1.6],
  cooldown: [40, 80],
  strafe: 0,
  flee: 0,
  hide: 'none',
  reveal: 0,
  hover: 0,
  mobile: true,
  turnRate: 5,
};

const arch = (p: Partial<ArchetypeParams>): ArchetypeParams => ({ ...BASE, ...p });

export const ARCHETYPES: Readonly<Record<ArchetypeId, ArchetypeParams>> = {
  /** Fast, eager melee that closes in and harries. */
  pack_hunter: arch({ aggro: 18, cooldown: [30, 70], strafe: 0.3, turnRate: 6 }),
  /** Lies still and unseen until its prey is close, then strikes. */
  ambusher: arch({ hide: 'ambush', reveal: 5, fov: 360, cooldown: [25, 60], turnRate: 7 }),
  /** Slow, heavy hitter that walks straight in. */
  brute: arch({ aggro: 14, cooldown: [60, 110], turnRate: 3 }),
  /** Keeps just out of reach, circles, darts in. */
  skirmisher: arch({ range: [2.5, 5], strafe: 0.8, cooldown: [35, 70], flee: 0.3, turnRate: 7 }),
  /** Keeps its distance and works from range. */
  caster: arch({ aggro: 22, range: [7, 13], strafe: 0.4, cooldown: [70, 120], flee: 0.5 }),
  /** Circles high, then dives. */
  flyer_swoop: arch({ aggro: 24, fov: 360, range: [3, 8], strafe: 0.7, hover: 2.5, cooldown: [50, 90] }),
  /** Hangs in the air at range. */
  hover_ranged: arch({ aggro: 22, fov: 360, range: [6, 12], strafe: 0.5, hover: 2, cooldown: [60, 110] }),
  /** Waits underground and erupts beneath its prey. */
  burrower: arch({ hide: 'burrow', reveal: 7, fov: 360, hearing: 12, cooldown: [45, 90], turnRate: 4 }),
  /** A mass of small things that simply floods forward. */
  swarm: arch({ aggro: 12, fov: 360, cooldown: [15, 35], turnRate: 9 }),
  /** Unseen except while it strikes. */
  invisible_stalker: arch({ hide: 'invisible', fov: 360, hearing: 8, strafe: 0.5, cooldown: [40, 90] }),
  /** Works on the mind from mid range and avoids melee. */
  mind_thief: arch({ aggro: 20, range: [5, 10], strafe: 0.6, cooldown: [80, 140], flee: 0.6 }),
  /** Never moves; lashes out at anything in reach. */
  stationary_horror: arch({ fov: 360, hearing: 10, mobile: false, range: [0, 99], cooldown: [45, 90], turnRate: 2 }),
  /** Arena foe: follows its boss script's attacks; never leashes. */
  boss: arch({ aggro: 40, fov: 360, hearing: 40, leash: 1000, range: [0, 3], cooldown: [50, 100], turnRate: 3 }),
  /** Non-hostile by default: follows the player and fights what threatens them. */
  ally: arch({ aggro: 14, fov: 360, range: [0, 2], cooldown: [50, 100], turnRate: 6 }),
};

/** One attack a brain may choose: the move id, its weight, and the distance bracket it is used in. */
export interface AttackChoice {
  move: string;
  weight: number;
  range: readonly [min: number, max: number];
}

/** A compiled brain: the archetype's resolved params and the attacks it chooses from. */
export interface BrainDef {
  archetype: ArchetypeId;
  params: ArchetypeParams;
  attacks: readonly AttackChoice[];
}

export function brainOf(archetype: ArchetypeId, params: Partial<ArchetypeParams> | undefined, attacks: readonly AttackChoice[]): BrainDef {
  return { archetype, params: { ...ARCHETYPES[archetype], ...params }, attacks };
}
