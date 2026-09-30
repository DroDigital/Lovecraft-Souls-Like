/**
 * The night's turn (round 26: the night was one hour, always): a long night of three parts that turns and
 * begins again — the gloaming, when the windows are lit and the lamps new; the deep of the night, when the
 * lights go out one by one; and the hour before a dawn that does not come, when the sky greys and the
 * birds stir — the dream never reaches morning, and the night turns. A pure function of the game's
 * seconds, so the picture and the sound and the simulation agree. Pure: no Three.js.
 */

import { CLOCK } from '../data/tuning';

export type Hour = 'gloaming' | 'deep' | 'waning';

const smooth = (a: number, b: number, x: number): number => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

/** Where in the night `seconds` of play are (0..1). */
export const phaseOf = (seconds: number): number => (((seconds / CLOCK.night + CLOCK.start) % 1) + 1) % 1;

export const hourOf = (phase: number): Hour => (phase < 0.14 ? 'gloaming' : phase < 0.7 ? 'deep' : 'waning');

/** The share of windows that are lit at `phase`: all in the gloaming, fewer through the night, a third at its last hour, and the lamps lit anew as it turns. */
export function windowShare(phase: number): number {
  if (phase < 0.14) return 1;
  if (phase < 0.7) return 1 - 0.3 * smooth(0.14, 0.7, phase);
  if (phase < 0.96) return 0.7 - 0.4 * smooth(0.7, 0.96, phase);
  return 0.3 + 0.7 * smooth(0.96, 1, phase);
}

/** How grey the sky is (0..1): nothing until the last hour, then the nearest thing to a dawn the dream has, gone at the turn. */
export const dawnOf = (phase: number): number => smooth(0.72, 0.93, phase) * (1 - smooth(0.96, 1, phase));

/** How high the moon stands (0..1): it climbs to a peak past the middle and is low again at the end. */
export const moonHigh = (phase: number): number => Math.sin(Math.PI * Math.min(1, phase * 1.02)) ** 0.8;
