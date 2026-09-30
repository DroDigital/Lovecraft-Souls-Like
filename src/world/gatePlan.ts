/**
 * Where the doors and the fog stand (round 27): a door in each doorway of a dungeon whose kit has
 * one (data/doors.ts), except a boss room's doorways, which are given fog instead (data/fogThemes.ts),
 * as is the ring of each arena in the open. A boss room's doors and an open ring share one list of
 * walls, each naming the spawn ids of the horrors it keeps: the fog is gone when every one is
 * slain. Hidden doors have their own seals and are left alone. Pure: no Three.js.
 */

import { hash2 } from '../core/rng';
import { doorLook, type DoorLook } from '../data/doors';
import { fogThemeOf, type FogThemeId } from '../data/fogThemes';
import { DUNGEON } from '../data/tuning';
import { kitIdOfRoom, type DoorLayout, type DungeonLayout } from './dungeonKit';
import type { WorldLayout } from './placements';
import { yawOfDir } from './worldMap';

export interface DoorSpec {
  id: string;
  x: number;
  z: number;
  y: number; // the floor in the doorway
  yaw: number; // local +z runs through the doorway, into the room beyond
  width: number;
  height: number;
  look: DoorLook;
  ajar: boolean; // stands part open until first approached
  region: string;
}

export interface FogWall {
  id: string;
  kind: 'doorway' | 'ring';
  x: number; // a doorway's centre, or a ring's
  z: number;
  y: number;
  yaw: number; // a doorway's (local +z through it)
  width: number; // a doorway's
  radius: number; // a ring's
  height: number;
  theme: FogThemeId;
  region: string;
  bosses: string[]; // roster ids
  spawns: string[]; // `boss:<id>`: slain for good, the wall is gone
}

const FOG = { doorHeight: 3.9, doorWidth: DUNGEON.door + 0.4, ring: 1.5, ringMin: 6, ringMax: 16 };

/** A doorway's yaw: through it, from the room `a` into the room `b` (or out). */
const yawOf = (d: DoorLayout): number => yawOfDir(d.side);

/** The doors of one dungeon, and the fog in the doorways of its boss rooms. */
function dungeonGates(L: DungeonLayout, doors: DoorSpec[], fogs: FogWall[]): void {
  L.doors.forEach((d, i) => {
    if (d.hidden) return; // the hidden layer has its own seals
    const room = d.b ?? d.a;
    const boss = [d.a, d.b].find((r) => r?.def.boss);
    if (boss?.def.boss) {
      const bosses = [...boss.def.boss];
      fogs.push({ id: `${L.def.id}:${boss.def.id}:${i}`, kind: 'doorway', x: d.x, z: d.z, y: d.level, yaw: yawOf(d), width: FOG.doorWidth, radius: 0, height: FOG.doorHeight, theme: fogThemeOf(bosses, L.region), region: L.region, bosses, spawns: bosses.map((b) => `boss:${b}`) });
      return;
    }
    const look = doorLook(kitIdOfRoom(L, room));
    if (!look) return;
    const id = `${L.def.id}:${i}`;
    doors.push({ id, x: d.x, z: d.z, y: d.level, yaw: yawOf(d), width: DUNGEON.door, height: DUNGEON.lintel, look, ajar: hash2(i, L.def.id.length, 41) < look.ajar, region: L.region });
  });
}

export interface GatePlan {
  doors: DoorSpec[];
  fogs: FogWall[];
}

/** Every door and every fog wall of the world. */
export function gatePlan(w: WorldLayout): GatePlan {
  const [doors, fogs]: [DoorSpec[], FogWall[]] = [[], []];
  for (const d of w.dungeons) dungeonGates(d.layout, doors, fogs);
  w.arenas.forEach((a, i) => {
    const bosses = [...a.bosses];
    const radius = a.radius + FOG.ring;
    fogs.push({ id: `ring:${i}:${bosses[0]}`, kind: 'ring', x: a.x, z: a.z, y: a.y, yaw: 0, width: 0, radius, height: Math.min(FOG.ringMax, Math.max(FOG.ringMin, radius * 0.22)), theme: fogThemeOf(bosses, a.region), region: a.region, bosses, spawns: bosses.map((b) => `boss:${b}`) });
  });
  return { doors, fogs };
}
