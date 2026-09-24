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
  fogColor: [0.03, 0.03, 0.037] as Vec3,
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
};

export const LIGHT = {
  dir: [-0.45, 0.8, 0.4] as Vec3, // toward the moon (normalised at use)
  color: [0.7, 0.68, 0.63] as Vec3,
  ambient: [0.19, 0.19, 0.21] as Vec3,
  glowRange: 14, // metres lit by the anomaly
  glowIntensity: 1.3,
  echoGlowRange: 6, // a dropped Echo's faint light
  echoGlowIntensity: 0.6,
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
};
