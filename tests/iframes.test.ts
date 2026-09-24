import { describe, expect, it } from 'vitest';
import { PLAYER_MOVES } from '../src/data/moves';
import { createActor, startMove } from '../src/systems/actions';
import { resolveHit, type Blow } from '../src/systems/combat';
import type { HitOutcome } from '../src/systems/components';
import { range } from './helpers';

const blow: Blow = { damage: 10, poise: 5, guard: 5, hitstop: 2, parryable: true, interrupts: false };

/** Outcome of a frontal blow landing on the player on `frame` of `move`. */
function outcomeAt(move: keyof typeof PLAYER_MOVES, frame: number, guard = false): HitOutcome {
  const actor = createActor(PLAYER_MOVES);
  startMove(actor, move);
  actor.frame = frame;
  actor.guard = guard;
  const defender = {
    actor,
    health: { hp: 100, max: 100, immortal: false, calm: 0 },
    poise: { value: 50, max: 50, calm: 0 },
    stamina: { value: 100, max: 100, delay: 0 },
  };
  return resolveHit(defender, blow, true).outcome;
}

const framesWhere = (move: keyof typeof PLAYER_MOVES, outcome: HitOutcome): number[] =>
  range(0, PLAYER_MOVES[move].frames).filter((f) => outcomeAt(move, f) === outcome);

describe('i-frame windows', () => {
  it('the roll is invulnerable on exactly its i-frame window', () => {
    expect(PLAYER_MOVES.roll.iframes).toEqual([2, 15]);
    expect(framesWhere('roll', 'dodged')).toEqual(range(2, 15));
    expect(outcomeAt('roll', 1)).toBe('hit');
    expect(outcomeAt('roll', 15)).toBe('hit');
  });

  it('the backstep has a shorter window', () => {
    expect(framesWhere('backstep', 'dodged')).toEqual(range(1, 7));
  });

  it('attacks have no i-frames', () => {
    for (const move of ['light1', 'heavy1', 'shoot'] as const) expect(framesWhere(move, 'dodged')).toEqual([]);
  });

  it('i-frames beat a raised guard and the parry window only parries on its frames', () => {
    expect(outcomeAt('roll', 5, true)).toBe('dodged');
    expect(framesWhere('parry', 'parried')).toEqual(range(3, 11));
  });
});
