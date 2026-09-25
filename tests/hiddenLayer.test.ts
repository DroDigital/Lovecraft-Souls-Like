import { describe, expect, it } from 'vitest';
import type { Entity } from '../src/core/ecs';
import { ARENA } from '../src/data/arena';
import { ENTITIES } from '../src/data/registry';
import { SANITY } from '../src/data/tuning';
import { validateRegistry } from '../src/data/validate';
import { targetsOf } from '../src/systems/combat';
import { isAbsent, type Band, type Game } from '../src/systems/components';
import { createGame } from '../src/systems/game';
import { layerShown } from '../src/systems/hiddenLayer';
import { buyUpgrade, changeInsight } from '../src/systems/insight';
import { candidates } from '../src/systems/lockOn';
import { createMind, setSanity } from '../src/systems/sanity';
import { hasLineOfSight, resolveCapsule, type BoxCollider } from '../src/world/colliders';
import { place, steps } from './helpers';

const mind = (insight: number, band: Band) => ({ ...createMind(), insight, band });
const piece = (g: Game, name: string): Entity => [...g.ecs.c.piece].find(([, p]) => p.def.name === name)![0];
const shown = (g: Game, id: Entity): boolean => g.ecs.c.layer.get(id)!.shown;

const firstBox = (g: Game, id: Entity): BoxCollider => g.ecs.c.piece.get(id)!.colliders[0] as BoxCollider;

/** Whether a line through the middle of a piece's first box passes (at head height, along z). */
function passes(g: Game, id: Entity): boolean {
  const c = firstBox(g, id);
  const x = (c.min.x + c.max.x) / 2;
  const y = Math.min(1.5, (c.min.y + c.max.y) / 2);
  return hasLineOfSight(g.world, { x, y, z: c.min.z - 2 }, { x, y, z: c.max.z + 2 });
}

describe('HiddenLayer', () => {
  it('shows with enough insight, and once the whole band lies at or below maxSanity', () => {
    expect(layerShown(mind(0, 'lucid'), { minInsight: 1 })).toBe(false);
    expect(layerShown(mind(1, 'lucid'), { minInsight: 1 })).toBe(true);
    expect(layerShown(mind(9, 'uneasy'), { maxSanity: 40 })).toBe(false);
    expect(layerShown(mind(0, 'fractured'), { maxSanity: 40 })).toBe(true);
    expect(layerShown(mind(0, 'fractured'), { maxSanity: 15 })).toBe(false);
    expect(layerShown(mind(0, 'unmoored'), { maxSanity: 15 })).toBe(true);
    expect(layerShown(mind(1, 'unmoored'), { minInsight: 2, maxSanity: 15 })).toBe(false);
    expect(layerShown(mind(2, 'unmoored'), { minInsight: 2, maxSanity: 15 })).toBe(true);
  });

  it('the insight door stands only while insight is held; spending the insight re-hides it', () => {
    const g = createGame();
    const door = piece(g, 'Door That Should Not Be');
    expect(shown(g, door)).toBe(false);
    expect(passes(g, door)).toBe(true);
    changeInsight(g, 1, 'debug', 'test');
    expect(shown(g, door)).toBe(true);
    expect(passes(g, door)).toBe(false);
    const jamb = firstBox(g, door);
    const pos = { x: jamb.min.x + 0.1, y: 0, z: (jamb.min.z + jamb.max.z) / 2 };
    resolveCapsule(g.world, pos, 0.4, 1.8);
    expect(pos.x).toBeCloseTo(jamb.min.x - 0.4); // pushed out of the jamb
    changeInsight(g, 1, 'debug', 'test');
    expect(buyUpgrade(g, 'resolve')).toBe(true); // two insight
    expect(g.mind.insight).toBe(0);
    expect(shown(g, door)).toBe(false);
    expect(passes(g, door)).toBe(true);
  });

  it('the wrong angles show to a fractured mind, with the band hysteresis', () => {
    const g = createGame();
    const angles = piece(g, 'Wrong Angles');
    setSanity(g, 45);
    expect(shown(g, angles)).toBe(false);
    setSanity(g, 39);
    expect(shown(g, angles)).toBe(true);
    expect(passes(g, angles)).toBe(false);
    setSanity(g, 42);
    expect(shown(g, angles)).toBe(true);
    setSanity(g, 43);
    expect(shown(g, angles)).toBe(false);
    expect(passes(g, angles)).toBe(true);
  });

  it('the Being from Beyond is absent until Unmoored: it neither acts nor can be seen or targeted', () => {
    const g = createGame({ creature: 'being_from_beyond' });
    const being = [...g.ecs.c.model].find(([, m]) => m === 'creature:being_from_beyond')![0];
    place(g, being, 0, 12, 0);
    steps(g, 30);
    expect(isAbsent(g, being)).toBe(true);
    expect(g.ecs.c.transform.get(being)!.pos).toMatchObject({ x: 0, z: 12 });
    expect(targetsOf(g, g.player.id)).not.toContain(being);
    expect(candidates(g).map((c) => c.id)).not.toContain(being);
    expect(g.mind.seen.has('being_from_beyond')).toBe(false);
    setSanity(g, 10);
    expect(isAbsent(g, being)).toBe(false);
    expect(targetsOf(g, g.player.id)).toContain(being);
    steps(g, 5);
    expect(g.ecs.c.brain.get(being)!.state).toBe('engage');
    setSanity(g, 17);
    expect(isAbsent(g, being)).toBe(false);
    setSanity(g, 18);
    expect(isAbsent(g, being)).toBe(true);
    expect(g.ecs.c.actor.get(being)!.move).toBeNull();
    expect(g.ecs.c.brain.get(being)!.target).toBeNull();
  });

  it('maxSanity is always a band floor', () => {
    const defs = ENTITIES.map((d) => (d.id === 'being_from_beyond' ? { ...d, hidden: { maxSanity: 20 } } : d));
    expect(validateRegistry(defs)).toContain('being_from_beyond: hidden.maxSanity = 20, expected a band floor (70, 40, 15)');
    for (const p of ARENA.hidden) if (p.maxSanity !== undefined) expect(SANITY.bands).toContain(p.maxSanity);
  });
});
