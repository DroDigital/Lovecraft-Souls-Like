/**
 * The sights that cross the dream without the investigator (round 26: nothing happened unless they made it
 * happen): a file of creatures that comes out of the dark at a distance, walks across the ground in
 * their own business, and is gone into it. Each belongs to regions, says how many of which go, and what
 * is heard as they come. They are creatures like any other: they hunt whoever they notice, and a kill
 * pays (systems/wanderers.ts). Data only.
 */

import type { SampleSetId } from './samples';

export interface Wandering {
  id: string;
  regions: readonly string[];
  who: readonly { id: string; n: readonly [number, number] }[];
  words: string; // said once, the first time one is seen: a line in the dark
  sound?: SampleSetId; // heard from afar as it begins
  pace?: number; // share of their amble (default 1)
}

export const WANDERINGS: readonly Wandering[] = [
  { id: 'heath_procession', regions: ['arkham'], who: [{ id: 'cthulhu_cultist', n: [4, 6] }], words: 'A LINE OF ROBED FIGURES CROSSES THE HEATH', sound: 'chant' },
  { id: 'burden', regions: ['arkham', 'providence'], who: [{ id: 'ghoul', n: [3, 4] }], words: 'SOMETHING IS BEING DRAGGED ACROSS THE GROUND', sound: 'growl' },
  { id: 'hill_rite', regions: ['dunwich'], who: [{ id: 'martense_degenerate', n: [3, 4] }], words: 'FIGURES GO UP THE HILL IN THE DARK', sound: 'howl' },
  { id: 'tide_procession', regions: ['innsmouth'], who: [{ id: 'dagon_priest', n: [1, 1] }, { id: 'innsmouth_hybrid', n: [3, 4] }], words: 'THEY GO DOWN TO THE WATER IN A FILE', sound: 'chant' },
  { id: 'the_dead_walk', regions: ['providence'], who: [{ id: 'reanimated_corpse', n: [3, 4] }], words: 'THE DEAD ARE OUT, AND IN NO HURRY', sound: 'zombie', pace: 0.8 },
  { id: 'festival_walkers', regions: ['vermont'], who: [{ id: 'winged_hybrid', n: [3, 4] }], words: 'WINGED SHAPES WALK THE ROAD TOGETHER', sound: 'wings' },
  { id: 'penguin_march', regions: ['mountains'], who: [{ id: 'albino_penguin', n: [5, 8] }], words: 'PALE BIRDS MARCH BLIND ACROSS THE SNOW', sound: 'penguin', pace: 0.9 },
  { id: 'reptile_patrol', regions: ['pnakotus'], who: [{ id: 'nameless_city_reptile', n: [2, 3] }], words: 'SOMETHING PATROLS THE RUINS', sound: 'hiss' },
  { id: 'serpent_file', regions: ['kn_yan'], who: [{ id: 'serpent_man', n: [2, 3] }, { id: 'kn_yan_dweller', n: [1, 2] }], words: 'A FILE OF HIGH ONES PASSES', sound: 'hiss' },
  { id: 'moon_party', regions: ['dreamlands'], who: [{ id: 'moon_beast', n: [2, 2] }], words: 'THE MOON-BEASTS HAVE LANDED SOMETHING', sound: 'chatter' },
  { id: 'deep_procession', regions: ['rlyeh', 'innsmouth'], who: [{ id: 'deep_one', n: [4, 6] }], words: 'THEY ARE COMING UP OUT OF THE SEA', sound: 'gargle' },
];

export const wanderingsIn = (region: string | null): readonly Wandering[] => WANDERINGS.filter((w) => region && w.regions.includes(region));
