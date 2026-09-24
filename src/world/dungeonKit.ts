/**
 * The dungeon kit's layout (spec §3D): a room graph (data/dungeons.ts) placed on a grid of 16 m
 * cells. Each room opens off its parent on a compass side; a wide hall takes 3 × 3 cells, centred on
 * the doorway's axis. Floors start at the ground in front of the entrance and change only on stairs,
 * which run straight on. Pure: dungeonParts.ts turns a layout into walls, floors and colliders.
 */

import type { XZ } from '../core/geom';
import type { Dir, DungeonDef, RoomDef, Veil } from '../data/dungeons';
import { DUNGEON, WORLD } from '../data/tuning';
import { DIRS, OPPOSITE, type Rect } from './worldMap';

export interface RoomLayout {
  def: RoomDef;
  index: number;
  size: 1 | 3; // cells per side
  i: number; // centre cell
  j: number;
  x: number; // world centre
  z: number;
  half: number; // metres from the centre to each wall
  rect: Rect;
  level: number; // floor height on its entry side
  rise: number; // stairs: climbed toward `axis`
  entry: Dir; // the side it is entered from (the entrance: its outside doorway)
  axis: Dir; // the way through it, away from the entry
  doors: Dir[]; // sides with doorways
}

export interface DoorLayout {
  x: number;
  z: number;
  side: Dir; // which side of `a` it is on
  a: RoomLayout;
  b: RoomLayout | null; // null: the way outside
  level: number; // floor height in the doorway
  hidden?: Veil;
}

export interface DungeonLayout {
  def: DungeonDef;
  region: string;
  base: number; // floor height at the entrance: the ground in front of it
  origin: XZ; // centre of cell (0, 0), the entrance's
  rooms: RoomLayout[];
  doors: DoorLayout[];
  rect: Rect; // around every room
  errors: string[];
}

const cellKey = (i: number, j: number): number => (i + 512) * 1024 + (j + 512);

const cells = new WeakMap<DungeonLayout, Map<number, RoomLayout>>();

/** Snaps a door position so every cell edge lands on the terrain grid. */
const snap = (v: number): number => Math.round(v / WORLD.snap) * WORLD.snap;

