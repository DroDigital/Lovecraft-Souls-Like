/** A bot that fights whatever stands in the arena (playtest round 24): it closes to the body's edge, strikes, dodges now and again, does what E offers in a boss fight, and cannot be killed. */

import type { Entity } from '../src/core/ecs';
import { createRng } from '../src/core/rng';
import { emptyInput, type Button } from '../src/core/input';
import type { Variant } from '../src/data/registry';
import type { Game } from '../src/systems/components';
import { fightAction } from '../src/systems/fightActions';
import { stepGame } from '../src/systems/game';
import { setLock } from '../src/systems/lockOn';
import { bossGame } from './bossHelpers';

export interface BotFight {
  frames: number; // how many it ran (fewer than asked when the foe fell)
  fell: boolean; // the foe fell within them
  dealt: number; // damage the bot did to the foe
  nearest: number; // the least it stood from the edge of the foe's body (metres)
  bad: string[]; // what was left not a number or out of its range
}

/** The bot against `id` (in `variant`) for up to `frames` steps, in the arena. */
export function botFight(id: string, frames: number, variant?: Variant): BotFight {
  const { g, boss } = bossGame(id, variant, 7);
  return driveBot(g, boss, frames);
}

/** The bot against `boss` in `g`, wherever it stands, for up to `frames` steps (or to its first landed blow, if `stopAtHit`). */
export function driveBot(g: Game, boss: Entity, frames: number, stopAtHit = false): BotFight {
  const rng = createRng(77);
  const c = g.ecs.c;
  const me = c.health.get(g.player.id)!;
  me.hp = me.max = 1e7;
  g.player.levels.might = 150;
  const brain = c.brain.get(boss);
  if (brain) Object.assign(brain, { state: 'engage', target: g.player.id, cooldown: 0 });
  let dealt = 0;
  let nearest = Infinity;
  g.events.on('Hit', (e) => void (e.attacker === g.player.id && e.target === boss && (dealt += e.damage)));
  let held = new Set<Button>();
  let dodgeIn = 60;
  let frame = 0;
  for (; frame < frames; frame++) {
    const [at, from] = [c.transform.get(boss), c.transform.get(g.player.id)!];
    if (!at || c.dead.has(boss) || (stopAtHit && dealt > 0)) break;
    const reach = Math.hypot(at.pos.x - from.pos.x, at.pos.z - from.pos.z) - (c.body.get(boss)?.radius ?? 0.5) + 0.5; // to the edge of the body
    nearest = Math.min(nearest, reach);
    g.camera.yaw = g.camera.prevYaw = Math.atan2(at.pos.x - from.pos.x, at.pos.z - from.pos.z);
    if (frame === 2) setLock(g, boss);
    const want = new Set<Button>();
    const f = emptyInput();
    f.moveY = reach > 2.1 ? 1 : reach < 1.2 ? -0.5 : 0;
    f.moveX = Math.sin(frame / 90) * 0.5;
    if (reach < 2.6) {
      if (frame % 22 === 0) want.add('light');
      else if (frame % 61 === 0) want.add('heavy');
    }
    if (reach > 4 && frame % 90 === 45) want.add('shoot'); // and, from afar, the revolver
    if (fightAction(g)) want.add('interact'); // the helm, the powder, the incantation
    if (--dodgeIn <= 0) {
      want.add('dodge');
      f.moveX = rng() < 0.5 ? -1 : 1;
      dodgeIn = 70 + Math.floor(rng() * 60);
    }
    for (const b of ['light', 'heavy', 'dodge', 'shoot', 'interact'] as const) {
      f.held[b] = want.has(b);
      f.pressed[b] = want.has(b) && !held.has(b);
      f.released[b] = held.has(b) && !want.has(b);
    }
    held = want;
    stepGame(g, f);
    if (frame % 300 === 0) me.hp = me.max;
    if (frame % 600 === 0) g.player.rounds = 12;
  }
  const bad: string[] = [];
  for (const [e, t] of c.transform) if (![t.pos.x, t.pos.y, t.pos.z, t.yaw].every(Number.isFinite)) bad.push(`entity ${e} (${c.model.get(e) ?? '?'}) not a number: ${JSON.stringify(t.pos)}`);
  for (const [e, h] of c.health) if (!Number.isFinite(h.hp) || h.hp < 0 || h.hp > h.max + 1e-6) bad.push(`entity ${e} hp ${h.hp}/${h.max}`);
  return { frames: frame, fell: frame < frames, dealt, nearest, bad };
}
