/**
 * How each realm looks (playtest round 32: every realm was the same dark grey-sepia under the same dark
 * grey haze; a screenshot could have been from any of them). Each realm has its own colours:
 *  - the grade: the picture's darks, middle and lights are pushed toward four colours of its own
 *    (ink, shade, mid, high), keeping `native` of what each pixel was lit as (render/shaders/post.ts);
 *  - two accent colours kept in the picture's 64-colour palette, so a hue the realm lives by (a green
 *    heath, a violet sky) is not lost to grey (render/realmPalette.ts);
 *  - its mist, its horizon and zenith, the moon and ambient light it is lit by, and the colour its far
 *    silhouettes are drawn in.
 * Colours are display sRGB. Realms ease from one look to the next (render/realmLook.ts). Data only.
 */

import type { Vec3 } from './tuning';

type Hex = `#${string}`;

interface LookDef {
  grade: readonly [ink: Hex, shade: Hex, mid: Hex, high: Hex];
  native: number; // 0..1: the share of its own colour a pixel keeps through the grade
  accents: readonly [Hex, Hex];
  mist: Hex; // the mist and the haze: its colour at full
  sky: readonly [horizon: Hex, zenith: Hex];
  ambient: readonly [Hex, level: number];
  moon: readonly [Hex, level: number];
  far: Hex; // what stands against the horizon: the far silhouettes
  glow?: number; // the horizon's moonlit glow, × the sky's own
}

export interface Look {
  grade: readonly [Vec3, Vec3, Vec3, Vec3];
  native: number;
  accents: readonly [Vec3, Vec3];
  mist: Vec3;
  horizon: Vec3;
  zenith: Vec3;
  ambient: Vec3;
  moon: Vec3;
  moonColor: Vec3; // the moon's own disc and halo
  haze: Vec3; // what the land fades into with distance
  far: Vec3;
  glow: number;
}

export const hex = (s: string): Vec3 => {
  const n = parseInt(s.slice(1), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
};
const scale = (c: Vec3, k: number): Vec3 => [c[0] * k, c[1] * k, c[2] * k];
const mix = (a: Vec3, b: Vec3, t: number): Vec3 => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];

function look(d: LookDef): Look {
  const [horizon, zenith] = [hex(d.sky[0]), hex(d.sky[1])];
  const moon = hex(d.moon[0]);
  return {
    grade: [hex(d.grade[0]), hex(d.grade[1]), hex(d.grade[2]), hex(d.grade[3])],
    native: d.native,
    accents: [hex(d.accents[0]), hex(d.accents[1])],
    mist: hex(d.mist),
    horizon,
    zenith,
    ambient: scale(hex(d.ambient[0]), d.ambient[1]),
    moon: scale(moon, d.moon[1]),
    moonColor: mix(moon, [1, 1, 1], 0.55),
    haze: mix(horizon, hex(d.mist), 0.35),
    far: hex(d.far),
    glow: d.glow ?? 1,
  };
}

