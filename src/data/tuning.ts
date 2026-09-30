/**
 * Every tunable number lives here (spec §1); the boss numbers sit in bossTuning.ts, re-exported below.
 * Sanity-driven FX values are [calm, mad] ramps: the value at sanity 100 and at sanity 0,
 * blended by stress = min(1 - sanity/100, fx cap).
 */

export type Ramp = readonly [calm: number, mad: number];
export type Vec3 = readonly [number, number, number];

export const SIM = {
  hz: 60,
  maxFrameSeconds: 0.25, // long frames are clamped so the sim never spirals
};

export const RENDER = {
  width: 400, // low-res target, upscaled nearest-neighbour (§2)
  height: 225,
  fovDeg: 60,
  near: 0.1,
  far: 90, // ~80 m view distance; fog hides the cut
};

export const FX = {
  capDefault: 1, // accessibility cap on stress, 0..1 (the settings menu's default)
  snapPixels: 1, // PS1 vertex snap grid, in low-res pixels (madness no longer coarsens it, nor the pixels: playtest round 7)
  affine: [1.25, 10] as Ramp, // texels the PS1 affine mapping may stray from the true one: a shiver when calm, walls swim when mad
  fogNear: [4, 2] as Ramp, // metres
  fogFar: [80, 42] as Ramp,
  fogColor: [0.058, 0.07, 0.068] as Vec3, // cold grey-green, near black, but a shade above the unlit sides of things, so they stand out against it as shapes
  desaturate: [0.85, 1] as Ramp, // toward bone/sepia
  anomalyStress: [0, 0.7] as Ramp, // added to anomalyProximity when boosting anomaly hues
  hueWidth: 0.1, // anomaly hue window, in 0..1 hue units
  minSaturation: 0.3, // below this a pixel never counts as an anomaly hue
  ditherSpread: [0.05, 0.12] as Ramp,
  ripple: [0, 0.012] as Ramp, // UV units
  chroma: [0, 0.009] as Ramp, // UV units
  displace: [0, 1] as Ramp,
  displaceAmp: 0.6, // metres
  displaceFreq: 0.35,
  displaceSafe: 7, // metres from the camera with no displacement (keeps combat readable)
  displaceFull: 32, // metres from the camera where displacement is at full strength
  displaceTwist: 0.2, // radians of space-twist around the viewer at full strength
  warpCap: 0.5, // the stress past which the picture warps only warpSlope as fast: ripple, split, swimming walls, breathing lens and shear (round 22: they had grown all the way to madness, and the screen tore; round 23: capped too hard at 0.4 of it, so a little more)
  warpSlope: 0.3, // ...so at sanity 0 it warps 0.65 of what it did before round 22, and at the edge of Unmoored 0.6 (round 22 left it at 0.4)
  dreadFrom: 0.25, // what a failing mind does besides begins at this stress and grows to madness: the edges of sight lose their focus...
  blur: [0, 1.1] as Ramp, // ...by up to this many low-res pixels...
  strange: [0, 1] as Ramp, // ...and the stars crawl, crowd and flicker (render/shaders/sky.ts)
  fovBreatheDeg: [0, 7] as Ramp,
  breatheHz: 0.23,
  skew: [0, 0.07] as Ramp, // horizontal shear per unit of screen height
  skewHz: 0.11,
  anomalyNear: 4, // metres: anomalyProximity is 1 at this distance...
  anomalyFar: 30, // ...and 0 beyond this one
  pulseSeconds: 0.8, // a band change for the worse sends a pulse of warp that fades over this long...
  pulseRipple: 0.012, // ...adding this much ripple...
  pulseChroma: 0.01, // ...and chromatic split at its peak
  detune: [0, -70] as Ramp, // cents the whole mix sags
  wobble: [0, 40] as Ramp, // cents it drifts around that
  distortion: [0, 0.85] as Ramp, // saturation amount, 0..1: loud sounds grow gritty and squashed, quiet ones stay as they are (engine.ts)
};

