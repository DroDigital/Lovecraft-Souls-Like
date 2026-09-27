/**
 * The world's small lives (playtest round 18: nothing in the open world moved of itself, and its owls,
 * dogs and whippoorwills were only ever heard): harmless things about the investigator. Crows on the
 * dead trees and gravestones take wing as they come near, bats flit about the trees and ruins, rats
 * run along the walls, moths circle the lamps, gulls sit on Innsmouth's ruins, whippoorwills wait in
 * Dunwich for the souls of the dying, Ulthar's cats keep the Dreamlands' streets, and fireflies drift
 * over the fields. They touch nothing in the simulation (world/haunts.ts places them, render/fauna.ts
 * gives them their lives). Data only.
 */

import type { PropKind } from './regions';
import type { VoiceId } from './voices';

export const CRITTER_IDS = ['crow', 'gull', 'whippoorwill', 'bat', 'rat', 'moth', 'cat', 'firefly'] as const;
export type CritterId = (typeof CRITTER_IDS)[number];

/** How it lives: sits, and takes wing when startled; flits about; runs about the ground; circles a light; drifts, blinking; sits, and slinks off. */
export type Habit = 'perch' | 'flit' | 'scurry' | 'orbit' | 'drift' | 'prowl';

export interface Critter {
  habit: Habit;
  size: number; // metres, as drawn
  speed: number; // m/s at its quickest: in flight, at a run
  reach: number; // metres about its haunt it keeps to (a bat's loops, a rat's runs, a firefly's drift)
  startle: number; // metres: the investigator this near sends it off (twice as far at a run); 0: it never minds them
  cry?: VoiceId; // what it says as it goes
  glow?: boolean; // a light of its own (drawn as a glow, not a sprite)
}

export const CRITTERS: Readonly<Record<CritterId, Critter>> = {
  // Drawn larger than life, as the creatures are, or the dark and the fog would swallow them.
  crow: { habit: 'perch', size: 0.8, speed: 7, reach: 0, startle: 8, cry: 'caw' },
  gull: { habit: 'perch', size: 0.85, speed: 6, reach: 0, startle: 7, cry: 'squawk' },
  whippoorwill: { habit: 'perch', size: 0.65, speed: 6, reach: 0, startle: 6, cry: 'flutter' },
  bat: { habit: 'flit', size: 0.7, speed: 5, reach: 4.5, startle: 0 },
  rat: { habit: 'scurry', size: 0.55, speed: 4, reach: 3.5, startle: 4.5, cry: 'scurry' },
  moth: { habit: 'orbit', size: 0.34, speed: 2, reach: 0.6, startle: 0 },
  cat: { habit: 'prowl', size: 0.8, speed: 3, reach: 4, startle: 3.5, cry: 'meow' },
  firefly: { habit: 'drift', size: 0.1, speed: 0.5, reach: 4, startle: 0, glow: true },
};

/** Critters kept to one kind of prop: the share of those props that hold any, and how many each holds. */
export interface Haunt {
  critter: CritterId;
  on: readonly PropKind[];
  share: number; // 0..1 of those props
  count: readonly [min: number, max: number]; // a murder of crows on one tree, a cloud of moths about one lamp
}

const haunt = (critter: CritterId, on: readonly PropKind[], share: number, count: readonly [number, number] = [1, 1]): Haunt => ({ critter, on, share, count });

const crows = haunt('crow', ['tree', 'grave', 'cross', 'obelisk'], 0.18, [2, 5]);
const bats = haunt('bat', ['tree', 'ruin', 'house'], 0.09, [1, 3]);
const rats = haunt('rat', ['house', 'wall', 'ruin'], 0.3, [1, 2]);
const moths = haunt('moth', ['lamp'], 1, [2, 3]);
const fireflies = haunt('firefly', ['bush', 'stump', 'log'], 0.4, [5, 9]);

