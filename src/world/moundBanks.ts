/**
 * How the earth heaped against a mound-shelled dungeon's outer walls (render/dungeonShell.ts; its
 * unseen band in dungeonParts.ts) meets what lies past each end of a wall (playtest round 19: every
 * bank ran straight on two metres past its wall's ends, so at a corner the banks of two walls
 * crossed in the air like the flaps of a tent, and along a row of rooms each overlapped the next).
 * Pure: no Three.js.
 */

import { DUNGEON } from '../data/tuning';
import { roomAt, type DungeonLayout, type RoomLayout } from './dungeonKit';
import type { BoxPart, Part } from './dungeonParts';
import { DIRS } from './worldMap';

/**
 * 'corner': the dungeon ends past it (the bank sweeps round the corner); 'joined': the next outer
 * wall runs on in line (the two banks meet at the cells' edge, half a wall short of its end);
 * 'neighbour': another room's wall stands there (the bank stops at its middle, its end closed and
 * buried in it: round 21, it ended on that wall's face, in the plane of it, and the two fought);
 * 'open': a doorway or a room on the diagonal (the bank stops there, its end closed).
 */
export type BankEnd = 'corner' | 'joined' | 'neighbour' | 'open';

/** The outer wall's outside face, on its axis across the wall. */
export function outerFace(p: BoxPart): number {
  const n = DIRS[p.outer!];
  return n.x > 0 ? p.max.x : n.x < 0 ? p.min.x : n.z > 0 ? p.max.z : p.min.z;
}

/** Whether an outer wall stands at its room's floor (not a lintel over the way in). */
export const grounded = (d: DungeonLayout, p: Part): p is BoxPart & { outer: NonNullable<BoxPart['outer']> } =>
  p.shape === 'box' && !!p.outer && p.min.y <= d.rooms[p.room].level + 1;

/** How each end of an outer wall meets what lies past it: its lower end along the wall first. */
export function bankEnds(d: DungeonLayout, parts: readonly Part[], p: BoxPart): readonly [BankEnd, BankEnd] {
  const n = DIRS[p.outer!];
  const alongX = n.z !== 0;
  const face = outerFace(p);
  const inside = face - (n.x + n.z) * (DUNGEON.wall + 0.5); // within the room, past the wall's thickness
  const line = parts.filter((q): q is BoxPart => q !== p && grounded(d, q) && q.outer === p.outer && Math.abs(outerFace(q) - face) < 0.01);
  const out = face + (n.x + n.z); // a metre beyond the face
  const empty = (a: number, across: number): boolean => roomAt(d, alongX ? a : across, alongX ? across : a) === undefined;
  const end = (a: number, dir: 1 | -1): BankEnd => {
    const past = a + dir;
    if (empty(past, inside)) return empty(past, out) ? 'corner' : 'open'; // a room on the diagonal: the bank stops short of it
    const probe = a + dir * 0.5 * DUNGEON.wall;
    if (line.some((q) => (alongX ? q.min.x < probe && probe < q.max.x : q.min.z < probe && probe < q.max.z))) return 'joined';
    const at = (across: number): RoomLayout | undefined => roomAt(d, alongX ? past : across, alongX ? across : past);
    return at(out) || at(inside) !== d.rooms[p.room] ? 'neighbour' : 'open'; // another room past the end (outside it or in line), or else a doorway out
  };
  return alongX ? [end(p.min.x, -1), end(p.max.x, 1)] : [end(p.min.z, -1), end(p.max.z, 1)];
}

/** Whether this wall's bank sweeps round the corner at its end `e` (0: lower, 1: upper): of a corner's two walls, the one turning to its left does, lest the two lie one over the other. */
export function sweeps(p: BoxPart, e: 0 | 1): boolean {
  const n = DIRS[p.outer!];
  const sign = e ? 1 : -1;
  const [tx, tz] = n.z !== 0 ? [sign, 0] : [0, sign];
  return n.x * tz - n.z * tx >= 0;
}
