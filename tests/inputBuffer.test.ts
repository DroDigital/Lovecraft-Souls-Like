import { describe, expect, it } from 'vitest';
import { emptyInput } from '../src/core/input';
import { PLAYER_MOVES } from '../src/data/moves';
import { startMove } from '../src/systems/actions';
import type { Game } from '../src/systems/components';
import { stepGame } from '../src/systems/game';
import { ageBuffer, BUFFER_FRAMES, bufferPress, createBuffer, takeBuffered } from '../src/systems/inputBuffer';
import { press, scriptedGame, steps } from './helpers';

describe('input buffer (pure)', () => {
  it('holds one action for 150 ms (9 frames at 60 Hz)', () => {
    expect(BUFFER_FRAMES).toBe(9);
    const b = createBuffer();
    bufferPress(b, 'light');
    for (let i = 0; i < BUFFER_FRAMES; i++) ageBuffer(b);
    expect(takeBuffered(b)).toBe('light');
    bufferPress(b, 'light');
    for (let i = 0; i <= BUFFER_FRAMES; i++) ageBuffer(b);
    expect(takeBuffered(b)).toBeNull();
  });

  it('keeps only the newest press and empties on take', () => {
    const b = createBuffer();
    bufferPress(b, 'light');
    bufferPress(b, 'parry');
    expect(takeBuffered(b)).toBe('parry');
    expect(takeBuffered(b)).toBeNull();
  });
});

describe('input buffer (in the action system)', () => {
  const actor = (g: Game) => g.ecs.c.actor.get(g.player.id)!;

  it('starts a press immediately when the player is free', () => {
    const { g } = scriptedGame();
    stepGame(g, press('light'));
    expect(actor(g)).toMatchObject({ move: 'light1', frame: 0 });
  });

  it('consumes a press at the cancel window, continuing the combo chain', () => {
    const { g } = scriptedGame();
    stepGame(g, press('light'));
    steps(g, 11); // light1 frame 11
    stepGame(g, press('light')); // frame 12, 8 frames before the cancel window at 20
    steps(g, 7);
    expect(actor(g)).toMatchObject({ move: 'light1', frame: 19 });
    stepGame(g, emptyInput());
    expect(actor(g)).toMatchObject({ move: 'light2', frame: 0 });
  });

  it('drops a press made more than 150 ms before the actor can act', () => {
    const cancel = PLAYER_MOVES.light1.cancel!;
    for (const [pressFrame, expected] of [
      [cancel - BUFFER_FRAMES, 'light2'],
      [cancel - BUFFER_FRAMES - 1, 'light1'],
    ] as const) {
      const { g } = scriptedGame();
      stepGame(g, press('light'));
      steps(g, pressFrame - 1);
      stepGame(g, press('light')); // pressed on light1's frame `pressFrame`
      steps(g, cancel - pressFrame);
      expect(actor(g).move).toBe(expected);
    }
  });

  it('consumes a press at the end of recovery when the move has no cancel window', () => {
    const { g } = scriptedGame();
    const a = actor(g);
    startMove(a, 'stagger');
    const end = PLAYER_MOVES.stagger.frames;
    steps(g, end - 5);
    stepGame(g, press('heavy')); // 4 frames before the stagger ends
    steps(g, 3);
    expect(a.move).toBe('stagger');
    stepGame(g, emptyInput());
    expect(a).toMatchObject({ move: 'heavy1', frame: 0 });
  });

  it('runs the newest press when two land in the same recovery', () => {
    const { g } = scriptedGame();
    startMove(actor(g), 'stagger');
    steps(g, PLAYER_MOVES.stagger.frames - 4);
    stepGame(g, press('light'));
    stepGame(g, press('parry'));
    steps(g, 2);
    expect(actor(g).move).toBe('parry');
  });
});
