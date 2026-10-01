/**
 * Relics and tempers (round 26; data/relics.ts): a horror slain for good leaves a relic, kept
 * among what has been told (so the save holds it); the worn ones multiply blows, bounties and
 * mending, and the weapon in hand steadies the mind at a kill. Pure: no Three.js.
 */

import { hash2 } from '../core/rng';
import { RELICS, RELIC_IDS, TEMPERS, type Relic, type RelicId } from '../data/relics';
import type { Game } from './components';
import { restoreSanity } from './sanity';

const KEY = 'relic:';

export const worn = (g: Pick<Game, 'overworld'>): RelicId[] => RELIC_IDS.filter((id) => g.overworld?.told.has(KEY + id));

/** The product of one gift across the worn relics. */
export function boon(g: Pick<Game, 'overworld'>, k: keyof Omit<Relic, 'name' | 'note'>): number {
  return worn(g).reduce((n, id) => n * ((RELICS[id] as Relic)[k] ?? 1), 1);
}

/** Which relic a horror of this name leaves: the first not yet worn, from a start of its own. */
export function relicFor(g: Pick<Game, 'overworld'>, name: string): RelicId | undefined {
  const at = Math.floor(hash2(name.length, [...name].reduce((h, c) => h + c.charCodeAt(0), 0), 3) * RELIC_IDS.length);
  return RELIC_IDS.map((_, i) => RELIC_IDS[(at + i) % RELIC_IDS.length]).find((id) => !g.overworld?.told.has(KEY + id));
}

/** The share a blow from `attacker` to `target` is scaled by the relics worn (1 for any but the investigator's blows and those that fall on them). */
export const relicScale = (g: Pick<Game, 'overworld' | 'player'>, attacker: number, target: number): number =>
  (attacker === g.player.id ? boon(g, 'dealt') : 1) * (target === g.player.id ? boon(g, 'taken') : 1);

/** Echoes a kill earns, once relics and the weapon's temper have had their say. */
export const bountyOf = (g: Pick<Game, 'overworld' | 'player'>, bounty: number): number =>
  Math.round(bounty * boon(g, 'echoes') * (TEMPERS[g.player.weapon as keyof typeof TEMPERS]?.echoes ?? 1));

export function registerRelics(g: Game): void {
  g.events.on('Vanquished', ({ name }) => {
    const id = relicFor(g, name);
    if (!id || !g.overworld) return;
    g.overworld.told.add(KEY + id);
    g.events.emit('Notice', { text: `${RELICS[id].name.toUpperCase()} · ${RELICS[id].note.toUpperCase()}` });
  });
  g.events.on('Died', ({ entity, killer }) => {
    if (killer !== g.player.id || entity === g.player.id) return;
    const t = TEMPERS[g.player.weapon as keyof typeof TEMPERS];
    if (t?.sanity) restoreSanity(g, t.sanity);
  });
}
