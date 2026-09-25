import { describe, expect, it } from 'vitest';
import { emptyInput, type InputFrame } from '../src/core/input';
import { PLAYER_MOVES } from '../src/data/moves';
import { PLAYER, SIM } from '../src/data/tuning';
import type { Game } from '../src/systems/components';
import { stepGame } from '../src/systems/game';
import { press, scriptedGame, steps } from './helpers';

const tap = (move: Partial<InputFrame> = {}): InputFrame => ({ ...emptyInput(), ...move, pressed: { ...emptyInput().pressed, dodge: true }, released: { ...emptyInput().released, dodge: true } });
const forward: InputFrame = { ...emptyInput(), moveY: 1 };

/** Taps dodge with no direction every few frames for `frames` frames; returns how many backsteps began and how far the investigator went. */
function spamBackstep(g: Game, frames: number, every: number): { started: number; metres: number } {
  const a = g.ecs.c.actor.get(g.player.id)!;
  const tr = g.ecs.c.transform.get(g.player.id)!;
  const from = { ...tr.pos };
  let started = 0;
  for (let i = 0; i < frames; i++) {
    stepGame(g, i % every === 0 ? tap() : emptyInput());
    if (a.move === 'backstep' && a.frame === 0) started++;
  }
  return { started, metres: Math.hypot(tr.pos.x - from.x, tr.pos.z - from.z) };
}

describe('dodges flow on and cannot be spammed', () => {
  it('a roll run out of lands straight into the stride, with no stop', () => {
    const { g } = scriptedGame();
    const a = g.ecs.c.actor.get(g.player.id)!;
    const tr = g.ecs.c.transform.get(g.player.id)!;
    stepGame(g, forward);
    stepGame(g, tap({ moveY: 1 }));
    expect(a.move).toBe('roll');
    const land = PLAYER_MOVES.roll.release!;
    for (let i = 1; i < land; i++) stepGame(g, forward);
    const z = tr.pos.z;
    stepGame(g, forward);
    expect(a.move).toBeNull(); // the recovery is walked out of...
    expect(z - tr.pos.z).toBeCloseTo(PLAYER.walkSpeed / SIM.hz); // ...at once, at a walk (the camera looks −z)
  });

  it('let go of the stick, and the roll comes up through its whole recovery', () => {
    const { g } = scriptedGame();
    const a = g.ecs.c.actor.get(g.player.id)!;
    stepGame(g, forward);
    stepGame(g, tap({ moveY: 1 }));
    steps(g, PLAYER_MOVES.roll.release! + 2);
    expect(a.move).toBe('roll');
  });

  it('a backstep never chains into itself: spammed, it is slower than walking', () => {
    const { g } = scriptedGame();
    const { started, metres } = spamBackstep(g, 120, 3);
    const cycle = PLAYER_MOVES.backstep.frames + PLAYER_MOVES.backstep.rest!;
    expect(started).toBeLessThanOrEqual(Math.ceil(120 / cycle));
    expect(metres / (120 / SIM.hz)).toBeLessThan(PLAYER.walkSpeed);
  });

  it('but it still turns into an attack, or a roll, in its cancel window', () => {
    for (const next of ['attack', 'roll'] as const) {
      const { g } = scriptedGame();
      const a = g.ecs.c.actor.get(g.player.id)!;
      stepGame(g, tap());
      expect(a.move).toBe('backstep');
      steps(g, PLAYER_MOVES.backstep.cancel! - 1);
      stepGame(g, next === 'attack' ? press('light') : tap({ moveY: 1 }));
      expect(a.move, next).toBe(next === 'attack' ? 'light1' : 'roll');
    }
  });
});
