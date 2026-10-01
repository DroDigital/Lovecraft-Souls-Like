/**
 * What the Bestiary page says of a creature besides its field note (round 34): how it fights, from its
 * behaviour archetype, and what hurts it or turns the blow, from its entry. Pure.
 */

import { getRegion } from './regions';
import type { ArchetypeId, DamageType, EntityDef, Tier } from './schema';

export const HABITS: Readonly<Record<ArchetypeId, string>> = {
  pack_hunter: 'Hunts in packs, and calls the rest to it.',
  ambusher: 'Lies in wait, and strikes when you come near.',
  brute: 'Slow to turn, and heavy in the blow.',
  skirmisher: 'Darts in and out, and does not stand to be struck.',
  caster: 'Fights from a distance, and throws what it speaks.',
  flyer_swoop: 'Swoops from above, and wheels to come again.',
  hover_ranged: 'Hangs in the air and strikes from afar.',
  burrower: 'Goes under the ground, and rises where it likes.',
  swarm: 'Comes as many, and is hard to count.',
  invisible_stalker: 'Cannot be seen until it strikes.',
  mind_thief: 'Takes the mind before the body.',
  stationary_horror: 'Does not move: what comes near it is its.',
  boss: 'A great horror of its place.',
  ally: 'Does not wish you harm.',
};

export const TIER_NAMES: Readonly<Record<Tier, string>> = {
  lesser: 'THE LESSER',
  greater: 'THE GREATER',
  named: 'THE NAMED',
  great_old_one: 'THE GREAT OLD ONES',
  outer_god: 'THE OUTER GODS',
  ally: 'THOSE WHO DO NOT WISH YOU HARM',
};

const WHAT: Readonly<Record<DamageType, string>> = { slash: 'the blade', blunt: 'a heavy blow', shot: 'the revolver', fire: 'fire', light: 'light', arcane: 'the arcane' };

/** "Hurt by fire. Turns the blade." — empty when it has neither. */
export function weaknessLine(def: Pick<EntityDef, 'weak' | 'resist'>): string {
  const [weak, resist] = [def.weak ?? [], def.resist ?? []];
  return [weak.length && `Hurt by ${weak.map((d) => WHAT[d]).join(' and ')}.`, resist.length && `Turns ${resist.map((d) => WHAT[d]).join(' and ')}.`].filter(Boolean).join(' ');
}

/** The names of the realms it is met in, as the map names them. */
export const wherever = (def: Pick<EntityDef, 'regions'>): string => def.regions.map((r) => getRegion(r)?.name ?? r).join(' · ');
