import { describe, expect, it } from 'vitest';
import { ENTITIES, variantOf } from '../src/data/registry';
import { LEVELS, REINFORCE, STAR_STONES } from '../src/data/tuning';
import { WEAPONS } from '../src/data/weapons';
import { canReinforce, edge, edgeAt, reinforce, reinforceCost, stonesOf, stonesOfSlain } from '../src/systems/arms';
import { createWorldGame } from '../src/systems/game';
import { snapshot } from '../src/systems/save';
import { spawnCreature } from '../src/systems/creatures';
import { place, press, scriptedGame, steps } from './helpers';

describe('reinforcing arms with star-stones (round 12)', () => {
  it('each level costs its stones, adds its share, and stops at the most', () => {
    expect(REINFORCE.cost).toHaveLength(REINFORCE.max);
    const { g } = scriptedGame();
    g.player.stones = REINFORCE.cost.reduce((a, b) => a + b, 0);
    for (let n = 0; n < REINFORCE.max; n++) {
      expect(reinforceCost(g, 'cane')).toBe(REINFORCE.cost[n]);
      expect(reinforce(g, 'cane')).toBe(true);
    }
    expect(g.player.stones).toBe(0);
    expect(g.player.reinforced.cane).toBe(REINFORCE.max);
    expect(reinforceCost(g, 'cane')).toBeUndefined();
    g.player.stones = 99;
    expect(reinforce(g, 'cane')).toBe(false); // at the most
    expect(canReinforce(g, 'axe')).toBe(false); // not theirs
    expect(edge(g, g.player.id)).toBeCloseTo(edgeAt(REINFORCE.max));
  });

  it('refuses when short of stones', () => {
    const { g } = scriptedGame();
    expect(reinforce(g, 'cane')).toBe(false);
    expect(g.player.reinforced.cane).toBe(0);
  });

  it("a reinforced weapon's blows land harder; no one else's do", () => {
    const hitFor = (level: number): number => {
      const s = scriptedGame();
      s.g.player.reinforced.cane = level;
      place(s.g, s.player, 0, 1.2, Math.PI);
      place(s.g, s.dummy, 0, 0, 0);
      const h = s.g.ecs.c.health.get(s.dummy)!;
      const before = h.hp;
      steps(s.g, 1, press('light'));
      steps(s.g, 30);
      expect(edge(s.g, s.dummy)).toBe(1);
      return before - h.hp;
    };
    const base = WEAPONS.cane.moves.light1!.hit!.damage;
    expect(hitFor(0)).toBe(base);
    expect(hitFor(3)).toBe(Math.round(base * edgeAt(3)));
  });

  it('a boss slain for good leaves star-stones by its tier, once', () => {
    const g = createWorldGame();
    const boss = spawnCreature(g, 'keziah_mason', { x: 0, z: 0, yaw: 0 })!;
    g.events.emit('Vanquished', { entity: boss, name: 'Keziah Mason' });
    expect(g.player.stones).toBe(STAR_STONES.named);
    expect(stonesOf('cthulhu')).toBe(STAR_STONES.great_old_one);
    expect(stonesOf('azathoth')).toBe(STAR_STONES.outer_god);
    expect(stonesOf('deep_one')).toBe(0);
  });

  it("an older save is paid the stones its slain bosses would have left", () => {
    const g = createWorldGame();
    const old = { ...snapshot(g), slain: ['boss:keziah_mason', 'boss:cthulhu', 'cave:1'] } as Record<string, unknown>;
    delete old.stones;
    delete old.reinforced;
    const loaded = createWorldGame({ save: old as never });
    expect(loaded.player.stones).toBe(stonesOfSlain(['boss:keziah_mason', 'boss:cthulhu']));
    expect(loaded.player.stones).toBe(STAR_STONES.named! + STAR_STONES.great_old_one!);
    expect(loaded.player.reinforced.cane).toBe(0);
  });

  it('boss health sits within a soulslike reach of the investigator\'s blows (round 12: 73 to 910 light cane blows)', () => {
    const cane = WEAPONS.cane.moves.light1!.hit!.damage;
    const most = cane * (1 + LEVELS.might.max * LEVELS.might.damage!) * edgeAt(REINFORCE.max);
    const bosses = ENTITIES.flatMap((d) => [d, variantOf(d, 'boss')]).filter((d) => d?.bossScript);
    expect(bosses.length).toBeGreaterThan(40);
    for (const d of bosses) expect(d!.stats.hp / most, d!.id).toBeLessThanOrEqual(90);
    const keziah = ENTITIES.find((d) => d.id === 'keziah_mason')!;
    expect(keziah.stats.hp / cane).toBeLessThanOrEqual(35); // the first boss on the main line, with nothing bought
  });
});
