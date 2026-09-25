/** Shared test helpers: scripted input frames and a game whose Deep One is driven by hand. */

import { expect } from 'vitest';
import type { Entity } from '../src/core/ecs';
import { REACTIONS, type MoveDef, type MoveSet, type Window } from '../src/data/moves';
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

const windows = (m: MoveDef): Window[] =>
  [m.iframes, m.parry, m.interrupt, m.hit?.window, m.motion?.window, m.track?.window, m.sanity?.window, m.effect?.window, m.sweep?.window, m.barrage?.window, m.pull?.window].filter((w) => w !== undefined);

/** Every reaction exists; every window, cancel, hitstop and combo link is valid. */
export function expectValidMoveSet(set: MoveSet): void {
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
    for (const at of [m.shot?.frame, m.volley?.frame, m.pool?.frame, m.marks?.frame, m.wave?.frame]) if (at !== undefined) expect(at, id).toBeLessThan(m.frames);
    if (m.then !== undefined) expect(set[m.then], `${id} runs on into ${m.then}`).toBeDefined();
    if (m.item !== undefined) expect(m.item, id).toBeLessThan(m.frames);
    if (m.sanity) expect(m.sanity.amount, id).toBeGreaterThan(0);
    if (m.interrupt && m.hit) expect(m.interrupt[1], `${id} interrupt is a wind-up`).toBeLessThanOrEqual(m.hit.window[0]);
    for (const next of Object.values(m.combo ?? {})) expect(set[next], `${id} → ${next}`).toBeDefined();
  }
}
