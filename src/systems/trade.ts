/**
 * Trade (playtest round 12): Echoes spent with a merchant (data/wares.ts). A ware is refused when
 * the investigator is short of Echoes, when its stock is sold out, or when they could carry no more
 * of it (five flasks of oil; a Reagent kit already at its most; the rounds a pocket holds). What has been sold is kept in the
 * overworld and saved. Pure: no Three.js.
 */

import { GUN, OIL, REAGENT } from '../data/tuning';
import { WARES, type WareId } from '../data/wares';
import { giveStones } from './arms';
import { roomFor } from './gun';
import type { Game } from './components';
import { addVial } from './reagent';

/** How many of a ware have been sold in this dream. */
export const soldOf = (g: Game, id: WareId): number => g.overworld?.sold.get(id) ?? 0;

/** How many more of a ware may still be bought (undefined: no end to them). */
export const stockLeft = (g: Game, id: WareId): number | undefined => {
  const s = WARES[id].stock;
  return s === undefined ? undefined : Math.max(0, s - soldOf(g, id));
};

/** Whether they could take one more (their pockets, not their purse). */
function room(g: Game, id: WareId): boolean {
  if (id === 'oil') return g.player.oil < OIL.carry;
  if (id === 'rounds') return roomFor(g, GUN.box);
  if (id === 'vial') return g.player.reagentMax < REAGENT.maxDoses;
  return true;
}

export const canBuy = (g: Game, id: WareId): boolean => !!g.overworld && g.player.echoes >= WARES[id].price && stockLeft(g, id) !== 0 && room(g, id);

/** Buys one: the Echoes go, the ware is theirs. False when refused. */
export function buy(g: Game, id: WareId): boolean {
  if (!canBuy(g, id)) return false;
  const price = WARES[id].price;
  g.player.echoes -= price;
  g.overworld!.sold.set(id, soldOf(g, id) + 1);
  g.events.emit('Echoes', { change: 'spent', amount: price, total: g.player.echoes });
  if (id === 'oil') g.player.oil++;
  else if (id === 'rounds') g.player.rounds += GUN.box;
  else if (id === 'vial') addVial(g);
  else giveStones(g, 1);
  return true;
}
