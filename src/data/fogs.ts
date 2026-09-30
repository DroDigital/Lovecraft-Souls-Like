/**
 * Volumetric fog (playtest round 16): each region's mist, drawn by the post pass as a march through
 * slow noise (render/volumetricFog.ts, render/shaders/fog.ts). Round 23: a low mist that pools about
 * the investigator's ground and clears above it, so roofs, trees and the sky stand crisp against it,
 * under a thin haze that reaches the lamps' height (they glow in it, and the far land melts into it);
 * a grey with a hint of the realm, brighter toward the moon. A dungeon's roofed rooms take a low
 * crypt-mist of their own. Colours are the mist's own tint (display sRGB); the lantern and the lamps
 * light it besides.
 */

export interface FogDef {
  density: number; // per metre, at the ground (the low mist)
  height: number; // metres over which the low mist thins to a third
  haze: number; // per metre, the thin haze that reaches the lamps' height (FOG.hazeHeight)
  color: readonly [number, number, number];
  moon: number; // 0: the mist is the same on every side; 1: it shines in the moon's quarter and sinks in the far one
  patchy: number; // 0: an even veil; 1: it gathers in drifts with clear air between
  wind: readonly [x: number, z: number]; // metres a second it drifts
}

const fog = (density: number, height: number, color: FogDef['color'], patchy: number, o: Partial<Pick<FogDef, 'haze' | 'moon' | 'wind'>> = {}): FogDef => ({
  density,
  height,
  color,
  patchy,
  haze: o.haze ?? 0.005,
  moon: o.moon ?? 0.8,
  wind: o.wind ?? [0.3, 0.15],
});

export const FOGS: Readonly<Record<string, FogDef>> = {
  hub: fog(0.09, 1.3, [0.14, 0.15, 0.155], 0.6), // a thin mist over the quad
  arkham: fog(0.14, 1.4, [0.14, 0.15, 0.155], 0.7, { haze: 0.006, moon: 0.9 }), // the Blasted Heath and the moon-bog: heavy ground fog
  dunwich: fog(0.12, 1.6, [0.14, 0.145, 0.15], 0.6), // fog in the valleys under the round hills
  innsmouth: fog(0.13, 2, [0.125, 0.15, 0.16], 0.5, { haze: 0.007, wind: [1.2, 0.4] }), // sea fog off Devil Reef
  providence: fog(0.1, 1.4, [0.14, 0.15, 0.16], 0.55), // river mist
  vermont: fog(0.1, 1.7, [0.135, 0.15, 0.15], 0.65), // mist on the wooded hills
  mountains: fog(0.06, 3, [0.2, 0.215, 0.24], 0.4, { haze: 0.006, moon: 0.9, wind: [2.5, 0.8] }), // blowing snow off the plateau
  pnakotus: fog(0.05, 2, [0.2, 0.17, 0.125], 0.35, { haze: 0.006, moon: 0.6, wind: [0.8, 0.2] }), // desert dust among the basalt
  kn_yan: fog(0.08, 2.2, [0.085, 0.1, 0.16], 0.3, { haze: 0.005, moon: 0, wind: [0.1, 0.05] }), // the blue murk under the earth
  dreamlands: fog(0.1, 1.6, [0.14, 0.12, 0.185], 0.6, { haze: 0.006, moon: 0.9 }), // dream-mist, faintly violet
  rlyeh: fog(0.11, 2.2, [0.09, 0.145, 0.125], 0.5, { haze: 0.006, moon: 0.6, wind: [0.9, 0.6] }), // green sea-mist over the drowned city
  yuggoth: fog(0.1, 1.8, [0.105, 0.075, 0.135], 0.75, { haze: 0.005, moon: 0, wind: [0.2, 0.3] }), // drifting fungal spores
  beyond: fog(0.09, 2.5, [0.115, 0.055, 0.155], 0.55, { haze: 0.005, moon: 0, wind: [0.15, 0.1] }), // the void's own haze
};

/** A dungeon's roofed rooms: a thin crypt-mist over the floor. */
export const DUNGEON_FOG: FogDef = fog(0.09, 1, [0.09, 0.09, 0.09], 0.6, { haze: 0.004, moon: 0, wind: [0.1, 0.05] });
