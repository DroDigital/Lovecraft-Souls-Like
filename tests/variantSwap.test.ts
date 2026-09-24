import { describe, expect, it } from 'vitest';
import type { Entity } from '../src/core/ecs';
import { getEntity, variantOf } from '../src/data/registry';
import type { Game } from '../src/systems/components';
import { bodyOf, creatureModel, spawnCreature } from '../src/systems/creatures';
import { createGame } from '../src/systems/game';
import { setSanity } from '../src/systems/sanity';

const find = (g: Game, model: string): Entity => [...g.ecs.c.model].find(([, m]) => m === model)![0];
const model = (g: Game, id: Entity): string => g.ecs.c.model.get(id)!;

describe('VariantSwap', () => {
  it('a creature shows its eldritch variant from Fractured down, and its own form again past 43', () => {
    const g = createGame({ creature: 'deep_one' });
    const foe = find(g, creatureModel('deep_one'));
    setSanity(g, 45);
    expect(model(g, foe)).toBe(creatureModel('deep_one'));
    expect(g.ecs.c.dread.get(foe)!.glow).toBe(false);
    setSanity(g, 39);
    expect(model(g, foe)).toBe(creatureModel('deep_one', 'eldritch'));
    expect(g.ecs.c.dread.get(foe)!.glow).toBe(true); // its eyes now glow Void Green
    setSanity(g, 42);
    expect(model(g, foe)).toBe(creatureModel('deep_one', 'eldritch'));
    setSanity(g, 43);
    expect(model(g, foe)).toBe(creatureModel('deep_one'));
  });

  it('rebuilds body, moves and stats from the variant, keeping the health fraction', () => {
    const g = createGame({ creature: 'innsmouth_hybrid' });
    const foe = find(g, creatureModel('innsmouth_hybrid'));
    const h = g.ecs.c.health.get(foe)!;
    h.hp = h.max / 2;
    const sweep = (): number => g.ecs.c.actor.get(foe)!.moves.sweep.hit!.damage;
    const before = sweep();
    setSanity(g, 30);
    expect(sweep()).toBeGreaterThan(before); // damage 12 → 15
    expect(h.hp / h.max).toBeCloseTo(0.5);
    expect(g.ecs.c.body.get(foe)!.height).toBeCloseTo(bodyOf(variantOf(getEntity('innsmouth_hybrid')!, 'eldritch')!).height);
    setSanity(g, 80);
    expect(sweep()).toBe(before);
    expect(g.ecs.c.body.get(foe)!.height).toBeCloseTo(bodyOf(getEntity('innsmouth_hybrid')!).height);
  });

  it('leaves alone creatures without one, a requested variant, and the placeholder Deep One', () => {
    const plain = createGame({ creature: 'ghast' });
    setSanity(plain, 10);
    expect([...plain.ecs.c.model.values()]).toContain(creatureModel('ghast'));
    const forced = createGame({ creature: 'deep_one', variant: 'eldritch' });
    for (const s of [10, 100]) {
      setSanity(forced, s);
      expect([...forced.ecs.c.model.values()]).toContain(creatureModel('deep_one', 'eldritch'));
    }
    const arena = createGame();
    setSanity(arena, 10);
    expect([...arena.ecs.c.model.values()]).toContain('deepOne');
  });

  it('a creature that appears to a fractured mind arrives in its eldritch form', () => {
    const g = createGame();
    setSanity(g, 30);
    const e = spawnCreature(g, 'ghoul', { x: 0, z: 0, yaw: 0 })!;
    expect(model(g, e)).toBe(creatureModel('ghoul', 'eldritch'));
    setSanity(g, 50);
    expect(model(g, e)).toBe(creatureModel('ghoul'));
  });
});
