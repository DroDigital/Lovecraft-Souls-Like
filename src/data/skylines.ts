/**
 * What stands against each realm's sky, too far off to walk to (playtest round 12: there was no
 * Kadath, no cyclopean R'lyeh, no Yuggoth towers to see): unknown Kadath's crowned peak north of
 * the Dreamlands, the Mountains of Madness with their cubes on the heights, R'lyeh's drowned city
 * risen beyond the Great Door, Yuggoth's towers, the Round Hills about Dunwich and the Green
 * Mountains over Vermont. Each is a silhouette at its true bearing and size (render/skyline.ts);
 * `at` is in metres from the region's south-west corner, like sites.ts, and may lie past its edge.
 * Data only.
 */

import type { At } from './sites';

export type SilhouetteKind = 'peak' | 'range' | 'city' | 'towers' | 'hills' | 'titan';

export interface Silhouette {
  kind: SilhouetteKind;
  at: At;
  width: number; // metres
  height: number; // metres above the plain
  seed: number;
}

const s = (kind: SilhouetteKind, x: number, z: number, width: number, height: number, seed: number): Silhouette => ({ kind, at: [x, z], width, height, seed });

export const SKYLINES: Readonly<Record<string, readonly Silhouette[]>> = {
  dreamlands: [s('peak', 520, 1500, 1100, 560, 3)], // unknown Kadath, in the cold waste
  mountains: [s('range', 250, 1000, 1900, 420, 7)],
  rlyeh: [s('city', 330, 760, 720, 190, 11), s('titan', 330, 1500, 900, 880, 31)], // and, risen behind its city, the one it was built for
  yuggoth: [s('towers', 300, 820, 900, 260, 5)],
  dunwich: [s('hills', 250, 900, 1500, 130, 13)],
  vermont: [s('hills', 260, 860, 1400, 190, 17)],
  // Round 26 (the first hour had nothing too large to fight in it, and nothing to be afraid of far off): a horror standing on the
  // horizon of the waking world, too far to reach and too vast to be anything else. They breathe (render/skyline.ts).
  hub: [s('titan', 1150, 2050, 560, 620, 21)], // the drowned one, far to the south-east, risen from the sea
  arkham: [s('titan', -900, 700, 520, 560, 23)], // something on its knees beyond the blasted heath
  innsmouth: [s('titan', 1350, 430, 640, 700, 29)], // out past Devil Reef, where the water is deepest
};
