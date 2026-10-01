/**
 * A dungeon's dressing (round 30: "improve the dungeon designs drastically"): over the bare rooms,
 * vaulting ribs (or joists) under every roof, furniture of the kit along the halls' walls
 * (dungeonFurniture.ts), things strewn on their floors, and braziers in their far corners. Placed clear
 * of doorways, torches, and what stands in a room (its sign, gate, tomes, pillars, and the corners and
 * bays a plan fills in: world/roomStyle.ts). Round 31: the floors' carpets and inlays are no longer
 * laid here, the same border, runner and three rings in every hall (the playtest's "the same inlay ring
 * in every room"); each room's plan lays its own (world/roomStyle.ts, drawn by siteMeshes.ts).
 * Deterministic from where each room is. Render only.
 */

import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { createRng, hash2 } from '../core/rng';
import { KITS, type DungeonKit, type KitId } from '../data/kits';
import { DUNGEON } from '../data/tuning';
import { floorRange, kitIdOfRoom, roomPoint, type DungeonLayout, type RoomLayout } from '../world/dungeonKit';
import { standing } from '../world/dungeonParts';
import { baysOf, cornersOf, pillarsOf, roomStyle } from '../world/roomStyle';
import { DIRS } from '../world/worldMap';
import { brazier, DEPTH, ITEMS, place, type Out, type Wall } from './dungeonFurniture';
import { box, worldUv } from './meshKit';
import { scaleRgb, type Rgb } from './palette';
import type { LightSpot } from './worldLights';

export type Dressed = { kind: 'wall' | 'wood' | 'trim' | 'beam' | 'glow'; kit: DungeonKit; geo: THREE.BufferGeometry; light?: LightSpot };
type Origin = { x: number; z: number };

const AWAY = { door: 2.8, torch: 1.5, spot: 2.2 }; // metres furniture keeps from a doorway, a torch, and what stands in a room

const finish = (g: THREE.BufferGeometry): THREE.BufferGeometry => {
  if (!g.index) g.setIndex([...Array(g.getAttribute('position').count).keys()]);
  return g;
};
const merged = (kind: Dressed['kind'], kit: DungeonKit, geos: THREE.BufferGeometry[]): Dressed[] => (geos.length ? [{ kind, kit, geo: mergeGeometries(geos.map(finish)) }] : []);

/** A room's wall frame on the side `side` of its local axes ('u+', 'u-', 'v+', 'v-'). */
function wallOf(r: RoomLayout, side: 'u+' | 'u-' | 'v+' | 'v-', inner: number): Wall {
  const sgn = side.endsWith('+') ? 1 : -1;
  const ax = DIRS[r.axis].x !== 0;
  return {
    at: (s, d) => (side[0] === 'u' ? roomPoint(r, sgn * (inner - d), s) : roomPoint(r, s, sgn * (inner - d))),
    alongX: side[0] === 'u' ? ax : !ax,
  };
}

/** Ribs under a vault, or joists under beams, across a room. */
function roof(r: RoomLayout, kit: DungeonKit, c: Rgb, at: Origin, out: Out): void {
  const top = floorRange(r)[1] + DUNGEON.height - 0.05;
  const [span, step, depth, drop] = kit.roof === 'vault' ? [r.half - 0.1, r.size === 3 ? 6 : 4, 0.5, 0.6] : [r.half - 0.1, 2.5, 0.28, 0.42];
  const alongX = DIRS[r.axis].x !== 0;
  const put = (u: number, v: number, du: number, dv: number, h: number, y: number, col: Rgb, to: THREE.BufferGeometry[]): void => {
    const p = roomPoint(r, u, v);
    to.push(worldUv(box(alongX ? dv : du, h, alongX ? du : dv, p.x, y, p.z, col), at));
  };
  const col = kit.roof === 'vault' ? scaleRgb(c, 0.95) : scaleRgb(c, 0.5);
  const to = kit.roof === 'vault' ? out.trim : out.beam;
  for (let v = -r.half + step / 2; v < r.half; v += step) put(0, v, span * 2, depth, drop, top - drop / 2, col, to);
  put(0, 0, depth * 0.8, r.half * 2 - 0.2, drop * 0.7, top - (drop * 0.7) / 2, col, to); // the ridge along it
}

/** The geometry of one room's dressing by group, in its kit's textures. */
function grouped(kit: DungeonKit, out: Out, at: Origin): Dressed[] {
  const uv = (g: THREE.BufferGeometry, m = 2): THREE.BufferGeometry => worldUv(g, at, m);
  return [
    ...merged('wall', kit, out.wall.map((g) => uv(g))),
    ...merged('wood', kit, out.wood.map((g) => uv(g, 3))),
    ...merged('trim', kit, out.trim.map((g) => uv(g))),
    ...merged('beam', kit, out.beam.map((g) => uv(g, 4))),
    ...merged('glow', kit, out.glow),
  ];
}

