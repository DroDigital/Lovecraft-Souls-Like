import { describe, expect, it } from 'vitest';
import { birth, live } from '../src/render/critterLife';

describe('moths are drawn to a lantern borne through the dark (round 26)', () => {
  const nest = (seed: number) => ({ critter: 'moth' as const, x: 100, y: 1, z: 100, seed });
  const moths = Array.from({ length: 24 }, (_, i) => birth(nest(i + 1)));

  it('some of those of a lamp it passes circle it, within a metre or two, and the rest keep the lamp', () => {
    const me = { x: 104, y: 0, z: 100 };
    for (let t = 0; t < 4; t += 1 / 60) for (const m of moths) live(m, 1 / 60, t, me, 1);
    const at = (m: { x: number; z: number }, p: { x: number; z: number }): number => Math.hypot(m.x - p.x, m.z - p.z);
    const round = moths.filter((m) => at(m, me) < 1.6).length;
    expect(round).toBeGreaterThan(3);
    expect(round).toBeLessThan(moths.length); // not all leave the lamp
    expect(moths.filter((m) => at(m, { x: 100, z: 100 }) < 2).length).toBeGreaterThan(0);
  });

  it('none when the lantern is far from the lamp', () => {
    const far = { x: 130, y: 0, z: 130 };
    for (let t = 0; t < 4; t += 1 / 60) for (const m of moths) live(m, 1 / 60, 10 + t, far, 1);
    expect(moths.filter((m) => Math.hypot(m.x - far.x, m.z - far.z) < 3).length).toBe(0);
  });
});
