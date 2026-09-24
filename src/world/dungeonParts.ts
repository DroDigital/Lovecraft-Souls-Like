/**
 * The dungeon kit's pieces (spec §3D): a layout becomes floors, walls with doorways and lintels,
 * corridor and stair blocks, steps, hall pillars, pits and bridge chasms (edges that stop feet but
 * not eyes), and wells. Solid parts are colliders; hidden doors and bridges become hidden-layer
 * pieces. `roomSpots` says where signs, gates, tomes, bosses and spawns stand. Pure: no Three.js.
 */

import type { V3 } from '../core/geom';
import type { HiddenPieceDef, LayerBox } from '../data/arena';
import type { Dir, Veil } from '../data/dungeons';
import { DUNGEON } from '../data/tuning';
import type { Collider } from './colliders';
import { floorRange, roomAt, roomPoint, type DoorLayout, type DungeonLayout, type RoomLayout } from './dungeonKit';
import { DIRS } from './worldMap';

/** How a part is drawn: 'none' is an invisible collider (a chasm's edge), 'chasm' a dark hole. */
export type Look = 'wall' | 'floor' | 'step' | 'pillar' | 'rim' | 'deck' | 'chasm' | 'none';

export interface BoxPart {
  shape: 'box';
  look: Look;
  min: V3;
  max: V3;
  solid: boolean;
}

export interface CylPart {
  shape: 'cyl';
  look: Look;
  x: number;
  z: number;
  radius: number;
  y0: number;
  y1: number;
  solid: boolean;
}

export type Part = BoxPart | CylPart;

export interface DungeonParts {
  parts: Part[];
  pieces: HiddenPieceDef[];
}

export const partCollider = (p: Part): Collider =>
  p.shape === 'box' ? { kind: 'box', min: p.min, max: p.max } : { kind: 'cylinder', x: p.x, z: p.z, radius: p.radius, y0: p.y0, y1: p.y1 };

/** An axis-aligned box over a room-local rectangle (u across the axis, v along it). */
function local(r: RoomLayout, u0: number, u1: number, v0: number, v1: number, y0: number, y1: number, look: Look, solid: boolean): BoxPart {
  const a = roomPoint(r, u0, v0);
  const b = roomPoint(r, u1, v1);
  return { shape: 'box', look, solid, min: { x: Math.min(a.x, b.x), y: y0, z: Math.min(a.z, b.z) }, max: { x: Math.max(a.x, b.x), y: y1, z: Math.max(a.z, b.z) } };
}

/** The room-local side a compass side is on: v+ (far), v- (entry), u+ or u-. */
function localSide(r: RoomLayout, d: Dir): 'far' | 'entry' | 'u+' | 'u-' {
  const a = DIRS[r.axis];
  const s = DIRS[d];
  if (s.x === a.x && s.z === a.z) return 'far';
  if (s.x === -a.x && s.z === -a.z) return 'entry';
  return s.x === a.z && s.z === -a.x ? 'u+' : 'u-';
}

