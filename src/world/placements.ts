/**
 * The resolved world (spec §3D): every site of sites.ts and dungeons.ts in world coordinates. Elder
 * Signs and where the investigator rises at them, gates and where they deliver, tomes, arenas with
 * their ring of stones, the fixed spawns (bosses, optional bosses, allies, dungeon rooms), the pads
 * that flatten the ground under sites, and the static colliders, bucketed by chunk. Built once. Pure.
 */

import { NOTE_SITES } from '../data/documents';
import type { XZ } from '../core/geom';
import { hash2 } from '../core/rng';
import type { HiddenPieceDef, Place } from '../data/arena';
import { DUNGEONS, type Dir } from '../data/dungeons';
import { isWeapon, WEAPONS } from '../data/weapons';
import { REGIONS, type RegionDef } from '../data/regions';
import { DREAM_DESCENT, SITES, type ArenaSite } from '../data/sites';
import { DUNGEON, WORLD } from '../data/tuning';
import { echoCaches } from './caches';
import { colliderBounds, type Collider } from './colliders';
import { floorAt, layoutDungeon, roomPoint, type DungeonLayout, type RoomLayout } from './dungeonKit';
import { dungeonParts, partCollider, roomSpots, type Part } from './dungeonParts';
import { landHeight } from './land';
import { shrineColliders } from './shrine';
import { chunkKey, chunkOf, DIRS, OPPOSITE, toWorld, yawOfDir, type Rect } from './worldMap';

export interface SignPlace {
  id: string;
  name: string;
  region: string;
  x: number;
  z: number;
  y: number;
  face: Dir;
  dream: boolean;
  rest: Place; // where the investigator rises
}

export interface GatePlace {
  id: string;
  name: string;
  to: string;
  region: string;
  x: number;
  z: number;
  y: number;
  face: Dir;
  arrive: Place; // where those coming through it stand
}

export interface TomePlace {
  name: string;
  insight: number;
  vial?: boolean; // a Silver Vial, not a tome
  note?: boolean; // a letter, clipping or report (documents.ts)
  echoes?: number; // an Echo cache, not a tome (caches.ts)
  weapon?: string; // a weapon lying where it was left (data/weapons.ts)
  region: string;
  at: Place;
}

export interface ArenaPlace {
  region: string;
  x: number;
  z: number;
  y: number;
  radius: number;
  well: boolean;
  bosses: readonly string[];
  stones: readonly { x: number; z: number; radius: number; height: number }[];
}

export interface SpawnPoint {
  id: string;
  entity: string;
  variant?: 'boss';
  region: string;
  at: Place;
  unique: boolean; // bosses and optional bosses stay slain
  arena?: { x: number; z: number; radius: number }; // a boss's: its ring of stones or its room
}

export type Pad =
  | { kind: 'circle'; x: number; z: number; radius: number; blend: number; level: number }
  | { kind: 'rect'; rect: Rect; blend: number; level: number };

export interface Dungeon {
  layout: DungeonLayout;
  parts: Part[];
}

export interface ChunkStatics {
  colliders: Collider[];
  pads: Pad[];
  dungeons: DungeonLayout[];
  spawns: SpawnPoint[];
}

export interface WorldLayout {
  signs: SignPlace[];
  gates: GatePlace[];
  tomes: TomePlace[];
  arenas: ArenaPlace[];
  dungeons: Dungeon[];
  spawns: SpawnPoint[]; // the fixed ones; open ground adds more per chunk (chunks.ts)
  pads: Pad[];
  pieces: HiddenPieceDef[];
  dream: Place | null; // where a dreamer arrives: the first room of the Stairs of Slumber
  errors: string[];
  chunk(cx: number, cz: number): ChunkStatics;
}

const EMPTY: ChunkStatics = { colliders: [], pads: [], dungeons: [], spawns: [] };
const PAD = { sign: [4, 6], gate: [5, 6], tome: [2.5, 4], ally: [3, 4], arena: [3, 12], dungeon: 12 } as const;

