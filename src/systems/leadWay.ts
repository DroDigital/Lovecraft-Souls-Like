/**
 * The way to a lead in another realm (playtest round 17: the descent's lead lay with Kuranes in the
 * Dreamlands, so the waking world's map and minimap marked nothing at all, and the seals' lead, from
 * the dream, the same). Realms are joined by gates, and the waking world to the dream by the stair at
 * the Sleeper's Sign once it opens; a sealed dungeon (the Stairs of Slumber) is a place of its own,
 * left only by its gate. The way begins at the first of these on the fewest crossings, the nearest
 * first; else at a lit Elder Sign where the investigator stands, whose travel crosses into any realm.
 * Pure: no Three.js.
 */

import { distXZ, type XZ } from '../core/geom';
import { allRealms } from '../world/mapData';
import { worldLayout } from '../world/placements';
import { regionAt, type Rect } from '../world/worldMap';
import { descentOpen } from './checkpoints';
import type { Game } from './components';

let realms: Map<string, number> | null = null;
let sealed: { id: string; rooms: Rect[] }[] | null = null;

const inside = (r: Rect, p: XZ): boolean => p.x >= r.x0 && p.x <= r.x1 && p.z >= r.z0 && p.z <= r.z1;

/** Where a point lies, as far as the way is concerned: a sealed dungeon, else its realm ('' in the sea between). */
export function placeKey(p: XZ): string {
  sealed ??= worldLayout().dungeons.filter((d) => d.layout.def.sealed).map((d) => ({ id: d.layout.def.id, rooms: d.layout.rooms.map((r) => r.rect) }));
  const pocket = sealed.find((d) => d.rooms.some((r) => inside(r, p)));
  if (pocket) return `sealed:${pocket.id}`;
  realms ??= new Map(allRealms().flatMap((rs, i) => rs.map((r) => [r.id, i] as const)));
  const realm = realms.get(regionAt(p.x, p.z)?.id ?? '');
  return realm === undefined ? '' : `realm:${realm}`;
}

interface Crossing {
  from: string;
  to: string;
  at: XZ;
}

/** Every way from one place into another: the gates, and the stair into the dream once it opens. */
function crossings(g: Game): Crossing[] {
  const w = worldLayout();
  const ways: Crossing[] = [];
  for (const gate of w.gates) {
    const twin = w.gates.find((x) => x.id === gate.to);
    if (twin) ways.push({ from: placeKey(gate), to: placeKey(twin), at: { x: gate.x, z: gate.z } });
  }
  const sleeper = w.signs.find((s) => s.dream);
  if (sleeper && w.dream && descentOpen(g)) ways.push({ from: placeKey(sleeper), to: placeKey(w.dream), at: { x: sleeper.x, z: sleeper.z } });
  return ways.filter((c) => c.from !== c.to);
}

/** Where the investigator at `from` should head for `to`: `to` itself within one place, else where the way there begins (null: none known). */
export function wayTo(g: Game, from: XZ, to: XZ): XZ | null {
  const [here, there] = [placeKey(from), placeKey(to)];
  if (here === there || !here || !there) return to;
  const ways = crossings(g).sort((a, b) => distXZ(a.at, from) - distXZ(b.at, from));
  const first = new Map<string, XZ>([[here, from]]); // each place reached: where its way from here begins
  for (let reached = [here]; reached.length && !first.has(there); ) {
    const next: string[] = [];
    for (const c of ways) {
      if (!reached.includes(c.from) || first.has(c.to)) continue;
      first.set(c.to, c.from === here ? c.at : first.get(c.from)!);
      next.push(c.to);
    }
    reached = next;
  }
  if (first.has(there)) return first.get(there)!;
  const lit = worldLayout().signs.filter((s) => g.overworld?.discovered.has(s.id) && placeKey(s) === here);
  lit.sort((a, b) => distXZ(a, from) - distXZ(b, from));
  return lit.length ? { x: lit[0].x, z: lit[0].z } : null;
}
