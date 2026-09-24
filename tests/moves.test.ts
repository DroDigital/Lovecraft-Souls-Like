import { describe, expect, it } from 'vitest';
import { PLAYER_MOVES, REACTIONS, type MoveDef, type MoveSet, type Window } from '../src/data/moves';
import { DEEP_ONE, TRAINING_DUMMY } from '../src/data/placeholders';

const SETS: Record<string, MoveSet> = { player: PLAYER_MOVES, deepOne: DEEP_ONE.moves, dummy: TRAINING_DUMMY.moves };

const windows = (m: MoveDef): Window[] =>
  [m.iframes, m.parry, m.interrupt, m.hit?.window, m.motion?.window, m.track?.window].filter((w) => w !== undefined);

describe('move data', () => {
  it.each(Object.entries(SETS))('%s: every window, cancel, hitstop and chain is valid', (_, set) => {
    for (const reaction of Object.keys(REACTIONS)) expect(set[reaction], reaction).toBeDefined();
    for (const [id, m] of Object.entries(set)) {
      expect(m.frames, id).toBeGreaterThan(0);
      for (const [from, to] of windows(m)) {
        expect(from, id).toBeGreaterThanOrEqual(0);
        expect(to, id).toBeGreaterThan(from);
        expect(to, id).toBeLessThanOrEqual(m.frames);
      }
      if (m.cancel !== undefined) expect(m.cancel, id).toBeLessThan(m.frames);
      for (const stop of [m.hit?.hitstop, m.shot?.hitstop]) {
        if (stop !== undefined) expect([2, 3, 4], id).toContain(stop);
      }
      if (m.shot) expect(m.shot.frame, id).toBeLessThan(m.frames);
      if (m.interrupt && m.hit) expect(m.interrupt[1], `${id} interrupt is a wind-up`).toBeLessThanOrEqual(m.hit.window[0]);
      for (const next of Object.values(m.combo ?? {})) expect(set[next], `${id} → ${next}`).toBeDefined();
    }
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
