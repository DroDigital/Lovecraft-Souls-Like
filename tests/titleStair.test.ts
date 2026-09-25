import { describe, expect, it } from 'vitest';
import { slopeAt, STAIR, titleStair, treadAt } from '../src/world/titleStair';

describe("the title's stair (world/titleStair.ts)", () => {
  it('repeats every eight steps, so the walk down it loops without a seam', () => {
    const loop = STAIR.period * STAIR.run;
    const drop = STAIR.period * STAIR.rise;
    for (let z = -1; z > -1 - loop; z -= 0.13) {
      expect(treadAt(z - loop)).toBeCloseTo(treadAt(z) - drop);
      expect(slopeAt(z - loop)).toBeCloseTo(slopeAt(z) - drop);
    }
  });

  it("keeps a walker's hips within a step of the treads under their feet", () => {
    for (let z = -0.5; z > -20; z -= 0.07) expect(Math.abs(treadAt(z) - slopeAt(z))).toBeLessThanOrEqual(STAIR.rise / 2 + 1e-9);
  });

  it('builds treads, walls, pilasters and sconce flames', () => {
    expect(titleStair().children).toHaveLength(4);
  });
});
