import { describe, expect, it } from 'vitest';
import { segmentGap, veilsFoe } from '../src/render/occlusion';
import { place, scriptedGame } from './helpers';

describe('the investigator hiding the foe they fight (round 12)', () => {
  it('measures the closest gap between two segments', () => {
    const o = { x: 0, y: 0, z: 0 };
    expect(segmentGap(o, { x: 0, y: 0, z: 10 }, { x: 1, y: -1, z: 5 }, { x: 1, y: 1, z: 5 }).gap).toBeCloseTo(1);
    expect(segmentGap(o, { x: 0, y: 0, z: 10 }, { x: 1, y: -1, z: 5 }, { x: 1, y: 1, z: 5 }).t).toBeCloseTo(0.5);
    expect(segmentGap(o, { x: 0, y: 0, z: 1 }, { x: 0, y: 0, z: 5 }, { x: 0, y: 1, z: 5 }).gap).toBeCloseTo(4);
  });

  it('fades them when they stand between the lens and a short foe close in, not when it stands clear', () => {
    const { g, player, deepOne } = scriptedGame();
    place(g, player, 0, 0, 0);
    place(g, deepOne, 0, 1.2, 0); // just ahead of them
    g.ecs.c.body.get(deepOne)!.aimHeight = 0.3; // as low as a rat
    g.lock.target = deepOne;
    const behind = { x: 0.45, y: 4.5, z: -2.5 }; // a steep lock-on lens over the shoulder
    expect(veilsFoe(g, behind)).toBe(true);
    place(g, deepOne, 4, 1.2, 0); // off to the side
    expect(veilsFoe(g, behind)).toBe(false);
    g.lock.target = null;
    expect(veilsFoe(g, behind)).toBe(false); // nothing hunts them, nothing to watch
  });
});