function roomParts(r: RoomLayout, out: Part[], pieces: HiddenPieceDef[], name: string): void {
  const { half: h, level: L } = r;
  const { height: H, lane: W, stairLane: S, ledge, deck, chasm, rim, well } = DUNGEON;
  const [lo, hi] = floorRange(r);
  const floor = (u0: number, u1: number, v0: number, v1: number): number => out.push(local(r, u0, u1, v0, v1, L - 0.3, L, 'floor', false));
  const block = (u0: number, u1: number, v0: number, v1: number): number => out.push(local(r, u0, u1, v0, v1, lo - 0.2, hi + H, 'wall', true));
  const open = new Set(r.doors.map((d) => localSide(r, d)));
  switch (r.def.kind) {
    case 'hall': {
      floor(-h, h, -h, h);
      const ring = r.size === 3 ? Array.from({ length: 8 }, (_, k) => [17 * Math.cos((k + 0.5) * (Math.PI / 4)), 17 * Math.sin((k + 0.5) * (Math.PI / 4))]) : [[5, 5], [-5, 5], [5, -5], [-5, -5]];
      for (const [u, v] of ring) {
        const p = roomPoint(r, u, v);
        out.push({ shape: 'cyl', look: 'pillar', x: p.x, z: p.z, radius: r.size === 3 ? 0.9 : 0.55, y0: L, y1: L + H - 0.6, solid: true });
      }
      break;
    }
    case 'corridor': {
      floor(-h, h, -h, h);
      for (const su of [-1, 1]) for (const sv of [-1, 1]) block(Math.min(su * W / 2, su * h), Math.max(su * W / 2, su * h), Math.min(sv * W / 2, sv * h), Math.max(sv * W / 2, sv * h));
      if (!open.has('far')) block(-W / 2, W / 2, W / 2, h);
      if (!open.has('entry')) block(-W / 2, W / 2, -h, -W / 2);
      if (!open.has('u+')) block(W / 2, h, -W / 2, W / 2);
      if (!open.has('u-')) block(-h, -W / 2, -W / 2, W / 2);
      break;
    }
    case 'stair': {
      block(S / 2, h, -h, h);
      block(-h, -S / 2, -h, h);
      const n = Math.max(2, Math.ceil(Math.abs(r.rise) / 0.25));
      for (let k = 0; k < n; k++) {
        const top = L + (r.rise * (k + 0.5)) / n;
        out.push(local(r, -S / 2, S / 2, -h + (2 * h * k) / n, -h + (2 * h * (k + 1)) / n, lo - 0.3, top, 'step', false));
      }
      break;
    }
    case 'pit': {
      const p = h - ledge;
      floor(-h, h, -h, -p);
      floor(-h, h, p, h);
      floor(-h, -p, -p, p);
      floor(p, h, -p, p);
      out.push(local(r, -p, p, -p, p, L - chasm, L, 'chasm', false));
      out.push(local(r, -p, p, -p, p, L - chasm, L + rim, 'none', true));
      break;
    }
    case 'bridge': {
      const p = h - ledge;
      floor(-h, h, -h, -p);
      floor(-h, h, p, h);
      out.push(local(r, -h, h, -p, p, L - chasm, L, 'chasm', false));
      out.push(local(r, -h, -deck / 2, -p, p, L - chasm, L + rim, 'none', true));
      out.push(local(r, deck / 2, h, -p, p, L - chasm, L + rim, 'none', true));
      if (r.def.hidden) pieces.push(bridgePiece(r, name, p, r.def.hidden));
      else out.push(local(r, -deck / 2, deck / 2, -p - 0.3, p + 0.3, L - 0.4, L, 'deck', false));
      break;
    }
    case 'well': {
      floor(-h, h, -h, h);
      out.push({ shape: 'cyl', look: 'rim', x: r.x, z: r.z, radius: well + 0.35, y0: L - chasm, y1: L + 0.9, solid: true });
      break;
    }
  }
}

const glowOf = (v: Veil): 'purple' | 'magenta' => (v.minInsight !== undefined ? 'purple' : 'magenta');

/** A hidden bridge: its deck while shown, and an unseen edge across the gap while hidden. */
function bridgePiece(r: RoomLayout, name: string, p: number, veil: Veil): HiddenPieceDef {
  const { deck, chasm, rim } = DUNGEON;
  const alongX = DIRS[r.axis].x !== 0;
  const [hw, hd] = alongX ? [p + 0.3, deck / 2] : [deck / 2, p + 0.3];
  const [sw, sd] = alongX ? [p, deck / 2] : [deck / 2, p];
  return {
    name, x: r.x, z: r.z, ...veil, glow: glowOf(veil),
    boxes: [[0, 0, hw, hd, r.level - 0.4, r.level]],
    seal: { boxes: [[0, 0, sw, sd, r.level - chasm, r.level + rim]], look: 'none' },
  };
}

/** A hidden doorway: glowing jambs and lintel while shown, plain wall while hidden. */
function doorPiece(o: DoorLayout, name: string, veil: Veil): HiddenPieceDef {
  const { door: D, wall: T, lintel } = DUNGEON;
  const alongX = DIRS[o.side].z !== 0; // the wall runs along x
  const box = (along: number, a: number, t: number, y0: number, y1: number): LayerBox => (alongX ? [along, 0, a, t, y0, y1] : [0, along, t, a, y0, y1]);
  const L = o.level;
  return {
    name, x: o.x, z: o.z, ...veil, glow: glowOf(veil),
    boxes: [box(-(D / 2 + 0.12), 0.12, T / 2 + 0.05, L, L + lintel), box(D / 2 + 0.12, 0.12, T / 2 + 0.05, L, L + lintel), box(0, D / 2 + 0.24, T / 2 + 0.05, L + lintel, L + lintel + 0.2)],
    seal: { boxes: [box(0, D / 2, T / 2, L - 0.3, L + lintel)], look: 'wall' },
  };
}

