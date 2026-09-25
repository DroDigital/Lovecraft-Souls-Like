/**
 * Recorded sounds (playtest round 6): public-domain recordings (public/audio, credited in its
 * CREDITS.md), cut and treated for the game. A set is a few takes of one sound; the engine picks one
 * (never the last twice running) at a pitch within the set's range (render/audio/sampler.ts). They
 * answer game events in place of, or over, a stinger's synthesized recipe (data/sounds.ts), speak for
 * creatures in place of their voice's recipe (voices.ts), and make each region's ambience: recorded
 * beds, with spot sounds now and then, over its drone. Until a file has loaded (or without it) the
 * recipes play as before.
 */

import type { StingerId } from './sounds';
import type { VoiceId } from './voices';

export interface SampleSet {
  files: readonly string[]; // under audio/sfx/, without the extension
  gain: number;
  pitch?: readonly [lo: number, hi: number]; // playback rate (default: SAMPLE_PITCH)
}

export const SAMPLE_PITCH = [0.94, 1.06] as const;

const takes = (name: string, n: number): string[] => Array.from({ length: n }, (_, k) => `${name}${k + 1}`);
const set = (files: readonly string[], gain: number, pitch?: readonly [number, number]): SampleSet => ({ files, gain, pitch });

export const SAMPLE_SETS = {
  // the investigator's arm, and what it meets
  swingLight: set(takes('swish', 4), 0.32, [0.92, 1.12]),
  swingHeavy: set(takes('swing', 4), 0.4, [0.82, 0.98]),
  stab: set(takes('stab', 4), 0.6),
  slash: set(takes('slash', 3), 0.8),
  clang: set([...takes('clang', 4), ...takes('clank', 2)], 0.45, [0.9, 1.1]),
  parry: set(['parry'], 0.7, [0.97, 1.04]),
  thud: set(takes('thud', 3), 0.75),
  bodyfall: set(takes('bodyfall', 2), 0.7, [0.85, 1]),
  gunshot: set(takes('gunshot', 2), 1, [0.95, 1.03]),
  roll: set(takes('roll', 2), 0.32),
  hurt: set(takes('hurt', 4), 0.4, [0.96, 1.04]),
  dying: set(['dying'], 0.8, [0.97, 1]),
  // footsteps
  stepDirt: set(takes('step_dirt', 4), 0.26, [0.9, 1.08]),
  stepRoad: set(takes('step_road', 4), 0.38, [0.92, 1.08]),
  stepStone: set(takes('step_stone', 4), 0.19, [0.92, 1.08]),
  stepWater: set(takes('step_water', 3), 0.15, [0.9, 1.1]),
  // creatures
  growl: set(takes('growl', 3), 0.32, [0.85, 1.1]),
  snarl: set(takes('snarl', 3), 0.53),
  bellow: set(takes('bellow', 3), 0.51, [0.8, 1]),
  groan: set(takes('groan', 3), 0.15, [0.85, 1.05]),
  hiss: set(takes('hiss', 2), 0.23),
  grunt: set(takes('grunt', 4), 0.2, [0.95, 1.2]),
  whale: set(takes('whale', 3), 0.9, [0.8, 1]),
  croak: set(takes('croak', 4), 0.25, [0.85, 1.05]),
  buzz: set(takes('buzz', 2), 0.23, [0.9, 1.15]),
  howl: set(takes('howl', 3), 0.27, [0.85, 1]),
  yowl: set(takes('yowl', 3), 0.19, [0.95, 1.15]),
  squeak: set(['squeak'], 0.19, [0.9, 1.2]),
  whisper: set(takes('whisper', 3), 0.18, [0.85, 1]),
  wings: set(['wings'], 0.14, [0.9, 1.2]),
  // things handled
  cork: set(['cork'], 0.23),
  page: set(takes('page', 2), 0.2),
  match: set(['match'], 0.32),
  // the world, now and then
  owl: set(['spot_owl1', 'spot_owl2'], 0.25, [0.95, 1.02]),
  whippoorwill: set(['spot_whippoorwill'], 0.22, [0.97, 1.03]),
  farHowl: set(['spot_howl'], 0.2, [0.9, 1]),
  hull: set(['spot_boat'], 0.3),
  creak: set(['spot_creak1', 'spot_creak2'], 0.22, [0.8, 1]),
  thunder: set(['spot_thunder'], 0.35, [0.85, 1]),
  gurgle: set(['spot_gurgle'], 0.3, [0.8, 1]),
  chains: set(['spot_chains'], 0.22, [0.85, 1]),
  timber: set(['spot_groan'], 0.25, [0.7, 0.95]),
} satisfies Record<string, SampleSet>;

