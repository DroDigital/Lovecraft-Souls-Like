import { describe, expect, it } from 'vitest';
import { emptyInput } from '../src/core/input';
import { DEEP_ONE } from '../src/data/placeholders';
import { PLAYER, SIM, STAMINA } from '../src/data/tuning';
import { startMove } from '../src/systems/actions';
import type { Stamina } from '../src/systems/components';
import { stepGame } from '../src/systems/game';
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
