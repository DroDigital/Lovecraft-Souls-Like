/** Seeded noise heightfield (pure, no Three.js). */

import { fbm } from '../core/noise';

export interface HeightfieldParams {
  seed: number;
  amplitude: number; // metres
  frequency: number; // noise cells per metre
  octaves: number;
}

export type HeightFn = (x: number, z: number) => number;

/** Height in [-amplitude, amplitude] at world (x, z). */
export function createHeightfield(p: HeightfieldParams): HeightFn {
  return (x, z) => (fbm(x * p.frequency, z * p.frequency, p.seed, p.octaves) * 2 - 1) * p.amplitude;
}
