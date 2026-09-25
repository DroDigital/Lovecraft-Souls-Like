import { describe, expect, it } from 'vitest';
import type { Entity } from '../src/core/ecs';
import { PLAYER_MOVES } from '../src/data/moves';
import { DEEP_ONE } from '../src/data/placeholders';
import { LAUDANUM, SANITY } from '../src/data/tuning';
import { startMove } from '../src/systems/actions';
import { strike } from '../src/systems/combat';
import type { Band, Game } from '../src/systems/components';
import { createGame, stepGame } from '../src/systems/game';
import { auraShare, bandOf, loseSanity, nextBand, setSanity } from '../src/systems/sanity';
import { callsForLaudanum } from '../src/ui/mindHud';
import { place, press, scriptedGame, steps } from './helpers';

const blow = (damage: number) => ({ damage, poise: 0, guard: 5, hitstop: 2, parryable: false, interrupts: false });
const find = (g: Game, model: string): Entity => [...g.ecs.c.model].find(([, m]) => m === model)![0];

function bandLog(g: Game): [Band, Band][] {
  const log: [Band, Band][] = [];
  g.events.on('SanityBandChanged', (e) => log.push([e.from, e.to]));
  return log;
}

describe('sanity bands', () => {
  it.each([
    [100, 'lucid'],
    [70, 'lucid'],
    [69.9, 'uneasy'],
    [40, 'uneasy'],
    [39.9, 'fractured'],
    [15, 'fractured'],
    [14.9, 'unmoored'],
    [0, 'unmoored'],
  ] as const)('sanity %d is %s', (s, band) => {
    expect(bandOf(s)).toBe(band);
  });

  it('falls at a floor at once, but climbs back only 3 points past it', () => {
    expect(nextBand('lucid', 69.9)).toBe('uneasy');
    expect(nextBand('uneasy', 72.9)).toBe('uneasy');
    expect(nextBand('uneasy', 73)).toBe('lucid');
    expect(nextBand('fractured', 42.9)).toBe('fractured');
    expect(nextBand('fractured', 43)).toBe('uneasy');
    expect(nextBand('unmoored', 17.9)).toBe('unmoored');
    expect(nextBand('unmoored', 18)).toBe('fractured');
    expect(nextBand('unmoored', 100)).toBe('lucid');
    expect(nextBand('lucid', 10)).toBe('unmoored');
  });

  it('announces each band change once, and none while sanity wavers inside the gap', () => {
    const { g } = scriptedGame();
    const log = bandLog(g);
    for (const s of [80, 69, 71, 69.5, 72.5, 60]) setSanity(g, s);
    expect(log).toEqual([['lucid', 'uneasy']]);
    setSanity(g, 73);
    setSanity(g, 10);
    expect(log).toEqual([
      ['lucid', 'uneasy'],
      ['uneasy', 'lucid'],
      ['lucid', 'unmoored'],
    ]);
    expect(g.mind.band).toBe('unmoored');
  });

  it('keeps sanity within 0–100', () => {
    const { g } = scriptedGame();
    setSanity(g, 250);
    expect(g.mind.sanity).toBe(100);
    setSanity(g, -5);
    expect(g.mind.sanity).toBe(0);
  });
});

