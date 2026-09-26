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

export type SilhouetteKind = 'peak' | 'range' | 'city' | 'towers' | 'hills';

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
  rlyeh: [s('city', 330, 760, 720, 190, 11)],
  yuggoth: [s('towers', 300, 820, 900, 260, 5)],
  dunwich: [s('hills', 250, 900, 1500, 130, 13)],
  vermont: [s('hills', 260, 860, 1400, 190, 17)],
};
