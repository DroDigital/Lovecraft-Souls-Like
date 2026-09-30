// Rounds found and bought, and the gun upgraded (round 22); split from gun.test.ts in round 24.
import { describe, expect, it } from 'vitest';
import { NPCS } from '../src/data/npcs';
import { DUNGEONS } from '../src/data/dungeons';
import { REGIONS } from '../src/data/regions';
import { GUN, LEVELS } from '../src/data/tuning';
import { SHOPS, WARES } from '../src/data/wares';
import type { GameEvents } from '../src/systems/components';
import { carryOf, parseCarry } from '../src/systems/cycles';
import { createGame, createWorldGame } from '../src/systems/game';
import { canUpgradeGun, gunCost, giveRounds, upgradeGun } from '../src/systems/gun';
import { spawnTome } from '../src/systems/insight';
import { parseSave, snapshot } from '../src/systems/save';
import { buy, canBuy } from '../src/systems/trade';
import { roundCaches } from '../src/world/caches';
import { worldLayout } from '../src/world/placements';
import { steps } from './helpers';
import { range } from './gunHelpers';

describe('rounds are found and bought (round 22)', () => {
  const at = (g: ReturnType<typeof createGame>) => ({ ...g.ecs.c.transform.get(g.player.id)!.pos, yaw: 0 });

  it('a box lying about is taken on touch, and taken for good', () => {
    const g = createWorldGame();
    g.player.rounds = 2;
    spawnTome(g, { ...at(g), name: 'Cartridges: test', insight: 0, rounds: 6 });
    steps(g, 1);
    expect(g.player.rounds).toBe(8);
    expect(g.overworld!.read.has('Cartridges: test')).toBe(true);
    expect([...g.ecs.c.tome.values()].some((t) => t.name === 'Cartridges: test')).toBe(false);
  });

  it('is left where it lies when they cannot carry it all, with a word now and then, until they can', () => {
    const g = createWorldGame();
    g.player.rounds = GUN.carry - 2;
    const said: string[] = [];
    g.events.on('Notice', (e) => said.push(e.text));
    spawnTome(g, { ...at(g), name: 'Cartridges: full', insight: 0, rounds: 6 });
    steps(g, 200);
    expect([...g.ecs.c.tome.values()].some((t) => t.name === 'Cartridges: full')).toBe(true);
    expect(g.player.rounds).toBe(GUN.carry - 2);
    expect(said.filter((s) => s === 'YOU CARRY ALL THE ROUNDS YOU CAN').length).toBeGreaterThan(0);
    expect(said.length).toBeLessThan(200 / 60 / 3 + 3); // not every step
    g.player.rounds = 0;
    steps(g, 1);
    expect(g.player.rounds).toBe(6);
    expect(giveRounds(g, GUN.carry)).toBe(false);
  });

  it('a merchant sells a box for Echoes, and refuses when the pocket is full or the purse empty', () => {
    const g = createWorldGame();
    g.player.echoes = WARES.rounds.price * 3;
    g.player.rounds = 0;
    expect(buy(g, 'rounds')).toBe(true);
    expect(g.player.rounds).toBe(GUN.box);
    expect(g.player.echoes).toBe(WARES.rounds.price * 2);
    g.player.rounds = GUN.carry - GUN.box + 1;
    expect(canBuy(g, 'rounds')).toBe(false); // it would not fit
    expect(buy(g, 'rounds')).toBe(false);
    g.player.rounds = 0;
    g.player.echoes = WARES.rounds.price - 1;
    expect(buy(g, 'rounds')).toBe(false);
    expect(WARES.rounds.stock).toBeUndefined(); // the pocket is the limit, not the stock
  });

  it('three people trade in them, each a real person with a real shop', () => {
    const sellers = NPCS.filter((n) => n.shop && SHOPS[n.shop]?.includes('rounds')).map((n) => n.id);
    expect(sellers.sort()).toEqual(['curtis', 'dyer', 'morgan']);
    for (const n of NPCS) if (n.shop) expect(SHOPS, n.id).toHaveProperty(n.shop);
  });

  it('lie in every dungeon that keeps a cache, and about the open world of every region', () => {
    const w = worldLayout();
    const boxes = w.tomes.filter((t) => t.rounds);
    for (const d of DUNGEONS) expect(roundCaches(d).size, d.id).toBeGreaterThan(0);
    for (const d of DUNGEONS) {
      for (const room of roundCaches(d).keys()) expect(boxes.some((b) => b.name === `Cartridges: ${d.id}/${room}`), `${d.id}/${room}`).toBe(true);
    }
    for (const r of REGIONS) expect(boxes.filter((b) => b.region === r.id && b.name.startsWith(`Cartridges: ${r.id} `)).length, r.id).toBeGreaterThan(0);
    for (const b of boxes) expect(b.rounds).toBeGreaterThanOrEqual(GUN.find);
    expect(new Set(boxes.map((b) => b.name)).size).toBe(boxes.length);
    const total = boxes.reduce((n, b) => n + b.rounds!, 0);
    expect(total).toBeGreaterThan(100); // enough to be found around the map...
    expect(total).toBeLessThan(350); // ...and few enough to be spent wisely
  });
});

