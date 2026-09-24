import { describe, expect, it } from 'vitest';
import { fbm, valueNoise } from '../src/core/noise';
import { createRng } from '../src/core/rng';
import { createHeightfield } from '../src/world/heightfield';

describe('rng', () => {
  it('is deterministic per seed and stays in [0, 1)', () => {
    const a = createRng(42);
    const b = createRng(42);
    for (let i = 0; i < 1000; i++) {
      const x = a();
      expect(x).toBe(b());
      expect(x).toBeGreaterThanOrEqual(0);
      expect(x).toBeLessThan(1);
    }
  });

  it('differs between seeds', () => {
    expect(createRng(1)()).not.toBe(createRng(2)());
  });
});

describe('noise', () => {
  it('tiles when given a period', () => {
    for (const [x, y] of [[0.3, 0.7], [2.5, 3.9], [1.1, 0.05]]) {
      expect(valueNoise(x + 4, y, 9, 4)).toBeCloseTo(valueNoise(x, y, 9, 4), 9);
      expect(valueNoise(x, y + 4, 9, 4)).toBeCloseTo(valueNoise(x, y, 9, 4), 9);
      expect(fbm(x + 4, y + 4, 9, 3, 4)).toBeCloseTo(fbm(x, y, 9, 3, 4), 9);
    }
  });

  it('stays in [0, 1)', () => {
    const rng = createRng(7);
    for (let i = 0; i < 500; i++) {
      const v = fbm(rng() * 100 - 50, rng() * 100 - 50, 3, 4);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });
});

describe('heightfield', () => {
  it('is deterministic and bounded by its amplitude', () => {
    const params = { seed: 5, amplitude: 4, frequency: 0.05, octaves: 4 };
    const a = createHeightfield(params);
    const b = createHeightfield(params);
    for (let x = -100; x <= 100; x += 7.3) {
      expect(a(x, x * 0.5)).toBe(b(x, x * 0.5));
      expect(Math.abs(a(x, -x))).toBeLessThanOrEqual(4);
    }
  });
});
