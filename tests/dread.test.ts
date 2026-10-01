import { describe, expect, it } from 'vitest';
import { callEvery, callOf, callReach, hushOf, hushReach } from '../src/render/audio/dread';

describe('dread by sound (round 26)', () => {
  it('the ground goes quiet toward a horror\'s ring, wholly at it and not at all past the reach', () => {
    const reach = hushReach(40);
    expect(hushOf(0, reach)).toBe(1);
    expect(hushOf(reach, reach)).toBe(0);
    expect(hushOf(reach / 2, reach)).toBeCloseTo(0.5);
    expect(hushOf(-10, reach)).toBe(1); // inside it
    expect(hushReach(40)).toBeGreaterThan(hushReach(10)); // a colossus quiets the ground further off
  });

  it('it is heard from far, the vast from farther, sooner the nearer', () => {
    expect(callReach(40)).toBeGreaterThan(callReach(14));
    const reach = callReach(40);
    expect(callEvery(0, reach)).toBeLessThan(callEvery(reach, reach));
    expect(callEvery(0, reach)).toBeGreaterThanOrEqual(30);
  });

  it('what calls is by its size', () => {
    expect(callOf(40).set).toBe('whale');
    expect(callOf(16).set).toBe('bellow');
    expect(callOf(9).set).toBe('roar');
    expect(callOf(40).pitch).toBeLessThan(callOf(9).pitch + 0.1);
  });
});