describe('the gun is upgraded with star-stones at an Elder Sign (round 22)', () => {
  it('each level costs its stones, adds to the damage and puts the fall-off off, up to the most', () => {
    const g = createWorldGame();
    g.player.stones = 0;
    expect(canUpgradeGun(g)).toBe(false);
    expect(upgradeGun(g)).toBe(false);
    for (let l = 0; l < GUN.level.max; l++) {
      const cost = GUN.level.cost[l];
      expect(gunCost(g)).toBe(cost);
      g.player.stones = cost - 1;
      expect(upgradeGun(g)).toBe(false);
      g.player.stones = cost + 2;
      expect(upgradeGun(g)).toBe(true);
      expect(g.player.stones).toBe(2);
      expect(g.player.gun).toBe(l + 1);
    }
    g.player.stones = 99;
    expect(gunCost(g)).toBeUndefined();
    expect(upgradeGun(g)).toBe(false);
    expect(g.player.gun).toBe(GUN.level.max);
  });

  it('a levelled gun hits harder and more often from afar', () => {
    const [plain, tuned] = [range(9), range(9)];
    tuned.g.player.gun = GUN.level.max;
    plain.volley(300);
    tuned.volley(300);
    expect(tuned.hits.length).toBeGreaterThan(plain.hits.length);
    const mean = (hs: GameEvents['Hit'][]): number => hs.reduce((n, h) => n + h.damage, 0) / Math.max(1, hs.length);
    expect(mean(tuned.hits)).toBeGreaterThan(mean(plain.hits) * 2);
    expect(LEVELS.might.damage).toBeGreaterThan(0); // (Might still scales it: strike())
  });

  it('is kept in a save, and carried into a new journey with the rounds started again', () => {
    const g = createWorldGame();
    Object.assign(g.player, { ammo: 3, rounds: 11, gun: 2 });
    const back = createWorldGame({ save: parseSave(JSON.stringify(snapshot(g)))! });
    expect(back.player).toMatchObject({ ammo: 3, rounds: 11, gun: 2 });
    const old = JSON.parse(JSON.stringify(snapshot(g))) as Record<string, unknown>;
    for (const k of ['ammo', 'rounds', 'gun']) delete old[k];
    const before = createWorldGame({ save: parseSave(JSON.stringify(old))! });
    expect(before.player).toMatchObject({ ammo: GUN.chamber, rounds: GUN.start, gun: 0 }); // a save from before the limits
    const next = createWorldGame({ carry: parseCarry(JSON.parse(JSON.stringify(carryOf(g))))! });
    expect(next.player).toMatchObject({ gun: 2, ammo: GUN.chamber, rounds: GUN.start });
    expect(parseSave(JSON.stringify({ ...snapshot(g), ammo: 'many' }))).toBeNull();
  });
});
