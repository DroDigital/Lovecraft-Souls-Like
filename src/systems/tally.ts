/**
 * The run's numbers (playtest round 12: an ending was two paragraphs on black), for the ending's
 * last page: time in the dream (steps of the world, so not paused time), foes killed, deaths and
 * Echoes earned; bosses slain are the overworld's own. Kept in the overworld and saved. Pure.
 */

import { SIM } from '../data/tuning';
import { isUnique, worldLayout } from '../world/placements';
import type { Game } from './components';

export interface Tally {
  frames: number;
  kills: number;
  deaths: number;
  echoes: number; // earned from kills, caches and quests (not recovered drops)
}

export const newTally = (): Tally => ({ frames: 0, kills: 0, deaths: 0, echoes: 0 });

export function registerTally(g: Game): void {
  const t = g.overworld?.tally;
  if (!t) return;
  g.events.on('Died', ({ entity, killer }) => {
    if (entity === g.player.id) t.deaths++;
    else if (killer === g.player.id && !g.ecs.c.phantom.has(entity)) t.kills++;
  });
  g.events.on('Echoes', ({ change, amount }) => void (change === 'earned' && (t.echoes += amount)));
}

export function tallySystem(g: Game): void {
  if (g.overworld) g.overworld.tally.frames++;
}

/** Hours and minutes, as a clock would read them: "4:07". */
export function playTime(frames: number): string {
  const minutes = Math.floor(frames / SIM.hz / 60);
  return `${Math.floor(minutes / 60)}:${String(minutes % 60).padStart(2, '0')}`;
}

/** Bosses and optional bosses slain, of all the world holds. */
export function bossesSlain(g: Game): [slain: number, of: number] {
  const all = worldLayout().spawns.filter((s) => isUnique(s.id));
  return [all.filter((s) => g.overworld!.slain.has(s.id)).length, all.length];
}