function build(): WorldLayout {
  const w: WorldLayout = { signs: [], gates: [], tomes: [], arenas: [], dungeons: [], spawns: [], pads: [], pieces: [], dream: null, errors: [], chunk: () => EMPTY };
  const buckets = new Map<number, ChunkStatics>();
  const bucket = (r: Rect, add: (b: ChunkStatics) => void): void => {
    for (let cx = chunkOf(r.x0); cx <= chunkOf(r.x1); cx++) {
      for (let cz = chunkOf(r.z0); cz <= chunkOf(r.z1); cz++) {
        const k = chunkKey(cx, cz);
        let b = buckets.get(k);
        if (!b) buckets.set(k, (b = { colliders: [], pads: [], dungeons: [], spawns: [] }));
        add(b);
      }
    }
  };
  const collide = (c: Collider): void => bucket(colliderBounds(c), (b) => b.colliders.push(c));
  const pad = (x: number, z: number, [radius, blend]: readonly [number, number], extra = 0): number => {
    const level = landHeight(x, z);
    const p: Pad = { kind: 'circle', x, z, radius: radius + extra, blend, level };
    w.pads.push(p);
    const reach = p.radius + blend;
    bucket({ x0: x - reach, z0: z - reach, x1: x + reach, z1: z + reach }, (b) => b.pads.push(p));
    return level;
  };
  const spawn = (s: SpawnPoint): void => {
    w.spawns.push(s);
    bucket({ x0: s.at.x, z0: s.at.z, x1: s.at.x, z1: s.at.z }, (b) => b.spawns.push(s));
  };
  const side = (d: Dir): { x: number; z: number } => ({ x: DIRS[d].z, z: -DIRS[d].x });

  /** An Elder Sign; the investigator rises well in front of it and to one side, so the camera behind them clears the slab, or at `at`. */
  const sign: SignFn = (region, x, z, y, id, name, face, dream = false, at) => {
    const f = DIRS[face];
    const s = side(face);
    const rest = { ...(at ?? { x: x + f.x * 4.6 + s.x * 1.2, z: z + f.z * 4.6 + s.z * 1.2 }), yaw: yawOfDir(face) };
    w.signs.push({ id, name, region, x, z, y, face, dream, rest });
    for (const c of shrineColliders(x, y, z, yawOfDir(face))) collide(c); // its shrine (shrine.ts)
  };
  const gate: GateFn = (region, x, z, y, id, name, to, face) => {
    const f = DIRS[face];
    w.gates.push({ id, name, to, region, x, z, y, face, arrive: { x: x + f.x * 2.6, z: z + f.z * 2.6, yaw: yawOfDir(face) } });
    const s = side(face);
    for (const k of [-1.9, 1.9]) collide({ kind: 'box', min: { x: x + s.x * k - 0.25, y: y - 0.3, z: z + s.z * k - 0.25 }, max: { x: x + s.x * k + 0.25, y: y + 3.8, z: z + s.z * k + 0.25 } });
  };

  for (const region of REGIONS) {
    const sites = SITES[region.id];
    if (!sites) {
      w.errors.push(`region ${region.id}: has no sites`);
      continue;
    }
    const at = (p: readonly [number, number]) => toWorld(region, p);
    for (const s of sites.signs) {
      const p = at(s.at);
      sign(region.id, p.x, p.z, pad(p.x, p.z, PAD.sign), s.id, s.name, s.face, s.dream);
    }
    for (const g of sites.gates) {
      const p = at(g.at);
      gate(region.id, p.x, p.z, pad(p.x, p.z, PAD.gate), g.id, g.name, g.to, g.face);
    }
    for (const t of sites.tomes) {
      const p = at(t.at);
      pad(p.x, p.z, PAD.tome);
      w.tomes.push({ name: t.name, insight: t.insight, region: region.id, at: { x: p.x, z: p.z, yaw: 0 } });
    }
    for (const [name, x, z] of NOTE_SITES[region.id] ?? []) {
      const p = at([x, z]);
      pad(p.x, p.z, PAD.tome);
      w.tomes.push({ name, insight: 0, note: true, region: region.id, at: { x: p.x, z: p.z, yaw: 0 } });
    }
    for (const a of sites.allies) {
      const p = at(a.at);
      pad(p.x, p.z, PAD.ally);
      spawn({ id: `ally:${a.id}`, entity: a.id, region: region.id, at: { x: p.x, z: p.z, yaw: Math.PI }, unique: false });
    }
    for (const a of sites.arenas) {
      const p = at(a.at);
      arena(w, region, p, a, pad(p.x, p.z, PAD.arena, a.radius), collide, spawn);
    }
    for (const d of sites.dungeons) {
      const def = DUNGEONS.find((x) => x.id === d.id);
      if (!def) {
        w.errors.push(`region ${region.id}: unknown dungeon ${d.id}`);
        continue;
      }
      const door = at(d.at);
      const layout = layoutDungeon(def, door, landHeight(door.x, door.z));
      const { parts, pieces } = dungeonParts(layout);
      w.errors.push(...layout.errors.map((e) => `dungeon ${def.id}: ${e}`));
      if (def.region !== region.id) w.errors.push(`dungeon ${def.id}: placed in ${region.id} but belongs to ${def.region}`);
      w.dungeons.push({ layout, parts });
      w.pieces.push(...pieces);
      for (const p of parts) if (p.solid) collide(partCollider(p));
      const rp: Pad = { kind: 'rect', rect: layout.rect, blend: PAD.dungeon, level: layout.base };
      w.pads.push(rp);
      const b = PAD.dungeon;
      bucket({ x0: layout.rect.x0 - b, z0: layout.rect.z0 - b, x1: layout.rect.x1 + b, z1: layout.rect.z1 + b }, (k) => k.pads.push(rp));
      bucket(layout.rect, (k) => k.dungeons.push(layout));
      const caches = echoCaches(def);
      for (const r of layout.rooms) furnish(w, region, def.id, r, sign, gate, spawn, caches.get(r.def.id));
      const first = layout.rooms[0];
      if (def.id === DREAM_DESCENT && first) w.dream = { x: first.x, z: first.z, yaw: yawOfDir(first.axis) };
    }
  }
  w.chunk = (cx, cz) => buckets.get(chunkKey(cx, cz)) ?? EMPTY;
  return w;
}

