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
