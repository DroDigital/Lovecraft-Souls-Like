/**
 * The title's wordmark, planned (playtest round 20; logo.ts draws it): SEVENTY STEPS cut in stone
 * over a flight of seventy treads that runs down into the dark, narrowing as it goes. When the title
 * opens a light sets out down the flight, lighting each tread as it passes; the letters take fire as
 * it goes, and at the bottom it blooms into the Elder Sign's glow. All of it is a function of the
 * seconds since the title opened, so any moment can be drawn. Pure: no canvas.
 */

export const LOGO = {
  size: [256, 136] as const, // logical pixels, drawn at two screen pixels each
  steps: 70,
  stair: { top: 78, bottom: 132, widest: 176, narrowest: 3, curve: 2.8 }, // rows of the first (nearest) and last tread, the flight's widths there (pixels), and how the spacing closes up toward the end
  descent: { start: 0.6, seconds: 4.6 }, // when the light sets out, and how long it takes to go down all seventy
  words: [
    { text: 'SEVENTY', size: 23, track: 9, baseline: 41, first: 1.0, gap: 0.14 }, // each letter: its size (px), the space between letters, its baseline row, when the first takes fire and the gap to the next (s)
    { text: 'STEPS', size: 33, track: 8, baseline: 71, first: 2.1, gap: 0.16 },
  ],
  sigil: { at: 4.6, y: 15 }, // when the Elder Sign above the words comes alight, and its middle row
  glitch: { every: 9, seconds: 0.16, from: 7 }, // once settled, the letters shudder now and then: how often, how long, from when
  breathe: 0.28, // Hz the resting glow breathes at
};

const clamp = (v: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, v));
const smooth = (x: number): number => x * x * (3 - 2 * x);

/** Tread `i` (0 the nearest, at the top): its row, and its half-width in pixels (the walls of the flight run straight in to the dark). */
export function tread(i: number): { y: number; half: number } {
  const { top, bottom, widest, narrowest, curve } = LOGO.stair;
  const u = i / (LOGO.steps - 1);
  const y = top + (bottom - top) * (1 - (1 - u) ** curve);
  const v = (y - top) / (bottom - top);
  return { y, half: (widest * (1 - v) + narrowest * v) / 2 };
}

/** How far down the light has come at `t`: 0 before it sets out, LOGO.steps at the last tread (fractions between). */
export function headAt(t: number): number {
  return clamp(((t - LOGO.descent.start) / LOGO.descent.seconds) * LOGO.steps, 0, LOGO.steps);
}

/** How lit tread `i` is at `t`, 0 unlit to about 1.3 as the light passes over it, settling to a breathing glow. */
export function treadLight(i: number, t: number): number {
  const passed = headAt(t) - i; // treads the head has gone beyond this one
  if (passed <= 0) return 0;
  const rest = 0.42 + 0.06 * Math.sin(t * Math.PI * 2 * LOGO.breathe + i * 0.35);
  return rest * smooth(clamp(passed / 1.2, 0, 1)) + Math.max(0, 1 - passed / 2.5) ** 2;
}

/** When letter `k` of word `w` takes fire. */
export const letterTime = (w: 0 | 1, k: number): number => LOGO.words[w].first + LOGO.words[w].gap * k;

/** How lit letter `k` of word `w` is at `t`: 0 before it takes fire, a flash of about 1.6 within a moment of it, then 1 breathing. */
export function letterLight(w: 0 | 1, k: number, t: number): number {
  const x = t - letterTime(w, k);
  if (x <= 0) return 0;
  const rest = 0.94 + 0.06 * Math.sin(t * Math.PI * 2 * LOGO.breathe + k * 0.9 + w * 2);
  return rest * smooth(clamp(x / 0.12, 0, 1)) + Math.exp(-x * 3.5);
}

/** How lit the Elder Sign above the words is at `t`. */
export function sigilLight(t: number): number {
  const x = t - LOGO.sigil.at;
  if (x <= 0) return 0;
  return (0.85 + 0.15 * Math.sin(t * Math.PI * 2 * LOGO.breathe)) * smooth(clamp(x / 0.35, 0, 1)) + Math.exp(-x * 3.5);
}

/** How strongly the letters shudder at `t` (0 none, 1 at the moment it starts), once the wordmark has settled. */
export function glitchAt(t: number): number {
  const { every, seconds, from } = LOGO.glitch;
  if (t < from) return 0;
  const phase = (t - from) % every;
  return phase < seconds ? 1 - phase / seconds : 0;
}

/** The seconds after which nothing more takes fire: the wordmark is whole. */
export const SETTLED = Math.max(LOGO.sigil.at + 1, ...LOGO.words.map((w) => w.first + w.gap * w.text.length + 0.6), LOGO.descent.start + LOGO.descent.seconds + 0.6);
