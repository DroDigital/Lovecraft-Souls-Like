import { describe, expect, it } from 'vitest';
import { falseStar, madness, slip } from '../src/ui/mapWrong';

describe('a failing mind draws the map wrong (round 26)', () => {
  it('not at all while the mind holds, wholly at none', () => {
    expect(madness(100)).toBe(0);
    expect(madness(40)).toBe(0);
    expect(madness(0)).toBe(1);
    expect(slip('arkham', 80, 3)).toEqual({ dx: 0, dy: 0 });
    expect(falseStar(80, 3, 60)).toBeNull();
  });

  it('marks slide by the slide they are in, a different way for each mark and each slide, and never far', () => {
    const a = slip('sign:a', 10, 4);
    expect(slip('sign:a', 10, 4)).toEqual(a);
    expect(slip('sign:a', 10, 5)).not.toEqual(a);
    expect(slip('sign:b', 10, 4)).not.toEqual(a);
    for (let b = 0; b < 40; b++) {
      const s = slip('x', 0, b);
      expect(Math.hypot(s.dx, s.dy)).toBeLessThanOrEqual(7 * Math.SQRT2 + 1e-9);
    }
    expect(Math.hypot(slip('x', 30, 1).dx, slip('x', 30, 1).dy)).toBeLessThan(Math.hypot(slip('x', 0, 1).dx, slip('x', 0, 1).dy) + 8);
  });

  it('a star where there is none comes within the map\'s reach, from a third of madness on', () => {
    for (let b = 0; b < 30; b++) {
      const s = falseStar(10, b, 60)!;
      expect(Math.hypot(s.dx, s.dy)).toBeLessThanOrEqual(60 * 0.9 + 1e-9);
    }
  });
});
