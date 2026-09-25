/**
 * Creature voices and drones (spec §5, Phase 6). A voice is a call a creature gives at random
 * intervals while it is near and awake, and at once when it turns on the investigator: the flying
 * polyps' whistling, the shoggoth's "Tekeli-li!", the ghouls' meeping. An entry names its voice
 * (`EntityDef.voice`, or 'silent'); without one it speaks with its tier's. Drones are the held
 * beds under play: one per region, the arena, the title and a boss fight.
 */

import type { EntityDef, Tier } from './schema';
import { chord, noise, notes, tone, type Sound, type Wave } from './sounds';

export interface Voice {
  call: Sound;
  every: readonly [min: number, max: number]; // seconds between calls
  range: number; // metres it carries
}

const bp = (hz: number, to?: number, q = 3) => ({ type: 'bandpass' as const, hz, to, q });
const lp = (hz: number, to?: number) => ({ type: 'lowpass' as const, hz, to });
const ticks = (n: number, gap: number, hz: number, gain: number, q = 3) =>
  Array.from({ length: n }, (_, k) => noise('bandpass', hz * (1 + 0.15 * Math.sin(k * 2.3)), 0.04, gain, { q, at: k * gap + 0.012 * Math.sin(k * 5.1) + 0.012 }));

export const VOICES = {
  // Tier defaults.
  growl: { call: [tone('sawtooth', 95, 0.6, 0.3, { to: 70, attack: 0.08, vibrato: [9, 30], filter: lp(420) }), noise('lowpass', 350, 0.5, 0.15, { attack: 0.1 })], every: [5, 11], range: 22 },
  bellow: { call: [tone('sawtooth', 58, 1.4, 0.35, { to: 46, attack: 0.3, vibrato: [4, 20], filter: lp(300, 180) }), tone('square', 29, 1.4, 0.12, { attack: 0.3, filter: lp(150) })], every: [6, 12], range: 35 },
  murmur: { call: [noise('bandpass', 700, 1.4, 0.4, { q: 5, to: 500, attack: 0.3 }), tone('triangle', 110, 1.4, 0.16, { to: 104, attack: 0.4, vibrato: [5, 15] })], every: [6, 12], range: 25 },
  abyss: { call: [tone('sine', 32.7, 3.5, 0.5, { attack: 1.2, vibrato: [0.5, 20] }), tone('sawtooth', 49, 3.5, 0.12, { attack: 1.5, filter: lp(220) }), noise('lowpass', 150, 3, 0.2, { attack: 1 })], every: [7, 14], range: 80 },
  choir: { call: chord('sine', [220, 233.1, 329.6, 349.2, 466.2], 4, 0.3, { attack: 1.5, vibrato: [5, 12] }), every: [8, 15], range: 80 },
  // Voices from the stories.
  whistle: { call: [tone('sine', 1150, 0.9, 0.18, { to: 1650, attack: 0.25, vibrato: [5, 25] }), tone('sine', 1650, 1.2, 0.18, { at: 0.9, to: 980, vibrato: [5, 25] }), tone('sine', 1162, 2.1, 0.07, { to: 1240, attack: 0.5 })], every: [3, 7], range: 45 },
  tekeli: {
    call: [
      ...[[0, 1480, 1600, 0.1], [0.14, 1970, 1860, 0.1], [0.28, 2350, 2640, 0.13], [0.46, 2350, 2800, 0.24]].map(([at, hz, to, dur]) => tone('sine', hz, dur, 0.24, { at, to, vibrato: [9, 20] })),
      noise('bandpass', 2400, 0.7, 0.04, { q: 3 }),
    ],
    every: [4, 9],
    range: 50,
  },
  piping: { call: notes('triangle', [[0, 660, 0.16], [0.18, 990, 0.14], [0.32, 1480, 0.2], [0.5, 1320, 0.16], [0.66, 880, 0.3]], 0.15, { vibrato: [7, 15] }), every: [5, 10], range: 35 },
  buzz: {
    call: [
      tone('sawtooth', 150, 0.22, 0.56, { to: 170, vibrato: [30, 60], filter: bp(900, 1400, 4) }),
      tone('sawtooth', 160, 0.22, 0.56, { at: 0.28, to: 130, vibrato: [30, 60], filter: bp(1200, 700, 4) }),
      tone('sawtooth', 165, 0.3, 0.56, { at: 0.56, to: 140, vibrato: [30, 60], filter: bp(1000, 1600, 4) }),
    ],
    every: [4, 9],
    range: 30,
  },
  croak: { call: [0, 0.45].flatMap((at) => [tone('square', 68, 0.35, 0.2, { at, to: 52, vibrato: [22, 60], filter: lp(450) }), noise('lowpass', 300, 0.3, 0.1, { at })]), every: [4, 9], range: 25 },
  meep: { call: [tone('sine', 1500, 0.09, 0.18, { to: 1150 }), tone('sine', 1450, 0.09, 0.18, { to: 1100, at: 0.16 }), noise('bandpass', 500, 0.5, 0.21, { q: 4, at: 0.35, to: 350 })], every: [4, 9], range: 22 },
  cough: { call: [noise('bandpass', 280, 0.18, 0.8, { q: 2 }), noise('bandpass', 250, 0.22, 0.8, { q: 2, at: 0.3 }), tone('sawtooth', 80, 0.4, 0.12, { to: 60, filter: lp(300) })], every: [5, 10], range: 24 },
  flutter: { call: ticks(7, 0.06, 1800, 0.45), every: [4, 8], range: 18 },
  scurry: { call: [...ticks(8, 0.045, 3500, 0.16, 1), tone('sine', 3200, 0.08, 0.1, { to: 3600, at: 0.2 })], every: [2, 5], range: 18 },
  meow: { call: [tone('sawtooth', 480, 0.55, 0.48, { to: 620, attack: 0.08, filter: bp(700, 1500) }), tone('sawtooth', 620, 0.35, 0.4, { at: 0.5, to: 420, filter: bp(1500, 600) })], every: [6, 14], range: 20 },
  viol: {
    call: [
      ...notes('sawtooth', [[0, 587.3, 0.14], [0.12, 698.5, 0.14], [0.22, 880, 0.12], [0.3, 1046.5, 0.12], [0.38, 932.3, 0.14], [0.5, 1174.7, 0.12], [0.6, 1396.9, 0.12]], 0.18, { vibrato: [7, 30], filter: bp(1200, undefined, 2) }),
      tone('sawtooth', 1480, 0.8, 0.21, { at: 0.72, vibrato: [8, 45], filter: bp(1600, undefined, 2) }),
    ],
    every: [3, 6],
    range: 40,
  },
  pipes: {
    call: [
      tone('triangle', 880, 2.4, 0.08, { attack: 0.3, vibrato: [6, 20] }),
      tone('triangle', 932.3, 2.4, 0.06, { attack: 0.4, vibrato: [5.5, 25] }),
      ...[0, 0.6, 1.2, 1.8].flatMap((at) => [tone('sine', 62, 0.25, 0.4, { at, to: 40 }), noise('lowpass', 180, 0.15, 0.2, { at })]),
    ],
    every: [2.5, 5],
    range: 70,
  },
  whisper: { call: [noise('bandpass', 1900, 0.2, 0.72, { q: 9 }), noise('bandpass', 1200, 0.25, 0.72, { q: 9, at: 0.25 }), noise('bandpass', 2300, 0.4, 0.72, { q: 9, at: 0.55, to: 1600 })], every: [4, 9], range: 25 },
  bay: { call: [tone('sawtooth', 190, 1.3, 0.25, { to: 150, attack: 0.15, vibrato: [5, 30], filter: lp(900, 500) }), tone('sawtooth', 95, 1.3, 0.1, { to: 75, attack: 0.15, filter: lp(400) })], every: [5, 10], range: 70 },
  squawk: { call: [0, 0.2].map((at, k) => tone('square', 620 - 60 * k, 0.14, 0.24, { at, to: 480 - 40 * k, filter: bp(1200, undefined, 2) })), every: [5, 12], range: 18 },
} satisfies Record<string, Voice>;

