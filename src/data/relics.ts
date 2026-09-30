/**
 * Relics and weapon traits (round 26: every build played the same): a horror slain for good leaves
 * a relic, worn from then on, each a gift with a price in the mind; and each weapon has a temper of
 * its own, felt at a kill. Numbers are multipliers (1: none) or sanity (per kill). Data only.
 */

import type { WeaponId } from './weapons';

export interface Relic {
  name: string;
  note: string; // the gift and its price, in a line
  dealt?: number; // the investigator's blows
  echoes?: number; // Echoes a kill earns
  mend?: number; // how fast the mind mends
  taken?: number; // blows the investigator takes
}

export const RELICS = {
  starHook: { name: 'Hook of the Star-Stone', note: 'Your blows bite deeper. Your mind mends slower.', dealt: 1.1, mend: 0.6 },
  blackCoin: { name: 'Coin of the Black Pharaoh', note: 'Kills earn more Echoes. Blows land harder on you.', echoes: 1.3, taken: 1.08 },
  paleLamp: { name: 'Lamp of the Pale Watcher', note: 'The mind mends faster. Your blows are lighter.', mend: 1.6, dealt: 0.93 },
  yellowSeal: { name: 'Seal of the Yellow Sign', note: 'Much deeper blows. Much blacker thoughts.', dealt: 1.16, mend: 0.35, taken: 1.05 },
  saltCharm: { name: 'Charm of Salt and Brine', note: 'You take less harm. Kills earn less.', taken: 0.92, echoes: 0.85 },
} satisfies Record<string, Relic>;
export type RelicId = keyof typeof RELICS;
export const RELIC_IDS = Object.keys(RELICS) as RelicId[];

/** What a weapon does to the mind and the purse when it kills (sanity is added; echoes multiplied). */
export const TEMPERS: Readonly<Partial<Record<WeaponId, { sanity?: number; echoes?: number; line: string }>>> = {
  cutlass: { echoes: 1.15, line: 'Salt-rusted; it takes its share of every kill.' },
  rapier: { sanity: 2, line: 'A clean kill steadies the hand and the mind.' },
};
