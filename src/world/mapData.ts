/**
 * What the map shows (playtest round 1): the realm the investigator stands in (the regions joined
 * edge to edge with theirs: the waking world is one, each far realm another) and the places marked
 * on it — Elder Signs, gates, dungeon doors and the bosses within, boss arenas. Pure: no DOM.
 */

import type { XZ } from '../core/geom';
import { REGIONS, type RegionDef } from '../data/regions';
import { worldLayout } from './placements';
import { regionRect, type Rect } from './worldMap';

export type PlaceKind = 'sign' | 'gate' | 'dungeon' | 'arena';

export interface MapPlace extends XZ {
  kind: PlaceKind;
  id: string; // a sign's or gate's id; a dungeon's def id; an arena's first boss
  name: string;
  region: string;
  bosses: readonly string[]; // roster ids fought there
}

const touching = (a: Rect, b: Rect): boolean => a.x0 <= b.x1 && b.x0 <= a.x1 && a.z0 <= b.z1 && b.z0 <= a.z1;

let realms: RegionDef[][] | null = null;

/** Every realm: regions joined edge to edge. */
export function allRealms(): RegionDef[][] {
  if (realms) return realms;
  const left = new Set(REGIONS);
  realms = [];
  while (left.size) {
    const [first] = left;
    left.delete(first);
    const realm = [first];
    for (let i = 0; i < realm.length; i++) {
      for (const r of [...left]) if (touching(regionRect(realm[i]), regionRect(r))) [left.delete(r), realm.push(r)];
    }
    realms.push(realm);
  }
  return realms;
}

/** The realm a region belongs to. */
export const realmOf = (region: string): RegionDef[] => allRealms().find((rs) => rs.some((r) => r.id === region)) ?? [];

/** The rectangle around a realm. */
export function realmRect(realm: readonly RegionDef[]): Rect {
  const rs = realm.map(regionRect);
  return { x0: Math.min(...rs.map((r) => r.x0)), z0: Math.min(...rs.map((r) => r.z0)), x1: Math.max(...rs.map((r) => r.x1)), z1: Math.max(...rs.map((r) => r.z1)) };
}

let places: MapPlace[] | null = null;

/** Every place the map can mark. */
export function mapPlaces(): MapPlace[] {
  if (places) return places;
  const w = worldLayout();
  places = [
    ...w.signs.map((s): MapPlace => ({ kind: 'sign', id: s.id, name: s.name, region: s.region, x: s.x, z: s.z, bosses: [] })),
    ...w.gates.map((g): MapPlace => ({ kind: 'gate', id: g.id, name: g.name, region: g.region, x: g.x, z: g.z, bosses: [] })),
    ...w.dungeons.map(({ layout: d }): MapPlace => {
      const door = d.doors.find((x) => x.b === null) ?? d.doors[0];
      return { kind: 'dungeon', id: d.def.id, name: d.def.name, region: d.region, x: door?.x ?? d.origin.x, z: door?.z ?? d.origin.z, bosses: d.rooms.flatMap((r) => r.def.boss ?? []) };
    }),
    ...w.arenas.map((a): MapPlace => ({ kind: 'arena', id: a.bosses[0] ?? `${a.x},${a.z}`, name: '', region: a.region, x: a.x, z: a.z, bosses: a.bosses })),
  ];
  return places;
}
