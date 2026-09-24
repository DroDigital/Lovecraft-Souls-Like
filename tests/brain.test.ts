import { describe, expect, it } from 'vitest';
import type { Entity } from '../src/core/ecs';
import { distXZ } from '../src/core/geom';
import { ARENA } from '../src/data/arena';
import { targetsOf } from '../src/systems/combat';
import type { Game } from '../src/systems/components';
import { creatureModel } from '../src/systems/creatures';
import { createGame } from '../src/systems/game';
import { place, steps } from './helpers';

const find = (g: Game, model: string): Entity => [...g.ecs.c.model].find(([, m]) => m === model)![0];

function arena(creature: string): { g: Game; foe: Entity; player: Entity } {
  const g = createGame({ creature });
  return { g, foe: find(g, creatureModel(creature)), player: g.player.id };
}

const gap = (g: Game, a: Entity, b: Entity): number => distXZ(g.ecs.c.transform.get(a)!.pos, g.ecs.c.transform.get(b)!.pos);

describe('archetype brains', () => {
  it('a pack hunter sees what is in front of it, not what is behind (beyond hearing)', () => {
    const { g, foe, player } = arena('ghoul');
    place(g, foe, 4, 0, 0); // facing +z
    place(g, player, 4, -10, 0);
    steps(g, 10);
    expect(g.ecs.c.brain.get(foe)!.state).toBe('idle');
    place(g, player, 4, 10, Math.PI);
    steps(g, 2);
    expect(g.ecs.c.brain.get(foe)!.state).toBe('engage');
    expect(g.ecs.c.brain.get(foe)!.target).toBe(player);
  });

  it('hears a foe close behind it', () => {
    const { g, foe, player } = arena('ghoul');
    place(g, foe, 4, 0, 0);
    place(g, player, 4, -3, 0);
    steps(g, 2);
    expect(g.ecs.c.brain.get(foe)!.state).toBe('engage');
  });

  it('a caster backs away from a foe inside its preferred range', () => {
    const { g, foe, player } = arena('dagon_priest');
    place(g, foe, 4, 0, 0);
    place(g, player, 4, 3, Math.PI);
    g.ecs.c.brain.get(foe)!.cooldown = 1e6; // movement only
    steps(g, 90);
    expect(gap(g, foe, player)).toBeGreaterThan(6);
  });

  it('an ambusher stays hidden and untargetable until its prey comes close', () => {
    const { g, foe, player } = arena('nameless_city_reptile');
    place(g, foe, 4, 0, 0);
    place(g, player, 4, 8, Math.PI);
    steps(g, 20);
    expect(g.ecs.c.brain.get(foe)!.state).toBe('hidden');
    expect(targetsOf(g, player)).not.toContain(foe);
    place(g, player, 4, 3, Math.PI);
    steps(g, 2);
    expect(g.ecs.c.brain.get(foe)!.state).toBe('engage');
    expect(targetsOf(g, player)).toContain(foe);
  });

  it('a stationary horror never moves', () => {
    const { g, foe, player } = arena('curwen_pit_thing');
    place(g, foe, 4, 0, 0);
    place(g, player, 4, 6, Math.PI);
    steps(g, 180);
    expect(g.ecs.c.transform.get(foe)!.pos).toMatchObject({ x: 4, z: 0 });
    expect(g.ecs.c.brain.get(foe)!.state).toBe('engage');
  });

  it('an ally follows the player when nothing threatens them', () => {
    const { g, foe: ally, player } = arena('nodens');
    for (const [id, c] of [...g.ecs.c.combatant]) if (c.faction === 'enemy') g.ecs.despawn(id);
    place(g, player, -10, 0, 0);
    steps(g, 360);
    expect(gap(g, ally, player)).toBeLessThan(5);
    expect(g.ecs.c.brain.get(ally)!.state).toBe('follow');
  });

  it('an ally turns on an enemy it notices', () => {
    const { g, foe: ally } = arena('cats_of_ulthar');
    const deepOne = find(g, 'deepOne');
    place(g, deepOne, ARENA.ally.x, ARENA.ally.z - 5, 0);
    steps(g, 5);
    expect(g.ecs.c.brain.get(ally)!.target).toBe(deepOne);
  });

  it('gives up beyond its leash, walks home and heals', () => {
    const g = createGame();
    const foe = find(g, 'deepOne');
    g.ecs.c.health.get(g.player.id)!.hp = 0; // nothing left to hunt
    const br = g.ecs.c.brain.get(foe)!;
    Object.assign(br, { state: 'engage', target: g.player.id });
    place(g, foe, -4, 18, 0); // 28.2 m from home, leash 28
    g.ecs.c.health.get(foe)!.hp = 50;
    steps(g, 2);
    expect(br.state).toBe('return');
    steps(g, 700);
    expect(br.state).toBe('idle');
    expect(g.ecs.c.health.get(foe)!.hp).toBe(g.ecs.c.health.get(foe)!.max);
    expect(distXZ(g.ecs.c.transform.get(foe)!.pos, ARENA.deepOne)).toBeLessThan(0.5);
  });
});
