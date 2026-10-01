/**
 * What a page gives besides its words (round 26: a tome or a note gave insight and nothing more): the
 * pages left about the world are the hand of someone who walked it, and each sketches the way to the
 * nearest Elder Sign not yet found, drawing in the ground about it on the map (where it shows as a dim
 * star, to go to) and saying so. A small win that points somewhere. Pure: no Three.js.
 */

import { distXZ } from '../core/geom';
import { SURVEY } from '../data/tuning';
import { worldLayout } from '../world/placements';
import type { Game } from './components';
import { explore } from './exploration';

/** The nearest Elder Sign not yet found, within SURVEY.reach of `from`, or undefined. */
export function nearestUnfound(g: Game, from: { x: number; z: number }): { id: string; name: string; x: number; z: number } | undefined {
  const found = g.overworld?.discovered;
  let best: ReturnType<typeof nearestUnfound>;
  for (const s of worldLayout().signs) {
    if (found?.has(s.id) || s.dream) continue;
    const d = distXZ(s, from);
    if (d <= SURVEY.reach && (!best || d < distXZ(best, from))) best = s;
  }
  return best;
}

/** A page read: the ground about the nearest Elder Sign unfound is drawn onto the map. */
export function registerSurvey(g: Game): void {
  g.events.on('Read', () => {
    const ow = g.overworld;
    const me = g.ecs.c.transform.get(g.player.id)?.pos;
    const s = ow && me && nearestUnfound(g, me);
    if (!ow || !s) return;
    for (const region of explore(ow.explored, s, SURVEY.radius)) g.events.emit('Explored', { region });
    g.events.emit('Notice', { text: `THE PAGES SKETCH A WAY TO ${s.name.toUpperCase()} · MARKED ON THE MAP` });
  });
}
