/**
 * The shape of a colossus (round 24): what the model is built from (render/assemblies.ts draws it) and
 * what a blow may strike (systems/hurt.ts), one description for both so they agree. A lathed or
 * mounded body is a column of three bands, legs, torso and head (its outline, PROFILE); a body of
 * spheres is its spheres, placed from the creature's seed alike in the picture and in the fight.
 * Pure: no Three.js. Heights and offsets are metres in the body's own frame (as the figure is drawn: its
 * local +x is its left, +z ahead, turned by its yaw).
 */

import { createRng } from '../core/rng';
import { ZONES } from './bossTuning';
import type { AssemblyRecipe } from './schema';

/** Body outline, bottom to top: (radius, height) as fractions of the assembly's height. */
export const PROFILE: readonly (readonly [number, number])[] = [
  [0.02, 0],
  [0.26, 0.02],
  [0.3, 0.16],
  [0.24, 0.34],
  [0.32, 0.5],
  [0.3, 0.62],
  [0.18, 0.7],
  [0.24, 0.78],
  [0.2, 0.92],
  [0.02, 1],
];

export interface Globe {
  x: number;
  y: number;
  z: number;
  r: number;
}

const RING = 8; // spheres resting about its foot, so a blade reaches it from any side

/** A body of spheres, from the creature's seed: a ring of them resting low about its foot (within a blade's reach from every side), and the rest floating above. */
export function globes(r: AssemblyRecipe, seed: number): Globe[] {
  const rng = createRng(seed);
  const h = r.scale;
  const n = r.spheres ?? 12;
  const ring = Math.min(RING, Math.ceil(n / 2));
  return Array.from({ length: n }, (_, i) => {
    if (i < ring) {
      const [size, a] = [h * (0.1 + rng() * 0.06), ((i + (rng() - 0.5) * 0.3) / ring) * Math.PI * 2];
      const d = h * 0.28 * (0.9 + rng() * 0.2);
      return { x: Math.sin(a) * d, y: size * (0.75 + rng() * 0.25), z: Math.cos(a) * d, r: size };
    }
    const size = h * (0.08 + rng() * 0.1);
    return { x: (rng() - 0.5) * h * 0.7, y: h * (0.2 + rng() * 0.65), z: (rng() - 0.5) * h * 0.7, r: size };
  });
}

/** One place a blow may land: a vertical column (`ball` false: its axis `y0`..`y1`, its breadth `r`) or a sphere (`y0` its centre). */
export interface ZoneShape {
  x: number;
  z: number;
  y0: number;
  y1: number;
  r: number;
  ball: boolean;
  damage: number; // the share of a blow it takes
  weak?: boolean; // the head: what the revolver aims for
}

/**
 * A colossus's zones, or none for a body that is not one (a short body, or a sprite). `radius` and
 * `height` are the creature's body; `seed` its entity; `stooped`: it is recovering from a blow, and its
 * head has come down within the blade's reach.
 */
export function zoneShapes(recipe: AssemblyRecipe | undefined, radius: number, height: number, seed: number, stooped: boolean): ZoneShape[] | null {
  if (!recipe || height < ZONES.height) return null;
  if (recipe.body === 'spheres') return globes(recipe, seed).map((g) => ({ x: g.x, z: g.z, y0: g.y, y1: g.y, r: g.r, ball: true, damage: ZONES.legs.damage }));
  const z: ZoneShape[] = [
    { x: 0, z: 0, y0: 0, y1: ZONES.legs.top * height, r: radius, ball: false, damage: ZONES.legs.damage },
    { x: 0, z: 0, y0: ZONES.legs.top * height, y1: ZONES.torso.top * height, r: radius * ZONES.torso.reach, ball: false, damage: ZONES.torso.damage },
  ];
  const r = radius * ZONES.head.reach;
  z.push(stooped
    ? { x: 0, z: radius * 0.35, y0: 0, y1: ZONES.head.stoop, r, ball: false, damage: ZONES.head.damage, weak: true } // the head down, in front of the face
    : { x: 0, z: 0, y0: ZONES.torso.top * height, y1: height, r, ball: false, damage: ZONES.head.damage, weak: true });
  return z;
}
