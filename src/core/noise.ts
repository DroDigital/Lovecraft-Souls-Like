/** Seeded 2D value noise and fBm. Non-zero periods make the noise tile (for textures). */

import { hash2 } from './rng';

const smooth = (t: number): number => t * t * (3 - 2 * t);
const wrap = (i: number, period: number): number => (period > 0 ? ((i % period) + period) % period : i);

/** Value noise in [0, 1). Repeats every `px` units in x and `py` in y when they are > 0. */
export function valueNoise(x: number, y: number, seed: number, px = 0, py = px): number {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const tx = smooth(x - xi);
  const ty = smooth(y - yi);
  const x0 = wrap(xi, px);
  const x1 = wrap(xi + 1, px);
  const y0 = wrap(yi, py);
  const y1 = wrap(yi + 1, py);
  const a = hash2(x0, y0, seed);
  const b = hash2(x1, y0, seed);
  const c = hash2(x0, y1, seed);
  const d = hash2(x1, y1, seed);
  return a + (b - a) * tx + (c - a) * ty + (a - b - c + d) * tx * ty;
}

/** Fractal sum of value noise in [0, 1). Periods double per octave, so tiling is preserved. */
export function fbm(x: number, y: number, seed: number, octaves: number, px = 0, py = px): number {
  let sum = 0;
  let amp = 0.5;
  let norm = 0;
  let f = 1;
  for (let o = 0; o < octaves; o++) {
    sum += amp * valueNoise(x * f, y * f, seed + o * 1013, px * f, py * f);
    norm += amp;
    amp *= 0.5;
    f *= 2;
  }
  return sum / norm;
}