export const LOOKS: Record<string, Look> = {
  // Miskatonic: an October night over brick and ivy: indigo shadow, amber lamplight.
  hub: look({
    grade: ['#0a1030', '#2a3668', '#8a86b0', '#ffe2a8'], native: 0.58, accents: ['#9a4a3a', '#5d7a4a'], mist: '#6a78a8',
    sky: ['#6a7ab0', '#0e1740'], ambient: ['#7080b8', 0.58], moon: ['#a8bcf0', 1.0], far: '#141c3c',
  }),
  // Arkham and the Blasted Heath: ash and khaki, a sick yellow in the lamps and the sky over the heath.
  arkham: look({
    grade: ['#0e1008', '#38402c', '#a09c78', '#f4e8a8'], native: 0.58, accents: ['#5a6a50', '#a08850'], mist: '#8a8e70',
    sky: ['#8e9068', '#161a10'], ambient: ['#8a9a78', 0.58], moon: ['#c8d0a8', 1.0], far: '#1a2014',
  }),
  // Dunwich: harvest russet and plum hills under a rose dusk.
  dunwich: look({
    grade: ['#1a0c14', '#4e2a44', '#b08868', '#ffd89a'], native: 0.58, accents: ['#a85a30', '#b89a50'], mist: '#a87a82',
    sky: ['#b27a70', '#2a2634'], ambient: ['#b08090', 0.56], moon: ['#f0c0b0', 1.0], far: '#382e34',
  }),
  // Innsmouth: sea fog the colour of a drowned thing, algae-gold light.
  innsmouth: look({
    grade: ['#041418', '#14505a', '#68a09c', '#e0f4a0'], native: 0.58, accents: ['#6a8c38', '#7a9aa0'], mist: '#5aa4a4',
    sky: ['#78a498', '#202c2c'], ambient: ['#78a49c', 0.56], moon: ['#a0e0e0', 0.96], far: '#222c2e',
  }),
  // Providence and Kingsport: moonlit slate and pewter, silver on the water.
  providence: look({
    grade: ['#0c1016', '#34404c', '#9aa4b0', '#ffe8d8'], native: 0.58, accents: ['#7a8aa6', '#a45c54'], mist: '#8494a8',
    sky: ['#8096be', '#101a3a'], ambient: ['#6c84b8', 0.58], moon: ['#c0d4ff', 1.05], far: '#162240',
  }),
  // Vermont: pine green and the pale mist of the hills, gold in the leaves.
  vermont: look({
    grade: ['#061208', '#1c4c2a', '#76986a', '#e4ecb8'], native: 0.62, accents: ['#2f6a3f', '#8a6a38'], mist: '#6a9a76',
    sky: ['#78a28e', '#202a26'], ambient: ['#78a286', 0.52], moon: ['#b8e0c0', 0.94], far: '#202c24',
  }),
  // The Mountains of Madness: ice and a hard white light, lavender in the shadow.
  mountains: look({
    grade: ['#10163a', '#4a58a8', '#a0d4e8', '#ffffff'], native: 0.55, accents: ['#8ad0e8', '#9c8cc8'], mist: '#a8c8e6',
    sky: ['#a8cce8', '#18305a'], ambient: ['#88a8d8', 0.5], moon: ['#d8ecff', 0.95], far: '#26406a', glow: 1.3,
  }),
  // Pnakotus: basalt and terracotta under a violet dusk.
  pnakotus: look({
    grade: ['#1c0c0c', '#74301e', '#d09870', '#ffe4a4'], native: 0.58, accents: ['#3c3844', '#8c6a98'], mist: '#c8946a',
    sky: ['#d89260', '#3a3850'], ambient: ['#c8906a', 0.62], moon: ['#ffd8a8', 1.1], far: '#341a14',
  }),
  // K'n-yan under the earth: ultramarine murk and a cold cyan glow.
  kn_yan: look({
    grade: ['#020820', '#1c3470', '#5a88c0', '#b8f0ff'], native: 0.58, accents: ['#2ad0c0', '#4040a8'], mist: '#3a64a8',
    sky: ['#2450a0', '#050c30'], ambient: ['#4068d0', 0.46], moon: ['#6090e8', 0.8], far: '#081240', glow: 0.7,
  }),
  // The Dreamlands: violet and lilac, gold on the spires.
  dreamlands: look({
    grade: ['#1a0a28', '#6a3a82', '#c8a4cc', '#ffe0a0'], native: 0.58, accents: ['#b890b0', '#e4c070'], mist: '#9c80c8',
    sky: ['#a894c8', '#38364c'], ambient: ['#a090c8', 0.6], moon: ['#e0d0ff', 1.1], far: '#403c54', glow: 1.2,
  }),
  // R'lyeh: viridian stone, wet and wrong, a sick lime in the light.
  rlyeh: look({
    grade: ['#030c0a', '#0e3a2e', '#3a7a64', '#a8f0c8'], native: 0.6, accents: ['#7a9a30', '#3e5e4e'], mist: '#3e7460',
    sky: ['#6c8c7c', '#1a201e'], ambient: ['#78a08a', 0.42], moon: ['#b0e0c8', 0.76], far: '#202a24',
  }),
  // Yuggoth: wine and dusty rose, fungus-violet and ember.
  yuggoth: look({
    grade: ['#14040e', '#58203c', '#a8707e', '#ffd0b4'], native: 0.6, accents: ['#8c4c8c', '#c85a34'], mist: '#8a3e60',
    sky: ['#8a6478', '#2c2229'], ambient: ['#a07a8c', 0.46], moon: ['#e8b0c4', 0.82], far: '#3a2c34',
  }),
  // Beyond the Gate: black, indigo, a white-hot star.
  beyond: look({
    grade: ['#050512', '#262654', '#7484c0', '#ffffff'], native: 0.58, accents: ['#6a6ad8', '#a0e0ea'], mist: '#3c3c88',
    sky: ['#7070a0', '#03030e'], ambient: ['#8080b0', 0.4], moon: ['#a8b0f0', 0.7], far: '#2c2c3c', glow: 0.8,
  }),
};

/** The look where no realm holds (the combat arena, the look test): the hub's. */
export const lookOf = (region: string | null): Look => LOOKS[region ?? ''] ?? LOOKS.hub;
