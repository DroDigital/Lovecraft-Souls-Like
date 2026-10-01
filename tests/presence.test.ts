import { describe, expect, it } from 'vitest';
import { arrival } from '../src/data/cutscenes';
import { jolt, presenceOf } from '../src/render/presence';

describe('what a colossus does to the ground (round 26)', () => {
  it('is felt the nearer one stands, to nothing at a height and a half away', () => {
    expect(presenceOf(0, 40)).toBe(1);
    expect(presenceOf(60, 40)).toBe(0);
    expect(presenceOf(30, 40)).toBeCloseTo(0.5);
    expect(presenceOf(-5, 40)).toBe(1); // inside its footprint
  });

  it('a blow\'s jolt shudders and dies away within a second', () => {
    expect(jolt(0.3, -0.1)).toBe(0);
    expect(jolt(0.3, 1.2)).toBe(0);
    const peak = Math.max(...Array.from({ length: 40 }, (_, i) => Math.abs(jolt(0.3, i / 40))));
    expect(peak).toBeGreaterThan(0.2);
    expect(Math.abs(jolt(0.3, 0.9))).toBeLessThan(0.01);
  });

  it('a horror\'s arrival strikes the ground the harder the larger it is, and a colossus is heard calling', () => {
    const sets = (scale: Parameters<typeof arrival>[0]) => arrival(scale, 'X', undefined).beats.filter((b) => b.set).map((b) => b.set);
    expect(sets('person')).toEqual([]);
    expect(sets('giant')).toEqual(['boom']);
    expect(sets('colossal')).toEqual(['boom', 'whale']);
  });
});
