/**
 * What can be bought (playtest round 12: Echoes bought only levels, and nothing was for sale). Dr.
 * Morgan, on the university grounds, trades lamp oil, cartridges, a few star-stones and one Silver Vial
 * for Echoes; a ware with `stock` is sold only so many times in a whole dream. Round 22: cartridges for
 * the revolver, whose rounds are few, are sold by two people far afield as well. Data only.
 */

export type WareId = 'oil' | 'rounds' | 'star_stone' | 'vial';

export interface Ware {
  name: string;
  note: string; // what it is for, in a line ({action} tokens name buttons)
  price: number; // Echoes
  stock?: number; // the most ever sold
}

export const WARES: Readonly<Record<WareId, Ware>> = {
  oil: { name: 'Flask of lamp oil', note: 'In a medicine bottle, stoppered with rag. Thrown ({throw}), it bursts and burns where it lands.', price: 150 },
  rounds: { name: 'Box of cartridges', note: 'Six rounds for the revolver ({shoot}), which holds six; {reload} loads it. No more than a few boxes fit a pocket.', price: 180 },
  star_stone: { name: 'Star-stone', note: 'A five-pointed greenish soapstone from a drawer of the Exhibition Hall. Set into a weapon at an Elder Sign.', price: 3500, stock: 3 },
  vial: { name: 'Silver Vial', note: "One more dose of West's Reagent carried, from Morgan's own bag.", price: 2500, stock: 1 },
};

/** Each merchant's wares, in the order they are shown. */
export const SHOPS: Readonly<Record<string, readonly WareId[]>> = {
  morgan: ['oil', 'rounds', 'star_stone', 'vial'],
  curtis: ['rounds'],
  dyer: ['rounds', 'oil'],
};
