/**
 * Volumetric fog (playtest round 16): each region's mist, drawn by the post pass as a march through
 * slow noise (render/volumetricFog.ts, render/shaders/fog.ts). Round 23: a low mist that pools about
 * the investigator's ground and clears above it, so roofs, trees and the sky stand crisp against it,
 * under a thin haze that reaches the lamps' height (they glow in it, and the far land melts into it).
 * Round 32 (it was a dark grey blanket: a small pool of lantern light, then haze, and nothing beyond):
 * a thinner mist, a third of what it was, in its realm's own colour (data/looks.ts), brighter toward
 * the moon, so the land beyond the lantern shows through it. A dungeon's roofed rooms take a low
 * crypt-mist of their own, in the realm's dark. The lantern and the lamps light it besides.
 */

import { lookOf } from './looks';

export interface FogDef {
  density: number; // per metre, at the ground (the low mist)
  height: number; // metres over which the low mist thins to a third
  haze: number; // per metre, the thin haze that reaches the lamps' height (FOG.hazeHeight)
  color: readonly [number, number, number];
  moon: number; // 0: the mist is the same on every side; 1: it shines in the moon's quarter and sinks in the far one
  patchy: number; // 0: an even veil; 1: it gathers in drifts with clear air between
  wind: readonly [x: number, z: number]; // metres a second it drifts
}

const fog = (density: number, height: number, region: string, patchy: number, o: Partial<Pick<FogDef, 'haze' | 'moon' | 'wind'>> = {}): FogDef => ({
  density,
  height,
  color: lookOf(region).mist,
  patchy,
  haze: o.haze ?? 0.0035,
  moon: o.moon ?? 0.8,
  wind: o.wind ?? [0.3, 0.15],
});

export const FOGS: Readonly<Record<string, FogDef>> = {
  hub: fog(0.035, 1.3, 'hub', 0.6), // a thin mist over the quad
  arkham: fog(0.07, 1.4, 'arkham', 0.7, { haze: 0.004, moon: 0.9 }), // the Blasted Heath and the moon-bog: ground fog, the heaviest of them
  dunwich: fog(0.05, 1.6, 'dunwich', 0.6, { haze: 0.003 }), // fog in the valleys under the round hills
  innsmouth: fog(0.06, 2, 'innsmouth', 0.5, { haze: 0.0045, wind: [1.2, 0.4] }), // sea fog off Devil Reef
  providence: fog(0.04, 1.4, 'providence', 0.55), // river mist
  vermont: fog(0.045, 1.7, 'vermont', 0.65), // mist on the wooded hills
  mountains: fog(0.03, 3, 'mountains', 0.4, { haze: 0.003, moon: 0.9, wind: [2.5, 0.8] }), // blowing snow off the plateau
  pnakotus: fog(0.025, 2, 'pnakotus', 0.35, { haze: 0.0035, moon: 0.6, wind: [0.8, 0.2] }), // desert dust among the basalt
  kn_yan: fog(0.04, 2.2, 'kn_yan', 0.3, { haze: 0.004, moon: 0, wind: [0.1, 0.05] }), // the blue murk under the earth
  dreamlands: fog(0.045, 1.6, 'dreamlands', 0.6, { haze: 0.0035, moon: 0.9 }), // dream-mist, violet
  rlyeh: fog(0.05, 2.2, 'rlyeh', 0.5, { haze: 0.004, moon: 0.6, wind: [0.9, 0.6] }), // green sea-mist over the drowned city
  yuggoth: fog(0.045, 1.8, 'yuggoth', 0.75, { haze: 0.004, moon: 0, wind: [0.2, 0.3] }), // drifting fungal spores
  beyond: fog(0.04, 2.5, 'beyond', 0.55, { haze: 0.004, moon: 0, wind: [0.15, 0.1] }), // the void's own haze
};

/** A dungeon's roofed rooms: a thin crypt-mist over the floor, a dark of the realm's own colour. */
export const DUNGEON_FOG: FogDef = { ...fog(0.05, 1, 'hub', 0.6, { haze: 0.002, moon: 0, wind: [0.1, 0.05] }), color: [0.1, 0.1, 0.12] };

/** The crypt-mist under the realm's roofs: the dungeon's, tinted with the realm's mist. */
export function dungeonFogOf(region: string | null): FogDef {
  const m = lookOf(region).mist;
  return { ...DUNGEON_FOG, color: [m[0] * 0.35, m[1] * 0.35, m[2] * 0.35] };
}
