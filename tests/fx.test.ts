import { describe, expect, it } from 'vitest';
import { FX, RENDER } from '../src/data/tuning';
import {
  allEffectsOn,
  anomalyProximity,
  computeFx,
  EFFECT_PARAMS,
  EFFECTS,
  lensAt,
  STEADY,
  sanityStress,
  type FxState,
} from '../src/render/fx';

const state = (sanity: number, cap = 1): FxState => ({ sanity, cap, anomalyProximity: 0, enabled: allEffectsOn() });

describe('sanity stress', () => {
  it('maps sanity 100..0 to stress 0..1', () => {
    expect(sanityStress(100, 1)).toBe(0);
    expect(sanityStress(50, 1)).toBe(0.5);
    expect(sanityStress(0, 1)).toBe(1);
    expect(sanityStress(-20, 1)).toBe(1);
  });

  it('never exceeds the accessibility cap', () => {
    expect(sanityStress(0, 0.3)).toBe(0.3);
    expect(computeFx(state(0, 0))).toEqual(computeFx(state(100, 1)));
  });
});

describe('computeFx', () => {
  it.each(EFFECTS.filter((id) => !STEADY.includes(id)))('%s responds to the sanity slider', (id) => {
    const calm = computeFx(state(100));
    const mad = computeFx(state(0));
    expect(EFFECT_PARAMS[id].some((key) => calm[key] !== mad[key])).toBe(true);
  });

  it('madness warps the picture but never coarsens its pixels (playtest round 7)', () => {
    for (const id of STEADY) expect(EFFECT_PARAMS[id].every((key) => computeFx(state(100))[key] === computeFx(state(0))[key])).toBe(true);
    expect(computeFx(state(0)).ripple).toBeGreaterThan(0);
  });

  it('turns every effect off with its toggle', () => {
    const s = state(0);
    for (const id of EFFECTS) s.enabled[id] = false;
    const fx = computeFx(s);
    expect(fx).toMatchObject({
      lowRes: false,
      snapPixels: 0,
      affine: 0,
      fogAmount: 0,
      isolate: false,
      quantize: false,
      ripple: 0,
      chroma: 0,
      displace: 0,
      fovBreatheDeg: 0,
      skew: 0,
      tunnel: 0,
      blur: 0,
      watch: 0,
      strange: 0,
    });
  });

  it('keeps the lens still while lucid', () => {
    const fx = computeFx(state(100));
    for (const t of [0, 1.3, 7.9]) {
      const lens = lensAt(fx, t);
      expect(lens.fovDeg).toBe(RENDER.fovDeg);
      expect(Math.abs(lens.skew)).toBe(0);
    }
  });
});

describe('anomalyProximity', () => {
  it('is 1 up close and 0 far away', () => {
    expect(anomalyProximity(0)).toBe(1);
    expect(anomalyProximity(1000)).toBe(0);
    const mid = anomalyProximity(15);
    expect(mid).toBeGreaterThan(0);
    expect(mid).toBeLessThan(1);
  });
});

describe('band pulse and audio', () => {
  it('adds the pulse to the warp, within the accessibility cap', () => {
    expect(computeFx({ ...state(100), pulse: 1 }).ripple).toBeCloseTo(FX.pulseRipple);
    expect(computeFx({ ...state(100), pulse: 1 }).chroma).toBeCloseTo(FX.pulseChroma);
    expect(computeFx({ ...state(100, 0.5), pulse: 1 }).ripple).toBeCloseTo(FX.pulseRipple / 2);
    expect(computeFx({ ...state(100, 0), pulse: 1 }).ripple).toBe(0);
  });

  it('detunes and distorts the audio as sanity falls, and leaves it be while lucid', () => {
    const calm = computeFx(state(100));
    expect([calm.detune, calm.wobble, calm.distortion]).toEqual([0, 0, 0]);
    const mad = computeFx(state(0));
    expect([mad.detune, mad.wobble, mad.distortion]).toEqual([FX.detune[1], FX.wobble[1], FX.distortion[1]]);
    expect(computeFx(state(0, 0)).distortion).toBe(0);
  });
});

describe('a failing mind warps the picture no further past a point, and dreads instead (round 22)', () => {
  const sanityOf = (stress: number): number => 100 * (1 - stress);

  it('stops the ripple, split, swimming walls, breathing lens and shear at FX.warpCap of the stress', () => {
    const [capped, mad] = [computeFx(state(sanityOf(FX.warpCap))), computeFx(state(0))];
    for (const key of ['ripple', 'chroma', 'displace', 'affine', 'fovBreatheDeg', 'skew'] as const) expect(mad[key], key).toBeCloseTo(capped[key], 9);
    expect(mad.ripple).toBeLessThan(FX.ripple[1] * 0.5); // where it was 0.012, and grew to madness
    expect(mad.fovBreatheDeg).toBeLessThan(FX.fovBreatheDeg[1] * 0.5);
    expect(mad.skew).toBeLessThan(FX.skew[1] * 0.5);
    expect(computeFx(state(sanityOf(0.2))).ripple).toBeLessThan(capped.ripple); // below the cap it still grows
    expect(computeFx(state(sanityOf(0.2))).ripple).toBeGreaterThan(0);
  });

  it('closes the edges of sight in and opens eyes there only as the mind goes, none while it holds', () => {
    const lucid = computeFx(state(100));
    expect([lucid.tunnel, lucid.blur, lucid.watch, lucid.strange]).toEqual([0, 0, 0, 0]);
    expect(computeFx(state(sanityOf(FX.tunnelFrom - 0.01))).tunnel).toBe(0);
    let last = 0;
    for (let sanity = 100; sanity >= 0; sanity -= 5) {
      const fx = computeFx(state(sanity));
      expect(fx.tunnel).toBeGreaterThanOrEqual(last);
      last = fx.tunnel;
    }
    const mad = computeFx(state(0));
    expect(mad.tunnel).toBeCloseTo(FX.tunnel[1], 9);
    expect(mad.blur).toBeCloseTo(FX.blur[1], 9);
    expect(mad.strange).toBeCloseTo(FX.strange[1], 9);
    expect(computeFx(state(sanityOf(FX.watchFrom))).watch).toBe(0); // the eyes open from here
    expect(computeFx(state(sanityOf(FX.watchFrom + 0.1))).watch).toBeGreaterThan(0);
    expect(mad.watch).toBe(1);
    expect(mad.tunnel).toBeLessThan(0.8); // the edges dim; they never close on the middle of the picture
  });

  it('keeps to the accessibility cap and its own toggle', () => {
    expect(computeFx(state(0, 0)).tunnel).toBe(0);
    expect(computeFx(state(0, 0)).watch).toBe(0);
    const s = state(0);
    s.enabled.dread = false;
    expect(computeFx(s)).toMatchObject({ tunnel: 0, blur: 0, watch: 0, strange: 0 });
    expect(computeFx(s).ripple).toBeGreaterThan(0); // the warp is its own toggle
  });
});

