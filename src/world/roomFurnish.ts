/**
 * What stands in a dungeon room (split from placements.ts in playtest round 24): its Elder Sign,
 * gate, tome, Echo cache, box of cartridges, weapon, vial, bosses, ally and spawns, and the dressing
 * of a boss's ground. Pure.
 */

import type { XZ } from '../core/geom';
import type { Dir } from '../data/dungeons';
import type { RegionDef } from '../data/regions';
import { arenaStyle } from '../data/arenaStyles';
import { DUNGEON } from '../data/tuning';
import { isWeapon, WEAPONS } from '../data/weapons';
import { roomProps } from './arenaDecor';
import { floorAt, roomPoint, type RoomLayout } from './dungeonKit';
import { roomSpots } from './dungeonParts';
import type { SpawnPoint, WorldLayout } from './placements';
import type { Prop } from './props';
import { DIRS, OPPOSITE, yawOfDir } from './worldMap';

export type SignFn = (region: string, x: number, z: number, y: number, id: string, name: string, face: Dir, dream?: boolean, at?: XZ) => void;
export type GateFn = (region: string, x: number, z: number, y: number, id: string, name: string, to: string, face: Dir) => void;

/** What stands in a dungeon room: its Elder Sign, gate, tome or Echo cache, a weapon, bosses, allies and spawns. */
export function furnish(w: WorldLayout, region: RegionDef, dungeon: string, r: RoomLayout, sign: SignFn, gate: GateFn, spawn: (s: SpawnPoint) => void, cache?: number, boxed?: number): Prop[] {
  const s = roomSpots(r);
  const pt = ([u, v]: readonly [number, number]) => {
    const p = roomPoint(r, u, v);
    return { ...p, y: floorAt(r, p.x, p.z) };
  };
  const face = yawOfDir(r.entry); // things in a room turn toward whoever comes in
  const d = r.def;
  if (d.sign) {
    const p = pt(s.sign);
    sign(region.id, p.x, p.z, p.y, d.sign.id, d.sign.name, r.axis, false, roomPoint(r, ...s.rest));
  }
  if (d.gate) {
    const p = pt(s.gate);
    gate(region.id, p.x, p.z, p.y, d.gate.id, d.gate.name, d.gate.to, OPPOSITE[r.axis]);
  }
  if (d.tome) {
    const p = pt(s.tome);
    w.tomes.push({ name: d.tome.name, insight: d.tome.insight, region: region.id, at: { x: p.x, z: p.z, yaw: face } });
  }
  if (cache) {
    const p = pt(s.tome);
    w.tomes.push({ name: `Echoes: ${dungeon}/${d.id}`, insight: 0, echoes: cache, region: region.id, at: { x: p.x, z: p.z, yaw: face } });
  }
  if (boxed) {
    const p = pt([s.tome[0], -s.tome[1]]);
    w.tomes.push({ name: `Cartridges: ${dungeon}/${d.id}`, insight: 0, rounds: boxed, region: region.id, at: { x: p.x, z: p.z, yaw: face } });
  }
  if (d.weapon && isWeapon(d.weapon)) {
    const p = pt([s.tome[0], -s.tome[1]]);
    w.tomes.push({ name: WEAPONS[d.weapon].name, insight: 0, weapon: d.weapon, region: region.id, at: { x: p.x, z: p.z, yaw: face } });
  }
  if (d.vial) {
    const p = pt(d.tome ? [s.tome[0], -s.tome[1]] : s.tome);
    w.tomes.push({ name: d.vial, insight: 0, vial: true, region: region.id, at: { x: p.x, z: p.z, yaw: face } });
  }
  const spread = r.size === 3 ? 6 : 2.5;
  (d.boss ?? []).forEach((id, k) => {
    const [u, v] = s.centre;
    const p = pt([u + (k - ((d.boss?.length ?? 1) - 1) / 2) * spread, v]);
    const arena = { x: r.x, z: r.z, radius: r.half - DUNGEON.wall };
    spawn({ id: `boss:${id}`, entity: id, variant: d.variant, region: region.id, at: { x: p.x, z: p.z, yaw: face }, unique: true, arena });
  });
  const ring = [...s.ring];
  const next = (): XZ => roomPoint(r, ...(ring.shift() ?? [0, 0]));
  if (d.ally) spawn({ id: `ally:${d.ally}`, entity: d.ally, region: region.id, at: { ...next(), yaw: face }, unique: false });
  (d.spawns ?? []).forEach((id, k) => spawn({ id: `room:${dungeon}:${d.id}:${k}`, entity: id, region: region.id, at: { ...next(), yaw: face }, unique: false }));
  if (!d.boss) return [];
  const ax = DIRS[r.axis];
  const away = d.gate ? { x: ax.z, z: -ax.x } : ax; // the far side, or beside it when a gate stands there
  return roomProps(arenaStyle(d.boss[0]), r.x, r.z, r.level, r.half - DUNGEON.wall, away);
}