/** Each region's critters (none on the dead plateau, in the desert, on Yuggoth or beyond the Gate: their silence is their own). */
export const FAUNA: Readonly<Record<string, readonly Haunt[]>> = {
  hub: [crows, bats, rats, moths],
  arkham: [crows, bats, rats, moths, fireflies],
  dunwich: [haunt('whippoorwill', ['tree', 'wall', 'rock', 'monolith'], 0.08, [1, 3]), haunt('crow', ['tree', 'grave', 'cross'], 0.05, [1, 3]), bats, moths, haunt('firefly', ['bush', 'stump', 'log'], 0.45, [3, 8])],
  innsmouth: [haunt('gull', ['ruin', 'rock', 'pillar', 'house'], 0.14, [1, 3]), haunt('rat', ['house', 'ruin', 'wall'], 0.22, [1, 3]), haunt('bat', ['ruin', 'house'], 0.04, [1, 2]), moths],
  providence: [crows, bats, rats, moths],
  vermont: [haunt('crow', ['tree', 'pine'], 0.06, [1, 3]), haunt('bat', ['tree', 'pine'], 0.04, [1, 3]), moths, fireflies],
  kn_yan: [haunt('bat', ['pillar', 'monolith', 'rock'], 0.06, [2, 4])],
  dreamlands: [haunt('cat', ['house', 'wall', 'ruin'], 0.3, [1, 2]), haunt('crow', ['tree', 'pine'], 0.03, [1, 2]), haunt('bat', ['tree', 'pine', 'ruin'], 0.03, [1, 2]), moths, haunt('firefly', ['bush', 'stump', 'log'], 0.4, [3, 8])],
  rlyeh: [haunt('gull', ['monolith', 'pillar'], 0.04, [1, 2])],
};

/** At most this many critters are kept to one chunk. */
export const CHUNK_CRITTERS = 20;

/**
 * What crosses the sky now and then (round 18): a flock of the region's birds, or one of the great
 * winged things of the realm (a roster creature's sprite), high over the investigator and gone
 * into the dark again, with a cry as it passes nearest.
 */
export interface SkyVisitor {
  flock?: CritterId; // a flock of these (render/fauna.ts draws them)...
  shape?: string; // ...or one of these roster creatures, drawn from its sprite...
  size?: number; // ...this many metres across
  count: readonly [min: number, max: number];
  every: readonly [min: number, max: number]; // seconds between
  height: readonly [min: number, max: number]; // metres over the investigator
  speed: number; // m/s
  cry?: VoiceId;
}

const flock = (kind: CritterId, every: readonly [number, number], count: readonly [number, number] = [5, 9]): SkyVisitor => ({ flock: kind, count, every, height: [5, 9], speed: 8, cry: CRITTERS[kind].cry });

export const SKY_VISITORS: Readonly<Record<string, readonly SkyVisitor[]>> = {
  hub: [flock('crow', [60, 130])],
  arkham: [flock('crow', [50, 110])],
  dunwich: [flock('whippoorwill', [40, 90], [7, 12])], // they gather where a soul is passing
  innsmouth: [flock('gull', [35, 80], [4, 8])],
  providence: [flock('crow', [55, 120])],
  vermont: [flock('crow', [70, 140]), { shape: 'mi_go', size: 3.4, count: [1, 3], every: [45, 110], height: [8, 14], speed: 11, cry: 'buzz' }],
  yuggoth: [{ shape: 'mi_go', size: 3.4, count: [2, 5], every: [25, 60], height: [8, 16], speed: 12, cry: 'buzz' }],
  dreamlands: [{ shape: 'night_gaunt', size: 3.6, count: [1, 3], every: [40, 90], height: [7, 13], speed: 9 }, { shape: 'shantak', size: 6.5, count: [1, 1], every: [100, 200], height: [12, 18], speed: 13, cry: 'squawk' }],
  rlyeh: [flock('gull', [60, 130], [3, 6])],
};
