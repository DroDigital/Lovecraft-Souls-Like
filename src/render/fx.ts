/**
 * Pure FX model (no Three.js): sanity, accessibility cap and debug toggles in,
 * per-effect parameters out. Every effect intensifies as sanity falls (spec §2, Phase 0), and so
 * does the audio's detune and distortion (the FX controller's audio half, spec §3A), but for the
 * low resolution and its vertex snap, which hold (playtest round 7: madness warps, it does not
 * coarsen the pixels). Round 22: the warping stops growing at FX.warpCap of the stress (the picture
 * stayed torn all the way to madness); what a failing mind does past it is dread's: the edges of sight
 * darken and blur, pale eyes open in the dark there, and the stars go wrong.
 */

import { FX, RENDER, type Ramp } from '../data/tuning';

export const EFFECTS = [
  'pixelate',
  'snap',
  'affine',
  'fog',
  'isolate',
  'quantize',
  'warp',
  'displace',
  'lens',
  'dread',
] as const;
export type EffectId = (typeof EFFECTS)[number];

export interface FxState {
  sanity: number; // 0..100
  cap: number; // 0..1, caps stress for accessibility
  anomalyProximity: number; // 0..1
  enabled: Record<EffectId, boolean>;
  pulse?: number; // 0..1: a band change for the worse, fading (fxController.ts)
}

export interface FxParams {
  stress: number;
  lowRes: boolean;
  snapPixels: number;
  affine: number;
  fogNear: number;
  fogFar: number;
  fogAmount: number;
  isolate: boolean;
  desaturate: number;
  anomalyProximity: number;
  anomalyStress: number;
  quantize: boolean;
  ditherSpread: number;
  ripple: number;
  chroma: number;
  displace: number;
  tunnel: number; // 0..1: how far the edges of sight close in and dim
  blur: number; // low-res pixels the edges blur by
  watch: number; // 0..1: how many pale eyes open at the edge of sight
  strange: number; // 0..1: how wrong the stars are
  fovBreatheDeg: number;
  skew: number;
  detune: number; // cents
  wobble: number; // cents of drift around the detune
  distortion: number; // 0..1
}

/** The FxParams fields each effect drives (the sanity slider moves all but the STEADY ones'). */
export const EFFECT_PARAMS: Record<EffectId, readonly (keyof FxParams)[]> = {
  pixelate: ['lowRes'],
  snap: ['snapPixels'],
  affine: ['affine'],
  fog: ['fogNear', 'fogFar'],
  isolate: ['desaturate', 'anomalyStress'],
  quantize: ['ditherSpread'],
  warp: ['ripple', 'chroma'],
  displace: ['displace'],
  lens: ['fovBreatheDeg', 'skew'],
  dread: ['tunnel', 'blur', 'watch', 'strange'],
};

/** The effects that hold at every sanity. */
export const STEADY: readonly EffectId[] = ['pixelate', 'snap'];

const clamp01 = (x: number): number => Math.min(1, Math.max(0, x));
const at = (r: Ramp, t: number): number => r[0] + (r[1] - r[0]) * t;
const smooth = (a: number, b: number, x: number): number => {
  const k = clamp01((x - a) / (b - a));
  return k * k * (3 - 2 * k);
};

export function allEffectsOn(): Record<EffectId, boolean> {
  return Object.fromEntries(EFFECTS.map((id) => [id, true])) as Record<EffectId, boolean>;
}

/** 0 when lucid, 1 at sanity 0; never above the accessibility cap. */
export function sanityStress(sanity: number, cap: number): number {
  return Math.min(clamp01(1 - sanity / 100), clamp01(cap));
}

export function computeFx(s: FxState): FxParams {
  const t = sanityStress(s.sanity, s.cap);
  const w = Math.min(t, FX.warpCap); // the picture warps no further past this
  const on = s.enabled;
  const pulse = clamp01(s.pulse ?? 0) * clamp01(s.cap);
  return {
    stress: t,
    lowRes: on.pixelate,
    snapPixels: on.snap ? FX.snapPixels : 0,
    affine: on.affine ? at(FX.affine, w) : 0,
    fogNear: at(FX.fogNear, t),
    fogFar: at(FX.fogFar, t),
    fogAmount: on.fog ? 1 : 0,
    isolate: on.isolate,
    desaturate: at(FX.desaturate, t),
    anomalyProximity: clamp01(s.anomalyProximity),
    anomalyStress: at(FX.anomalyStress, t),
    quantize: on.quantize,
    ditherSpread: at(FX.ditherSpread, t),
    ripple: on.warp ? at(FX.ripple, w) + FX.pulseRipple * pulse : 0,
    chroma: on.warp ? at(FX.chroma, w) + FX.pulseChroma * pulse : 0,
    displace: on.displace ? at(FX.displace, w) : 0,
    tunnel: on.dread ? at(FX.tunnel, smooth(FX.tunnelFrom, 1, t)) : 0,
    blur: on.dread ? at(FX.blur, smooth(FX.tunnelFrom, 1, t)) : 0,
    watch: on.dread ? clamp01((t - FX.watchFrom) / (1 - FX.watchFrom)) : 0,
    strange: on.dread ? at(FX.strange, smooth(FX.tunnelFrom, 1, t)) : 0,
    fovBreatheDeg: on.lens ? at(FX.fovBreatheDeg, w) : 0,
    skew: on.lens ? at(FX.skew, w) : 0,
    detune: at(FX.detune, t),
    wobble: at(FX.wobble, t),
    distortion: at(FX.distortion, t),
  };
}

/** Camera FOV "breathing" and projection skew at a moment in time. */
export function lensAt(fx: FxParams, time: number): { fovDeg: number; skew: number } {
  return {
    fovDeg: RENDER.fovDeg + fx.fovBreatheDeg * Math.sin(time * Math.PI * 2 * FX.breatheHz),
    skew: fx.skew * Math.sin(time * Math.PI * 2 * FX.skewHz),
  };
}

/** 1 when within FX.anomalyNear metres of an anomaly, fading to 0 at FX.anomalyFar. */
export function anomalyProximity(distance: number): number {
  return clamp01(1 - (distance - FX.anomalyNear) / (FX.anomalyFar - FX.anomalyNear));
}
