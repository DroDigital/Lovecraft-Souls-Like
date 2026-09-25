/**
 * Tunable numbers for play feel and presentation (re-exported by tuning.ts): the look test's orbit,
 * audio, the settings menu, consumables, hit feedback, overhead health bars and particles.
 */

import type { Ramp, Vec3 } from './tuning';

/** Debug orbit camera of the Phase 0 look-test scene. */
export const ORBIT = {
  target: [0, 2.2, 0] as Vec3,
  radius: [9, 34] as Ramp, // auto-orbit breathes between these (metres)
  radiusPeriod: 45, // seconds
  yawSpeed: 0.07, // rad/s
  pitch: 0.18, // rad
  pitchMin: -0.05,
  pitchMax: 1.2,
  dragSensitivity: 0.005, // rad per pixel
  zoomSensitivity: 0.001, // per wheel delta unit
  zoomMin: 0.3,
  zoomMax: 2.5,
  minHeightAboveGround: 1.5,
};

/** Procedural audio (Phase 6): the recipes are data/sounds.ts and data/voices.ts. Times in seconds. */
export const AUDIO = {
  fade: 4, // a region's drone crossfades into the next over this long...
  bossFade: 2, // ...and a boss fight's bed swells in and out over this
  swellHz: 0.06, // drones breathe this slowly...
  swell: 0.3, // ...by this share of their level
  polyphony: 24, // one-shot sounds at once; more are dropped
  near: 3, // metres: sounds are whole this close, fading to nothing at their range
  eventRange: 40, // the range of event stingers (blows, shots) away from the investigator
  callGap: 2.5, // a creature calls at most this often, even when it turns on the investigator
  pan: 0.8, // the widest stereo placement
};

/** Boss music (playtest round 4, render/audio/bossMusic.ts; the scores are data/music.ts). Times in seconds. */
export const MUSIC = {
  level: 0.45, // the music's share of the drones' bus (offline renders: it sits under the blows' stingers)
  fadeIn: 2.5,
  fadeOut: 3.5,
  ahead: 0.25, // notes are scheduled this far ahead on the audio clock
};

/** The settings menu (Phase 6): [min, max, step, default]. */
export const SETTINGS = {
  fxCap: [0, 1, 0.05, 1], // caps every sanity effect (accessibility); the default is FX.capDefault's
  sensitivity: [0.25, 3, 0.05, 1], // look speed: mouse, stick and arrows
  resolution: [0.5, 2, 0.25, 1], // internal resolution, × RENDER's 400 × 225
  volume: [0, 1, 0.05, 0.7],
} satisfies Record<string, readonly [number, number, number, number]>;

/** Levels bought with Echoes at an Elder Sign (playtest round 4): what one level of each attribute adds, and the most levels. */
export const LEVELS: Record<'vigour' | 'endurance' | 'might', { max: number; hp?: number; stamina?: number; damage?: number }> = {
  vigour: { max: 20, hp: 12 },
  endurance: { max: 20, stamina: 8 },
  might: { max: 20, damage: 0.04 }, // share added to the investigator's blows and shots
};
export type LevelId = keyof typeof LEVELS;

/** Echoes the next level costs: base + step·n + curve·n², n being the levels bought so far. */
export const LEVEL_COST = { base: 250, step: 90, curve: 9 };

export interface SkyDef {
  moon: number; // the moon's radius, radians (0: none)
  stars: number; // their density
  clouds: number; // cover
  haze: number; // the horizon's moonlit glow
}

/** The night sky over each realm (playtest round 4, render/sky.ts). */
export const SKY = {
  base: { moon: 0.034, stars: 1, clouds: 0.5, haze: 1 } as SkyDef,
  regions: {
    innsmouth: { clouds: 0.7 }, // sea mist
    mountains: { stars: 1.6, clouds: 0.15, haze: 0.8 },
    pnakotus: { stars: 1.4, clouds: 0.1 }, // desert air
    kn_yan: { moon: 0, stars: 0, clouds: 0, haze: 0.35 }, // under the earth
    dreamlands: { moon: 0.075, stars: 1.3, clouds: 0.3, haze: 1.3 }, // the Dreamlands' moon hangs near
    rlyeh: { stars: 0.5, clouds: 0.8, haze: 0.7 },
    yuggoth: { moon: 0, stars: 1.8, clouds: 0, haze: 0.3 }, // no moon over Yuggoth: the sun a star among the rest
    beyond: { moon: 0, stars: 0.5, clouds: 0, haze: 0 },
  } as Readonly<Record<string, Partial<SkyDef>>>,
  haze: [0.075, 0.085, 0.09] as Vec3, // the moonlit haze, added to the fog's colour off the horizon
  moonColor: [0.86, 0.85, 0.8] as Vec3,
  fade: 3, // seconds to ease into another realm's sky...
  jump: 30, // ...unless the camera leapt this many metres at once (a journey): then at once
  close: 0.6, // seconds for a dungeon's walls to close it off
};

/** Echo caches (playtest round 4): what the casket at a dungeon's dead end holds. */
export const CACHE = {
  bounties: 3, // times the richest bounty among the dungeon's creatures...
  least: 150, // ...but never less...
  most: 6000, // ...nor more
};

/** Consumables: Laudanum steadies the mind (tuning.ts), West's Reagent closes wounds. */
export const REAGENT = {
  doses: 4, // at the start; each Silver Vial found adds one
  maxDoses: 14, // the start's four and the ten vials hidden in the lesser dungeons
  heal: 0.45, // share of full health restored
};

/** How a blow taken reads without making the investigator blink: a red edge from the blow's side, a shake, a health bar that drains behind. */
export const HURT = {
  seconds: 0.7, // the red edge fades over this long
  strength: [0.35, 1] as const, // its strength for a grazing blow and for one taking a third of full health
  shake: 0.07, // metres the camera jitters at full strength
  chipDelay: 0.6, // seconds before the lost health drains away from the bar
  chipRate: 45, // percent of the bar per second
};

/** How a loss of sanity reads on its bar (ui/mindHud.ts), as a wound does on health's. */
export const MIND_HUD = {
  chipDelay: 0.9, // seconds before the lost sanity drains away from the bar
  chipRate: 30, // percent of the bar per second
  joltSeconds: 0.6, // a sudden loss (SANITY.jolt) shakes the bar and lights its frame this long
};

/** Health bars over ordinary foes (bosses keep theirs at the bottom of the screen). */
export const FOE_BARS = {
  max: 8, // at once, nearest first
  range: 22, // metres
  height: 0.35, // metres above the head
};

/** The map (playtest round 1): what the investigator has seen stays drawn; the rest lies under fog. */
export const EXPLORE = {
  cell: 16, // metres: the fog's grain
  sight: 56, // metres around the investigator that come to be known
  every: 8, // frames between looks around
  minimap: 110, // metres from the centre to the minimap's edge
};
