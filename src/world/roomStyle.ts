/**
 * How a dungeon room is laid out inside its walls (playtest round 32: "each room in a dungeon
 * repeats the same inlay ring and the same box shape, and boss halls are the plainest rooms"). A hall
 * had four pillars or a ring of eight and a bare floor, wherever it was. Now each hall is one of a few
 * plans (pillars in pairs, in two rows down a nave, in a square; a cross-shaped room, its corners
 * filled in), its floor carpeted, banded, framed, chequered or inlaid with nested squares, and a
 * boss's hall always has its emblem under the boss (rings about a heart, a carpet to it). Which plan a
 * room has follows from its dungeon's name and the room's place in it, so no two halls of a dungeon
 * are alike in turn. Pure: no Three.js; dungeonParts.ts builds the pieces, render/siteMeshes.ts draws them.
 */

import { hash2 } from '../core/rng';
import { DUNGEON } from '../data/tuning';
import { kitOfRoom, type DungeonLayout, type RoomLayout } from './dungeonKit';
import { DIRS } from './worldMap';

export type Pillars = 'none' | 'four' | 'pairs' | 'colonnade' | 'ring';
export type Floor = 'plain' | 'runner' | 'frame' | 'cross' | 'chequer' | 'nested' | 'rings' | 'squares' | 'quincunx' | 'bands' | 'ring';

export interface RoomStyle {
  pillars: Pillars;
  floor: Floor;
  corners: number; // metres of solid wall filled into each corner (a hall that is a cross), or 0
  bays: boolean; // buttresses along the walls, between the doorways: the room is bays, not a plain box
}

/** What an inlay is laid of: the wall's own stone paler or darker, a carpet, a gilt border. */
export type Tone = 'pale' | 'dark' | 'rug' | 'gilt';

export interface Inlay {
  tone: Tone;
  box?: readonly [u0: number, u1: number, v0: number, v1: number]; // across the room's axis, and along it, from its centre
  disc?: readonly [radius: number, inner: number]; // a ring (inner 0: a disc)...
  at?: readonly [u: number, v: number]; // ...about the room's centre, or about this point
}

/** A pillar: across, along, and its radius. */
export type Pillar = readonly [u: number, v: number, radius: number];

const style = (pillars: Pillars, floor: Floor, corners = 0, bays = false): RoomStyle => ({ pillars, floor, corners, bays });

/** A single-cell hall's plans, taken in turn from a dungeon's own starting point: eight, each differing from the one a step of three along (so successive halls never match, nor do they once an earth floor takes the inlay from both). */
const SMALL: readonly RoomStyle[] = [
  style('four', 'plain'),
  style('none', 'cross', 3.5),
  style('colonnade', 'runner'),
  style('pairs', 'frame', 0, true),
  style('four', 'chequer'),
  style('none', 'nested', 0, true),
  style('pairs', 'runner'),
  style('colonnade', 'plain', 0, true),
];

/** A great hall that is no boss's (the story has none: every great hall is a boss's). */
const WIDE: RoomStyle = style('ring', 'frame', 0, true);

const BOSS: readonly Pillars[] = ['ring', 'colonnade', 'four']; // the middle of a boss's hall stays clear
const EMBLEMS: readonly Floor[] = ['rings', 'squares', 'quincunx']; // and its emblem is rings, squares, or a disc with four about it
const CORRIDOR: readonly Floor[] = ['plain', 'runner', 'bands'];
const ORGANIC = new Set(['mud', 'rot', 'flesh', 'rock']); // floors of earth and flesh: no stone inlay, but a boss's ritual markings

/** A string's hash, 0..1: the same dungeon always begins its plans at the same place. */
const unit = (s: string): number => hash2([...s].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7), s.length, 28);

