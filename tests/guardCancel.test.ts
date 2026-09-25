import { describe, expect, it } from 'vitest';
import type { Entity } from '../src/core/ecs';
import { emptyInput, noButtons, type InputFrame } from '../src/core/input';
import { PLAYER_MOVES } from '../src/data/moves';
import { startMove } from '../src/systems/actions';
import type { Game } from '../src/systems/components';
import { stepGame } from '../src/systems/game';
import { place, press, scriptedGame, steps } from './helpers';
import { record } from './worldHelpers';

const guard: InputFrame = { ...emptyInput(), held: { ...noButtons(), block: true } }; // block held down
const raise = (): InputFrame => press('block'); // block pressed
const behindGuard = (f: InputFrame): InputFrame => ({ ...f, held: { ...f.held, block: true } });

/** The investigator squared up to the training dummy, a step away (the Deep One sent far off). */
function squaredUp(): { g: Game; player: Entity; dummy: Entity } {
  const { g, player, dummy, deepOne } = scriptedGame();
  const at = g.ecs.c.transform.get(dummy)!.pos;
  place(g, player, at.x, at.z + 1.4, Math.PI);
  place(g, deepOne, at.x + 30, at.z + 30, 0);
  return { g, player, dummy };
}

/** Steps until the investigator's move reaches `frame`. */
function until(g: Game, frame: number): void {
  const a = g.ecs.c.actor.get(g.player.id)!;
  for (let i = 0; i < 120 && a.frame < frame; i++) stepGame(g, emptyInput());
}

const blowsOn = (hits: { attacker: Entity; target: Entity }[], player: Entity, dummy: Entity): number =>
  hits.filter((h) => h.attacker === player && h.target === dummy).length;

describe('raising the guard calls off an attack', () => {
  it('while the blow winds up: it never lands, and the guard is up at once', () => {
    const { g, player, dummy } = squaredUp();
    const hits = record(g, 'Hit');
    const a = g.ecs.c.actor.get(player)!;
    stepGame(g, press('light'));
    expect(a.move).toBe('light1');
    until(g, 4);
    stepGame(g, raise());
    expect(a.move).toBeNull();
    expect(a.guard).toBe(true);
    steps(g, 30, guard);
    expect(blowsOn(hits, player, dummy)).toBe(0);
  });

  it('not while the blow is landing: it lands, and the guard comes up as it ends', () => {
    const { g, player, dummy } = squaredUp();
    const hits = record(g, 'Hit');
    const a = g.ecs.c.actor.get(player)!;
    const [from, to] = PLAYER_MOVES.light1.hit!.window;
    stepGame(g, press('light'));
    until(g, from);
    stepGame(g, raise());
    expect(a.move).toBe('light1');
    let offAt = -1;
    for (let i = 0; i < 30 && a.move !== null; i++) {
      const was = a.frame;
      stepGame(g, guard);
      if (a.move === null) offAt = was + 1;
    }
    expect(offAt).toBe(to); // the first frame after the blow has landed
    expect(a.guard).toBe(true);
    expect(blowsOn(hits, player, dummy)).toBe(1);
  });

  it('while it recovers, before its own cancel window', () => {
    const { g, player } = squaredUp();
    const a = g.ecs.c.actor.get(player)!;
    stepGame(g, press('heavy'));
    until(g, PLAYER_MOVES.heavy1.hit!.window[1] + 1);
    expect(a.frame).toBeLessThan(PLAYER_MOVES.heavy1.cancel!);
    stepGame(g, raise());
    expect(a.move).toBeNull();
    expect(a.guard).toBe(true);
  });

  it('a chain called off begins afresh', () => {
    const { g, player } = squaredUp();
    const a = g.ecs.c.actor.get(player)!;
    stepGame(g, press('light'));
    until(g, 3);
    stepGame(g, raise());
    stepGame(g, emptyInput());
    stepGame(g, press('light'));
    expect(a.move).toBe('light1');
  });

  it('a parry pressed while a blow winds up cuts it short and parries', () => {
    const { g, player } = squaredUp();
    const a = g.ecs.c.actor.get(player)!;
    stepGame(g, press('heavy'));
    until(g, 5);
    stepGame(g, press('parry'));
    expect(a.move).toBe('parry');
  });

  it('but not with no stamina left to parry: the blow goes on', () => {
    const { g, player } = squaredUp();
    const a = g.ecs.c.actor.get(player)!;
    stepGame(g, press('heavy'));
    until(g, 5);
    g.ecs.c.stamina.get(player)!.value = 0;
    stepGame(g, press('parry'));
    expect(a.move).toBe('heavy1');
  });

  it('a revolver shot called off before it fires never fires', () => {
    const { g, player } = squaredUp();
    const shots = record(g, 'Shot');
    const a = g.ecs.c.actor.get(player)!;
    stepGame(g, press('shoot'));
    until(g, 2);
    stepGame(g, raise());
    steps(g, 20, guard);
    expect(a.move).toBeNull();
    expect(shots).toEqual([]);
  });

  it('a blow struck with the guard already up plays out, and the guard comes back after it', () => {
    const { g, player, dummy } = squaredUp();
    const hits = record(g, 'Hit');
    const a = g.ecs.c.actor.get(player)!;
    stepGame(g, raise());
    steps(g, 5, guard);
    expect(a.guard).toBe(true);
    stepGame(g, behindGuard(press('light')));
    expect(a.move).toBe('light1');
    for (let i = 0; i < 60 && a.move !== null; i++) stepGame(g, guard);
    expect(blowsOn(hits, player, dummy)).toBe(1);
    expect(a.guard).toBe(true);
  });

  it('but raising the guard afresh calls that blow off too', () => {
    const { g, player, dummy } = squaredUp();
    const hits = record(g, 'Hit');
    const a = g.ecs.c.actor.get(player)!;
    stepGame(g, raise());
    stepGame(g, behindGuard(press('light')));
    stepGame(g, emptyInput()); // let go...
    expect(a.move).toBe('light1');
    stepGame(g, raise()); // ...and raise it again
    expect(a.move).toBeNull();
    steps(g, 30, guard);
    expect(blowsOn(hits, player, dummy)).toBe(0);
  });

  it('it does not cut a roll, a swallow of Laudanum or a shot of Reagent short', () => {
    for (const move of ['roll', 'drink', 'inject'] as const) {
      const { g, player } = squaredUp();
      const a = g.ecs.c.actor.get(player)!;
      startMove(a, move);
      stepGame(g, raise());
      steps(g, 3, guard);
      expect(a.move, move).toBe(move);
    }
  });
});
