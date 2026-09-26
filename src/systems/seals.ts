/**
 * The seals on Kadath's door and the Beyond's order (playtest round 12): the Great Ones' door opens
 * only to one who has put down the great horrors of the waking world (sealCount.ts), and beyond the
 * Gate each horror wakes only once the one before it has fallen. The door, a hidden-layer piece with
 * `minSeals`, stands until enough seals are broken; each boss's fall makes it look again. Coming up
 * to it while it stands, or into an arena whose horror still sleeps, says what it waits for.
 * Pure: no Three.js.
 */

import { distXZ } from '../core/geom';
import { getEntity } from '../data/registry';
import { SEALS } from '../data/tuning';
import { worldLayout } from '../world/placements';
import type { Game } from './components';
import { applyLayer } from './hiddenLayer';
import { bossAwake, priorOf, sealsBroken } from './sealCount';

/** The sealed doors look again at the seals broken (a boss's fall, a save loaded). */
export function refreshSeals(g: Game): void {
  for (const [id, l] of g.ecs.c.layer) if (l.minSeals !== undefined) applyLayer(g, id);
}

/** A boss's fall may break a seal. */
export function registerSeals(g: Game): void {
  g.events.on('Vanquished', () => refreshSeals(g));
}

/** What the investigator standing here is kept from, in a line, or null. */
export function sealedHere(g: Game): string | null {
  const me = g.ecs.c.transform.get(g.player.id)!.pos;
  for (const [id, p] of g.ecs.c.piece) {
    const need = p.def.minSeals;
    if (need !== undefined && !g.ecs.c.layer.get(id)?.shown && distXZ(p.def, me) <= SEALS.warn) {
      return `THE DOOR IS SEALED · ${sealsBroken(g)} OF ${need} GREAT HORRORS HAVE FALLEN`;
    }
  }
  for (const s of worldLayout().spawns) {
    if (!s.arena || bossAwake(g, s.entity) || distXZ(s.arena, me) > s.arena.radius) continue;
    return `SOMETHING VAST SLEEPS HERE · ${(getEntity(priorOf(s.entity)!)?.name ?? 'ANOTHER').toUpperCase()} STILL KEEPS THE WAY`;
  }
  return null;
}

const warnedAt = new WeakMap<Game, number>();

/** Every half second: at a sealed door or a sleeping horror's arena, the investigator is told what it waits for. */
export function sealSystem(g: Game): void {
  if (!g.overworld || g.frame % 30 !== 0 || g.frame - (warnedAt.get(g) ?? -Infinity) < SEALS.again * 60) return;
  const text = sealedHere(g);
  if (!text) return;
  warnedAt.set(g, g.frame);
  g.events.emit('Notice', { text });
}