describe('sanity drains', () => {
  it('an aura is whole within auraNear of the body and gone past auraFar', () => {
    expect(auraShare(0)).toBe(1);
    expect(auraShare(SANITY.auraNear)).toBe(1);
    expect(auraShare((SANITY.auraNear + SANITY.auraFar) / 2)).toBeCloseTo(0.5);
    expect(auraShare(SANITY.auraFar)).toBe(0);
  });

  it('drains near a creature with an aura, fading with distance', () => {
    const { g, player, deepOne } = scriptedGame();
    const { aura } = g.ecs.c.dread.get(deepOne)!;
    const r = g.ecs.c.body.get(deepOne)!.radius;
    place(g, deepOne, 0, 0, 0);
    place(g, player, 0, r + SANITY.auraNear - 0.5, Math.PI);
    steps(g, 60);
    expect(g.mind.sanity).toBeCloseTo(100 - aura, 5);
    place(g, player, 0, r + (SANITY.auraNear + SANITY.auraFar) / 2, Math.PI);
    steps(g, 60);
    expect(g.mind.sanity).toBeCloseTo(100 - aura * 1.5, 5);
    place(g, player, 0, r + SANITY.auraFar + 1, Math.PI);
    const before = g.mind.sanity;
    steps(g, 60);
    expect(g.mind.sanity).toBe(before);
  });

  it("landed blows take the attacker's sanityDamage; blocked and dodged ones do not", () => {
    const { g, player, deepOne } = scriptedGame();
    const loss = g.ecs.c.dread.get(deepOne)!.blow;
    place(g, player, 0, 0, 0);
    place(g, deepOne, 0, 1.5, Math.PI);
    strike(g, deepOne, player, blow(10));
    expect(g.mind.sanity).toBe(100 - loss);
    const a = g.ecs.c.actor.get(player)!;
    a.guard = true;
    expect(strike(g, deepOne, player, blow(10))).toBe('blocked');
    a.guard = false;
    startMove(a, 'roll');
    a.frame = 5;
    expect(strike(g, deepOne, player, blow(10))).toBe('dodged');
    expect(g.mind.sanity).toBe(100 - loss);
  });

  it('a roar takes sanity from the investigator in range, through walls', () => {
    const g = createGame({ creature: 'dagon_priest' });
    const priest = find(g, 'creature:dagon_priest');
    g.ecs.c.brain.delete(priest);
    g.ecs.c.dread.get(priest)!.aura = 0;
    const roar = g.ecs.c.actor.get(priest)!.moves.roar.sanity!;
    place(g, priest, -8, -2, 0);
    place(g, g.player.id, -8, 4, Math.PI); // the pillar at (-8, 1) stands between them
    startMove(g.ecs.c.actor.get(priest)!, 'roar');
    steps(g, 60);
    expect(g.mind.sanity).toBeCloseTo(100 - roar.amount, 5);
    place(g, g.player.id, -8, -2 + roar.range + 1, Math.PI);
    startMove(g.ecs.c.actor.get(priest)!, 'roar');
    steps(g, 60);
    expect(g.mind.sanity).toBeCloseTo(100 - roar.amount, 5);
  });

  it('a gaze needs line of sight', () => {
    const g = createGame({ creature: 'yekubian' });
    const gazer = find(g, 'creature:yekubian');
    g.ecs.c.brain.delete(gazer);
    g.ecs.c.dread.get(gazer)!.aura = 0;
    g.mind.seen.add('yekubian'); // no first-sight shock
    const gaze = g.ecs.c.actor.get(gazer)!.moves.gaze.sanity!;
    expect(gaze.sight).toBe(true);
    place(g, gazer, -8, -2, 0);
    place(g, g.player.id, -8, 4, Math.PI);
    startMove(g.ecs.c.actor.get(gazer)!, 'gaze');
    steps(g, 80);
    expect(g.mind.sanity).toBe(100);
    place(g, g.player.id, -4, 4, Math.PI);
    startMove(g.ecs.c.actor.get(gazer)!, 'gaze');
    steps(g, 80);
    expect(g.mind.sanity).toBeCloseTo(100 - gaze.amount, 5);
  });
});

describe('sudden losses', () => {
  it('a loss of SANITY.jolt or more at once is announced; a slow drain is not', () => {
    const g = createGame();
    const lost: number[] = [];
    g.events.on('SanityLost', (e) => lost.push(e.amount));
    loseSanity(g, SANITY.jolt / 3);
    loseSanity(g, 6);
    expect(lost).toEqual([6]);
    setSanity(g, 2);
    loseSanity(g, 10); // only what there was to lose
    expect(lost).toEqual([6, 2]);
  });

  it('a failing mind is pointed to its Laudanum while a dose is left and none is being drunk', () => {
    const g = createGame();
    expect(callsForLaudanum(g)).toBe(false);
    setSanity(g, 39);
    expect(callsForLaudanum(g)).toBe(true);
    startMove(g.ecs.c.actor.get(g.player.id)!, 'drink');
    expect(callsForLaudanum(g)).toBe(false);
    g.ecs.c.actor.get(g.player.id)!.move = null;
    g.player.laudanum = 0;
    expect(callsForLaudanum(g)).toBe(false);
  });
});

describe('what sanity does, and what restores it', () => {
  it('a failing mind deals and takes more damage', () => {
    const { g, player, deepOne } = scriptedGame();
    const hp = (id: Entity): number => g.ecs.c.health.get(id)!.hp;
    strike(g, player, deepOne, blow(20));
    expect(DEEP_ONE.hp - hp(deepOne)).toBe(20);
    setSanity(g, 10);
    const foe = hp(deepOne);
    strike(g, player, deepOne, blow(20));
    expect(foe - hp(deepOne)).toBe(Math.round(20 * SANITY.dealt[3]));
    const me = hp(player);
    strike(g, deepOne, player, blow(20));
    expect(me - hp(player)).toBe(Math.round(20 * SANITY.taken[3]));
  });

  it('a dose of Laudanum restores sanity on its item frame; with none left nothing happens', () => {
    const { g, player } = scriptedGame();
    const a = g.ecs.c.actor.get(player)!;
    setSanity(g, 30);
    stepGame(g, press('item'));
    expect(a.move).toBe('drink');
    expect(g.player.laudanum).toBe(LAUDANUM.doses - 1);
    steps(g, PLAYER_MOVES.drink.item - 1);
    expect(g.mind.sanity).toBe(30);
    steps(g, 1);
    expect(g.mind.sanity).toBe(30 + LAUDANUM.sanity);
    steps(g, PLAYER_MOVES.drink.frames);
    g.player.laudanum = 0;
    stepGame(g, press('item'));
    expect(a.move).toBeNull();
  });

  it('respawning at the Elder Sign restores sanity and Laudanum', () => {
    const { g, player, deepOne } = scriptedGame();
    setSanity(g, 20);
    g.player.laudanum = 0;
    strike(g, deepOne, player, blow(9999));
    steps(g, PLAYER_MOVES.death.frames + 5);
    expect(g.mind.sanity).toBe(SANITY.max);
    expect(g.mind.band).toBe('lucid');
    expect(g.player.laudanum).toBe(LAUDANUM.doses);
  });
});
