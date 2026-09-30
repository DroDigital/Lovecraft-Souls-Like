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

describe('getting up from the knee (round 22: a slow rise stages its parts)', () => {
  it('lifts the head first, holds the hands on the knee to half way, and stands the body last', () => {
    const f = buildFigure('player');
    pose(f, walking(0));
    const [head0, drop0, hand0] = [f.head.rotation.x, f.body.position.y, f.elbowR.rotation.x];
    pose(f, walking(1));
    const [bowed, low, held] = [f.head.rotation.x - head0, drop0 - f.body.position.y, f.elbowR.rotation.x - hand0];
    pose(f, walking(0.6));
    const share = (now: number, was: number, whole: number): number => (now - was) / whole; // how much of its way down a joint still is
    expect(share(f.head.rotation.x, head0, bowed)).toBeLessThan(0.6); // the head is well on its way up...
    expect(share(drop0 - f.body.position.y, 0, low)).toBeGreaterThan(0.75); // ...while the body has hardly begun
    expect(share(f.elbowR.rotation.x, hand0, held)).toBeGreaterThan(0.99); // and the hands still rest on the knee
    pose(f, walking(0.1));
    expect(share(f.elbowR.rotation.x, hand0, held)).toBeLessThan(0.2); // gone from it by the end
  });

  it('moves every part smoothly through the rise, none of them jumping between one frame and the next', () => {
    const f = buildFigure('player');
    let last: number[] | undefined;
    for (let k = 1; k >= 0.1; k -= 0.01) { // (the last hair of it, a knee giving where the foot would sink, is settle's: a sharp bend for a millimetre)
      pose(f, walking(k));
      const now = joints(f);
      if (last) expect(Math.max(...now.map((v, i) => Math.abs(v - last![i]))), `at ${k.toFixed(2)}`).toBeLessThan(0.08);
      last = now;
    }
  });
});