/** Every wall segment on a room boundary (each shared edge once), with doorways and lintels. */
function wallParts(d: DungeonLayout, out: Part[], pieces: HiddenPieceDef[]): void {
  const { cell: C, wall: T, height: H, door: D, lintel } = DUNGEON;
  for (const r of d.rooms) {
    const h = (r.size - 1) / 2;
    for (const side of ['n', 'e', 's', 'w'] as const) {
      const n = DIRS[side];
      const p = { x: -n.z, z: n.x }; // along the wall
      for (let k = -h; k <= h; k++) {
        const mx = r.x + n.x * r.half + p.x * k * C;
        const mz = r.z + n.z * r.half + p.z * k * C;
        const nb = roomAt(d, mx + (n.x * C) / 2, mz + (n.z * C) / 2);
        if (nb === r || (nb && nb.index < r.index)) continue;
        const [lo, hi] = floorRange(r);
        const [nlo, nhi] = nb ? floorRange(nb) : [d.base, d.base];
        const y0 = Math.min(lo, nlo) - 0.3;
        const y1 = Math.max(hi + H, nb ? nhi + H : d.base + 1.2);
        const seg = (a0: number, a1: number, b0: number, b1: number): void => {
          const ax = [mx + p.x * a0 - n.x * (T / 2), mx + p.x * a1 + n.x * (T / 2)];
          const az = [mz + p.z * a0 - n.z * (T / 2), mz + p.z * a1 + n.z * (T / 2)];
          out.push({ shape: 'box', look: 'wall', solid: true, min: { x: Math.min(...ax), y: b0, z: Math.min(...az) }, max: { x: Math.max(...ax), y: b1, z: Math.max(...az) } });
        };
        const L = C / 2 + T / 2;
        const door = d.doors.find((o) => Math.abs(o.x - mx) < 0.01 && Math.abs(o.z - mz) < 0.01);
        if (!door) {
          seg(-L, L, y0, y1);
          continue;
        }
        seg(-L, -D / 2, y0, y1);
        seg(D / 2, L, y0, y1);
        if (y1 > door.level + lintel) seg(-D / 2, D / 2, door.level + lintel, y1);
        if (door.hidden) pieces.push(doorPiece(door, `${d.def.name}: ${door.b?.def.id ?? 'door'}`, door.hidden));
      }
    }
  }
}

/** Every piece of a dungeon. */
export function dungeonParts(d: DungeonLayout): DungeonParts {
  const parts: Part[] = [];
  const pieces: HiddenPieceDef[] = [];
  for (const r of d.rooms) roomParts(r, parts, pieces, `${d.def.name}: ${r.def.id}`);
  wallParts(d, parts, pieces);
  return { parts, pieces };
}

type Spot = readonly [u: number, v: number];

export interface RoomSpots {
  centre: Spot; // bosses
  sign: Spot; // faces along the axis, near the entry
  rest: Spot; // where the investigator rises at that sign
  gate: Spot; // faces back toward the entry, at the far end
  tome: Spot;
  ring: readonly Spot[]; // allies and spawns, in turn
}

/** Where things stand in a room, clear of its pillars, blocks and chasms. */
export function roomSpots(r: RoomLayout): RoomSpots {
  const h = r.half;
  const e = h - DUNGEON.ledge / 2; // the middle of a ledge
  switch (r.def.kind) {
    case 'hall':
      return r.size === 3
        ? { centre: [0, 0], sign: [6, 4 - h], rest: [3, 6.5 - h], gate: [0, h - 4], tome: [-8, 8], ring: [[10, 8], [-10, 8], [10, -8], [-10, -8], [0, 12], [0, -12]] }
        : { centre: [0, 0], sign: [2.8, 3 - h], rest: [0.8, 5 - h], gate: [0, h - 3], tome: [-3, 2], ring: [[2.5, 3], [-2.5, 3], [-2.5, -2.5], [2.5, -1.5]] };
    case 'corridor':
      return { centre: [0, 0], sign: [1.2, 3 - h], rest: [-0.6, 5 - h], gate: [0, 0], tome: [0, 0.5], ring: [[0, -3.5], [-1, -6.5], [1, -6.5], [0, 1]] };
    case 'stair':
      return { centre: [0, 0], sign: [1.8, -4], rest: [-0.5, -2.5], gate: [0, 4], tome: [-1.8, 2], ring: [[0, -4], [0, 3], [-1.5, 6], [1.5, -6]] };
    case 'well':
      return { centre: [0, e - 0.75], sign: [3, 0.75 - e], rest: [0.5, 2.5 - e], gate: [0, e - 0.75], tome: [e - 0.75, 0], ring: [[0.75 - e, 0], [-5, 5], [5, 5], [-5, -5]] };
    default: // pit and bridge: the ledges
      return { centre: [0, e], sign: [3, -e], rest: [0, -e], gate: [0, e], tome: [-4, e], ring: [[4, e], [-4, -e], [5.5, e], [-5.5, e]] };
  }
}