/** A hall's furniture, debris and braziers (a boss's hall: none; its own style dresses it). */
function hall(d: DungeonLayout, r: RoomLayout, kitId: KitId, kit: DungeonKit, c: Rgb, torches: LightSpot[], out: Out): Dressed[] {
  const rng = createRng((hash2(Math.round(r.x), Math.round(r.z), 31) * 4294967296) >>> 0);
  if (r.def.boss) return []; // a boss's ground is dressed by its own style (arenaDecor.ts)
  const spots = standing(r);
  const plan = roomStyle(d, r);
  const pillars = pillarsOf(plan, r, spots); // what the room's plan stands in it: pillars, the corners filled solid, the bays along its walls
  const blocks = [...cornersOf(plan, r, spots), ...baysOf(plan, r)];
  const a = DIRS[r.axis];
  const stands = spots.map(([u, v]) => roomPoint(r, u, v));
  const doors = d.doors.filter((o) => o.a === r || o.b === r);
  const free = (x: number, z: number, margin: number): boolean => {
    const [dx, dz] = [x - r.x, z - r.z];
    const [u, v] = [dx * a.z - dz * a.x, dx * a.x + dz * a.z]; // in the room's own frame
    return (
      doors.every((o) => Math.hypot(o.x - x, o.z - z) > AWAY.door + margin) &&
      torches.every((t) => Math.hypot(t.x - x, t.z - z) > AWAY.torch + margin) &&
      stands.every((p) => Math.hypot(p.x - x, p.z - z) > AWAY.spot + margin) &&
      pillars.every(([pu, pv, rad]) => Math.hypot(pu - u, pv - v) > rad * 1.5 + 0.6 + margin) &&
      blocks.every(([u0, u1, v0, v1]) => !(u > u0 - 1 - margin && u < u1 + 1 + margin && v > v0 - 1 - margin && v < v1 + 1 + margin))
    );
  };
  const inner = r.half - DUNGEON.wall / 2;
  const list = ITEMS[kitId];
  let turn = Math.floor(rng() * 4);
  for (const side of list.length ? (['u+', 'u-', 'v+', 'v-'] as const) : []) {
    const wall = wallOf(r, side, inner);
    for (let t = -inner + 2; t < inner - 1.5; t += (r.size === 3 ? 3.6 : 2.7) + rng() * 0.6) {
      const p = wall.at(t, DEPTH / 2);
      if (rng() < 0.12 || !free(p.x, p.z, 0)) continue;
      place(list[turn++ % list.length], { wall, s: t, y: r.level, c, rng, out });
    }
  }
  for (let k = 0; k < 5 && list.length; k++) { // small things strewn on the floor
    const [u, v] = [(rng() * 2 - 1) * (inner - 1.5), (rng() * 2 - 1) * (inner - 1.5)];
    const p = roomPoint(r, u, v);
    if (Math.hypot(u, v) < 2 || !free(p.x, p.z, 0)) continue;
    const frame = { at: (a: number, b: number) => ({ x: p.x + a, z: p.z + b }), alongX: true };
    place(list.includes('bones') && k % 2 ? 'bones' : 'rubble', { wall: frame, s: 0, y: r.level, c, rng, out });
  }
  const lit: Dressed[] = [];
  for (const su of kit.flames >= 0.3 ? [-1, 1] : []) { // braziers in the far corners
    const p = roomPoint(r, su * (inner - 1.1), inner - 1.1);
    if (!free(p.x, p.z, -1.2)) continue;
    const b = brazier(p.x, p.z, r.level);
    out.wall.push(...b.iron);
    lit.push({ kind: 'glow', kit, geo: b.flame, light: { ...b.at, kind: 'fire' } });
  }
  return lit;
}

/** The dressing of every room of a dungeon (halls: furniture, debris, braziers; every roofed room: its ribs). */
export function dressing(d: DungeonLayout, colour: (kit: DungeonKit) => Rgb, at: Origin, lights: LightSpot[]): Dressed[] {
  const torches = lights.filter((l) => l.kind === 'torch');
  const result: Dressed[] = [];
  for (const r of d.rooms) {
    const out: Out = { wall: [], wood: [], beam: [], trim: [], glow: [] };
    const kitId = kitIdOfRoom(d, r);
    const kit = KITS[kitId] as DungeonKit;
    const c = colour(kit);
    if (kit.roof !== 'open') roof(r, kit, c, at, out);
    const lit = r.def.kind === 'hall' ? hall(d, r, kitId, kit, c, torches, out) : [];
    result.push(...grouped(kit, out, at), ...lit);
  }
  return result;
}