export const LIGHT = {
  dir: [-0.45, 0.8, 0.4] as Vec3, // toward the moon (normalised at use); the ?look test's light
  color: [0.7, 0.68, 0.63] as Vec3,
  ambient: [0.19, 0.19, 0.21] as Vec3,
  nightAmbient: [0.034, 0.041, 0.04] as Vec3, // night: a faint cold ambient...
  nightMoon: [0.38, 0.43, 0.47] as Vec3, // ...a dim cold moon, so houses, trees and stones beyond the lantern read as shapes...
  nightMoonDir: [-0.7, 0.35, 0.45] as Vec3, // ...low in the sky, so it finds walls and pillars more than the floor
  glowRange: 14, // metres lit by the anomaly
  glowIntensity: 1.3,
  echoGlowRange: 6, // a dropped Echo's faint light
  echoGlowIntensity: 0.6,
  character: 0.65, // share of the lantern (and, for sprites, the moon) characters take, without N·L: their values hold as they turn
  eyes: [12, 22] as const, // metres over which self-lit eyes and markings sink into the dark: seen when near enough, not from afar (playtest round 8: they were gone by 13)
  eyeGlow: { gain: 0.34, radius: 0.07 }, // the faint glow about them (playtest round 8), out to the same reach
};

/** The investigator's lantern: a warm point light at the hip, the night's only real light. */
export const LANTERN = {
  color: [1, 0.82, 0.58] as Vec3,
  intensity: 1.5,
  range: 11, // metres: the light fades smoothly to nothing here (no hard edge)
  decay: 0.12, // inverse-square falloff, per m², so the pool is brightest at the player
  facing: 0.5, // weight of N·L: surfaces turned away keep 1 - facing of the light
  self: 0.45, // the investigator's share of it (of a character's): it hangs at their hip, well below the face...
  selfMax: 1, // ...and nothing lights them past this (their lit colour's brightest channel), so the flame they carry always outshines them (playtest round 5)
  height: 0.9, // metres above the player's feet: it hangs at the belt...
  forward: 0.25, // ...ahead of the player...
  side: 0.3, // ...and to their left, so the pool is brightest on that side
};

/** Post colour grade (spec §2): split toning by luma. */
export const GRADE = {
  split: [0.03, 0.2] as const, // luma: cold grey-green shadows and fog at the first, warm bone/sepia lights from the second
};

/** The player character (spec §3B). Speeds in m/s, turn rates in rad/s. */
export const PLAYER = {
  hp: 160,
  poise: 30,
  stamina: 100,
  radius: 0.4, // capsule
  height: 1.8,
  aimHeight: 1.3, // where lock-on and shots aim
  eyeHeight: 1.6, // line-of-sight origin
  walkSpeed: 4.2,
  sprintSpeed: 6.4,
  guardSpeed: 2.2,
  turnRate: 12,
  dodgeTapFrames: 14, // dodge button: released sooner = roll/backstep, held longer = sprint
  pickupRadius: 1.2, // touching an Echo drop recovers it
  staggerRespite: 90, // frames from a stagger in which no blow staggers them again: the stagger's 34, then time to roll away (round 12)
};

export const STAMINA = {
  regen: 24, // per second at the start; each Endurance level adds LEVELS.endurance.regen (round 22: it was 40 for all, and a bar refilled so soon that rolling on and on cost nothing)
  regenDelay: 48, // frames of no regen after any spending: longer than a roll, so a chain of rolls draws on the bar alone
  guardRegen: 0.35, // regen multiplier while guarding
  sprintDrain: 18, // per second
};

export const COMBAT = {
  bufferMs: 250, // input buffer window: one queued action (was 150: a press early in a swing was gone before it could cut in; playtest round 7)
  comboGrace: 8, // frames after an attack ends in which the next press still continues its chain
  evadeAfter: 3, // frames after a blow lands (or a shot leaves) from which a dodge may cut the rest short (before its cancel frame)
  assist: { range: 3.6, arcDeg: 70 }, // without a lock, a blow or a shot turns to the nearest foe this close and this far off its line
  guardArcDeg: 180, // block and parry stop hits from anywhere in front (was 120: blows from the flank went through; playtest round 7)
  riposte: 2.5, // damage multiplier on the next hit against a parried or interrupted foe (and on a backstab)
  backstab: { arcDeg: 100, height: 2.9 }, // a blow from within this rear arc of a foe no taller than this lands as a riposte (round 12)
  poiseReset: 120, // frames without poise damage before poise refills
  dummyReset: 180, // frames without damage before the immortal training dummy heals
  muzzleHeight: 1.35,
  shotRadius: 0.2, // revolver bullet radius for the hit test
  limb: 2.5, // metres: a blow reaching further sweeps all it passes over, from the body out (round 19: a colossus's tentacle swept over one who stood close in)
};