type SignFn = (region: string, x: number, z: number, y: number, id: string, name: string, face: Dir, dream?: boolean, at?: XZ) => void;
type GateFn = (region: string, x: number, z: number, y: number, id: string, name: string, to: string, face: Dir) => void;

/** An arena: its ring of standing stones, the well at its heart, and its bosses. */
function arena(w: WorldLayout, region: RegionDef, p: XZ, a: ArenaSite, y: number, collide: (c: Collider) => void, spawn: (s: SpawnPoint) => void): void {
  const ring = a.radius + 1.5;
  const n = Math.max(6, Math.round((2 * Math.PI * ring) / 5.5));
  const stones = Array.from({ length: n }, (_, k) => {
    const t = (k / n) * Math.PI * 2;
    return { x: p.x + Math.cos(t) * ring, z: p.z + Math.sin(t) * ring, radius: 0.7, height: 2.5 + 3 * hash2(k, n, WORLD.seed) };
  });
  for (const s of stones) collide({ kind: 'cylinder', x: s.x, z: s.z, radius: s.radius, y0: y - 0.3, y1: y + s.height });
  if (a.well) collide({ kind: 'cylinder', x: p.x, z: p.z, radius: 2.75, y0: y - 12, y1: y + 0.9 });
  w.arenas.push({ region: region.id, x: p.x, z: p.z, y, radius: a.radius, well: !!a.well, bosses: a.bosses, stones });
  const spread = Math.min(8, a.radius / 3);
  a.bosses.forEach((id, k) => {
    const dx = (k - (a.bosses.length - 1) / 2) * spread;
    const at = { x: p.x + dx, z: p.z + (a.well ? a.radius / 2 : 0), yaw: Math.PI };
    spawn({ id: `boss:${id}`, entity: id, variant: a.variant, region: region.id, at, unique: true, arena: { x: p.x, z: p.z, radius: a.radius } });
  });
}

/** What stands in a dungeon room: its Elder Sign, gate, tome or Echo cache, a weapon, bosses, allies and spawns. */
function furnish(w: WorldLayout, region: RegionDef, dungeon: string, r: RoomLayout, sign: SignFn, gate: GateFn, spawn: (s: SpawnPoint) => void, cache?: number): void {
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
}

/** Whether a spawn point's creature stays slain once killed: bosses and optional bosses. */
export const isUnique = (spawnId: string): boolean => spawnId.startsWith('boss:');

let cached: WorldLayout | undefined;

/** The world's sites, resolved once. */
export const worldLayout = (): WorldLayout => (cached ??= build());