export type SampleSetId = keyof typeof SAMPLE_SETS;

/** Stingers that are recorded: the set, and the share of the stinger's recipe kept beneath it (0: none). */
export const STINGER_SAMPLES: Partial<Record<StingerId, readonly [SampleSetId, number]>> = {
  hit: ['stab', 0.45], // the recipe's low thump gives the cut its weight
  blocked: ['clang', 0.25],
  parried: ['parry', 0.5],
  guardBreak: ['thud', 0.5],
  riposte: ['slash', 0.6],
  kill: ['bodyfall', 0.6],
  shot: ['gunshot', 0.25],
  death: ['dying', 1], // the doom chord stays
  page: ['page', 0],
  lampLit: ['match', 0.4],
};

/** Voices that are recorded (the rest keep their recipes: the pipers, the viol, the choirs, the Tekeli-li). */
export const VOICE_SAMPLES: Partial<Record<VoiceId, SampleSetId>> = {
  growl: 'growl',
  bellow: 'bellow',
  murmur: 'groan',
  abyss: 'whale',
  croak: 'croak',
  meep: 'grunt',
  buzz: 'buzz',
  bay: 'howl',
  meow: 'yowl',
  scurry: 'squeak',
  whisper: 'whisper',
  flutter: 'wings',
  hiss: 'hiss',
};

/** Voices that snarl as they turn on the investigator, rather than call as they do the rest of the time. */
export const VOICE_ALERTS: Partial<Record<VoiceId, SampleSetId>> = { growl: 'snarl' };

/** Spot sounds over a bed: one of the set, far off (panned anywhere, dulled), every so often. */
export interface Spot {
  set: SampleSetId;
  every: readonly [min: number, max: number]; // seconds between
}

/** A region's recorded ambience: looped beds (audio/amb/, at a level) and spot sounds. */
export interface Ambience {
  beds: readonly (readonly [file: string, gain: number])[];
  spots: readonly Spot[];
}

const owls: Spot = { set: 'owl', every: [25, 60] };
const dogs: Spot = { set: 'farHowl', every: [40, 90] };
const creaks: Spot = { set: 'creak', every: [18, 45] };

export const AMBIENCE: Record<string, Ambience> = {
  title: { beds: [], spots: [] }, // the theme plays
  arena: { beds: [['wind', 0.6]], spots: [] },
  hub: { beds: [['wind', 0.8], ['crickets', 0.22]], spots: [owls, dogs] },
  arkham: { beds: [['wind', 0.7], ['crickets', 0.27]], spots: [owls, dogs, creaks] },
  dunwich: { beds: [['crickets', 0.63], ['wind', 0.45]], spots: [{ set: 'whippoorwill', every: [14, 35] }, { set: 'thunder', every: [60, 140] }, owls] },
  innsmouth: { beds: [['surf', 0.9], ['frogs', 0.32]], spots: [{ set: 'hull', every: [15, 40] }, { set: 'gurgle', every: [30, 70] }] },
  providence: { beds: [['wind', 0.72]], spots: [creaks, dogs, owls] },
  vermont: { beds: [['leaves', 0.8], ['crickets', 0.32]], spots: [owls, { set: 'farHowl', every: [60, 120] }] },
  mountains: { beds: [['wind_cold', 0.75]], spots: [] },
  pnakotus: { beds: [['wind', 0.8], ['wind_ghost', 0.2]], spots: [{ set: 'timber', every: [45, 100] }] },
  kn_yan: { beds: [['cave', 0.8], ['drips', 0.65]], spots: [{ set: 'chains', every: [50, 110] }] },
  dreamlands: { beds: [['murmur', 0.65], ['wind', 0.4]], spots: [owls] },
  rlyeh: { beds: [['waves', 1], ['wind_ghost', 0.3]], spots: [{ set: 'thunder', every: [35, 80] }, { set: 'gurgle', every: [25, 60] }] },
  yuggoth: { beds: [['alien', 0.72]], spots: [{ set: 'timber', every: [40, 90] }] },
  beyond: { beds: [['wind_ghost', 0.72], ['cave', 0.36]], spots: [] },
};

/** Inside a legacy dungeon: stone and water, whatever the region. */
export const DUNGEON_AMBIENCE: Ambience = { beds: [['cave', 0.63], ['drips', 0.8]], spots: [{ set: 'chains', every: [45, 100] }, { set: 'timber', every: [50, 110] }] };
