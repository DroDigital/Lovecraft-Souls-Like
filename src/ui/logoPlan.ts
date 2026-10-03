/**
 * The title's wordmark, planned (playtest round 20; logo.ts draws it): SEVENTY STEPS cut in stone under
 * a small Elder Sign. When the title opens the letters take fire one after another, and the sign
 * crowns them. (Round 38: the flight of seventy treads beneath it is gone: it read as cheap.) All of
 * it is a function of the seconds since the title opened, so any moment can be drawn. Pure: no canvas.
 */

export const LOGO = {
  size: [256, 82] as const, // logical pixels, drawn at two screen pixels each
  words: [
    { text: 'SEVENTY', size: 23, track: 9, baseline: 41, first: 1.0, gap: 0.14 }, // each letter: its size (px), the space between letters, its baseline row, when the first takes fire and the gap to the next (s)
    { text: 'STEPS', size: 33, track: 8, baseline: 71, first: 2.1, gap: 0.16 },
  ],
  sigil: { at: 3.4, y: 15 }, // when the Elder Sign above the words comes alight, and its middle row
  glitch: { every: 9, seconds: 0.16, from: 6 }, // once settled, the letters shudder now and then: how often, how long, from when
  breathe: 0.28, // Hz the resting glow breathes at
};

const clamp = (v: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, v));
const smooth = (x: number): number => x * x * (3 - 2 * x);

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
export const SETTLED = Math.max(LOGO.sigil.at + 1, ...LOGO.words.map((w) => w.first + w.gap * w.text.length + 0.6));
