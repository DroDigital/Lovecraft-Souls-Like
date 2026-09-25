/**
 * Creature skins for the sprite generator (pure): each a brightness pattern over the cell's
 * pixels, worked into a shape's shading — overlapping scales, streaked fur, warts, dark veins,
 * chitin plates, cracked stone, wrinkled hide, cloth folds, smooth wet sheen and trailing wisps.
 * A creature's skin comes from its palette and body plan.
 */

import { hash2 } from '../../core/rng';
import type { CreaturePalette, Silhouette } from '../../data/schema';
import type { Skin } from './raster';

/** How bright the skin is at (x, y): about 1, darker in its seams and lines. */
export function skinAt(skin: Skin, x: number, y: number, seed: number): number {
  switch (skin) {
    case 'scales': {
      const row = Math.floor(y / 3);
      const lx = (x + (row % 2) * 2) % 4;
      return 1.1 - 0.09 * (y % 3) - (lx === 0 ? 0.12 : 0);
    }
    case 'fur':
      return 0.84 + 0.3 * hash2(x, Math.floor(y / 3) + (x % 2) * 17, seed);
    case 'warts': {
      const h = hash2(x >> 1, y >> 1, seed);
      return h > 0.88 ? 1.25 : h < 0.08 ? 0.8 : 1;
    }
    case 'veins':
      return Math.abs(Math.sin(x * 0.8 + Math.sin(y * 0.5 + seed) * 2.2)) < 0.12 ? 0.72 : 1;
    case 'plates':
      return (x + y) % 7 === 0 || (x - y + 70) % 7 === 0 ? 0.78 : 1.04;
    case 'cracks':
      return Math.abs(Math.sin(x * 0.5 + y * 0.9) * Math.sin(y * 0.7 - x * 0.3)) < 0.06 ? 0.7 : 1;
    case 'wrinkles':
      return y % 4 === 0 && hash2(x >> 2, y, seed) > 0.4 ? 0.82 : 1;
    case 'cloth':
      return 0.93 + 0.12 * Math.sin(x * 1.1 + Math.sin(y * 0.3) * 1.5);
    case 'wisp':
      return 0.85 + 0.25 * hash2(x, Math.floor(y / 5), seed);
    default:
      return 1;
  }
}

const BY_PALETTE: Partial<Record<CreaturePalette, Skin>> = { sea: 'scales', mold: 'warts', fungus: 'plates', ichor: 'veins', flesh: 'veins', rubber: 'sheen', stone: 'cracks' };
const BY_BODY: Partial<Record<Silhouette, Skin>> = {
  humanoid: 'cloth', robed: 'cloth', giant: 'wrinkles', hunched: 'wrinkles', quadruped: 'fur', winged: 'fur', serpent: 'scales', toad: 'warts',
  crustacean: 'plates', blob: 'veins', cone: 'veins', barrel: 'plates', orb: 'veins', spectre: 'wisp', cephalopod: 'veins',
};
const WET = new Set<Skin>(['scales', 'veins', 'sheen', 'warts']);

/** A creature's skin, and whether it is wet. */
export function skinOf(palette: CreaturePalette, body: Silhouette): { skin?: Skin; wet: boolean } {
  const skin = BY_PALETTE[palette] ?? BY_BODY[body];
  return { skin, wet: !!skin && WET.has(skin) };
}