export type VoiceId = keyof typeof VOICES;

/** The voice of an entry without one: allies keep quiet. */
export const TIER_VOICES: Record<Tier, VoiceId | null> = {
  lesser: 'growl',
  greater: 'bellow',
  named: 'murmur',
  great_old_one: 'abyss',
  outer_god: 'choir',
  ally: null,
};

export function voiceOf(d: Pick<EntityDef, 'voice' | 'tier'>): Voice | null {
  if (d.voice === 'silent') return null;
  const id = d.voice ?? TIER_VOICES[d.tier];
  return id ? VOICES[id] : null;
}

/** A held bed: a chord of oscillators at `hz` × ratios through a lowpass, with a little filtered noise (wind, sea). */
export interface Drone {
  hz: number;
  ratios: readonly number[];
  wave: Wave;
  cutoff: number; // Hz
  gain: number;
  noise?: number; // level of the noise bed...
  noiseHz?: number; // ...and its lowpass
}

const d = (hz: number, ratios: readonly number[], wave: Wave, cutoff: number, gain: number, noise?: number, noiseHz?: number): Drone => ({ hz, ratios, wave, cutoff, gain, noise, noiseHz });

export const DRONES = {
  title: d(41.2, [1, 1.5, 2.01], 'sawtooth', 260, 0.07, 0.03, 400),
  arena: d(49, [1, 1.498], 'sawtooth', 240, 0.04),
  hub: d(49, [1, 1.5, 2], 'triangle', 380, 0.05, 0.02, 600), // wind over the quad
  arkham: d(46.2, [1, 1.059, 1.5], 'sawtooth', 300, 0.045, 0.03, 500),
  dunwich: d(43.7, [1, 1.335, 2], 'sawtooth', 280, 0.045, 0.035, 350),
  innsmouth: d(41.2, [1, 1.19, 1.5], 'triangle', 320, 0.05, 0.08, 250), // the sea
  providence: d(51.9, [1, 1.2, 1.414], 'sawtooth', 320, 0.04, 0.02, 700),
  vermont: d(55, [1, 1.5, 3.02], 'triangle', 420, 0.04, 0.03, 900),
  mountains: d(36.7, [1, 1.5, 2, 3], 'sine', 600, 0.07, 0.07, 1400), // polar wind
  pnakotus: d(38.9, [1, 1.414, 2.83], 'triangle', 380, 0.05, 0.05, 1800), // desert wind
  kn_yan: d(32.7, [1, 1.06, 2], 'sawtooth', 220, 0.05, 0.02, 200),
  dreamlands: d(65.4, [1, 1.25, 1.5, 2], 'sine', 900, 0.05, 0.015, 1200),
  rlyeh: d(30.9, [1, 1.5, 1.587], 'sawtooth', 200, 0.06, 0.07, 220),
  yuggoth: d(44, [1, 1.03, 1.47, 2.08], 'square', 260, 0.035, 0.01, 3000),
  beyond: d(27.5, [1, 2, 2.97, 4.1], 'sine', 1200, 0.08),
  boss: d(36.7, [1, 1.06, 1.5], 'sawtooth', 180, 0.08), // under a boss fight
} satisfies Record<string, Drone>;

export type DroneId = keyof typeof DRONES;
export const droneOf = (id: string): Drone | undefined => (DRONES as Record<string, Drone>)[id];
