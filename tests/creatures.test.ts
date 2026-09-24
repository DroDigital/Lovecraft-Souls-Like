import { describe, expect, it } from 'vitest';
import { ARENA } from '../src/data/arena';
import { ENTITIES, variantOf } from '../src/data/registry';
import { attacksOf, creatureModel, toCombatant } from '../src/systems/creatures';
import { createGame } from '../src/systems/game';
import { expectValidMoveSet, steps } from './helpers';

const VARIANTS = ENTITIES.flatMap((d) => (['eldritch', 'boss'] as const).filter((v) => variantOf(d, v)).map((v) => [d.id, v] as const));

describe('roster creatures as combatants', () => {
  it.each(ENTITIES.map((d) => [d.id, d] as const))('%s compiles to valid moves and a brain that uses them', (_, def) => {
    const c = toCombatant(def);
    expectValidMoveSet(c.moves);
    for (const a of attacksOf(def)) expect(c.moves[a], a).toBeDefined();
    for (const a of c.brain!.attacks) expect(c.moves[a.move], a.move).toBeDefined();
    expect(c.height).toBeGreaterThan(0);
    expect(c.radius).toBeGreaterThan(0);
    expect(c.model).toBe(creatureModel(def.id));
  });

  it.each(ENTITIES.map((d) => [d.id] as const))('%s spawns into the arena and fights for three seconds', (id) => {
    const g = createGame({ creature: id });
    const [e] = [...g.ecs.c.model].find(([, m]) => m === creatureModel(id))!;
    steps(g, 180);
    const hp = g.ecs.c.health.get(e)!.hp;
    expect(Number.isFinite(hp)).toBe(true);
    expect(g.ecs.c.combatant.get(e)!.faction).toBe(getTier(id) === 'ally' ? 'player' : 'enemy');
  });

  it.each(VARIANTS)('%s (%s variant) spawns', (id, v) => {
    const g = createGame({ creature: id, variant: v });
    expect([...g.ecs.c.model.values()]).toContain(creatureModel(id, v));
    steps(g, 60);
  });

  it('replaces the placeholder Deep One with an enemy, and keeps it beside an ally', () => {
    const models = (id: string): string[] => [...createGame({ creature: id }).ecs.c.model.values()];
    expect(models('ghoul')).not.toContain('deepOne');
    expect(models('nodens')).toContain('deepOne');
    expect(models('no_such_thing')).toContain('deepOne');
  });

  it('puts a spawned enemy where the placeholder stood', () => {
    const g = createGame({ creature: 'gug' });
    const [e] = [...g.ecs.c.model].find(([, m]) => m === creatureModel('gug'))!;
    expect(g.ecs.c.home.get(e)).toMatchObject({ x: ARENA.deepOne.x, z: ARENA.deepOne.z });
  });
});

function getTier(id: string): string {
  return ENTITIES.find((d) => d.id === id)!.tier;
}
