import { describe, expect, it } from 'vitest';
import { PLAYER_MOVES, type MoveSet } from '../src/data/moves';
import { DEEP_ONE, TRAINING_DUMMY } from '../src/data/placeholders';
import { expectValidMoveSet } from './helpers';

const SETS: Record<string, MoveSet> = { player: PLAYER_MOVES, deepOne: DEEP_ONE.moves, dummy: TRAINING_DUMMY.moves };

describe('move data', () => {
  it.each(Object.entries(SETS))('%s: every window, cancel, hitstop and chain is valid', (_, set) => {
    expectValidMoveSet(set);
  });

  it('chains light1 → light2 → light3 → light1 and heavy1 ⇄ heavy2', () => {
    expect([PLAYER_MOVES.light1, PLAYER_MOVES.light2, PLAYER_MOVES.light3].map((m) => m.combo?.light)).toEqual([
      'light2',
      'light3',
      'light1',
    ]);
    expect([PLAYER_MOVES.heavy1.combo?.heavy, PLAYER_MOVES.heavy2.combo?.heavy]).toEqual(['heavy2', 'heavy1']);
  });

  it('the Deep One only picks attacks it has', () => {
    for (const a of DEEP_ONE.brain!.attacks) expect(DEEP_ONE.moves[a.move]?.hit, a.move).toBeDefined();
  });
});
