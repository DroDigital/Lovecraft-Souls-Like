import { describe, expect, it } from 'vitest';
import type { Entity } from '../src/core/ecs';
import { ARENA } from '../src/data/arena';
import { PLAYER, SANITY, UPGRADES } from '../src/data/tuning';
import type { Game, GameEvents } from '../src/systems/components';
import { createGame } from '../src/systems/game';
import { buyUpgrade, changeInsight } from '../src/systems/insight';
import { loseSanity } from '../src/systems/sanity';
import { place, steps } from './helpers';

const find = (g: Game, model: string): Entity => [...g.ecs.c.model].find(([, m]) => m === model)![0];

function insightLog(g: Game): GameEvents['InsightChanged'][] {
  const log: GameEvents['InsightChanged'][] = [];
  g.events.on('InsightChanged', (e) => log.push(e));
  return log;
}

describe('first sight', () => {
  it('of a named horror grants its insight once, and shocks sanity by tier', () => {
    const g = createGame({ creature: 'wilbur_whateley' });
    const sights: GameEvents['FirstSight'][] = [];
    g.events.on('FirstSight', (e) => sights.push(e));
    steps(g, 1);
    expect(g.mind.insight).toBe(1);
    expect(g.mind.sanity).toBeCloseTo(SANITY.max - SANITY.firstSight.named, 5);
    steps(g, 30);
    expect(g.mind.insight).toBe(1);
    expect(sights).toEqual([{ entity: find(g, 'creature:wilbur_whateley'), name: 'Wilbur Whateley', sanity: SANITY.firstSight.named, insight: 1 }]);
  });

  it('of a lesser one costs nothing, but still counts as seen', () => {
    const g = createGame();
    steps(g, 5);
    expect(g.mind.seen.has('deep_one')).toBe(true);
    expect(g.mind.sanity).toBe(SANITY.max);
    expect(g.mind.insight).toBe(0);
  });

  it('needs the horror on screen and in line of sight', () => {
    const g = createGame({ creature: 'wilbur_whateley' });
    const foe = find(g, 'creature:wilbur_whateley');
    g.ecs.c.brain.delete(foe);
    place(g, foe, 0, 20, 0); // behind the camera
    steps(g, 5);
    expect(g.mind.insight).toBe(0);
    place(g, foe, -8, -2, 0);
    place(g, g.player.id, -8, 4, Math.PI); // the pillar at (-8, 1) hides it
    steps(g, 5);
    expect(g.mind.insight).toBe(0);
    place(g, g.player.id, -4, 4, Math.PI);
    steps(g, 5);
    expect(g.mind.insight).toBe(1);
  });
});

describe('tomes and upgrades', () => {
  it('reading the tome grants its insight and takes it from the world', () => {
    const g = createGame();
    const log = insightLog(g);
    const [tome] = g.ecs.query('tome');
    place(g, g.player.id, ARENA.tome.x, ARENA.tome.z + PLAYER.pickupRadius + 0.5, 0);
    steps(g, 2);
    expect(g.mind.insight).toBe(0);
    place(g, g.player.id, ARENA.tome.x, ARENA.tome.z + PLAYER.pickupRadius - 0.5, 0);
    steps(g, 1);
    expect(g.mind.insight).toBe(ARENA.tome.insight);
    expect(g.ecs.c.tome.has(tome)).toBe(false);
    expect(log).toEqual([{ insight: 1, change: 1, cause: 'tome', source: ARENA.tome.name }]);
  });

  it('spends insight on upgrades, and refuses when short of it', () => {
    const g = createGame();
    expect(buyUpgrade(g, 'resolve')).toBe(false);
    changeInsight(g, 5, 'debug', 'test');
    const log = insightLog(g);
    const doses = g.player.laudanum;
    expect(buyUpgrade(g, 'draught')).toBe(true);
    expect(g.player.laudanum).toBe(doses + UPGRADES.draught.doses!); // carried at once
    expect(buyUpgrade(g, 'resolve')).toBe(true);
    expect(g.mind.insight).toBe(0);
    expect(buyUpgrade(g, 'resolve')).toBe(false);
    expect(log.map((e) => [e.change, e.source])).toEqual([
      [-3, 'Draught'],
      [-2, 'Resolve'],
    ]);
    loseSanity(g, 10);
    expect(g.mind.sanity).toBeCloseTo(SANITY.max - 10 * (1 - UPGRADES.resolve.resist!));
  });
});
