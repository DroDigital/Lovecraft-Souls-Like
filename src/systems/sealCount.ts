/**
 * The seals of the waking world (playtest round 12): each region of the waking world and its gated
 * realms holds one, broken when any of its region bosses (regions.ts) is vanquished. Kadath's door
 * waits on them (seals.ts, hiddenLayer.ts). Beyond the Gate the horrors stand in order: each wakes
 * only once the one before it has fallen (SEALS.after). Pure: no Three.js.
 */

import { REGIONS } from '../data/regions';
import { SEALS } from '../data/tuning';
import type { Game } from './components';

/** The regions that hold a seal: all but the hub and the realms of dream. */
export const SEAL_REGIONS = REGIONS.filter((r) => !SEALS.exempt.includes(r.id) && r.bosses.length > 0);

/** Whether this region's seal is broken: one of its region bosses slain. */
export const sealBroken = (g: Pick<Game, 'overworld'>, region: string): boolean =>
  !!g.overworld && (REGIONS.find((r) => r.id === region)?.bosses ?? []).some((b) => g.overworld!.slain.has(`boss:${b}`));

/** How many seals are broken (none outside the open world). */
export const sealsBroken = (g: Pick<Game, 'overworld'>): number => SEAL_REGIONS.filter((r) => sealBroken(g, r.id)).length;

/** The boss that must fall before this one wakes (the Beyond's order), if any. */
export const priorOf = (entity: string): string | undefined => SEALS.after[entity];

/** Whether a boss may stand in its arena: whatever must fall before it has fallen. */
export const bossAwake = (g: Pick<Game, 'overworld'>, entity: string): boolean => {
  const prior = priorOf(entity);
  return !prior || !!g.overworld?.slain.has(`boss:${prior}`);
};
