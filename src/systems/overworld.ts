/**
 * The open world's state and rules (spec §3D): the Elder Sign last rested at and those found, the
 * bosses and optional bosses slain for good, the foes killed since the last rest or death (they
 * return), and the tomes read. Pure: no Three.js.
 */

import { isUnique } from '../world/placements';
import type { Game, Overworld } from './components';

export function createOverworld(sign: string): Overworld {
  return { sign, discovered: new Set([sign]), slain: new Set(), killed: new Set(), read: new Set(), alive: new Map(), region: null, chunk: -1, dirty: true };
}

/** Foes killed since the last rest come back (population.ts respawns them). */
export function reopen(g: Game): void {
  const ow = g.overworld;
  if (!ow) return;
  ow.killed.clear();
  ow.dirty = true;
}

/** Subscribes the world's rules: kills are remembered (bosses for good), foes return on respawn, tomes stay read. */
export function registerOverworld(g: Game): void {
  const ow = g.overworld!;
  g.events.on('Died', ({ entity }) => {
    const origin = g.ecs.c.origin.get(entity);
    if (origin === undefined) return;
    if (!isUnique(origin)) return void ow.killed.add(origin);
    ow.slain.add(origin);
    g.events.emit('Vanquished', { entity, name: g.ecs.c.combatant.get(entity)?.name ?? origin });
  });
  g.events.on('Respawned', () => reopen(g));
  g.events.on('InsightChanged', ({ cause, source }) => {
    if (cause === 'tome') ow.read.add(source);
  });
}
