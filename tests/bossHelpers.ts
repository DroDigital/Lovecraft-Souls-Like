/** Helpers for boss tests: an arena game with one roster boss, engaged on demand, and fights with made-up scripts. */

import type { Entity } from '../src/core/ecs';
import { ph, phases } from '../src/data/entities/kit';
import type { Variant } from '../src/data/registry';
import type { ArenaChange, AttackId, RealityHook } from '../src/data/schema';
import type { Fight, Game } from '../src/systems/components';
import { creatureModel } from '../src/systems/creatures';
import { createGame } from '../src/systems/game';
import { place, steps } from './helpers';

export interface BossGame {
  g: Game;
  boss: Entity;
  fight: Fight;
}

/** The arena with `id` in the Deep One's place; the investigator stands `gap` metres south of it, facing it. */
export function bossGame(id: string, variant?: Variant, gap = 6): BossGame {
  const g = createGame({ creature: id, variant });
  const boss = [...g.ecs.c.model].find(([, m]) => m === creatureModel(id, variant))![0];
  const at = g.ecs.c.transform.get(boss)!.pos;
  place(g, g.player.id, at.x, at.z + gap, Math.PI);
  return { g, boss, fight: g.ecs.c.fight.get(boss)! };
}

/** Turns the boss on the investigator and lets its fight begin. */
export function engage({ g, boss }: BossGame): void {
  Object.assign(g.ecs.c.brain.get(boss)!, { state: 'engage', target: g.player.id, cooldown: 0 });
  steps(g, 1);
}

/** Keeps the boss where it stands, not attacking (its brain waits on a long cooldown, going nowhere). */
export const calm = ({ g, boss }: BossGame): void => void Object.assign(g.ecs.c.brain.get(boss)!, { cooldown: 1e6, speed: 0 });

/** An engaged, calm fight whose one phase holds these hooks (and arena change), on the Outsider. */
export function hookFight(hooks: readonly RealityHook[], arena?: ArenaChange, attacks: Partial<Record<AttackId, number>> = { sweep: 1 }): BossGame {
  const b = bossGame('the_outsider');
  b.fight.script = phases(ph(1, attacks, { hooks, arena }));
  engage(b);
  calm(b);
  return b;
}
