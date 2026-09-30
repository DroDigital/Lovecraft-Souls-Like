/**
 * Arms (playtest round 4): the investigator's melee weapons, each a light and a heavy chain over
 * the shared swings (render/swings.ts). The sword-cane they carry from the start; the others lie in
 * the dream's houses (dungeons.ts, lairs.ts), and are taken up from the pause menu; round 12 adds
 * Obed Marsh's cutlass (found in Y'ha-nthlei) and Zamacona's espada (his thanks, in K'n-yan). Data only.
 */

import { PLAYER_MOVES, type MoveDef, type MoveSet, type SwingAnim } from './moves';

export interface WeaponDef {
  name: string;
  note: string; // how it handles, in a line
  moves: MoveSet; // its light1… and heavy1… chains
}

type Arc = readonly [number, number];

/** An axe blow: a long wind-up, a heavy bite that staggers. */
const chop = (arc: Arc, light: string, anim: SwingAnim, damage: number, windup: number): MoveDef => ({
  frames: windup + 26,
  anim,
  stamina: 20,
  cancel: windup + 14,
  release: windup + 16,
  combo: { light, heavy: 'heavy1' },
  track: { window: [0, windup - 4], rate: 6 },
  motion: { window: [windup - 8, windup + 2], distance: 0.6, dir: 'facing' },
  hit: { window: [windup, windup + 5], damage, poise: 26, guard: 30, hitstop: 3, reach: 1.5, radius: 0.5, height: 1.15, arc },
});

const fell = (arc: Arc, heavy: string, anim: SwingAnim, damage: number, windup: number): MoveDef => ({
  frames: windup + 34,
  anim,
  stamina: 32,
  cancel: windup + 20,
  release: windup + 22,
  combo: { light: 'light1', heavy },
  track: { window: [0, windup - 8], rate: 4 },
  motion: { window: [windup - 10, windup + 2], distance: 0.9, dir: 'facing' },
  hit: { window: [windup, windup + 6], damage, poise: 58, guard: 60, hitstop: 5, reach: 1.6, radius: 0.6, height: 1.1, arc },
});

/** A razor's cut: out almost at once, light, and short. */
const cut = (arc: Arc, light: string, anim: SwingAnim, damage: number): MoveDef => ({
  frames: 22,
  anim,
  stamina: 9,
  cancel: 13,
  release: 15,
  combo: { light, heavy: 'heavy1' },
  track: { window: [0, 5], rate: 10 },
  motion: { window: [1, 7], distance: 0.35, dir: 'facing' },
  hit: { window: [6, 9], damage, poise: 7, guard: 10, hitstop: 1, reach: 1.05, radius: 0.4, height: 1.2, arc },
});

/** An espada's thrust: long and straight, and back at once; nothing at the sides. */
const pierce = (light: string, anim: SwingAnim, damage: number, windup: number): MoveDef => ({
  frames: windup + 19,
  anim,
  stamina: 13,
  cancel: windup + 8,
  release: windup + 10,
  combo: { light, heavy: 'heavy1' },
  track: { window: [0, windup - 2], rate: 9 },
  motion: { window: [windup - 6, windup + 1], distance: 0.6, dir: 'facing' },
  hit: { window: [windup, windup + 3], damage, poise: 10, guard: 14, hitstop: 2, reach: 1.75, radius: 0.32, height: 1.2, arc: [0, 0], thrust: true },
});

/** A cutlass's cut: wide, and a little slower than the cane's. */
const hew = (arc: Arc, light: string, anim: SwingAnim, damage: number, windup: number): MoveDef => ({
  frames: windup + 18,
  anim,
  stamina: 15,
  cancel: windup + 10,
  release: windup + 12,
  combo: { light, heavy: 'heavy1' },
  track: { window: [0, windup - 3], rate: 8 },
  motion: { window: [windup - 6, windup + 1], distance: 0.45, dir: 'facing' },
  hit: { window: [windup, windup + 4], damage, poise: 14, guard: 18, hitstop: 2, reach: 1.25, radius: 0.5, height: 1.15, arc },
});

const pick = (ids: readonly string[]): MoveSet => Object.fromEntries(ids.map((id) => [id, (PLAYER_MOVES as MoveSet)[id]]));

