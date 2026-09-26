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

/** The title's theme (render/audio/music.ts; playtest rounds 5 and 6). Times in seconds. */
export const THEME = {
  from: 3.3, // where the track first swells: its first three seconds are a near-silent lead-in (the first hit lands at 3.85)
  fadeIn: 0.4, // so starting mid-phrase does not click
  sink: 7, // spawning in, it sinks away over this long: an equal-power fade...
  sinkTo: 280, // ...under a low-pass closing to this (Hz), as the world's ambience rises beneath it (AUDIO.fade)
  wait: 4, // the title opens by itself after this long if the theme has neither sounded nor been refused (a slow line)
  leap: [1.1, 3.2] as const, // looping, it leaps from this long before the end, where the ending has decayed to about −20 dB, back to here, where the lead-in has swelled to the same...
  hit: 3.85, // ...a moment before the first hit (playtest round 9)
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
  resolution: [0.5, 2, 0.25, 1.5], // internal resolution, × RENDER's 400 × 225 (600 × 338 by default since playtest round 7, so the figures' detail shows)
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

export type LightKind = 'lamp' | 'window' | 'fire' | 'torch' | 'sigil';

interface LightDef {
  color: Vec3;
  strength: number; // of the light it casts...
  range: number; // ...out to here (metres)
  halo: number; // the glow about it: its radius (metres)...
  haloGain: number; // ...and brightness
  flicker: number; // share its light wavers by (flames)
}

/** The world's lights (playtest round 5, render/worldLights.ts): street lamps, fires, torches and lit windows. */
export const LIGHTS = {
  reach: 42, // metres: the farthest a light is chosen to light the world about it
  haloReach: 75, // metres: the farthest a halo is drawn
  haloFog: 0.55, // halos pierce the fog: they fade by only this share of it
  lantern: { color: [1, 0.82, 0.58] as Vec3, halo: 0.34, haloGain: 0.6 }, // the investigator's own, which lights by its own rules (lantern.ts)
  kinds: {
    lamp: { color: [1, 0.8, 0.52], strength: 2.6, range: 11, halo: 1.4, haloGain: 0.8, flicker: 0.03 }, // a pool about six metres across under a lamp three and a half up, and the walls about it
    window: { color: [1, 0.76, 0.48], strength: 1.1, range: 6.5, halo: 0.9, haloGain: 0.38, flicker: 0 }, // a warm patch on the wall and ground before it
    fire: { color: [1, 0.66, 0.36], strength: 3, range: 13, halo: 1.8, haloGain: 0.75, flicker: 0.2 },
    torch: { color: [1, 0.72, 0.42], strength: 2, range: 8.5, halo: 0.85, haloGain: 0.7, flicker: 0.14 },
    sigil: { color: [0.62, 0.26, 1], strength: 1.3, range: 9, halo: 1.3, haloGain: 0.3, flicker: 0 }, // a lit Elder Sign's glow (Cosmic Purple)
  } satisfies Record<LightKind, LightDef>,
};

/** The Elder Signs' shrines (playtest round 7, render/signViews.ts). */
export const SIGIL = {
  wake: 1.2, // seconds a sign found takes to come to its glow
  breatheHz: 0.3, // its glow breathes this often
  turn: 0.06, // radians a second its ring of runes turns
  motes: 5, // motes rising a second about a lit sign...
  moteReach: 40, // ...within this many metres of the eye
  flare: 1.8, // seconds a flare (a sign found; resting, softer) takes to die away
  wave: [1.5, 8] as const, // its ring of light: seconds to run out, and how far (metres)
  burst: 40, // motes a sign found throws up (resting, half as many)
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
  mend: 8, // seconds after a shot in which lingering hurts (pools, the void) do no harm (playtest round 7)
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

/** How creatures sense and hunt (playtest round 8, systems/perception.ts, brain.ts, tactics.ts). Metres and seconds. */
export const AI = {
  sure: 12, // what a creature sees in its sight cone this close it knows at once...
  notice: 1.1, // ...beyond, a glimpse takes this long to be sure of (longer the farther, at the edge of its sight about twice)
  side: 6, // beside or behind it, it glimpses only what is this close, slowly
  forget: 6, // an unconfirmed stir fades over this long
  noise: { walk: 5, sprint: 14, roll: 10, blow: 12, shot: 34 }, // how far the investigator's sounds carry...
  muffle: 0.5, // ...a wall between halving them
  call: 16, // a creature that takes up the hunt rouses its kind this far off (those within half come at once)
  track: 1.6, // hunting, it keeps its quarry in sight this far beyond its sight's reach (× its `aggro`)
  lose: 1.5, // out of sight and hearing this long, a hunter goes to look where it last knew its quarry...
  search: 7, // ...and looks about there this long before it goes home
  stalk: 0.55, // share of its pace a stirred creature closes in at
  wander: 2.5, // an idle creature strays this far from its post as it looks about...
  lookEvery: [3, 7] as const, // ...every so often
  tokens: 2, // hunters closing in to strike the investigator at once; the rest keep off, circling, waiting their turn
  wait: 4.5, // how far the waiting ones keep (at least this far beyond their reach)
  space: 1.1, // hunters keep this far apart (beyond their bodies)
  punish: 0.5, // a hunter strikes into an opening (a swallow, a blow's recovery, a stagger) once this share of its cooldown has passed
  fallBack: 0.6, // seconds a skirmisher falls back after its blow
  stuck: 0.5, // pushing this long without getting anywhere...
  detour: 0.7, // ...it steps aside this long to get round what blocks it
};