/** The plan of a room: by its kind, where it comes among its dungeon's rooms of that kind, and its dungeon. */
export function roomStyle(d: DungeonLayout, r: RoomLayout): RoomStyle {
  const kind = r.def.kind;
  const same = d.rooms.filter((x) => x.index < r.index && x.def.kind === kind && x.size === r.size && !x.def.boss).length; // earlier of its kind
  const start = unit(d.def.id);
  const organic = ORGANIC.has(kitOfRoom(d, r).floor);
  let s: RoomStyle;
  if (kind === 'hall' && r.def.boss) {
    const k = unit(`${d.def.id}:${r.def.id}`);
    s = style(BOSS[Math.floor(k * BOSS.length)], EMBLEMS[Math.floor(unit(`${r.def.id}:${d.def.id}`) * EMBLEMS.length)], 0, true);
  }
  else if (kind === 'hall') {
    s = r.size === 3 ? WIDE : SMALL[(Math.floor(start * SMALL.length) + same * 3) % SMALL.length];
  } else if (kind === 'corridor') s = style('none', CORRIDOR[(Math.floor(start * 3) + same) % 3]);
  else if (kind === 'well') s = style('none', same % 2 === 0 ? 'ring' : 'plain');
  else s = style('none', 'plain');
  return organic && !r.def.boss ? { ...s, floor: 'plain' } : s; // earth keeps its own floor
}

/** The unit vectors, in a room's own frame (u across, v along), of the ways in and out: a doorway on that side. */
const lanes = (r: RoomLayout): [number, number][] => r.doors.map((side) => {
  const [s, a] = [DIRS[side], DIRS[r.axis]];
  return [s.x * a.z - s.z * a.x, s.x * a.x + s.z * a.z];
});

/**
 * The pillars of a room's plan, less any that would stand in a doorway's way, or within a pace of
 * somewhere a thing stands (`spots`: where signs, gates, tomes, bosses and spawns are put).
 */
export function pillarsOf(s: RoomStyle, r: RoomLayout, spots: readonly (readonly [number, number])[]): Pillar[] {
  const h = r.half;
  const wide = r.size === 3;
  const rad = wide ? 0.9 : 0.55;
  const at: [number, number][] = [];
  switch (s.pillars) {
    case 'four':
      if (wide) for (let k = 0; k < 8; k++) at.push([17 * Math.cos((k + 0.5) * (Math.PI / 4)), 17 * Math.sin((k + 0.5) * (Math.PI / 4))]);
      else at.push([5, 5], [-5, 5], [5, -5], [-5, -5]);
      break;
    case 'ring':
      for (let k = 0; k < 10; k++) at.push([17.5 * Math.cos((k + 0.5) * (Math.PI / 5)), 17.5 * Math.sin((k + 0.5) * (Math.PI / 5))]);
      break;
    case 'pairs':
      for (const u of [-3.4, 3.4]) for (const v of [-(h - 2.6), h - 2.6]) at.push([u, v]);
      break;
    case 'colonnade':
      for (const u of wide ? [-16, 16] : [-5.2, 5.2]) for (const v of wide ? [-18, -9, 0, 9, 18] : [-5.5, -1.8, 1.8, 5.5]) at.push([u, v]);
      break;
    case 'none':
      break;
  }
  const ways = lanes(r);
  return at.filter(([u, v]) => {
    if (Math.max(Math.abs(u), Math.abs(v)) > h - 1.8) return false; // inside its walls
    if (spots.some(([a, b]) => Math.hypot(u - a, v - b) < rad + 1.6)) return false;
    return !ways.some(([lu, lv]) => u * lu + v * lv > h - 6 && Math.abs(-u * lv + v * lu) < rad + 2.2); // nor in a doorway's lane
  }).map(([u, v]) => [u, v, rad] as const);
}

/** The corners of a cross-shaped hall, filled solid (each as a box: u0, u1, v0, v1), unless one would hold a spot or a doorway. */
export function cornersOf(s: RoomStyle, r: RoomLayout, spots: readonly (readonly [number, number])[]): (readonly [number, number, number, number])[] {
  const [h, c] = [r.half, s.corners];
  if (c <= 0) return [];
  const boxes = [[1, 1], [1, -1], [-1, 1], [-1, -1]].map(([a, b]) => [Math.min(a * (h - c), a * h), Math.max(a * (h - c), a * h), Math.min(b * (h - c), b * h), Math.max(b * (h - c), b * h)] as const);
  const spotIn = boxes.some(([u0, u1, v0, v1]) => spots.some(([u, v]) => u > u0 - 1.6 && u < u1 + 1.6 && v > v0 - 1.6 && v < v1 + 1.6));
  return spotIn ? [] : boxes;
}

