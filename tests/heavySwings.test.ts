import { describe, expect, it } from 'vitest';
import { WEAPONS } from '../src/data/weapons';
import { PLAYER_MOVES, type MoveDef } from '../src/data/moves';
import { heavyKeys, heavyTime, type HeavyAnim } from '../src/render/heavySwings';

const heavies: [string, MoveDef][] = [
  ...Object.entries(PLAYER_MOVES).filter(([k]) => k.startsWith('heavy')),
  ...Object.values(WEAPONS).flatMap((w) => Object.entries(w.moves as Record<string, MoveDef>).filter(([k]) => k.startsWith('heavy'))),
] as [string, MoveDef][];

describe('heavy blows (playtest round 13)', () => {
  it('every heavy of every weapon is drawn by key poses', () => {
    expect(heavies.length).toBeGreaterThanOrEqual(8);
    for (const [, d] of heavies) expect(['cleave', 'wheel', 'lunge', 'whirl']).toContain(d.anim);
  });

  it('keys run in order through the wind-up, the strike and the recovery', () => {
    for (const [, d] of heavies) {
      const keys = heavyKeys(d.anim as HeavyAnim, d.hit!.arc);
      const ts = keys.map((k) => k.t);
      expect([...ts].sort((a, b) => a - b)).toEqual(ts);
      expect(ts[0]).toBeGreaterThan(0);
      expect(ts.at(-1)).toBeLessThanOrEqual(3);
      expect(ts.some((t) => t > 1 && t <= 2)).toBe(true); // a pose inside the active frames
    }
  });

  it('the time reaches the strike as the active frames open and close', () => {
    for (const [, d] of heavies) {
      const [w0, w1] = d.hit!.window;
      expect(heavyTime(d, 0)).toBe(0);
      expect(heavyTime(d, w0)).toBeCloseTo(1);
      expect(heavyTime(d, w1)).toBeCloseTo(2);
      expect(heavyTime(d, d.frames)).toBe(3);
    }
  });
});
