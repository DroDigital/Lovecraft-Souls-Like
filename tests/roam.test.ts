import { describe, expect, it } from 'vitest';
import type { Entity } from '../src/core/ecs';
import { distXZ } from '../src/core/geom';
import { createWorldGame } from '../src/systems/game';
import { scriptedGame, steps } from './helpers';
import { run } from './worldHelpers';

describe('foes make their rounds (round 18: roam.ts)', () => {
  it('idle in the open world, a foe ambles about its post, never farther than its roam, and lingers between strolls', () => {
    const g = createWorldGame();
    run(g, 60); // the creatures about the investigator rise
    const c = g.ecs.c;
    const me = c.transform.get(g.player.id)!.pos;
    const roamers: Entity[] = [];
    for (const [id, br] of c.brain) {
      const home = c.home.get(id);
      if (home && br.state === 'idle' && br.def.params.roam > 0 && distXZ(home, me) > 60) roamers.push(id);
    }
    expect(roamers.length).toBeGreaterThan(3);
    const farthest = new Map<Entity, number>(roamers.map((id) => [id, 0]));
    let still = 0; // frames on which a watched foe stood (lingering)
    for (let i = 0; i < 60 * 30; i++) {
      run(g, 1);
      for (const id of roamers) {
        if (c.brain.get(id)?.state !== 'idle') continue;
        const d = distXZ(c.transform.get(id)!.pos, c.home.get(id)!);
        farthest.set(id, Math.max(farthest.get(id)!, d));
        const m = c.mover.get(id)!;
        if (Math.hypot(m.vx, m.vz) < 1e-3) still++;
      }
    }
    const moved = roamers.filter((id) => farthest.get(id)! > 1.5);
    expect(moved.length).toBeGreaterThan(roamers.length / 2);
    for (const id of roamers) expect(farthest.get(id)!, c.combatant.get(id)?.name).toBeLessThanOrEqual(c.brain.get(id)!.def.params.roam + 1.5);
    expect(still).toBeGreaterThan(0);
  });

  it('those that lie in wait stay where they lie, and outside the open world a foe keeps its post', () => {
    const g = createWorldGame();
    run(g, 60);
    const c = g.ecs.c;
    const lurkers = [...c.brain].filter(([id, br]) => c.home.has(id) && br.def.params.roam === 0 && br.def.params.hide !== 'none').map(([id]) => id);
    const at = new Map(lurkers.map((id) => [id, { ...c.transform.get(id)!.pos }]));
    run(g, 600);
    for (const id of lurkers) if (c.brain.get(id)?.state === 'hidden') expect(distXZ(c.transform.get(id)!.pos, at.get(id)!)).toBeLessThan(0.01);

    const { g: arena, deepOne } = scriptedGame();
    const post = { ...arena.ecs.c.transform.get(deepOne)!.pos };
    arena.ecs.c.transform.get(arena.player.id)!.pos.x += 200; // far out of its sight
    steps(arena, 600);
    expect(distXZ(arena.ecs.c.transform.get(deepOne)!.pos, post)).toBeLessThan(0.5);
  });
});
