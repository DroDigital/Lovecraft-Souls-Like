import { describe, expect, it } from 'vitest';
import { LAUDANUM, LEVEL_COST, LEVELS, PLAYER } from '../src/data/tuning';
import type { GameEvents } from '../src/systems/components';
import { DUNGEONS } from '../src/data/dungeons';
import { createGame, createWorldGame } from '../src/systems/game';
import { changeInsight, buyUpgrade } from '../src/systems/insight';
import { buyLevel, laudanumMax, levelCost, levelsBought, might } from '../src/systems/levels';
import { strike } from '../src/systems/combat';
import { worldLayout } from '../src/world/placements';
import { place, steps } from './helpers';

describe('levels bought with Echoes (systems/levels.ts)', () => {
  it('each level costs more than the last, from the base', () => {
    expect(levelCost(0)).toBe(LEVEL_COST.base);
    for (let n = 1; n < 60; n++) expect(levelCost(n)).toBeGreaterThan(levelCost(n - 1));
  });

  it('spends Echoes on Vigour and Endurance, which lift health and stamina at once', () => {
    const g = createGame();
    const me = g.player.id;
    const events: GameEvents['LevelUp'][] = [];
    g.events.on('LevelUp', (e) => events.push(e));
    g.ecs.c.health.get(me)!.hp = 50;
    g.player.echoes = levelCost(0) + levelCost(1);
    expect(buyLevel(g, 'vigour')).toBe(true);
    expect(g.ecs.c.health.get(me)!).toMatchObject({ max: PLAYER.hp + LEVELS.vigour.hp!, hp: 50 + LEVELS.vigour.hp! }); // wounds kept
    expect(buyLevel(g, 'endurance')).toBe(true);
    expect(g.ecs.c.stamina.get(me)!.max).toBe(PLAYER.stamina + LEVELS.endurance.stamina!);
    expect(g.player.echoes).toBe(0);
    expect(levelsBought(g)).toBe(2);
    expect(events).toEqual([
      { attribute: 'vigour', level: 1, total: 1 },
      { attribute: 'endurance', level: 1, total: 2 },
    ]);
  });

  it('refuses when short of Echoes or at the most levels', () => {
    const g = createGame();
    g.player.echoes = levelCost(0) - 1;
    expect(buyLevel(g, 'might')).toBe(false);
    g.player.echoes = 1e9;
    g.player.levels.might = LEVELS.might.max;
    expect(buyLevel(g, 'might')).toBe(false);
    expect(g.player.echoes).toBe(1e9);
  });

  it("Might adds weight to the investigator's blows, and to no one else's", () => {
    const g = createGame();
    const [player, dummy] = [...g.ecs.c.combatant.keys()];
    g.player.levels.might = 5;
    expect(might(g, player)).toBeCloseTo(1 + 5 * LEVELS.might.damage!);
    expect(might(g, dummy)).toBe(1);
    const h = g.ecs.c.health.get(dummy)!;
    const before = h.hp;
    strike(g, player, dummy, { damage: 20, poise: 0, guard: 0, hitstop: 0, parryable: false, interrupts: false });
    expect(before - h.hp).toBe(Math.round(20 * (1 + 5 * LEVELS.might.damage!)));
  });

  it('every dungeon with a free room keeps an Echo cache, and taking one pays once', () => {
    const caches = worldLayout().tomes.filter((t) => t.echoes);
    const roomy = DUNGEONS.filter((d) => d.rooms.some((r) => r.from && !r.sign && !r.gate && !r.boss && !r.tome && !r.vial && !r.ally));
    expect(new Set(caches.map((t) => t.name.replace(/^Echoes: /, '').split('/')[0]))).toEqual(new Set(roomy.map((d) => d.id)));
    const g = createWorldGame();
    const t = caches[0];
    const cache = [...g.ecs.c.tome].find(([, x]) => x.name === t.name)![0];
    expect(g.ecs.c.model.get(cache)).toBe('cache');
    place(g, g.player.id, t.at.x, t.at.z, 0);
    steps(g, 2);
    expect(g.player.echoes).toBe(t.echoes);
    expect(g.ecs.c.tome.has(cache)).toBe(false);
    expect(g.overworld!.read.has(t.name)).toBe(true); // a reload leaves it taken
  });

  it('a Draught bought with insight carries one more dose of Laudanum', () => {
    const g = createGame();
    expect(laudanumMax(g)).toBe(LAUDANUM.doses);
    changeInsight(g, 3, 'debug', 'test');
    expect(buyUpgrade(g, 'draught')).toBe(true);
    expect(laudanumMax(g)).toBe(LAUDANUM.doses + 1);
  });
});
