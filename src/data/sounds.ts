/**
 * Procedural sound recipes (spec §5, Phase 6). A sound is layers, each an oscillator or generated
 * noise with a pitch glide, an envelope (a short attack, then an exponential fade over its duration)
 * and an optional sweeping filter; render/audio/synth.ts plays them. The stingers here answer game
 * events (render/audio/cues.ts); creature voices and drones are in voices.ts. Since playtest round 6
 * recorded sounds (samples.ts) play in place of some, or over them with a share of the recipe kept
 * beneath; the recipes still play wherever a recording has not loaded.
 */

export type Wave = 'sine' | 'triangle' | 'square' | 'sawtooth';
export type FilterType = 'lowpass' | 'highpass' | 'bandpass';

export interface Layer {
  src: Wave | 'noise';
  hz?: number; // oscillator pitch (noise has none)
  to?: number; // pitch at the end: a glide
  at?: number; // seconds after the sound starts
  dur: number; // seconds
  attack?: number; // seconds to full level
  gain: number; // peak level
  vibrato?: readonly [hz: number, cents: number];
  filter?: { type: FilterType; hz: number; to?: number; q?: number };
}
export type Sound = readonly Layer[];

type ToneOpts = Pick<Layer, 'to' | 'at' | 'attack' | 'vibrato' | 'filter'>;
interface NoiseOpts {
  to?: number; // the filter's end frequency: a sweep
  q?: number;
  at?: number;
  attack?: number;
}

export const tone = (src: Wave, hz: number, dur: number, gain: number, o: ToneOpts = {}): Layer => ({ src, hz, dur, gain, ...o });
export const noise = (type: FilterType, hz: number, dur: number, gain: number, o: NoiseOpts = {}): Layer => ({
  src: 'noise',
  dur,
  gain,
  at: o.at,
  attack: o.attack,
  filter: { type, hz, to: o.to, q: o.q },
});
/** Several pitches sharing one gain. */
export const chord = (src: Wave, hzs: readonly number[], dur: number, gain: number, o: ToneOpts = {}): Layer[] => hzs.map((hz) => tone(src, hz, dur, gain / hzs.length, o));
/** A run of notes: [at, hz, dur] each. */
export const notes = (src: Wave, run: readonly (readonly [at: number, hz: number, dur: number])[], gain: number, o: ToneOpts = {}): Layer[] =>
  run.map(([at, hz, dur]) => tone(src, hz, dur, gain, { ...o, at }));

const lp = (hz: number, to?: number): Layer['filter'] => ({ type: 'lowpass', hz, to });

