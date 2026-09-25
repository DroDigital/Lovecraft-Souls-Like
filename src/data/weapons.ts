/**
 * Arms (playtest round 4): the investigator's melee weapons, each a light and a heavy chain over
 * the shared swings (render/swings.ts). The sword-cane they carry from the start; the others lie in
 * the dream's houses (dungeons.ts, lairs.ts), and are taken up from the pause menu. Data only.
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
  combo: { light, heavy: 'heavy1' },
  track: { window: [0, 5], rate: 10 },
  motion: { window: [1, 7], distance: 0.35, dir: 'facing' },
  hit: { window: [6, 9], damage, poise: 7, guard: 10, hitstop: 1, reach: 1.05, radius: 0.4, height: 1.2, arc },
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
      heavy1: fell([110, -70], 'heavy2', 'overhead', 74, 32),
      heavy2: fell([-110, 70], 'heavy1', 'spin', 66, 30),
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
        combo: { light: 'light1', heavy: 'heavy1' },
        track: { window: [0, 8], rate: 8 },
        motion: { window: [4, 12], distance: 0.7, dir: 'facing' },
        hit: { window: [10, 13], damage: 20, poise: 12, guard: 14, hitstop: 2, reach: 1.25, radius: 0.35, height: 1.2, arc: [0, 0] },
      },
      heavy1: {
        frames: 40,
        anim: 'thrust',
        stamina: 18,
        cancel: 28,
        combo: { light: 'light1', heavy: 'heavy2' },
        track: { window: [0, 8], rate: 7 },
        motion: { window: [4, 14], distance: 2.2, dir: 'facing' }, // a lunge
        hit: { window: [12, 16], damage: 30, poise: 16, guard: 20, hitstop: 3, reach: 1.3, radius: 0.4, height: 1.2, arc: [0, 0] },
      },
      heavy2: {
        frames: 42,
        anim: 'spin',
        stamina: 20,
        cancel: 30,
        combo: { light: 'light1', heavy: 'heavy1' },
        track: { window: [0, 10], rate: 6 },
        motion: { window: [8, 16], distance: 0.5, dir: 'facing' },
        hit: { window: [14, 19], damage: 32, poise: 18, guard: 22, hitstop: 3, reach: 1.2, radius: 0.5, height: 1.1, arc: [-120, 120] },
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
