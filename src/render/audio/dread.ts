/**
 * Dread by sound (round 26): before a horror is met the world goes quiet, and far off it is heard. Walking
 * toward the ground of a great one that has not yet been engaged, the ambience and the drones give way until
 * there is almost nothing (the birds and the wind stop, as they do before something arrives); and from a long
 * way off, every so often, a call rolls across the dream, louder the nearer, so the horror is known before it
 * is seen. Nothing of it when the fight is engaged (its score takes over), when the boss is slain, or in
 * the arena test. Read-only on the simulation.
 */

import type { Entity } from '../../core/ecs';
import type { SampleSetId } from '../../data/samples';
import { engagedFights } from '../../systems/bossFight';
import type { Game } from '../../systems/components';
import type { AudioEngine } from './engine';

/** How far the hush reaches past a boss's ring (metres, by its height: a colossus quiets the ground further off). */
export const hushReach = (height: number): number => 25 + Math.min(60, height * 1.5);

/** The hush, 0..1, `past` metres outside a boss's ring: whole at the ring, gone at `reach`. */
export function hushOf(past: number, reach: number): number {
  const k = Math.min(1, Math.max(0, 1 - past / reach));
  return k * k * (3 - 2 * k);
}

/** How far a horror is heard from (metres), by its height. */
export const callReach = (height: number): number => 140 + height * 7;

/** Seconds to its next call at `distance` metres of its `reach`: sooner the nearer. */
export const callEvery = (distance: number, reach: number): number => 30 + 60 * Math.min(1, distance / reach);

/** What calls across the dream, by the horror's height: a low bellow for one of a house's size, the whale-song of the deep for the vast. */
export const callOf = (height: number): { set: SampleSetId; pitch: number } => (height >= 25 ? { set: 'whale', pitch: 0.65 } : height >= 12 ? { set: 'bellow', pitch: 0.7 } : { set: 'roar', pitch: 0.7 });

export interface Dread {
  update(seconds: number, paused: boolean): void;
}

export function createDread(e: AudioEngine, g: Game, far: (set: SampleSetId, gain: number, pitch: number) => void): Dread {
  const next = new Map<Entity, number>();
  return {
    update(seconds, paused) {
      if (!g.overworld || paused) return e.setHush(0);
      const me = g.ecs.c.transform.get(g.player.id)?.pos;
      const engaged = new Set(engagedFights(g).map(([id]) => id));
      let hush = 0;
      for (const [id, f] of g.ecs.c.fight) {
        const [b, at] = [g.ecs.c.body.get(id), g.ecs.c.transform.get(id)?.pos];
        if (!me || !b || !at || engaged.has(id) || f.script.unseen || (g.ecs.c.health.get(id)?.hp ?? 0) <= 0 || g.ecs.c.dead.has(id)) continue;
        const d = Math.hypot(at.x - me.x, at.z - me.z);
        if (b.height >= 8) hush = Math.max(hush, hushOf(Math.hypot(f.arena.x - me.x, f.arena.z - me.z) - f.arena.radius, hushReach(b.height)));
        const reach = callReach(b.height);
        if (b.height < 12 || d > reach) continue;
        const due = next.get(id) ?? seconds + callEvery(d, reach) * Math.random();
        if (seconds < due) {
          next.set(id, due);
          continue;
        }
        next.set(id, seconds + callEvery(d, reach));
        const c = callOf(b.height);
        far(c.set, 0.18 + 0.6 * (1 - d / reach), c.pitch);
      }
      e.setHush(hush);
    },
  };
}