/** A hall's buttresses (each a box: u0, u1, v0, v1): a metre and a half deep and wide, along each wall at 4.8 m from its middle (great halls: 8 and 16), where no doorway is. */
export function baysOf(s: RoomStyle, r: RoomLayout): (readonly [number, number, number, number])[] {
  if (!s.bays) return [];
  const [h, w] = [r.half, 0.7];
  const at = r.size === 3 ? [-16, -8, 8, 16] : [-4.8, 4.8];
  const doors = lanes(r).map(([lu, lv]) => [lu * h, lv * h]);
  const out: (readonly [number, number, number, number])[] = [];
  for (const [nu, nv] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { // each wall, by its outward normal in the room's frame
    for (const c of at) {
      const [pu, pv] = nu === 0 ? [c, nv * h] : [nu * h, c]; // where the bay meets the wall
      if (doors.some(([du, dv]) => Math.hypot(pu - du, pv - dv) < 3.6)) continue;
      out.push(nu === 0 ? [c - w, c + w, nv > 0 ? h - 1.4 : -h, nv > 0 ? h : -h + 1.4] : [nu > 0 ? h - 1.4 : -h, nu > 0 ? h : -h + 1.4, c - w, c + w]);
    }
  }
  return out;
}

/** A carpet from the entry wall to `reach` metres short of the centre: the way in to a boss's emblem. */
const approach = (r: RoomLayout, reach: number): Inlay[] => {
  const [w, m] = [r.size === 3 ? 1.8 : 1.1, r.half - 1.6];
  return reach < m ? [{ tone: 'rug', box: [-w, w, -m, -reach] }] : [];
};

/** Gilt arms from an emblem's rim to the walls, on the sides but the way in. */
const arms = (r: RoomLayout, reach: number): Inlay[] => {
  const [w, m] = [0.45 * (r.size === 3 ? 1 : 0.8), r.half - 1.6];
  return reach < m ? [{ tone: 'gilt', box: [-w, w, reach, m] }, { tone: 'gilt', box: [-m, -reach, -w, w] }, { tone: 'gilt', box: [reach, m, -w, w] }] : [];
};

/** A frame of four strips between half-sizes `outer` and `inner` (a square ring). */
const square = (outer: number, inner: number, tone: Tone): Inlay[] => [
  { tone, box: [-outer, outer, -outer, -inner] },
  { tone, box: [-outer, outer, inner, outer] },
  { tone, box: [-outer, -inner, -inner, inner] },
  { tone, box: [inner, outer, -inner, inner] },
];

/** What a floor plan lays on the floor: flat pieces over the slabs, between `h - 1.6` of the walls. Stone kits: stone paler and darker; board floors: carpets. */
export function inlaysOf(s: RoomStyle, r: RoomLayout, boards: boolean): Inlay[] {
  const h = r.half;
  const m = h - 1.6;
  const wide = r.size === 3;
  const out: Inlay[] = [];
  const dark: Tone = boards ? 'rug' : 'dark';
  const pale: Tone = boards ? 'gilt' : 'pale';
  switch (s.floor) {
    case 'plain':
      break;
    case 'runner': {
      const w = wide ? 1.8 : r.def.kind === 'corridor' ? 0.9 : 1.1;
      out.push({ tone: 'rug', box: [-w, w, -m, m] }, { tone: 'gilt', box: [-w - 0.3, -w - 0.12, -m, m] }, { tone: 'gilt', box: [w + 0.12, w + 0.3, -m, m] });
      break;
    }
    case 'frame':
      out.push(...square(m, m - 0.8, dark), ...square(m - 1.3, m - 1.45, pale));
      break;
    case 'cross': {
      const w = wide ? 1.6 : 0.9;
      out.push({ tone: pale, box: [-w, w, -m, m] }, { tone: pale, box: [-m, -w, -w, w] }, { tone: pale, box: [w, m, -w, w] }, { tone: dark, box: [-w * 2, w * 2, -w * 2, w * 2] });
      break;
    }
    case 'chequer': {
      const [n, k] = wide ? [5, 3.2] : [6, 2];
      for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) if ((i + j) % 2 === 0) out.push({ tone: dark, box: [(i - n / 2) * k, (i - n / 2 + 1) * k, (j - n / 2) * k, (j - n / 2 + 1) * k] });
      break;
    }
    case 'nested': {
      const k = wide ? 2 : 1;
      out.push(...square(6.4 * k, 5.6 * k, dark), ...square(4.6 * k, 4.2 * k, pale), ...square(3.2 * k, 2.4 * k, dark), { tone: pale, box: [-1.4 * k, 1.4 * k, -1.4 * k, 1.4 * k] });
      break;
    }
    case 'rings': { // a boss's emblem: rings about the heart, a cross through them, a carpet in
      const k = wide ? 1 : 0.5;
      const reach = 14.5 * k;
      out.push({ tone: dark, disc: [reach, reach - 0.9 * k] }, { tone: 'gilt', disc: [reach - 2 * k, reach - 2.3 * k] }, { tone: dark, disc: [9.5 * k, 8.6 * k] }, { tone: 'rug', disc: [5 * k, 0] }, { tone: 'gilt', disc: [5 * k, 4.6 * k] });
      out.push(...approach(r, reach), ...arms(r, reach));
      break;
    }
    case 'squares': { // nested squares about the heart, gilt at their corners
      const k = wide ? 1 : 0.5;
      out.push(...square(14 * k, 13 * k, dark), ...square(11.4 * k, 11 * k, 'gilt'), ...square(8.5 * k, 7.4 * k, dark), { tone: 'rug', box: [-4.4 * k, 4.4 * k, -4.4 * k, 4.4 * k] }, ...square(4.4 * k, 4 * k, 'gilt'));
      for (const [a, b] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) out.push({ tone: 'gilt', box: [Math.min(a * 9.6 * k, a * 10.4 * k), Math.max(a * 9.6 * k, a * 10.4 * k), Math.min(b * 9.6 * k, b * 10.4 * k), Math.max(b * 9.6 * k, b * 10.4 * k)] });
      out.push(...approach(r, 14 * k));
      break;
    }
    case 'quincunx': { // a disc at the heart, a smaller at each of the four ways, a cross of gilt joining them
      const k = wide ? 1 : 0.5;
      out.push({ tone: dark, disc: [6 * k, 5 * k] }, { tone: 'rug', disc: [4.6 * k, 0] }, { tone: 'gilt', disc: [4.6 * k, 4.2 * k] });
      for (const [a, b] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const [cu, cv] = [a * 12 * k, b * 12 * k];
        out.push({ tone: dark, disc: [3 * k, 2.4 * k], at: [cu, cv] }, { tone: 'rug', disc: [2.2 * k, 0], at: [cu, cv] });
      }
      const w = 0.4 * (wide ? 1 : 0.8);
      out.push({ tone: 'gilt', box: [-w, w, -9 * k, -6 * k] }, { tone: 'gilt', box: [-w, w, 6 * k, 9 * k] }, { tone: 'gilt', box: [-9 * k, -6 * k, -w, w] }, { tone: 'gilt', box: [6 * k, 9 * k, -w, w] });
      out.push(...square(15.4 * k, 14.8 * k, dark));
      out.push(...approach(r, 15.4 * k));
      break;
    }
    case 'bands': // corridor: thresholds laid across at every four metres
      for (let v = -h + 3.5; v < h - 3; v += 4) out.push({ tone: pale, box: [-DUNGEON.lane / 2 + 0.3, DUNGEON.lane / 2 - 0.3, v, v + 0.5] });
      break;
    case 'ring':
      out.push({ tone: dark, disc: [DUNGEON.well + 1.9, DUNGEON.well + 1.3] }, { tone: pale, disc: [DUNGEON.well + 2.4, DUNGEON.well + 2.2] });
      break;
  }
  return out;
}
