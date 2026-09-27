/**
 * Volumetric fog (playtest round 16): each region's mist, drawn by the post pass as a march through
 * slow noise that pools about the investigator's ground and thins with height (render/volumetricFog.ts,
 * render/shaders/fog.ts). A dungeon's roofed rooms take a low crypt-mist of their own. Colours are the
 * mist's own moonlit tint (display sRGB); the lantern and the lamps light it besides.
 */

export interface FogDef {
  density: number; // per metre, at the ground
  height: number; // metres over which it thins to a third
  color: readonly [number, number, number];
  patchy: number; // 0: an even veil; 1: it gathers in drifts with clear air between
  wind: readonly [x: number, z: number]; // metres a second it drifts
}

const fog = (density: number, height: number, color: FogDef['color'], patchy: number, wind: FogDef['wind'] = [0.3, 0.15]): FogDef => ({ density, height, color, patchy, wind });

export const FOGS: Readonly<Record<string, FogDef>> = {
  hub: fog(0.032, 2.5, [0.13, 0.14, 0.138], 0.5), // a thin mist over the quad
  arkham: fog(0.085, 2.4, [0.12, 0.14, 0.12], 0.65), // the Blasted Heath and the moon-bog: heavy ground fog
  dunwich: fog(0.07, 3, [0.13, 0.13, 0.115], 0.55), // fog in the valleys under the round hills
  innsmouth: fog(0.09, 5, [0.11, 0.135, 0.13], 0.45, [1.2, 0.4]), // sea fog off Devil Reef
  providence: fog(0.055, 2.5, [0.13, 0.135, 0.15], 0.5), // river mist
  vermont: fog(0.055, 3.5, [0.135, 0.14, 0.135], 0.6), // mist on the wooded hills
  mountains: fog(0.035, 12, [0.18, 0.19, 0.22], 0.4, [2.5, 0.8]), // blowing snow off the plateau
  pnakotus: fog(0.03, 4, [0.17, 0.14, 0.1], 0.35, [0.8, 0.2]), // desert dust among the basalt
  kn_yan: fog(0.06, 6, [0.08, 0.1, 0.155], 0.3, [0.1, 0.05]), // the blue murk under the earth
  dreamlands: fog(0.06, 3, [0.14, 0.115, 0.18], 0.6), // dream-mist, faintly violet
  rlyeh: fog(0.09, 5, [0.08, 0.14, 0.115], 0.5, [0.9, 0.6]), // green sea-mist over the drowned city
  yuggoth: fog(0.055, 3, [0.1, 0.065, 0.13], 0.75, [0.2, 0.3]), // drifting fungal spores
  beyond: fog(0.075, 8, [0.115, 0.05, 0.155], 0.55, [0.15, 0.1]), // the void's own haze
};

/** A dungeon's roofed rooms: a thin crypt-mist over the floor. */
export const DUNGEON_FOG: FogDef = fog(0.05, 1.6, [0.085, 0.085, 0.08], 0.6, [0.1, 0.05]);
