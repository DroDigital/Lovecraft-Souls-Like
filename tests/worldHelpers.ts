/** Helpers for open-world tests: a fresh world game, moving the investigator, killing by hand. */

import type { Entity } from '../src/core/ecs';
import { emptyInput } from '../src/core/input';
import { strike } from '../src/systems/combat';
import { teleport } from '../src/systems/checkpoints';
import type { Game } from '../src/systems/components';
import { stepGame } from '../src/systems/game';

export const deathblow = { damage: 99999, poise: 0, guard: 0, hitstop: 2, parryable: false, interrupts: false };

/** Moves the investigator to (x, z). */
export const goTo = (g: Game, x: number, z: number, yaw = 0): void => teleport(g, { x, z, yaw });

export function run(g: Game, n: number): void {
  for (let i = 0; i < n; i++) stepGame(g, emptyInput());
}

/** Kills `id` with a blow from the investigator and waits out its death throes. */
export function kill(g: Game, id: Entity): void {
  strike(g, g.player.id, id, deathblow);
  run(g, 90);
}

/** The creature standing for a spawn point, if it is alive. */
export const creatureOf = (g: Game, spawnId: string): Entity | undefined => g.overworld!.alive.get(spawnId);

/** Records every event of one type. */
export function record<K extends keyof import('../src/systems/components').GameEvents>(g: Game, type: K): import('../src/systems/components').GameEvents[K][] {
  const log: import('../src/systems/components').GameEvents[K][] = [];
  g.events.on(type, (e) => log.push(e));
  return log;
}
