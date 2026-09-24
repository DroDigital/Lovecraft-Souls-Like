import { describe, expect, it } from 'vitest';
import { RENDER } from '../src/data/tuning';
import {
  allEffectsOn,
  anomalyProximity,
  computeFx,
  EFFECT_PARAMS,
  EFFECTS,
  lensAt,
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
  it.each(EFFECTS)('%s responds to the sanity slider', (id) => {
    const calm = computeFx(state(100));
    const mad = computeFx(state(0));
    expect(EFFECT_PARAMS[id].some((key) => calm[key] !== mad[key])).toBe(true);
  });

  it('turns every effect off with its toggle', () => {
    const s = state(0);
    for (const id of EFFECTS) s.enabled[id] = false;
    const fx = computeFx(s);
    expect(fx).toMatchObject({
      lowRes: false,
      pixelCrush: 0,
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
