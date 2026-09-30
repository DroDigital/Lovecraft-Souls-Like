/**
 * The dream's answer to a horror's fall (round 26: nothing around a fallen horror changed): a region whose
 * every boss has fallen breathes out (`Exhaled`: its mist thins, its sky brightens, the small lives come
 * back, render/ and ui/ read `calmOf`), and the dream as a whole grows a little lighter with each of the great
 * horrors put down (`reliefOf`). The people it has not told yet are heard to speak of it (`rumorFor`).
 * Pure: no Three.js.
 */

import { RUMORS } from '../data/rumors';
import { getEntity } from '../data/registry';
import { REGIONS } from '../data/regions';
import { worldLayout } from '../world/placements';
import type { Game } from './components';

/** The bosses each region holds (spawn ids: `boss:<id>`), and the tier of each. */
const BOSSES = ((): Map<string, string[]> => {
  const out = new Map<string, string[]>();
  for (const s of worldLayout().spawns) if (s.id.startsWith('boss:')) out.set(s.region, [...(out.get(s.region) ?? []), s.id]);
  return out;
})();

const GREAT = new Set(['great_old_one', 'outer_god']);

/** How much of a region's horror is gone: the share of its bosses that have fallen (0 where it has none). */
export function calmOf(g: Game, region: string | null): number {
  const list = (region && BOSSES.get(region)) || [];
  return list.length ? list.filter((id) => g.overworld?.slain.has(id)).length / list.length : 0;
}

/** How much lighter the whole dream is: the share of the great horrors (great old ones and outer gods) that have fallen. */
export function reliefOf(g: Game): number {
  const all = [...BOSSES.values()].flat().filter((id) => GREAT.has(getEntity(id.slice(5))?.tier ?? ''));
  return all.length ? all.filter((id) => g.overworld?.slain.has(id)).length / all.length : 0;
}

/** The line someone has to say of the latest fall they have not yet told of (and it is marked told), or undefined. */
export function rumorFor(g: Game, npc: string): string | undefined {
  const ow = g.overworld;
  if (!ow) return undefined;
  for (const id of [...ow.slain].reverse()) {
    const boss = id.slice(5);
    const line = id.startsWith('boss:') ? RUMORS[boss] : undefined;
    if (!line || ow.told.has(`rumor:${npc}:${boss}`)) continue;
    ow.told.add(`rumor:${npc}:${boss}`);
    return line;
  }
  return undefined;
}

/** The name of a region for the words that mark its breath. */
export const regionName = (id: string): string => REGIONS.find((r) => r.id === id)?.name ?? id;

/** A boss's fall may end a region's horror: it breathes out, once (and again never, on a later load). */
export function registerOmens(g: Game): void {
  g.events.on('Vanquished', ({ entity }) => {
    const ow = g.overworld;
    const spawn = g.ecs.c.origin.get(entity);
    const region = spawn ? worldLayout().spawns.find((s) => s.id === spawn)?.region : undefined;
    if (!ow || !region || calmOf(g, region) < 1 || ow.told.has(`exhaled:${region}`)) return;
    ow.told.add(`exhaled:${region}`);
    g.events.emit('Exhaled', { region, name: regionName(region) });
  });
}
