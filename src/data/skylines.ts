/**
 * What stands against each realm's sky, too far off to walk to (playtest round 12: there was no
 * Kadath, no cyclopean R'lyeh, no Yuggoth towers to see): unknown Kadath's crowned peak north of
 * the Dreamlands, the Mountains of Madness with their cubes on the heights, R'lyeh's drowned city
 * risen beyond the Great Door, Yuggoth's towers, the Round Hills about Dunwich and the Green
 * Mountains over Vermont. Each is a silhouette at its true bearing and size (render/skyline.ts);
 * `at` is in metres from the region's south-west corner, like sites.ts, and may lie past its edge.
 * Round 32 (the towns, hills and towers never showed through the haze): every realm of the waking
 * world sees its neighbours' towns on the horizon, their roofs and steeples with a few windows lit,
 * from where each truly stands; Innsmouth sees Devil Reef; the realms beyond see more of their own
 * far land. A silhouette is replaced by the real thing as it comes within reach of the world's chunks.
 * Round 26: a horror stands on the horizon of the waking world and of R'lyeh, too far to reach and too
 * vast to be anything else (a `titan`; they breathe, render/skyline.ts). Data only.
 */

import type { At } from './sites';

export type SilhouetteKind = 'peak' | 'range' | 'city' | 'towers' | 'hills' | 'town' | 'reef' | 'dunes' | 'minarets' | 'titan';

export interface Silhouette {
  kind: SilhouetteKind;
  at: At;
  width: number; // metres
  height: number; // metres above the plain
  seed: number;
  lit?: number; // 0..1: how many of its windows are lit (warm, or the realm's own light: `glow`)
  glow?: 'amber' | 'cyan' | 'gold';
  fade?: number; // 0..1: how far it has melted toward the horizon's colour (the farthest ranges)
}

const s = (kind: SilhouetteKind, x: number, z: number, width: number, height: number, seed: number, o: Pick<Silhouette, 'lit' | 'glow' | 'fade'> = {}): Silhouette => ({ kind, at: [x, z], width, height, seed, ...o });

export const SKYLINES: Readonly<Record<string, readonly Silhouette[]>> = {
  // The waking world's neighbours, each town where it truly stands (the tiles lie in a ring about the hub).
  hub: [
    s('town', -72, 256, 240, 48, 21, { lit: 0.12 }), // Arkham, to the west
    s('town', 582, 250, 200, 42, 22, { lit: 0.12 }), // Providence, east
    s('town', 952, 130, 140, 38, 23, { lit: 0.1 }), // Kingsport beyond it
    s('town', 256, 582, 100, 22, 28, { lit: 0.08 }), // Vermont's hamlet, north
    s('hills', 256, 1000, 1700, 150, 31, { fade: 0.35 }),
    s('titan', 1150, 2050, 560, 620, 21), // the drowned one, far to the south-east, risen from the sea
  ],
  arkham: [
    s('town', 768, 210, 250, 52, 24, { lit: 0.14 }), // the University's towers, east
    s('town', 430, 582, 110, 22, 26, { lit: 0.08 }), // Dunwich, north
    s('hills', -250, 250, 900, 70, 25, { fade: 0.2 }), // the heath's low ridges
    s('titan', -900, 700, 520, 560, 23), // something on its knees beyond the blasted heath
  ],
  dunwich: [
    s('hills', 250, 900, 1500, 130, 13),
    s('town', 440, -256, 240, 50, 27, { lit: 0.12 }), // Arkham, south
    s('town', 768, 70, 100, 22, 28, { lit: 0.08 }),
  ],
  innsmouth: [
    s('reef', 770, 200, 400, 55, 29), // Devil Reef, with its light, out in the sea
    s('town', 440, -382, 140, 38, 30, { lit: 0.1 }), // Kingsport, south
    s('hills', -300, 300, 1200, 90, 36, { fade: 0.4 }),
    s('titan', 1350, 430, 640, 700, 29), // out past Devil Reef, where the water is deepest
  ],
  providence: [
    s('town', -256, 210, 250, 52, 31, { lit: 0.14 }), // the University, west
    s('town', 96, 608, 260, 44, 32, { lit: 0.1 }), // Innsmouth, north
    s('hills', 700, 300, 1400, 110, 37, { fade: 0.4 }),
  ],
  vermont: [
    s('hills', 260, 860, 1400, 190, 17),
    s('town', 256, -302, 250, 52, 33, { lit: 0.14 }), // the University, south
    s('town', -82, 70, 100, 22, 34, { lit: 0.08 }),
    s('town', 608, 96, 260, 44, 35, { lit: 0.1 }),
  ],
  // The realms beyond.
  mountains: [s('range', 250, 1000, 1900, 420, 7), s('range', 900, 900, 2600, 640, 46, { fade: 0.55 })],
  pnakotus: [s('dunes', 250, 900, 1800, 100, 47, { fade: 0.2 }), s('towers', 620, 700, 700, 170, 38)],
  kn_yan: [s('towers', 300, 800, 900, 150, 39, { lit: 0.35, glow: 'cyan' })],
  dreamlands: [
    s('peak', 520, 1500, 1100, 560, 3), // unknown Kadath, in the cold waste
    s('minarets', 1100, 400, 700, 130, 40, { lit: 0.3, glow: 'gold' }), // Celephaïs, on its sea
    s('range', -350, 500, 1500, 320, 41, { fade: 0.3 }),
  ],
  rlyeh: [s('city', 330, 760, 720, 190, 11), s('city', -300, 500, 520, 150, 43, { fade: 0.25 }), s('titan', 330, 1500, 900, 880, 31)], // and, risen behind its city, the one it was built for
  yuggoth: [s('towers', 300, 820, 900, 260, 5), s('range', 700, 300, 1500, 300, 44, { fade: 0.4 })],
  beyond: [s('towers', 400, 700, 600, 230, 45, { fade: 0.2 })],
};
