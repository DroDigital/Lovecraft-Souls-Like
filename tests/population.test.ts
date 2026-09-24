import { describe, expect, it } from 'vitest';
import { WORLD } from '../src/data/tuning';
import { rest, signPlace, travel } from '../src/systems/checkpoints';
import { isAbsent } from '../src/systems/components';
import { createWorldGame } from '../src/systems/game';
import { worldLayout } from '../src/world/placements';
import { chunkSpan } from '../src/world/streaming';
import { chunkOf } from '../src/world/worldMap';
import { creatureOf, goTo, kill, record, run } from './worldHelpers';

const game = () => {
  const g = createWorldGame();
  for (const s of worldLayout().signs) g.overworld!.discovered.add(s.id);
  return g;
};

describe('population', () => {
  it('spawns the creatures of the 5 × 5 chunks around the investigator, never more than 60', () => {
    const g = game();
    for (const sign of ['hub_quad', 'dream_ulthar', 'innsmouth_yhanthlei', 'dream_zin', 'knyan_tsath', 'rlyeh_deck']) {
      travel(g, sign);
      run(g, 31);
      const ow = g.overworld!;
      expect(ow.alive.size).toBeGreaterThan(0);
      expect(ow.alive.size).toBeLessThanOrEqual(WORLD.maxActive);
      const p = g.ecs.c.transform.get(g.player.id)!.pos;
      for (const e of ow.alive.values()) {
        const q = g.ecs.c.transform.get(e)!.pos;
        expect(chunkSpan(chunkOf(q.x), chunkOf(q.z), chunkOf(p.x), chunkOf(p.z))).toBeLessThanOrEqual(WORLD.keep);
      }
    }
  });

  it('lets creatures go beyond the 7 × 7, and brings them back on return', () => {
    const g = game();
    const [id, e] = [...g.overworld!.alive][0];
    travel(g, 'arkham_heath');
    run(g, 1);
    expect(creatureOf(g, id)).toBeUndefined();
    expect(g.ecs.c.transform.has(e)).toBe(false);
    travel(g, 'hub_quad');
    run(g, 1);
    expect(creatureOf(g, id)).toBeDefined();
  });

  it('the killed stay dead until a rest; a boss stays slain', () => {
    const g = game();
    const [id, foe] = [...g.overworld!.alive].find(([k, e]) => k.startsWith('w:') && !isAbsent(g, e))!;
    kill(g, foe);
    expect(creatureOf(g, id)).toBeUndefined();
    expect(g.overworld!.killed.has(id)).toBe(true);
    run(g, 60);
    expect(creatureOf(g, id)).toBeUndefined();

    const lair = worldLayout().spawns.find((s) => s.id === 'boss:dr_munoz')!;
    goTo(g, lair.at.x + 6, lair.at.z);
    run(g, 1);
    const munoz = creatureOf(g, 'boss:dr_munoz')!;
    const vanquished = record(g, 'Vanquished');
    kill(g, munoz);
    expect(vanquished).toEqual([{ entity: munoz, name: 'Dr. Muñoz' }]);
    expect(g.overworld!.slain.has('boss:dr_munoz')).toBe(true);

    const s = signPlace('hub_quad')!;
    goTo(g, s.rest.x, s.rest.z);
    rest(g, 'hub_quad');
    run(g, 1);
    expect(creatureOf(g, id)).toBeDefined();
    expect(creatureOf(g, 'boss:dr_munoz')).toBeUndefined();
  });

  it('announces each region the investigator enters', () => {
    const g = game();
    const entered = record(g, 'RegionEntered');
    travel(g, 'arkham_streets');
    run(g, 1);
    travel(g, 'dream_wood');
    run(g, 1);
    expect(entered.map((e) => e.region)).toEqual(['arkham', 'dreamlands']);
  });
});
