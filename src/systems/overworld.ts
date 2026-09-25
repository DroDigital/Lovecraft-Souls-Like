/**
 * The open world's state and rules (spec §3D): the Elder Sign last rested at and those found, the
 * bosses and optional bosses slain for good, the foes killed since the last rest or death (they
 * return), the wounds of foes out of sight (only resting or dying makes them whole), and the tomes
 * read. Pure: no Three.js.
 */

import { isUnique } from '../world/placements';
import type { Game, Overworld } from './components';

export function createOverworld(sign: string): Overworld {
  return { sign, discovered: new Set([sign]), slain: new Set(), killed: new Set(), wounds: new Map(), read: new Set(), named: 0, called: new Set(), ending: null, alive: new Map(), region: null, chunk: -1, dirty: true, explored: new Map(), lookedFrom: -1, quests: new Map(), met: new Set() };
}

/** Foes killed since the last rest come back (population.ts respawns them), and every foe is whole again. */
export function reopen(g: Game): void {
  const ow = g.overworld;
  if (!ow) return;
  ow.killed.clear();
  ow.wounds.clear();
  ow.dirty = true;
}

/** The wounds of every foe standing now or remembered, by spawn id (health fractions; the whole are left out). */
export function woundsNow(g: Game): Map<string, number> {
  const ow = g.overworld!;
  const out = new Map(ow.wounds);
  for (const [id, e] of ow.alive) {
    const h = g.ecs.c.health.get(e);
    if (h && h.hp > 0 && h.hp < h.max && !g.ecs.c.dead.has(e)) out.set(id, h.hp / h.max);
  }
  return out;
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
