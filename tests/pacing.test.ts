import { describe, expect, it } from 'vitest';
import type { Entity } from '../src/core/ecs';
import { PLAYER, SANITY } from '../src/data/tuning';
import { startMove } from '../src/systems/actions';
import { strike, type Blow } from '../src/systems/combat';
import type { Game } from '../src/systems/components';
import { createGame } from '../src/systems/game';
import { tollOnce } from '../src/systems/sanity';
import { place, scriptedGame, steps } from './helpers';

const find = (g: Game, model: string): Entity => [...g.ecs.c.model].find(([, m]) => m === model)![0];
const heavy: Blow = { damage: 5, poise: 999, guard: 0, hitstop: 0, parryable: false, interrupts: false };

describe('fair pacing (round 12)', () => {
  it('a staggered investigator cannot be staggered again within the respite; a foe can', () => {
    const { g, player, deepOne } = scriptedGame();
    expect(strike(g, deepOne, player, heavy)).toBe('stagger');
    expect(strike(g, deepOne, player, heavy)).toBe('hit'); // it still hurts
    steps(g, PLAYER.staggerRespite);
    expect(strike(g, deepOne, player, heavy)).toBe('stagger');
    expect(strike(g, player, deepOne, heavy)).toBe('stagger');
    expect(strike(g, player, deepOne, heavy)).toBe('stagger');
  });

  it('within a spell a toll takes only what it exceeds the greatest already taken', () => {
    const t = { at: -Infinity, amount: 0 };
    expect(tollOnce(t, 0, 10, 60)).toBe(10);
    expect(tollOnce(t, 20, 10, 60)).toBe(0);
    expect(tollOnce(t, 30, 18, 60)).toBe(8);
    expect(tollOnce(t, 59, 5, 60)).toBe(0);
    expect(tollOnce(t, 60, 5, 60)).toBe(5); // a new spell
  });

  it('blows landing together take the mind once, the greatest of them', () => {
    const { g, player, deepOne } = scriptedGame();
    const blow = g.ecs.c.dread.get(deepOne)!.blow;
    expect(blow).toBeGreaterThan(0);
    const light: Blow = { ...heavy, poise: 0 };
    for (let i = 0; i < 4; i++) strike(g, deepOne, player, light);
    expect(g.mind.sanity).toBeCloseTo(100 - blow, 5);
    steps(g, SANITY.volley);
    strike(g, deepOne, player, light);
    expect(g.mind.sanity).toBeLessThan(100 - blow - 0.5);
  });

  it("Keziah's barrage at arm's length no longer takes the mind and the body whole (it took 97 sanity in 3.5 s)", () => {
    const g = createGame({ creature: 'keziah_mason' });
    const keziah = find(g, 'creature:keziah_mason');
    g.ecs.c.brain.delete(keziah);
    g.mind.seen.add('keziah_mason');
    place(g, keziah, 0, 0, 0);
    place(g, g.player.id, 0, 2, Math.PI);
    for (let i = 0; i < 2; i++) {
      startMove(g.ecs.c.actor.get(keziah)!, 'barrage');
      steps(g, 105); // 3.5 s over the two
    }
    expect(100 - g.mind.sanity).toBeLessThan(35);
    expect(g.ecs.c.actor.get(g.player.id)!.move).not.toBe('death');
  });
});
