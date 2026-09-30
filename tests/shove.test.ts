import { describe, expect, it } from 'vitest';
import { place, scriptedGame, steps } from './helpers';

describe('bodies that overlap are pushed apart by the share the other weighs (round 24)', () => {
  it('a colossus is not shoved about by the man who stands inside it', () => {
    const { g, player, deepOne } = scriptedGame();
    const body = g.ecs.c.body.get(deepOne)!;
    body.radius = 2.5; // a wide body, clear of the pillars (a real colossus is wider than the test arena)
    place(g, deepOne, 1, 5, 0);
    place(g, player, 1, 7.2, Math.PI);
    const boss = g.ecs.c.transform.get(deepOne)!.pos;
    const me = g.ecs.c.transform.get(player)!.pos;
    steps(g, 1);
    expect(Math.hypot(boss.x - 1, boss.z - 5)).toBeLessThan(0.05); // it keeps its place
    expect(Math.hypot(me.x - boss.x, me.z - boss.z)).toBeGreaterThan(body.radius + g.ecs.c.body.get(player)!.radius - 0.05); // and he is put out of it
  });

  it('two bodies of a size give way equally', () => {
    const { g, player, deepOne } = scriptedGame();
    const tr = (e: number) => g.ecs.c.transform.get(e)!.pos;
    place(g, deepOne, 0, 0, 0);
    place(g, player, 0.4, 0, 0);
    const [a, b] = [{ ...tr(deepOne) }, { ...tr(player) }];
    steps(g, 1);
    const [da, db] = [Math.hypot(tr(deepOne).x - a.x, tr(deepOne).z - a.z), Math.hypot(tr(player).x - b.x, tr(player).z - b.z)];
    expect(da).toBeGreaterThan(0);
    expect(db).toBeGreaterThan(0);
    expect(Math.abs(da / db - (g.ecs.c.body.get(player)!.radius ** 2 / g.ecs.c.body.get(deepOne)!.radius ** 2))).toBeLessThan(2); // each by the other's weight
  });
});
