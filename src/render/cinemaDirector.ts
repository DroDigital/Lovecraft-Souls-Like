/**
 * Which scene plays when (playtest round 20): a horror's arrival, the first time it turns on the
 * investigator (remembered in the save: it is not shown again after a death); its fall, slowed; the
 * wake of a new game; an ending's, and then its card. Nothing plays in the arena test or while
 * another scene has the screen, except an ending, which waits its turn. Its size, from its body,
 * chooses how the camera treats it (data/cutscenes.ts).
 */

import type { Entity } from '../core/ecs';
import { yawOf } from '../core/geom';
import { EPITHETS } from '../data/bossCards';
import { arrival, ENDING_SCENES, fall, scaleOf, WAKE } from '../data/cutscenes';
import { signPlace } from '../systems/checkpoints';
import type { Game } from '../systems/components';
import type { Cinema } from './cinema';

/** A new game's investigator begins on one knee before the Elder Sign they wake at, the camera behind them; the wake's beat lets them rise. */
export function wakeKneeling(g: Game): void {
  const s = g.overworld && signPlace(g.overworld.sign);
  const t = g.ecs.c.transform.get(g.player.id);
  if (!s || !t) return;
  const yaw = yawOf(s.x - t.pos.x, s.z - t.pos.z);
  t.yaw = t.prevYaw = yaw;
  Object.assign(g.camera, { yaw, prevYaw: yaw });
  g.player.kneeling = { x: s.x, z: s.z };
}

export interface Director {
  /** A new game's wake, as the veil lifts on it. */
  wake(): void;
}

export function createDirector(g: Game, cinema: Cinema, opens: (endingId: string) => void): Director {
  const memory = new Set<string>(); // the arrivals shown, where no save keeps them (the arena)
  const height = (e: Entity): number => g.ecs.c.body.get(e)?.height ?? 2;
  /** Whether a scene is worth playing about this horror: one seen and heard, that stands as itself in the fight. */
  const worth = (e: Entity): boolean => {
    const f = g.ecs.c.fight.get(e);
    return !!f && !f.script.unseen && !f.script.joins && !g.ecs.c.unseen.has(e) && g.ecs.c.actor.get(g.player.id)?.move !== 'death';
  };

  g.events.on('BossEngaged', ({ entity, name }) => {
    const f = g.ecs.c.fight.get(entity);
    const seen = g.overworld?.watched ?? memory;
    if (!f || !worth(entity) || seen.has(f.id) || cinema.active) return;
    seen.add(f.id);
    void cinema.play(arrival(scaleOf(height(entity)), name, EPITHETS[f.id]), { target: entity });
  });
  g.events.on('Vanquished', ({ entity }) => {
    if (!cinema.active && worth(entity)) void cinema.play(fall(scaleOf(height(entity))), { target: entity });
  });
  g.events.on('Ending', ({ id }) => {
    const scene = ENDING_SCENES[id];
    void (scene ? cinema.play(scene) : Promise.resolve()).then(() => opens(id));
  });

  return { wake: () => void cinema.play(WAKE) };
}
