import { describe, expect, it } from 'vitest';
import { centreline, done, LIFE, pickSpot, radius, rise, SEE } from '../src/render/tentacleShape';

describe('a tentacle in the distance (round 30)', () => {
  it('comes up, holds, and goes under, and is gone when it has', () => {
    const hold = 5;
    expect(rise(-1, hold)).toBe(0);
    expect(rise(0, hold)).toBe(0);
    expect(rise(LIFE.emerge / 2, hold)).toBeGreaterThan(0.3);
    expect(rise(LIFE.emerge / 2, hold)).toBeLessThan(0.7);
    expect(rise(LIFE.emerge + hold / 2, hold)).toBe(1);
    expect(rise(LIFE.emerge + hold + LIFE.sink / 2, hold)).toBeLessThan(0.7);
    expect(rise(LIFE.emerge + hold + LIFE.sink + 0.1, hold)).toBe(0);
    expect(done(LIFE.emerge + hold + LIFE.sink - 0.1, hold)).toBe(false);
    expect(done(LIFE.emerge + hold + LIFE.sink + 0.1, hold)).toBe(true);
    let last = 0;
    for (let a = 0; a <= LIFE.emerge; a += 0.1) {
      const r = rise(a, hold);
      expect(r).toBeGreaterThanOrEqual(last - 1e-9); // it only rises while it comes up
      last = r;
    }
  });

  it('is a long curve from below the water to a tip that is higher, arched over, and moves', () => {
    const line = centreline(20, 3, 1.5);
    expect(line.length).toBe(15);
    expect(line[0][1]).toBeLessThan(0);
    const tip = line[line.length - 1];
    expect(tip[1]).toBeGreaterThan(8);
    expect(Math.abs(tip[0])).toBeGreaterThan(4); // it leans over
    for (let i = 2; i < line.length; i++) expect(Math.hypot(line[i][0] - line[i - 1][0], line[i][1] - line[i - 1][1], line[i][2] - line[i - 1][2])).toBeCloseTo(20 / 14, 0); // each part the same length, bar the sideways wave
    const later = centreline(20, 5, 1.5);
    expect(Math.hypot(later[14][0] - tip[0], later[14][1] - tip[1], later[14][2] - tip[2])).toBeGreaterThan(0.2); // it writhes
  });

  it('is drawn to a point', () => {
    expect(radius(0, 1.2)).toBeGreaterThan(radius(0.5, 1.2));
    expect(radius(0.5, 1.2)).toBeGreaterThan(radius(0.99, 1.2));
    expect(radius(1, 1.2)).toBeGreaterThan(0);
  });

  it('is seen on open water ahead and far, and not where the water is not or does not reach back', () => {
    let s = 7;
    const rand = (): number => (s = (s * 16807) % 2147483647) / 2147483647;
    const sea = (x: number): boolean => x > 30; // water from x = 30 on: the investigator at the origin looks +x (yaw π/2)
    for (let i = 0; i < 50; i++) {
      const p = pickSpot({ x: 0, z: 0 }, Math.PI / 2, rand, sea) ?? { x: 100, z: 0 };
      const d = Math.hypot(p.x, p.z);
      expect(d).toBeGreaterThanOrEqual(SEE.near - 1e-6);
      expect(d).toBeLessThanOrEqual(SEE.far + 1e-6);
      expect(Math.abs(Math.atan2(p.x, p.z) - Math.PI / 2)).toBeLessThanOrEqual(SEE.spread + 1e-6);
    }
    expect(pickSpot({ x: 0, z: 0 }, 0, rand, sea)).toBeNull(); // looking away from the sea
    expect(pickSpot({ x: 0, z: 0 }, Math.PI / 2, rand, (x) => x > 70)).toBeNull(); // water far off with land between: nothing rises from behind a hill
  });
});