/** Lays the graph out with the entrance's outside doorway at `door`, its floor at `base`. */
export function layoutDungeon(def: DungeonDef, door: XZ, base: number): DungeonLayout {
  const C = DUNGEON.cell;
  const errors: string[] = [];
  const rooms: RoomLayout[] = [];
  const doors: DoorLayout[] = [];
  const byCell = new Map<number, RoomLayout>();
  const byId = new Map<string, RoomLayout>();
  const first = def.rooms[0];
  const firstHalf = ((first?.wide ? 3 : 1) * C) / 2;
  const entry = first ? DIRS[first.dir] : DIRS.n;
  const origin = { x: snap(door.x) - entry.x * firstHalf, z: snap(door.z) - entry.z * firstHalf };

  def.rooms.forEach((r, index) => {
    const size: 1 | 3 = r.wide ? 3 : 1;
    if (r.wide && r.kind !== 'hall') errors.push(`${r.id}: only halls can be wide`);
    const parent = r.from === undefined ? undefined : byId.get(r.from);
    if (index === 0 && r.from !== undefined) errors.push(`${r.id}: the entrance opens off nothing`);
    if (index > 0 && !parent) return void errors.push(`${r.id}: opens off unknown or later room ${r.from}`);
    if (index === 0 && (r.kind === 'stair' || r.kind === 'bridge')) errors.push(`${r.id}: the entrance cannot be a ${r.kind}`);
    let [i, j, level] = [0, 0, base];
    if (parent) {
      const step = (parent.size - 1) / 2 + (size - 1) / 2 + 1;
      [i, j] = [parent.i + DIRS[r.dir].x * step, parent.j + DIRS[r.dir].z * step];
      const straight = parent.def.kind !== 'stair' && parent.def.kind !== 'bridge';
      if (!straight && r.dir !== parent.axis) errors.push(`${r.id}: ${parent.def.kind}s run straight on`);
      level = parent.level + (parent.def.kind === 'stair' ? parent.rise : 0);
    }
    const half = (size * C) / 2;
    const [x, z] = [origin.x + i * C, origin.z + j * C];
    const entrySide: Dir = parent ? OPPOSITE[r.dir] : r.dir;
    const room: RoomLayout = {
      def: r, index, size, i, j, x, z, half, level,
      rise: r.kind === 'stair' ? r.rise ?? 0 : 0,
      entry: entrySide,
      axis: OPPOSITE[entrySide],
      rect: { x0: x - half, z0: z - half, x1: x + half, z1: z + half },
      doors: parent || !def.sealed ? [entrySide] : [],
    };
    if (r.kind === 'stair' && !room.rise) errors.push(`${r.id}: a stair needs a rise`);
    const h = (size - 1) / 2;
    for (let di = -h; di <= h; di++) {
      for (let dj = -h; dj <= h; dj++) {
        const k = cellKey(i + di, j + dj);
        if (byCell.has(k)) errors.push(`${r.id}: overlaps ${byCell.get(k)!.def.id}`);
        byCell.set(k, room);
      }
    }
    rooms.push(room);
    byId.set(r.id, room);
    if (parent) {
      parent.doors.push(r.dir);
      const d = DIRS[r.dir];
      doors.push({ x: parent.x + d.x * parent.half, z: parent.z + d.z * parent.half, side: r.dir, a: parent, b: room, level, hidden: r.kind === 'bridge' ? undefined : r.hidden });
    } else if (!def.sealed) {
      doors.push({ x: x + entry.x * half, z: z + entry.z * half, side: r.dir, a: room, b: null, level: base });
    }
  });
  const ids = new Set<string>();
  for (const r of def.rooms) {
    if (ids.has(r.id)) errors.push(`${r.id}: two rooms share the id`);
    ids.add(r.id);
  }
  for (const r of rooms) {
    const out = r.doors.filter((d) => d !== r.entry);
    if ((r.def.kind === 'stair' || r.def.kind === 'bridge') && out.length > 1) errors.push(`${r.def.id}: a ${r.def.kind} leads on to one room at most`);
  }
  const rect = rooms.reduce<Rect>(
    (b, r) => ({ x0: Math.min(b.x0, r.rect.x0), z0: Math.min(b.z0, r.rect.z0), x1: Math.max(b.x1, r.rect.x1), z1: Math.max(b.z1, r.rect.z1) }),
    { x0: Infinity, z0: Infinity, x1: -Infinity, z1: -Infinity },
  );
  const layout: DungeonLayout = { def, region: def.region, base, origin, rooms, doors, rect, errors };
  cells.set(layout, byCell);
  return layout;
}

/** The room whose floor is at (x, z), if any. */
export function roomAt(d: DungeonLayout, x: number, z: number): RoomLayout | undefined {
  const C = DUNGEON.cell;
  return cells.get(d)!.get(cellKey(Math.round((x - d.origin.x) / C), Math.round((z - d.origin.z) / C)));
}

/** A room's lowest and highest floor. */
export const floorRange = (r: RoomLayout): readonly [number, number] => [Math.min(r.level, r.level + r.rise), Math.max(r.level, r.level + r.rise)];

/** Progress 0 → 1 through a room along its axis, from its entry wall to the far one. */
export function along(r: RoomLayout, x: number, z: number): number {
  const a = DIRS[r.axis];
  const s = (x - r.x) * a.x + (z - r.z) * a.z + r.half;
  return Math.min(1, Math.max(0, s / (2 * r.half)));
}

/** Floor height at (x, z) in a room: flat, or a straight ramp on stairs. */
export const floorAt = (r: RoomLayout, x: number, z: number): number => r.level + (r.rise ? r.rise * along(r, x, z) : 0);

/** Converts a room-local point (u across the axis, v along it from the centre) to world XZ. */
export function roomPoint(r: RoomLayout, u: number, v: number): XZ {
  const a = DIRS[r.axis];
  return { x: r.x + a.x * v + a.z * u, z: r.z + a.z * v - a.x * u };
}