/** Sanity & Insight (spec §3A). Band arrays run Lucid, Uneasy, Fractured, Unmoored. */
export const SANITY = {
  max: 100,
  bands: [70, 40, 15], // floors of Lucid, Uneasy, Fractured; below the last is Unmoored
  hysteresis: 3, // a band falls at its floor but climbs back only this many points past it
  jolt: 1.5, // a loss this large at once is felt: announced as SanityLost, so the bar jolts and it is heard
  auraNear: 3, // metres beyond a creature's body where its aura is at full strength...
  auraFar: 12, // ...fading to nothing here
  auraStack: 0.35, // the strongest aura weighs whole, each of the rest this share (round 17: a pack of rats drained a mind in minutes)
  lesserAura: 0.6, // and the vermin's (the lesser tier's) weigh this much
  sightRange: 30, // metres: first sight needs a creature this close, in line of sight...
  sightCone: 50, // ...and within this many degrees of the camera's forward
  firstSight: { lesser: 0, greater: 6, named: 10, great_old_one: 18, outer_god: 25, ally: 0 }, // sanity lost on first sight, by tier...
  muffled: 0.35, // share of a roar's toll that carries through a wall (round 12: whole, from 12 m)
  together: 240, // ...but of those first seen within this many frames of each other, only the greatest (round 12)
  volley: 75, // frames in which landed blows take the mind once: the greatest of them (a barrage's bolts, a swarm's bites; round 12)
  dealt: [1, 1.1, 1.2, 0.85], // damage multipliers by band: a failing mind hits harder... until it is Unmoored, and can barely lift its arm (round 23: it was 1.35)
  taken: [1, 1.1, 1.25, 1.35], // ...and is hit harder (round 23: Unmoored took 1.5, and now suffers more besides, so a little less of it here)
  // What being Unmoored does to the body besides (round 23; kept modest, the game is hard enough):
  unmoored: {
    stamina: 0.65, // stamina comes back at this share of its pace...
    bleed: 0.0025, // ...and the body wears away by this share of full health a second (never to death; a shot of Reagent holds it off, as it does a pool's tick)
  },
  // The mind mends by itself while it is not in a fight (round 22): a real blow struck or taken, or a foe hunting them, holds it off; swinging at the air does not. Sanity regained a second in the dark, and standing at a lamp, fire or torch (not the Elder Signs' glow, an Echo's or the lantern's own).
  mend: {
    rate: 0.25, // in the dark: a full mind in under seven minutes
    lit: 1.6, // in the light of a lamp: a dose of Laudanum's worth in twenty seconds
    delay: 6, // seconds after the last real blow before it begins
    foes: 45, // metres: a hunting foe this close is a fight (aggro)
    reach: 0.6, // the share of a light's range (LIGHTS.kinds) its mending reaches; it falls off as 1 − distance/reach, to this power
    curve: 1.3,
    light: { lamp: 1, fire: 1, torch: 0.85, window: 0.4, sigil: 0 } as Readonly<Record<'lamp' | 'window' | 'fire' | 'torch' | 'sigil', number>>, // how much of the mending each kind of light gives at its foot: the Elder Signs' violet light none
  },
};

/** The investigator's sanity tonic, refilled at the Elder Sign. */
export const LAUDANUM = {
  doses: 3,
  sanity: 30, // restored per dose
  steady: 10, // seconds after a swallow in which auras, roars, gazes and the void take no sanity (playtest round 7)
};

/** Insight upgrades (spec §3A): insight per level, the most levels, and what each level adds. The body's strength is bought with Echoes (LEVELS). */
export const UPGRADES: Record<'resolve' | 'draught', { cost: number; max: number; resist?: number; doses?: number }> = {
  resolve: { cost: 2, max: 4, resist: 0.15 }, // every sanity loss shrinks by this fraction per level
  draught: { cost: 3, max: 2, doses: 1 }, // one more dose of Laudanum carried per level
};
export type UpgradeId = keyof typeof UPGRADES;

/** Hallucinations (spec §3A, Unmoored only). Times in frames. */
export const HALLUCINATIONS = {
  max: 3, // at once
  onset: 120, // after sanity becomes Unmoored, before the first
  interval: [240, 480] as const, // between apparitions
  distance: [6, 9] as const, // metres from the player...
  spread: 120, // ...within this many degrees of straight behind the camera
  life: 1800, // before one fades by itself
  sanity: 5, // sanity lost per landed blow (they deal no damage)
};

export const LOCK = {
  range: 25, // metres, with line of sight
  breakRange: 27, // a held lock breaks beyond this (2 m hysteresis)
  angleWeight: 12, // score = distance + angleWeight × |angle from camera forward| (metres per radian)
  graceFrames: 30, // frames out of sight before the lock breaks
};