/** Event stingers. */
export const STINGERS = {
  hit: [noise('lowpass', 700, 0.14, 0.45, { to: 200 }), tone('sine', 120, 0.16, 0.5, { to: 45 })],
  blocked: [tone('square', 640, 0.14, 0.1, { to: 600, filter: { type: 'bandpass', hz: 1800, q: 2 } }), tone('triangle', 1210, 0.25, 0.12), noise('bandpass', 2600, 0.07, 0.35, { q: 2 })],
  parried: [tone('triangle', 1480, 0.8, 0.22), tone('sine', 2220, 0.6, 0.14), tone('sine', 2960, 0.35, 0.08), noise('highpass', 3500, 0.05, 0.3)],
  guardBreak: [noise('lowpass', 1200, 0.35, 0.55, { to: 150 }), tone('sawtooth', 220, 0.45, 0.18, { to: 55, filter: lp(900) })],
  riposte: [noise('lowpass', 500, 0.3, 0.7, { to: 90 }), tone('sine', 90, 0.5, 0.7, { to: 28 }), noise('bandpass', 1400, 0.14, 0.35, { at: 0.03, q: 2 })],
  kill: [tone('sine', 75, 1, 0.6, { to: 24 }), noise('lowpass', 400, 0.8, 0.4, { to: 60 }), tone('sawtooth', 110, 1.2, 0.08, { to: 55, at: 0.1, filter: lp(500) })],
  dodged: [noise('bandpass', 500, 0.26, 0.55, { to: 1800, q: 1.2 })],
  shot: [noise('highpass', 1500, 0.06, 0.8), noise('lowpass', 900, 0.45, 0.6, { to: 120 }), tone('sine', 100, 0.3, 0.55, { to: 32 }), noise('bandpass', 2400, 0.9, 0.05, { at: 0.08, q: 0.7 })],
  lock: [tone('square', 1760, 0.04, 0.04, { filter: { type: 'bandpass', hz: 2000 } })],
  death: [...chord('sawtooth', [55, 58.27, 82.41, 87.31], 3.5, 0.3, { attack: 0.05, filter: lp(900, 120) }), tone('sine', 41, 4, 0.4, { to: 30 }), noise('lowpass', 300, 2.5, 0.2)],
  rise: [noise('lowpass', 300, 2, 0.2, { to: 1200, attack: 1.2 }), tone('sine', 55, 2.2, 0.25, { to: 110, attack: 1 })],
  sight: [...chord('sawtooth', [233.1, 246.9, 349.2, 370], 1.8, 0.28, { attack: 0.02, vibrato: [6, 18], filter: lp(3000, 700) }), noise('highpass', 2500, 1.2, 0.08, { attack: 0.05 })],
  slip: [tone('sine', 62, 0.22, 0.45, { to: 44 }), tone('sine', 2637, 0.9, 0.025, { at: 0.03, attack: 0.15, to: 2489, vibrato: [8, 30] })], // sanity lost at once: a thud in the chest, a thin ringing
  worse: [tone('sine', 55, 0.18, 0.6, { to: 40 }), tone('sine', 55, 0.22, 0.5, { to: 38, at: 0.24 }), tone('sine', 3150, 1.4, 0.035, { at: 0.05, attack: 0.4, vibrato: [7, 25] })],
  better: [noise('lowpass', 900, 1.2, 0.12, { to: 300, attack: 0.3 }), tone('triangle', 392, 1.4, 0.06, { attack: 0.3 })],
  levelUp: [...chord('triangle', [146.8, 220, 293.7, 440], 2.4, 0.34, { attack: 0.08 }), ...notes('sine', [[0.05, 587.3, 1.2], [0.16, 880, 1.4], [0.27, 1174.7, 1.6]], 0.07), tone('sine', 73.4, 2.6, 0.3, { attack: 0.05 })], // a level bought: an open chord that blooms
  insight: [tone('sine', 1318.5, 2.2, 0.12), tone('sine', 1975.5, 1.8, 0.08, { at: 0.12 }), tone('sine', 2637, 1.4, 0.06, { at: 0.24 })],
  echoes: notes('sine', [[0, 880, 0.6], [0.07, 1108.7, 0.6], [0.14, 1318.5, 0.6], [0.21, 1760, 0.9]], 0.08),
  found: [tone('triangle', 659.3, 1.8, 0.14), tone('triangle', 987.8, 1.6, 0.1, { at: 0.18 }), tone('sine', 1318.5, 1.8, 0.07, { at: 0.36 })],
  rested: chord('triangle', [196, 246.9, 293.7, 392], 3, 0.3, { attack: 0.6 }),
  refused: [tone('sine', 70, 0.3, 0.5, { to: 50 }), noise('lowpass', 250, 0.25, 0.3)],
  travel: [noise('bandpass', 200, 1.6, 0.25, { to: 3000, q: 1.5, attack: 0.8 }), tone('sine', 110, 1.6, 0.15, { to: 440, attack: 0.8 })],
  boss: [...chord('sawtooth', [36.7, 55, 58.3, 77.8], 3.2, 0.5, { attack: 0.5, filter: lp(300, 1400) }), tone('sine', 50, 0.5, 0.7, { to: 30 }), noise('lowpass', 200, 0.6, 0.4)],
  phase: [tone('sine', 60, 1.6, 0.6, { to: 22 }), ...chord('sawtooth', [110, 116.5], 1.6, 0.18, { filter: lp(800, 200) })],
  vanquished: [...chord('triangle', [98, 147, 196, 293.7], 4, 0.4, { attack: 0.4 }), tone('sine', 49, 4.5, 0.3, { attack: 0.3 })],
  teleport: [noise('bandpass', 3000, 0.5, 0.2, { to: 300, q: 2, attack: 0.4 }), tone('sine', 1200, 0.5, 0.06, { to: 200, attack: 0.3 })],
  summon: [tone('sawtooth', 45, 1.2, 0.25, { to: 90, attack: 0.3, filter: lp(400) }), noise('lowpass', 500, 1, 0.2, { attack: 0.4 })],
  gaze: [noise('highpass', 2000, 0.6, 0.3, { to: 6000 }), tone('square', 1800, 0.7, 0.05, { to: 2400, vibrato: [11, 40] }), tone('sine', 50, 0.6, 0.4, { to: 30 })],
  darkness: [tone('sine', 400, 1.5, 0.15, { to: 30 }), noise('lowpass', 2000, 1.5, 0.2, { to: 80 })],
  timeSkip: [tone('sawtooth', 440, 0.45, 0.12, { to: 30, filter: lp(2000) }), noise('bandpass', 1000, 0.45, 0.15, { to: 80 })],
  stolen: [tone('sine', 700, 1.5, 0.1, { to: 690, vibrato: [3, 80] }), tone('sine', 707, 1.5, 0.1, { to: 1400 }), noise('bandpass', 800, 1.2, 0.1, { q: 6, to: 300 })],
  rewired: [tone('triangle', 300, 0.6, 0.1, { to: 900 }), tone('triangle', 900, 0.6, 0.1, { to: 300 })],
  revealed: [noise('highpass', 4000, 0.8, 0.2, { to: 9000 }), tone('sine', 2093, 1, 0.06, { at: 0.1 }), tone('sine', 3136, 0.8, 0.04, { at: 0.2 })],
  lampLit: [noise('bandpass', 600, 0.5, 0.25, { to: 1500, attack: 0.1 }), tone('triangle', 523.3, 0.8, 0.06, { at: 0.1 })],
  lampOut: [noise('lowpass', 1200, 0.35, 0.3, { to: 100 })],
  petrified: [noise('bandpass', 1500, 0.2, 0.6, { q: 1 }), noise('lowpass', 400, 1.2, 0.4, { at: 0.05, to: 60 }), tone('sine', 45, 1.4, 0.5, { to: 25 })],
  named: [noise('bandpass', 2400, 0.25, 0.25, { q: 8 }), noise('bandpass', 1100, 0.3, 0.25, { q: 8, at: 0.25 }), noise('bandpass', 1900, 0.5, 0.25, { q: 8, at: 0.55, to: 1300 }), tone('sine', 40, 1.2, 0.3, { attack: 0.3 })],
  rammed: [noise('lowpass', 2500, 1.5, 0.8, { to: 60 }), tone('sine', 40, 2, 0.8, { to: 20 }), noise('bandpass', 700, 0.8, 0.3, { at: 0.05, q: 1.5 })],
  title: [tone('sine', 65.4, 4, 0.4, { attack: 0.02 }), tone('sine', 98.7, 3, 0.18), tone('sine', 157, 2.5, 0.1), tone('sine', 231, 2, 0.06), noise('lowpass', 500, 0.3, 0.2)],
  ending: chord('sine', [65.4, 98, 130.8, 196, 293.7, 440], 8, 0.5, { attack: 2 }),
  select: [tone('triangle', 880, 0.12, 0.05, { to: 870 })],
  healed: [noise('highpass', 3000, 0.12, 0.12), ...notes('sine', [[0.08, 523.3, 0.9], [0.18, 784, 0.9], [0.3, 1046.5, 1.1]], 0.07, { attack: 0.05 }), tone('sine', 98, 1.2, 0.2, { attack: 0.2, to: 131 })],
  marked: [noise('bandpass', 400, 0.9, 0.25, { to: 2400, q: 3, attack: 0.7 }), tone('sine', 60, 0.9, 0.2, { to: 90, attack: 0.6 })], // the ground about to go
  erupted: [noise('lowpass', 900, 0.5, 0.7, { to: 120 }), tone('sine', 70, 0.6, 0.6, { to: 30 }), noise('bandpass', 1800, 0.25, 0.25, { at: 0.03, q: 2 })],
  quaked: [tone('sine', 45, 1.3, 0.7, { to: 28 }), noise('lowpass', 250, 1.1, 0.5, { attack: 0.05, to: 80 })],
  swept: [tone('sawtooth', 110, 1.2, 0.18, { to: 220, filter: lp(900, 2400) }), noise('highpass', 3000, 1, 0.12, { attack: 0.2 }), tone('sine', 55, 1.2, 0.3)],
  page: [noise('bandpass', 2200, 0.18, 0.2, { q: 1.5 }), noise('bandpass', 3000, 0.15, 0.15, { at: 0.12, q: 1.5 })],
  quest: [tone('triangle', 392, 1.4, 0.1, { attack: 0.05 }), tone('triangle', 587.3, 1.4, 0.08, { at: 0.15 })],
} satisfies Record<string, Sound>;

export type StingerId = keyof typeof STINGERS;