export const WEAPONS = {
  cane: {
    name: 'Sword-cane',
    note: 'A blade in a walking stick. Quick enough, and it reaches.',
    moves: pick(['light1', 'light2', 'light3', 'heavy1', 'heavy2']),
  },
  axe: {
    name: "Woodsman's Axe",
    note: 'From the Whateley woodpile. Slow to lift; what it bites, it staggers.',
    moves: {
      light1: chop([60, -80], 'light2', 'overhead', 34, 15),
      light2: chop([-70, 70], 'light1', 'backhand', 38, 16),
      heavy1: fell([110, -70], 'heavy2', 'cleave', 74, 32),
      heavy2: fell([100, -100], 'heavy1', 'wheel', 66, 30), // a flat forehand (round 13; the arc sets the sweep's way)
    },
  },
  razor: {
    name: 'Straight Razor',
    note: "A barber's razor from the Witch House. Four cuts before a cane finishes two; mind the short reach.",
    moves: {
      light1: cut([60, -60], 'light2', 'slash', 13),
      light2: cut([-60, 60], 'light3', 'backhand', 13),
      light3: cut([50, -50], 'light4', 'slash', 14),
      light4: {
        frames: 30,
        anim: 'thrust',
        stamina: 12,
        cancel: 20,
        release: 22,
        combo: { light: 'light1', heavy: 'heavy1' },
        track: { window: [0, 8], rate: 8 },
        motion: { window: [4, 12], distance: 0.7, dir: 'facing' },
        hit: { window: [10, 13], damage: 20, poise: 12, guard: 14, hitstop: 2, reach: 1.25, radius: 0.35, height: 1.2, arc: [0, 0] },
      },
      heavy1: {
        frames: 40,
        anim: 'lunge',
        stamina: 18,
        cancel: 28,
        release: 30,
        combo: { light: 'light1', heavy: 'heavy2' },
        track: { window: [0, 8], rate: 7 },
        motion: { window: [4, 14], distance: 2.2, dir: 'facing' }, // a lunge
        hit: { window: [12, 16], damage: 30, poise: 16, guard: 20, hitstop: 3, reach: 1.3, radius: 0.4, height: 1.2, arc: [0, 0] },
      },
      heavy2: {
        frames: 42,
        anim: 'whirl',
        stamina: 20,
        cancel: 30,
        release: 32,
        combo: { light: 'light1', heavy: 'heavy1' },
        track: { window: [0, 10], rate: 6 },
        motion: { window: [8, 16], distance: 0.5, dir: 'facing' },
        hit: { window: [14, 19], damage: 32, poise: 18, guard: 22, hitstop: 3, reach: 1.2, radius: 0.5, height: 1.1, arc: [-120, 120] },
      },
    },
  },
  cutlass: {
    name: "Obed Marsh's Cutlass",
    note: 'Off the Sumatra Queen, rusted at the basket. Wide cuts that find more than one foe.',
    moves: {
      light1: hew([80, -80], 'light2', 'slash', 25, 11),
      light2: hew([-80, 80], 'light3', 'backhand', 25, 11),
      light3: hew([10, -10], 'light1', 'overhead', 34, 15),
      heavy1: fell([150, -150], 'heavy2', 'whirl', 48, 26),
      heavy2: fell([0, 0], 'heavy1', 'cleave', 58, 28),
    },
  },
  rapier: {
    name: "Zamacona's Espada",
    note: 'A Spanish sword of 1541, from the depths of K\'n-yan. It reaches past a foe\'s guard; mind its narrow line.',
    moves: {
      light1: pierce('light2', 'thrust', 22, 9),
      light2: pierce('light1', 'thrust', 24, 10),
      heavy1: {
        ...pierce('light1', 'lunge', 46, 22),
        frames: 48,
        stamina: 22,
        combo: { light: 'light1', heavy: 'heavy1' },
        motion: { window: [14, 24], distance: 2.8, dir: 'facing' }, // the lunge
        hit: { window: [22, 26], damage: 46, poise: 22, guard: 26, hitstop: 3, reach: 1.8, radius: 0.34, height: 1.2, arc: [0, 0], thrust: true },
      },
    },
  },
} satisfies Record<string, WeaponDef>;

export type WeaponId = keyof typeof WEAPONS;
export const WEAPON_IDS = Object.keys(WEAPONS) as WeaponId[];
export const isWeapon = (id: string): id is WeaponId => id in WEAPONS;

/** The investigator's moves with `id` in hand: the sword-cane's chains give way to the weapon's. */
export function armedMoves(id: WeaponId): MoveSet {
  const rest = Object.entries(PLAYER_MOVES).filter(([k]) => !k.startsWith('light') && !k.startsWith('heavy'));
  return { ...Object.fromEntries(rest), ...WEAPONS[id].moves };
}
