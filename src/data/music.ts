/**
 * Boss themes (playtest round 4): procedural scores, data only (render/audio/bossMusic.ts plays
 * them). A theme is a key (a low tonic and a mode, in semitones), a tempo for each phase, an
 * ostinato of eighth notes, the choir's chord for each bar in turn and a bell line of quarter notes
 * for the last phase. Degrees count scale steps from the tonic (7 is an octave up in a seven-note
 * mode; negative ones fall below it; null is a rest). The deeper in the lore, the stranger the mode.
 */

import type { Tier } from './schema';

export interface Theme {
  tonic: number; // Hz
  mode: readonly number[]; // semitones above the tonic
  bpm: readonly [number, number, number]; // by phase (the last holds for any after)
  ostinato: readonly (number | null)[]; // eighth notes, a bar of 8
  chords: readonly (readonly number[])[]; // the choir's chord, a bar each, in turn
  bells: readonly (number | null)[]; // quarter notes, a bar of 4, from the last phase
}

const PHRYGIAN = [0, 1, 3, 5, 7, 8, 10];
const LOCRIAN = [0, 1, 3, 5, 6, 8, 10];
const WHOLE = [0, 2, 4, 6, 8, 10];

/** The named horrors: D Phrygian, driving. */
const NAMED: Theme = {
  tonic: 73.42,
  mode: PHRYGIAN,
  bpm: [88, 100, 114],
  ostinato: [0, 0, 0, 1, 0, 0, 0, -1],
  chords: [[0, 2, 4], [1, 3, 5], [0, 2, 4], [-1, 1, 3]],
  bells: [4, 5, 4, 1],
};

/** The Great Old Ones: B Locrian, lower and heavier, the fifth diminished. */
const GREAT_OLD_ONE: Theme = {
  tonic: 61.74,
  mode: LOCRIAN,
  bpm: [74, 86, 98],
  ostinato: [0, null, 0, 1, 0, null, 4, 1],
  chords: [[0, 2, 4], [1, 4, 6], [0, 2, 4], [-3, 0, 1]],
  bells: [4, null, 1, 4],
};

/** The Outer Gods: A in whole tones, no home to rest in. */
const OUTER_GOD: Theme = {
  tonic: 55,
  mode: WHOLE,
  bpm: [68, 80, 94],
  ostinato: [0, 3, 0, 3, 1, 4, 1, 4],
  chords: [[0, 1, 2], [3, 4, 5], [1, 2, 3], [4, 5, 6]],
  bells: [5, 3, 4, 2],
};

export const THEMES: Readonly<Record<Tier, Theme>> = {
  lesser: NAMED,
  greater: NAMED,
  named: NAMED,
  great_old_one: GREAT_OLD_ONE,
  outer_god: OUTER_GOD,
  ally: NAMED,
};

/** The pitch of scale degree `d` in `t`, `octaves` up. */
export function pitchOf(t: Theme, d: number, octaves = 0): number {
  const n = t.mode.length;
  const step = ((d % n) + n) % n;
  const semis = t.mode[step] + 12 * (Math.floor(d / n) + octaves);
  return t.tonic * 2 ** (semis / 12);
}