/** Third-person camera: orbits a pivot above the player and pulls in on collision. */
export const CAMERA = {
  pivotHeight: 1.55,
  distance: 4.2,
  minDistance: 0.5,
  shoulder: 0.45, // metres the boom hangs to the right of the player, so a lock target is not hidden behind them
  margin: 0.3, // keeps the lens this far off walls
  clearance: 0.25, // metres above the ground
  pitch: 0.25, // rad, positive looks down
  pitchMin: -0.35,
  pitchMax: 1.05,
  easeOut: 4, // m/s the boom grows back after a pull-in
  follow: 7, // 1/s: how fast the camera swings toward the lock target (or recentres)
  lockPitch: 0.15,
  talkTurn: 0.5, // radians the camera turns left of the one talking, so they stand clear of the investigator, on the right (round 12)
  lockLift: 0.5, // metres: looks further down on close lock targets, to see them over the player...
  lockPitchMax: 0.8, // ...but never more steeply than this: a short foe close in is seen through the dithered investigator instead (round 12)
  recenterFrames: 20, // lock pressed with no target: swing behind the player
};

export const INPUT = {
  deadzone: 0.2, // gamepad sticks
  mouseSensitivity: 0.0025, // rad per pixel
  stickLookSpeed: 3.2, // rad/s at full deflection
  keyLookSpeed: 2.4, // rad/s (arrow keys)
  flickPixels: 60, // mouse flick that switches lock target
  flickDecay: 0.8, // per step
  flickCooldown: 12, // steps between flick switches
  stickFlick: 0.7, // right-stick flick threshold...
  stickRearm: 0.35, // ...and the level it must return under before the next flick
};

/** Hit feedback and figure animation in the renderer. */
export const FEEDBACK = {
  flashSeconds: 0.12, // a struck figure flashes...
  flashLevel: 0.7, // ...this much toward full-bright
  flinchSeconds: 0.25,
  tracerSeconds: 0.07, // revolver tracer
  shakeMetres: 0.07, // jitter during hitstop
  strideEase: 14, // per second: how quickly a figure's stride takes up its ground speed (render/gait.ts)
  echoGlowHeight: 0.6, // light above an Echo drop
  revealSeconds: 0.5, // hidden-layer geometry flickers this long as it comes and goes
};

/** The open world (spec §3D). Distances in metres. */
export const WORLD = {
  seed: 1926,
  chunk: 64, // streaming grid
  regionChunks: 8, // a region tile is 8 × 8 chunks (512 m)
  load: 2, // chunks within this Chebyshev radius of the player's are loaded (5 × 5)...
  keep: 3, // ...and unloaded beyond this one (7 × 7)
  sliceMs: 2, // chunk generation budget per rendered frame
  maxActive: 60, // creatures alive at once (the AI budget)
  snap: 4, // dungeon cells and origins align to this grid...
  meshCell: 1, // ...and so does the terrain mesh, whose vertices keep the lantern's vertex-lit pool round
  blend: 32, // neighbouring regions' terrain blends across this band
  seaLevel: -2,
  seaFloor: -9,
  coast: 24, // beyond the land's edge the ground sinks to the sea floor over this distance
  discover: 6, // an Elder Sign is found this close
  reach: 3.2, // pass a gate or talk with someone this close
  signReach: 5.2, // rest at an Elder Sign this close: the point they rise at (4.75 m out) is within it (playtest round 12)
  faceWeight: 2, // E takes what the investigator faces: a thing straight behind them seems (1 + this) times as far
  gateArrive: 5.5, // those coming through a gate stand this far out from it: the camera behind them clears it, and its E is out of reach
  restFoes: 18, // no resting while a foe hunts the investigator within this distance
  saveSeconds: 20, // autosave interval (also on rest, travel, death and leaving the page)
};

/** The legacy-dungeon kit (spec §3D): corridor, hall, stair, pit, bridge, well. */
export const DUNGEON = {
  cell: 16, // metres per room cell (a wide hall is 3 × 3 cells)
  wall: 1, // thickness
  height: 6, // walls rise this far above the higher floor
  door: 3.2, // doorway width...
  lintel: 3.4, // ...and height
  lane: 4, // walkable width of corridors
  stairLane: 6,
  ledge: 3.5, // walkable rim around a pit or at the ends of a bridge
  deck: 2.4, // bridge width
  well: 2.4, // shaft radius
  chasm: 12, // depth of pits, chasms and wells
  rim: 0.45, // chasm edges stop feet but not eyes
};

export * from './bossTuning';
export * from './fxTuning';
export * from './playTuning';
