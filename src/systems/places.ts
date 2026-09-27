/**
 * The world's lesser places found (playtest round 18; world/namedPlaces.ts): stepping into a named
 * grove, graveyard, ring of stones, ruin, outcrop, camp or landmark for the first time finds it. It
 * is kept (and saved), and the HUD names it with how many of the region's have been found. Looked
 * for a few times a second. Pure: no Three.js.
 */

import { placeAt, placesOf } from '../world/namedPlaces';
import type { Game } from './components';

const EVERY = 15; // frames between looks

export function placeSystem(g: Game): void {
  const ow = g.overworld;
  if (!ow || g.frame % EVERY || (g.ecs.c.health.get(g.player.id)?.hp ?? 0) <= 0) return;
  const p = g.ecs.c.transform.get(g.player.id)?.pos;
  const here = p ? placeAt(p.x, p.z) : null;
  if (!here || ow.places.has(here.id)) return;
  ow.places.add(here.id);
  const all = placesOf(here.region);
  g.events.emit('PlaceFound', { id: here.id, name: here.name, region: here.region, found: all.filter((x) => ow.places.has(x.id)).length, of: all.length });
}
