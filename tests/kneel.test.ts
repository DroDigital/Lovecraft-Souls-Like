import { describe, expect, it } from 'vitest';
import { buildFigure, type Figure } from '../src/render/figures';
import { pose, type PoseInput } from '../src/render/poses';

/** Every joint's rotation and the body's height, as posed. */
function joints(f: Figure): number[] {
  const out: number[] = [f.body.position.y];
  f.root.traverse((o) => void (o !== f.root && out.push(o.rotation.x, o.rotation.y, o.rotation.z)));
  return out;
}

const walking = (kneel: number): PoseInput => ({ move: null, def: undefined, frame: 0, speed: 1.6, stride: 1.1, guard: false, flinch: 0, rollYaw: 0, time: 3, kneel });

describe('kneeling at an Elder Sign (round 15) leaves the walk alone once it is over (round 20: the legs and arms stayed set)', () => {
  it('a kneel eased almost to nothing changes the stride by almost nothing', () => {
    const f = buildFigure('player');
    pose(f, walking(0));
    const striding = joints(f);
    for (const k of [1e-6, 0.001, 0.01]) {
      pose(f, walking(k));
      const eased = joints(f);
      const worst = Math.max(...eased.map((v, i) => Math.abs(v - striding[i])));
      expect(worst, `kneel ${k}`).toBeLessThan(0.05 * Math.max(k * 40, 0.05));
    }
  });

  it('a whole kneel reaches its pose whatever the stride was, and the legs swing again when it is gone', () => {
    const f = buildFigure('player');
    pose(f, walking(1));
    expect(f.legL.rotation.x).toBeCloseTo(-1.3, 5); // the front thigh forward
    expect(f.kneeR.rotation.x).toBeCloseTo(1.55, 5); // the back knee to the ground
    pose(f, { ...walking(1), stride: 4.2 });
    expect(f.legL.rotation.x).toBeCloseTo(-1.3, 5); // not the walk's
    const swing = (k: number): number => {
      const angles = [0, 1, 2, 3, 4, 5].map((i) => (pose(f, { ...walking(k), stride: i }), f.legR.rotation.x));
      return Math.max(...angles) - Math.min(...angles);
    };
    expect(swing(0)).toBeGreaterThan(0.3);
    expect(swing(1e-4)).toBeGreaterThan(swing(0) * 0.9); // a hair of kneel left: the swing is still there
  });
});
