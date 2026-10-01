/**
 * A dungeon's dressing (round 30: "improve the dungeon designs drastically"): over the bare rooms,
 * vaulting ribs (or joists) under every roof, runners and borders and medallions laid in the floors,
 * furniture of the kit along the halls' walls (dungeonFurniture.ts), things strewn on their floors,
 * and braziers in their far corners. Placed clear of doorways, torches, and what stands in a room
 * (its sign, gate, tomes, pillars). Deterministic from where each room is. Render only.
 */

import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { createRng, hash2 } from '../core/rng';
import { KITS, type DungeonKit, type KitId } from '../data/kits';
import { DUNGEON } from '../data/tuning';
import { floorRange, kitIdOfRoom, roomPoint, type DungeonLayout, type RoomLayout } from '../world/dungeonKit';
import { roomSpots } from '../world/dungeonParts';
import { DIRS } from '../world/worldMap';
import { brazier, DEPTH, ITEMS, place, type Out, type Wall } from './dungeonFurniture';
import { box, tint, worldUv } from './meshKit';
import { scaleRgb, type Rgb } from './palette';
import type { LightSpot } from './worldLights';

export type Dressed = { kind: 'wall' | 'wood' | 'trim' | 'beam' | 'inlay' | 'glow'; kit: DungeonKit; geo: THREE.BufferGeometry; light?: LightSpot };
type Origin = { x: number; z: number };

/** What each kit lays in its floors (a carpet's colour, or none: its stone's own darker shade). */
const CARPET: Partial<Record<KitId, Rgb>> = {
  library: [0.5, 0.17, 0.16], church: [0.34, 0.2, 0.44], marble: [0.2, 0.27, 0.5], townhouse: [0.3, 0.42, 0.32], timber: [0.5, 0.36, 0.2], dream: [0.95, 0.78, 0.4],
};
const RUNNER = new Set<KitId>(['library', 'church', 'marble', 'townhouse', 'timber', 'dream']);
/** A kit's banners' colour (its carpet's, else a faded red). */
const banner = (kit: DungeonKit): Rgb => CARPET[(Object.keys(KITS) as KitId[]).find((k) => KITS[k] === kit) as KitId] ?? [0.46, 0.16, 0.14];
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
  if (r.def.kind !== 'hall' || kit.trim !== 'masonry') return;
  const cloth = scaleRgb(banner(kit), 1);
  const reach = r.size === 3 ? 9 : 2.6;
  for (let v = -r.half + step / 2; v < r.half; v += step) {
    for (const u of [-reach, reach]) {
      put(u, v, 1.1, 0.07, 2.6, top - drop - 1.3, cloth, out.trim); // a banner hung from the rib, its tail cut to a point
      put(u, v, 0.6, 0.07, 0.5, top - drop - 2.85, scaleRgb(cloth, 0.9), out.trim);
      put(u, v + 0.05, 1.2, 0.05, 0.1, top - drop - 0.1, scaleRgb(c, 0.5), out.trim);
    }
  }
}

/** What lies on a hall's floor: a border, a runner, a medallion (inlaid; drawn nearer than the slab). */
function floors(r: RoomLayout, kitId: KitId, c: Rgb, at: Origin, list: THREE.BufferGeometry[]): void {
  const y = r.level + 0.02;
  const colour = CARPET[kitId] ?? scaleRgb(c, 0.55);
  const alongX = DIRS[r.axis].x !== 0;
  const strip = (u: number, v: number, du: number, dv: number, col: Rgb): void => {
    const p = roomPoint(r, u, v);
    list.push(worldUv(box(alongX ? dv : du, 0.04, alongX ? du : dv, p.x, y, p.z, col), at));
  };
  const e = r.half - 1.6;
  const gold = kitId === 'dream' ? [0.95, 0.8, 0.45] as const : scaleRgb(colour, 1.3);
  strip(0, e, e * 2, 0.35, gold);
  strip(0, -e, e * 2, 0.35, gold);
  strip(e, 0, 0.35, e * 2, gold);
  strip(-e, 0, 0.35, e * 2, gold);
  if (RUNNER.has(kitId)) strip(0, 0, r.size === 3 ? 3.2 : 2, r.half * 2 - 1, colour);
  const p = roomPoint(r, 0, 0);
  const rings = r.size === 3 ? [7, 4, 1.4] : [3.4, 2, 0.8];
  rings.forEach((rad, k) => list.push(worldUv(tint(new THREE.RingGeometry(rad - (k === 2 ? rad : 0.3), rad, 20).rotateX(-Math.PI / 2).translate(p.x, y + 0.012 * k, p.z), k % 2 ? gold : colour), at)));
}

/** The geometry of one room's dressing by group, in its kit's textures. */
function grouped(kit: DungeonKit, out: Out, inlay: THREE.BufferGeometry[], at: Origin): Dressed[] {
  const uv = (g: THREE.BufferGeometry, m = 2): THREE.BufferGeometry => worldUv(g, at, m);
  return [
    ...merged('wall', kit, out.wall.map((g) => uv(g))),
    ...merged('wood', kit, out.wood.map((g) => uv(g, 3))),
    ...merged('trim', kit, out.trim.map((g) => uv(g))),
    ...merged('beam', kit, out.beam.map((g) => uv(g, 4))),
    ...merged('inlay', kit, inlay),
    ...merged('glow', kit, out.glow),
  ];
}

/** A hall's floors, furniture and braziers (a boss's hall: floors only). */
function hall(d: DungeonLayout, r: RoomLayout, kitId: KitId, kit: DungeonKit, c: Rgb, torches: LightSpot[], out: Out, inlay: THREE.BufferGeometry[], at: Origin): Dressed[] {
  const rng = createRng((hash2(Math.round(r.x), Math.round(r.z), 31) * 4294967296) >>> 0);
  floors(r, kitId, c, at, inlay);
  if (r.def.boss) return []; // a boss's ground is dressed by its own style (arenaDecor.ts)
  const s = roomSpots(r);
  const stands = [s.sign, s.rest, s.gate, s.tome, ...s.ring].map(([u, v]) => roomPoint(r, u, v));
  const doors = d.doors.filter((o) => o.a === r || o.b === r);
  const free = (x: number, z: number, margin: number): boolean =>
    doors.every((o) => Math.hypot(o.x - x, o.z - z) > AWAY.door + margin) && torches.every((t) => Math.hypot(t.x - x, t.z - z) > AWAY.torch + margin) && stands.every((p) => Math.hypot(p.x - x, p.z - z) > AWAY.spot + margin);
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

/** The dressing of every room of a dungeon (halls: furniture, floors, braziers; every roofed room: its ribs). */
export function dressing(d: DungeonLayout, colour: (kit: DungeonKit) => Rgb, at: Origin, lights: LightSpot[]): Dressed[] {
  const torches = lights.filter((l) => l.kind === 'torch');
  const result: Dressed[] = [];
  for (const r of d.rooms) {
    const out: Out = { wall: [], wood: [], beam: [], trim: [], glow: [] };
    const inlay: THREE.BufferGeometry[] = [];
    const kitId = kitIdOfRoom(d, r);
    const kit = KITS[kitId] as DungeonKit;
    const c = colour(kit);
    if (kit.roof !== 'open') roof(r, kit, c, at, out);
    const lit = r.def.kind === 'hall' ? hall(d, r, kitId, kit, c, torches, out, inlay, at) : [];
    result.push(...grouped(kit, out, inlay, at), ...lit);
  }
  return result;
}
