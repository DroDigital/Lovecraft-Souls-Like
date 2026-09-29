import { describe, expect, it } from 'vitest';
import { emptyInput } from '../src/core/input';
import { DEEP_ONE } from '../src/data/placeholders';
import { LEVELS, PLAYER, SIM, STAMINA } from '../src/data/tuning';
import { PLAYER_MOVES } from '../src/data/moves';
import { startMove } from '../src/systems/actions';
import type { Stamina } from '../src/systems/components';
import { applyLevels, staminaRegen } from '../src/systems/levels';
import { createGame, stepGame } from '../src/systems/game';
import { absorb, canAfford, spend, tickStamina } from '../src/systems/stamina';
import { place, press, scriptedGame, steps } from './helpers';

const dt = 1 / SIM.hz;
const bar = (value = 100): Stamina => ({ value, max: 100, delay: 0 });

describe('stamina rules', () => {
  it('pays costs, never drops below zero, and delays regen after spending', () => {
    const s = bar(20);
    spend(s, 14);
    expect(s).toEqual({ value: 6, max: 100, delay: STAMINA.regenDelay });
    spend(s, 14);
    expect(s.value).toBe(0);
  });

  it('regenerates only after the delay, slower while guarding', () => {
    const s = bar(50);
    spend(s, 10);
    for (let i = 0; i < STAMINA.regenDelay; i++) tickStamina(s, 'idle', dt);
    expect(s.value).toBe(40);
    tickStamina(s, 'idle', dt);
    expect(s.value).toBeCloseTo(40 + STAMINA.regen * dt);
    const g = bar(40);
    tickStamina(g, 'guard', dt);
    expect(g.value).toBeCloseTo(40 + STAMINA.regen * dt * STAMINA.guardRegen);
    const full = bar(100);
    tickStamina(full, 'idle', dt);
    expect(full.value).toBe(100);
  });

  it('drains while sprinting and holds regen off', () => {
    const s = bar(10);
    for (let i = 0; i < SIM.hz; i++) tickStamina(s, 'sprint', dt);
    expect(s.value).toBe(0);
    expect(s.delay).toBe(STAMINA.regenDelay);
  });

  it('lets any positive stamina start an action; zero cannot', () => {
    expect(canAfford(bar(0.1))).toBe(true);
    expect(canAfford(bar(0))).toBe(false);
    expect(canAfford(undefined)).toBe(true); // enemies have no stamina bar
  });

  it('breaks the guard exactly when a blocked hit empties the bar', () => {
    expect(absorb(bar(30), 22)).toBe(false);
    expect(absorb(bar(22), 22)).toBe(true);
    expect(absorb(bar(5), 22)).toBe(true);
  });
});

describe('stamina in play', () => {
  it('charges each action its cost, and an empty bar refuses the next one', () => {
    const { g } = scriptedGame();
    const s = g.ecs.c.stamina.get(g.player.id)!;
    stepGame(g, press('light'));
    expect(s.value).toBe(PLAYER.stamina - 14);
    steps(g, 40);
    const a = g.ecs.c.actor.get(g.player.id)!;
    expect(a.move).toBeNull();
    s.value = 0;
    s.delay = STAMINA.regenDelay; // emptied and still recovering
    stepGame(g, press('light'));
    expect(a.move).toBeNull();
    expect(s.value).toBe(0);
  });

  it('blocks frontal hits with stamina, and guard-breaks when a hit empties it', () => {
    const { g, player, deepOne } = scriptedGame();
    const s = g.ecs.c.stamina.get(player)!;
    const a = g.ecs.c.actor.get(player)!;
    const hp = g.ecs.c.health.get(player)!;
    const claw = DEEP_ONE.moves.claw;
    const block = press('block');
    for (const [start, outcome] of [
      [100, 'blocked'],
      [10, 'guardBreak'],
    ] as const) {
      place(g, player, 0, 1.2, Math.PI);
      place(g, deepOne, 0, 0, 0);
      s.value = start;
      stepGame(g, block);
      startMove(g.ecs.c.actor.get(deepOne)!, 'claw');
      const seen: string[] = [];
      const off = g.events.on('Hit', (e) => seen.push(e.outcome));
      steps(g, claw.hit!.window[1] + 1, { ...emptyInput(), held: { ...block.held } });
      off();
      expect(seen).toEqual([outcome]);
      expect(hp.hp).toBe(PLAYER.hp);
      expect(s.value).toBeCloseTo(Math.max(0, start - claw.hit!.guard), 0);
      if (outcome === 'guardBreak') expect(a.move).toBe('guardBreak');
      steps(g, 120);
    }
  });
});

describe('stamina returns slowly, and faster with each level of Endurance (round 22)', () => {
  /** Seconds a bar takes to fill from empty once its delay is over. */
  const fill = (regen: number | undefined, max = 100): number => {
    const s: Stamina = { value: 0, max, delay: 0, regen };
    let frames = 0;
    while (s.value < max && frames < 60 * 60) (tickStamina(s, 'idle', dt), frames++);
    return frames / SIM.hz;
  };

  it('a first-level investigator takes long to refill, and the twentieth regains it as fast as everyone once did', () => {
    expect(fill(undefined)).toBeGreaterThan(4); // (it was under two and a half seconds)
    expect(staminaRegen(0)).toBe(STAMINA.regen);
    expect(staminaRegen(LEVELS.endurance.max)).toBeCloseTo(40, 6);
    for (let n = 1; n <= LEVELS.endurance.max; n++) expect(staminaRegen(n)).toBeGreaterThan(staminaRegen(n - 1));
  });

  it('a set rate is the one used, and a bar without one takes the start\'s', () => {
    expect(fill(60)).toBeLessThan(fill(undefined));
    expect(fill(staminaRegen(0))).toBeCloseTo(fill(undefined), 6);
  });

  it('nothing comes back between rolls run on at their fastest, so a chain of them draws on the bar alone', () => {
    const roll = PLAYER_MOVES.roll;
    expect(STAMINA.regenDelay).toBeGreaterThanOrEqual(roll.frames); // the delay outlasts the whole roll
    const s = bar(100);
    let rolls = 0;
    while (s.value > 0) {
      spend(s, roll.stamina!);
      rolls++;
      for (let f = 0; f < roll.cancel!; f++) tickStamina(s, 'idle', dt); // the next roll as soon as the last may be cut short
    }
    expect(rolls).toBeLessThanOrEqual(6);
    const full = bar(100);
    for (let n = 0; n < 4; n++) {
      spend(full, roll.stamina!);
      for (let f = 0; f < roll.frames; f++) tickStamina(full, 'idle', dt); // or as it ends
    }
    expect(full.value).toBeCloseTo(100 - 4 * roll.stamina!, 6);
  });

  it('levelling Endurance sets how fast the investigator regains stamina, and a save keeps it', () => {
    const g = createGame();
    const s = g.ecs.c.stamina.get(g.player.id)!;
    g.player.levels.endurance = 5;
    applyLevels(g);
    expect(s.regen).toBeCloseTo(STAMINA.regen + 5 * LEVELS.endurance.regen!, 6);
    expect(s.max).toBe(PLAYER.stamina + 5 * LEVELS.endurance.stamina!);
  });
});
