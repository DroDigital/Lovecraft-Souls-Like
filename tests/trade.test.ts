import { describe, expect, it } from 'vitest';
import { OIL, REAGENT } from '../src/data/tuning';
import { WARES } from '../src/data/wares';
import { createGame, createWorldGame } from '../src/systems/game';
import { buy, canBuy, hasRoom, stockLeft } from '../src/systems/trade';
import { talk } from '../src/systems/npcs';
import { parseSave, snapshot } from '../src/systems/save';
import { place, press, scriptedGame, steps } from './helpers';
import { record } from './worldHelpers';

describe('Dr. Morgan trades (round 12)', () => {
  it('his talk ends on his wares', () => {
    const g = createWorldGame();
    const heard = record(g, 'Talked');
    talk(g, 'morgan');
    expect(heard[0].shop).toBe('morgan');
  });

  it('a flask costs its Echoes, and no more are sold than can be carried', () => {
    const g = createWorldGame();
    g.player.echoes = WARES.oil.price * (OIL.carry + 2);
    for (let i = 0; i < OIL.carry; i++) expect(buy(g, 'oil')).toBe(true);
    expect(g.player.oil).toBe(OIL.carry);
    expect(canBuy(g, 'oil')).toBe(false);
    expect(g.player.echoes).toBe(WARES.oil.price * 2);
  });

  it('says whether the pocket has room, apart from the purse (the shop names a full one, round 24)', () => {
    const g = createWorldGame();
    g.player.echoes = 0;
    expect(hasRoom(g, 'oil')).toBe(true);
    expect(canBuy(g, 'oil')).toBe(false); // no purse
    g.player.oil = OIL.carry;
    g.player.echoes = 1e6;
    expect(hasRoom(g, 'oil')).toBe(false);
    expect(canBuy(g, 'oil')).toBe(false); // no room
  });

  it('a star-stone sells only so often in a dream, and the count is saved', () => {
    const g = createWorldGame();
    g.player.echoes = 1e6;
    for (let i = 0; i < WARES.star_stone.stock!; i++) expect(buy(g, 'star_stone')).toBe(true);
    expect(stockLeft(g, 'star_stone')).toBe(0);
    expect(buy(g, 'star_stone')).toBe(false);
    expect(g.player.stones).toBe(WARES.star_stone.stock);
    const loaded = createWorldGame({ save: parseSave(JSON.stringify(snapshot(g)))! });
    expect(stockLeft(loaded, 'star_stone')).toBe(0);
  });

  it('a Silver Vial is refused to a kit already at its most', () => {
    const g = createWorldGame();
    g.player.echoes = 1e6;
    g.player.reagentMax = REAGENT.maxDoses;
    expect(canBuy(g, 'vial')).toBe(false);
  });

  it('short of Echoes, nothing is sold', () => {
    const g = createWorldGame();
    g.player.echoes = WARES.oil.price - 1;
    expect(buy(g, 'oil')).toBe(false);
    expect(g.player.oil).toBe(0);
  });
});

describe('a flask of lamp oil (round 12)', () => {
  it('is lobbed at the foe locked on, and burns it where it lands, not the thrower', () => {
    const { g, player, deepOne } = scriptedGame();
    place(g, player, 0, 8, Math.PI);
    place(g, deepOne, 0, 0, 0);
    g.lock.target = deepOne;
    g.player.oil = 1;
    const h = g.ecs.c.health.get(deepOne)!;
    const before = h.hp;
    steps(g, 1, press('throw'));
    expect(g.player.oil).toBe(0);
    steps(g, 90);
    const pools = [...g.ecs.c.hazard.values()];
    expect(pools.some((p) => p.fire && p.faction === 'player')).toBe(true);
    expect(h.hp).toBeLessThan(before);
    expect(g.ecs.c.health.get(player)!.hp).toBe(g.ecs.c.health.get(player)!.max);
  });

  it('with none carried, nothing is thrown', () => {
    const g = createGame();
    steps(g, 1, press('throw'));
    expect(g.ecs.c.actor.get(g.player.id)!.move).not.toBe('throw');
  });
});
