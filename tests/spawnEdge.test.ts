import { describe, expect, it } from 'vitest';
import { ENTITIES } from '../src/data/registry';
import { createGame } from '../src/systems/game';

describe('?spawn=<creature> (round 24)', () => {
  it('never begins with the investigator inside the body of a great one', () => {
    const wide = ENTITIES.filter((e) => e.tier !== 'ally' && e.bossScript);
    const bad: string[] = [];
    for (const e of wide) {
      const g = createGame({ creature: e.id });
      const foe = [...g.ecs.c.fight.keys()][0];
      if (foe === undefined) continue;
      const [a, b, me] = [g.ecs.c.transform.get(foe)!.pos, g.ecs.c.body.get(foe)!, g.ecs.c.transform.get(g.player.id)!.pos];
      const gap = Math.hypot(a.x - me.x, a.z - me.z) - b.radius;
      if (gap < 1) bad.push(`${e.id}: ${gap.toFixed(1)} m from its edge`);
    }
    expect(bad).toEqual([]);
  });
});
