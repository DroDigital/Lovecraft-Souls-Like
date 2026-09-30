/** Where a blow's sparks and spray are drawn (playtest round 24: on a colossus they were inside it). */
import { describe, expect, it } from 'vitest';
import { woundPoint } from '../src/render/wound';
import { PLAYER } from '../src/data/tuning';
import { place } from './helpers';
import { bossGame } from './bossHelpers';

describe('the wound of a blow', () => {
  it('is on the near side of a colossus, at the height of the blade, and a slight body keeps its old place', () => {
    const { g, boss } = bossGame('cthulhu', undefined, 30);
    const at = g.ecs.c.transform.get(boss)!.pos;
    const r = g.ecs.c.body.get(boss)!.radius;
    place(g, g.player.id, at.x, at.z + r + PLAYER.radius, Math.PI); // at its edge
    const w = woundPoint(g, boss, g.player.id, 0.25)!;
    expect(Math.hypot(w.at.x - at.x, w.at.z - at.z)).toBeGreaterThan(r - 0.5); // on its surface, not at its axis
    expect(Math.hypot(w.at.x - g.ecs.c.transform.get(g.player.id)!.pos.x, w.at.z - g.ecs.c.transform.get(g.player.id)!.pos.z)).toBeLessThan(1); // where the blade is
    expect(w.at.y).toBeLessThan(2); // at the blade's height, not the heart's six metres up
    expect(w.dz).toBeLessThan(-0.99); // the blow ran toward it

    const small = bossGame('deep_one', undefined, 2);
    const p = small.g.ecs.c.transform.get(small.boss)!.pos;
    const s = woundPoint(small.g, small.boss, small.g.player.id, 0.25)!;
    expect(Math.hypot(s.at.x - p.x, s.at.z - p.z)).toBeCloseTo(0.25, 1); // a quarter metre in from its axis, as before
  });

  it('is nothing when the body is gone', () => {
    const { g, boss } = bossGame('deep_one', undefined, 2);
    g.ecs.despawn(boss);
    expect(woundPoint(g, boss, g.player.id, 0.25)).toBeUndefined();
  });
});
