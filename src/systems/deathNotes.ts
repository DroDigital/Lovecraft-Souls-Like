/**
 * What the last blow teaches (round 26; data/deathLines.ts): the attack that took the investigator's
 * life is remembered as it lands, and when they fall, the line read under UNMADE says how it is met, if
 * it was a known blow; else a fragment of the place, never the same one twice running. A petrifying gaze
 * has its own. Pure: no Three.js.
 */

import { FRAGMENTS, GENERIC, TIPS } from '../data/deathLines';
import type { AttackId } from '../data/schema';
import type { Game } from './components';

const last = new WeakMap<Game, { move: string | null; by: string }>();
const said = new WeakMap<Game, string>();

/** Remembers the blows the investigator takes (the last of them, at a fall). */
export function registerDeathNotes(g: Game): void {
  g.events.on('Hit', (e) => {
    if (e.target !== g.player.id || e.damage <= 0) return;
    last.set(g, { move: g.ecs.c.actor.get(e.attacker)?.move ?? null, by: g.ecs.c.combatant.get(e.attacker)?.name ?? '' });
  });
  g.events.on('Petrified', () => void last.set(g, { move: 'petrified', by: 'stone' }));
  g.events.on('Respawned', () => void last.delete(g));
}

/** The line to read under a fall: how the last blow is met, or else a fragment of the place. */
export function deathLine(g: Game): string {
  const blow = last.get(g)?.move;
  if (blow === 'petrified') return 'Stone takes four seconds. Break its sight behind a monolith, and it wears off.';
  if (blow && blow in TIPS) return TIPS[blow as AttackId];
  const before = said.get(g);
  const pool = [...(FRAGMENTS[g.overworld?.region ?? ''] ?? []), ...GENERIC].filter((x) => x !== before);
  const line = pool[Math.floor(g.rng() * pool.length)];
  said.set(g, line);
  return line;
}
