/**
 * Every tunable number lives here (spec §1).
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
  capDefault: 1, // accessibility cap on stress, 0..1 (settings menu is Phase 6)
  pixelCrush: [0, 1] as Ramp, // extra low-res pixel size
  snapPixels: [1, 4] as Ramp, // PS1 vertex snap grid, in low-res pixels
  affine: [1, 2.5] as Ramp, // 1 = PS1 affine mapping; >1 exaggerates the wobble
  fogNear: [4, 2] as Ramp, // metres
  fogFar: [80, 42] as Ramp,
  fogColor: [0.03, 0.04, 0.037] as Vec3, // cold grey-green, near black
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
  fovBreatheDeg: [0, 7] as Ramp,
  breatheHz: 0.23,
  skew: [0, 0.07] as Ramp, // horizontal shear per unit of screen height
  skewHz: 0.11,
  anomalyNear: 4, // metres: anomalyProximity is 1 at this distance...
  anomalyFar: 30, // ...and 0 beyond this one
  pulseSeconds: 0.8, // a band change for the worse sends a pulse of warp that fades over this long...
  pulseRipple: 0.012, // ...adding this much ripple...
  pulseChroma: 0.01, // ...and chromatic split at its peak
  droneGain: [0, 0.06] as Ramp, // the sanity drone's level (audio)
  detune: [0, -70] as Ramp, // cents the whole mix sags
  wobble: [0, 40] as Ramp, // cents it drifts around that
  distortion: [0, 0.85] as Ramp, // waveshaper amount, 0..1
};

/** The sanity drone the FX controller detunes and distorts: a low chord through a lowpass. */
export const AUDIO = {
  droneHz: 55,
  voices: [1, 1.5, 2.02], // frequency ratios
  cutoff: 420, // Hz
  glide: 0.25, // seconds for level changes
};

export const LIGHT = {
  dir: [-0.45, 0.8, 0.4] as Vec3, // toward the moon (normalised at use); the ?look test's light
  color: [0.7, 0.68, 0.63] as Vec3,
  ambient: [0.19, 0.19, 0.21] as Vec3,
  nightAmbient: [0.018, 0.024, 0.022] as Vec3, // the arena at night: a faint cold ambient...
  nightMoon: [0.2, 0.24, 0.26] as Vec3, // ...a very dim cold moon, so architecture beyond the lantern reads as faint shapes...
  nightMoonDir: [-0.7, 0.35, 0.45] as Vec3, // ...low in the sky, so it finds walls and pillars more than the floor
  glowRange: 14, // metres lit by the anomaly
  glowIntensity: 1.3,
  echoGlowRange: 6, // a dropped Echo's faint light
  echoGlowIntensity: 0.6,
  character: 0.65, // share of the lantern (and, for sprites, the moon) characters take, without N·L: their values hold as they turn
};

/** The investigator's lantern: a warm point light at the hip, the arena's only real light. */
export const LANTERN = {
  color: [1, 0.82, 0.58] as Vec3,
  intensity: 1.5,
  range: 6, // metres; nothing beyond is lit
  hard: 0.75, // the edge band starts at this fraction of the range and ends at the range (ordered-dithered)
  ragged: 0.12, // the edge band's distance wanders by up to this fraction around the lantern
  decay: 0.05, // inverse-square falloff inside the range, per m², so the pool is brightest at the player
  facing: 0.5, // weight of N·L: surfaces turned away keep 1 - facing of the light
  height: 0.9, // metres above the player's feet: it hangs at the belt...
  forward: 0.25, // ...ahead of the player...
  side: 0.3, // ...and to their left, so the pool is brightest on that side
};

/** Post colour grade (spec §2): split toning by luma, and the characters' rim light. */
export const GRADE = {
  split: [0.03, 0.2] as const, // luma: cold grey-green shadows and fog at the first, warm bone/sepia lights from the second
  rim: 0.4, // strength of the player's 1-px rim...
  rimCreature: 0.6, // ...and every other character's, stronger so a creature never merges with the dark player...
  rimBackdrop: [0.03, 0.15] as const, // ...where the neighbour (backdrop or the other kind) is at most this much brighter (luma)
  rimFade: [9, 15] as const, // metres from the camera over which the rim fades out: far creatures are silhouettes and eyes
};

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
};

export const STAMINA = {
  regen: 40, // per second
  regenDelay: 36, // frames of no regen after any spending
  guardRegen: 0.35, // regen multiplier while guarding
  sprintDrain: 18, // per second
};

export const COMBAT = {
  bufferMs: 150, // input buffer window: one queued action
  comboGrace: 8, // frames after an attack ends in which the next press still continues its chain
  guardArcDeg: 120, // block and parry only stop hits from inside this frontal arc
  riposte: 2.5, // damage multiplier on the next hit against a parried or interrupted foe
  poiseReset: 120, // frames without poise damage before poise refills
  dummyReset: 180, // frames without damage before the immortal training dummy heals
  muzzleHeight: 1.35,
  shotRadius: 0.2, // revolver bullet radius for the hit test
};

/** Sanity & Insight (spec §3A). Band arrays run Lucid, Uneasy, Fractured, Unmoored. */
export const SANITY = {
  max: 100,
  bands: [70, 40, 15], // floors of Lucid, Uneasy, Fractured; below the last is Unmoored
  hysteresis: 3, // a band falls at its floor but climbs back only this many points past it
  auraNear: 3, // metres beyond a creature's body where its aura is at full strength...
  auraFar: 12, // ...fading to nothing here
  sightRange: 30, // metres: first sight needs a creature this close, in line of sight...
  sightCone: 50, // ...and within this many degrees of the camera's forward
  firstSight: { lesser: 0, greater: 6, named: 10, great_old_one: 18, outer_god: 25, ally: 0 }, // sanity lost on first sight, by tier
  dealt: [1, 1.1, 1.2, 1.35], // damage multipliers by band: a failing mind hits harder...
  taken: [1, 1.1, 1.25, 1.5], // ...and is hit harder
};

/** The investigator's sanity tonic, refilled at the Elder Sign. */
export const LAUDANUM = {
  doses: 3,
  sanity: 30, // restored per dose
};

/** Insight upgrades (spec §3A): insight per level, the most levels, and what each level adds. */
export const UPGRADES: Record<'vigour' | 'endurance' | 'resolve', { cost: number; max: number; hp?: number; stamina?: number; resist?: number }> = {
  vigour: { cost: 1, max: 10, hp: 20 },
  endurance: { cost: 1, max: 10, stamina: 15 },
  resolve: { cost: 2, max: 4, resist: 0.15 }, // every sanity loss shrinks by this fraction per level
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
  lockLift: 0.5, // metres: looks further down on close lock targets, to see them over the player
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
  strideMetres: 1.5, // ground covered per walk cycle
  echoGlowHeight: 0.6, // light above an Echo drop
  revealSeconds: 0.5, // hidden-layer geometry flickers this long as it comes and goes
};
