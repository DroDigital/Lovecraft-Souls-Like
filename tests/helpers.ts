/** Shared test helpers: scripted input frames and a game whose Deep One is driven by hand. */

import type { Entity } from '../src/core/ecs';
import { emptyInput, type Button, type InputFrame } from '../src/core/input';
import type { Game } from '../src/systems/components';
import { createGame, stepGame } from '../src/systems/game';

/** One step's input with these buttons going down (and held). */
export function press(...buttons: Button[]): InputFrame {
  const f = emptyInput();
  for (const b of buttons) {
    f.pressed[b] = true;
    f.held[b] = true;
  }
  return f;
}

/** Runs `n` steps with the same input. */
export function steps(g: Game, n: number, input: InputFrame = emptyInput()): void {
  for (let i = 0; i < n; i++) stepGame(g, input);
}

/** A fresh game with the Deep One's brain removed, so tests script it. */
export function scriptedGame(): { g: Game; player: Entity; dummy: Entity; deepOne: Entity } {
  const g = createGame();
  const [player, dummy, deepOne] = [...g.ecs.c.combatant.keys()];
  g.ecs.c.brain.delete(deepOne);
  return { g, player, dummy, deepOne };
}

/** Teleports an entity to (x, z) facing `yaw`. */
export function place(g: Game, id: Entity, x: number, z: number, yaw: number): void {
  const tr = g.ecs.c.transform.get(id)!;
  tr.pos = { x, y: 0, z };
  tr.prev = { ...tr.pos };
  tr.yaw = yaw;
  tr.prevYaw = yaw;
}

export const range = (from: number, to: number): number[] => Array.from({ length: to - from }, (_, i) => from + i);
