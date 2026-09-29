import * as THREE from 'three';
import { dungeonPieces, type Group } from '../src/render/siteMeshes';
import { DUNGEON } from '../src/data/tuning';
import { floorRange, kitOfRoom, type RoomLayout } from '../src/world/dungeonKit';
import type { Dungeon } from '../src/world/placements';
import { DIRS } from '../src/world/worldMap';
import { faces, type Face } from './depthAudit';

/**
 * What the eye meets (round 21). Rays leave the places a player stands and looks from; each first
 * meets a surface, and the renderer draws that surface only if it faces the eye. So a ray whose first
 * hit is the back of a face (a face seen through) or nothing at all (a hole: the clear colour shows,
 * a flat near-black wedge on a wall in a recording) is a fault, and a ray whose first hit has
 * another face facing the same way within a few centimetres of it, at another texture or another
 * tone, is a depth fight: the PS1's snapping moves each by up to half a pixel and whichever it puts
 * nearer shows, in wedges and streaks that change as the view turns.
 */

const CELL = 2; // metres a grid cell holds
const NEAR = 1e-4;

export interface Hit {
  t: number;
  front: boolean;
  face: Face;
}

/** A dungeon's faces in a grid over the ground plane, walked by a ray cell by cell. */
export class FaceGrid {
  private cells = new Map<string, Face[]>();
  private stamp = new Map<Face, number>();
  private ray = 0;
  readonly bounds = new THREE.Box3();

  constructor(all: Face[]) {
    for (const f of all) {
      const xs = f.p.map((q) => q.x);
      const zs = f.p.map((q) => q.z);
      for (const q of f.p) this.bounds.expandByPoint(q);
      for (let i = Math.floor(Math.min(...xs) / CELL); i <= Math.floor(Math.max(...xs) / CELL); i++) {
        for (let j = Math.floor(Math.min(...zs) / CELL); j <= Math.floor(Math.max(...zs) / CELL); j++) {
          const k = `${i},${j}`;
          (this.cells.get(k) ?? this.cells.set(k, []).get(k)!).push(f);
        }
      }
    }
  }

  /** Every face along the ray from `o` to `reach` metres off (or, with `beyond`, until `beyond` metres past the first it meets), nearest first. */
  cast(o: THREE.Vector3, dir: THREE.Vector3, reach: number, beyond = Infinity): Hit[] {
    const hits: Hit[] = [];
    this.ray++;
    let [i, j] = [Math.floor(o.x / CELL), Math.floor(o.z / CELL)];
    const [sx, sz] = [Math.sign(dir.x), Math.sign(dir.z)];
    const step = (s: number, d: number, c: number, p: number): number => (s === 0 ? Infinity : ((s > 0 ? c + 1 : c) * CELL - p) / d);
    const dx = sx === 0 ? Infinity : Math.abs(CELL / dir.x);
    const dz = sz === 0 ? Infinity : Math.abs(CELL / dir.z);
    let [tx, tz] = [step(sx, dir.x, i, o.x), step(sz, dir.z, j, o.z)];
    let nearest = Infinity;
    for (let t = 0; t <= reach && t <= nearest + beyond; ) {
      for (const f of this.cells.get(`${i},${j}`) ?? []) {
        if (this.stamp.get(f) === this.ray) continue;
        this.stamp.set(f, this.ray);
        const d = crossing(o, dir, f);
        if (d === null || d > reach) continue;
        hits.push({ t: d, front: f.n.dot(dir) < 0, face: f });
        if (d < nearest) nearest = d;
      }
      t = Math.min(tx, tz);
      if (!isFinite(t)) break;
      if (tx < tz) [i, tx] = [i + sx, tx + dx];
      else [j, tz] = [j + sz, tz + dz];
    }
    return hits.sort((a, b) => a.t - b.t);
  }
}

/** Möller–Trumbore: the distance along `dir` from `o` to a face, or null. */
function crossing(o: THREE.Vector3, dir: THREE.Vector3, f: Face): number | null {
  const [a, b, c] = f.p;
  const [e1x, e1y, e1z] = [b.x - a.x, b.y - a.y, b.z - a.z];
  const [e2x, e2y, e2z] = [c.x - a.x, c.y - a.y, c.z - a.z];
  const [px, py, pz] = [dir.y * e2z - dir.z * e2y, dir.z * e2x - dir.x * e2z, dir.x * e2y - dir.y * e2x];
  const det = e1x * px + e1y * py + e1z * pz;
  if (Math.abs(det) < 1e-12) return null;
  const [sx, sy, sz] = [o.x - a.x, o.y - a.y, o.z - a.z];
  const u = (sx * px + sy * py + sz * pz) / det;
  if (u < -1e-6 || u > 1 + 1e-6) return null;
  const [qx, qy, qz] = [sy * e1z - sz * e1y, sz * e1x - sx * e1z, sx * e1y - sy * e1x];
  const v = (dir.x * qx + dir.y * qy + dir.z * qz) / det;
  if (v < -1e-6 || u + v > 1 + 1e-6) return null;
  const t = (e2x * qx + e2y * qy + e2z * qz) / det;
  return t > NEAR ? t : null;
}

/** A dungeon's faces, each named for the part it comes from (`texture:look@room#part`) or 'shell'. */
export function dungeonFaces(d: Dungeon): Face[] {
  const gen = dungeonPieces(d, []);
  let r = gen.next();
  while (!r.done) r = gen.next();
  const out: Face[] = [];
  for (const [tex, geos] of r.value as Map<Group, THREE.BufferGeometry[]>) {
    for (const g of geos) {
      const k = g.userData.part as number | undefined;
      const p = k === undefined ? undefined : d.parts[k];
      out.push(...faces(g, `${tex}:${p ? p.look : 'shell'}@${p ? d.layout.rooms[p.room].def.id : 'shell'}#${k ?? '-'}`, tex));
    }
  }
  return out;
}

export interface Sight {
  from: THREE.Vector3;
  dir: THREE.Vector3;
  room: RoomLayout;
}

const solidAt = (d: Dungeon, p: THREE.Vector3, margin: number): boolean =>
  d.parts.some((q) => q.solid && (q.shape === 'box' ? p.x > q.min.x - margin && p.x < q.max.x + margin && p.y > q.min.y - margin && p.y < q.max.y + margin && p.z > q.min.z - margin && p.z < q.max.z + margin : Math.hypot(p.x - q.x, p.z - q.z) < q.radius + margin && p.y > q.y0 - margin && p.y < q.y1 + margin));

/** The top of the floor (or step, or deck) under a point, or null over a chasm. */
const groundAt = (d: Dungeon, x: number, z: number): number | null => {
  let top: number | null = null;
  for (const q of d.parts) if (q.shape === 'box' && (q.look === 'floor' || q.look === 'step' || q.look === 'deck') && x >= q.min.x && x <= q.max.x && z >= q.min.z && z <= q.max.z && (top === null || q.max.y > top)) top = q.max.y;
  return top;
};

/** Where a player looks from: spots in the open air of each room, at eye height and at the camera's. */
export function* sights(d: Dungeon, { azimuths = 48, elevations = [-60, -35, -15, -4, 6, 20, 40, 65], spots = 4, heights = [1.7, 3.2] } = {}): Generator<Sight> {
  const dirs: THREE.Vector3[] = [];
  for (let a = 0; a < azimuths; a++) {
    for (const el of elevations) {
      const [az, e] = [((a + 0.37) / azimuths) * Math.PI * 2, (el * Math.PI) / 180];
      dirs.push(new THREE.Vector3(Math.sin(az) * Math.cos(e), Math.sin(e), Math.cos(az) * Math.cos(e)));
    }
  }
  for (const room of d.layout.rooms) {
    const span = room.half - 1.2;
    for (let a = 0; a < spots; a++) {
      for (let b = 0; b < spots; b++) {
        const [x, z] = [room.x + ((a + 0.5) / spots - 0.5) * 2 * span, room.z + ((b + 0.5) / spots - 0.5) * 2 * span];
        const g = groundAt(d, x, z);
        if (g === null) continue;
        const from = new THREE.Vector3(x, g + heights[(a + b) % heights.length], z);
        if (solidAt(d, from, 0.35) || solidAt(d, new THREE.Vector3(x, g + 0.4, z), 0.2)) continue;
        for (const dir of dirs) yield { from, dir, room };
      }
    }
  }
}

export type Kind = 'hole' | 'back' | 'fight';

export interface Finding {
  kind: Kind;
  dungeon: string;
  room: string;
  key: string; // what it is, without where
  at: string; // where, and by which faces
}

const COS = Math.cos((8 * Math.PI) / 180);
const WITHIN = 0.12; // metres: near enough to fight once snapped
const TONE = 0.03; // how unlike two faces of one texture must look for their fight to show

/** Where a ray leaves its room's inner box: how far along it is, and by which axis (0 x, 1 z, 2 up or down). */
function exitOf(s: Sight): { t: number; axis: number } {
  const { from, dir, room } = s;
  const inner = room.half - DUNGEON.wall / 2;
  const [lo, hi] = floorRange(room);
  const deep = room.def.kind === 'pit' || room.def.kind === 'bridge' || room.def.kind === 'well' ? DUNGEON.chasm : 0; // their chasms sink below the floor
  const bounds: [number, number, number][] = [
    [dir.x, room.x + Math.sign(dir.x) * inner - from.x, 0],
    [dir.z, room.z + Math.sign(dir.z) * inner - from.z, 1],
    [dir.y, (dir.y > 0 ? hi + DUNGEON.height : lo - deep - 0.3) - from.y, 2],
  ];
  let [t, axis] = [Infinity, 0];
  for (const [v, delta, a] of bounds) if (Math.abs(v) > 1e-9 && delta / v < t) [t, axis] = [delta / v, a];
  return { t, axis };
}

/** Whether the ray leaves the room by one of its doorways. */
function byDoor(d: Dungeon, s: Sight, t: number): boolean {
  const p = s.from.clone().addScaledVector(s.dir, t);
  return d.layout.doors.some((o) => {
    if (o.a !== s.room && o.b !== s.room) return false;
    const n = DIRS[o.side];
    const side = Math.abs((p.x - o.x) * -n.z + (p.z - o.z) * n.x);
    const across = Math.abs((p.x - o.x) * n.x + (p.z - o.z) * n.z);
    return side < DUNGEON.door / 2 + 0.6 && across < DUNGEON.wall + 0.8 && p.y > o.level - 0.5 && p.y < o.level + DUNGEON.lintel + 0.5;
  });
}

/** Whether a point on a face's plane lies within the face, at least `-slack` metres from its edges (or, given a positive slack, that near it). */
function over(f: Face, p: THREE.Vector3, slack = -0.03): boolean {
  const [a, b, c] = f.p;
  const [v0, v1, v2] = [c.clone().sub(a), b.clone().sub(a), p.clone().sub(a)];
  const [d00, d01, d02, d11, d12] = [v0.dot(v0), v0.dot(v1), v0.dot(v2), v1.dot(v1), v1.dot(v2)];
  const inv = 1 / (d00 * d11 - d01 * d01);
  const [u, v] = [(d11 * d02 - d01 * d12) * inv, (d00 * d12 - d01 * d02) * inv];
  const e = slack / Math.sqrt(Math.max(f.area, 1e-6)); // the slack as a share of the face's own scale
  return u >= -e && v >= -e && u + v <= 1 + e;
}

/** How unlike two faces look: 1 for another texture, else their difference in lightness. */
const unlike = (a: Face, b: Face): number => (a.tex !== b.tex ? 1 : Math.abs(a.luma - b.luma) / Math.max(a.luma, b.luma, 1e-3));

const kindOf = (t: string): string => t.replace(/@[a-z_0-9]+#(\d+|-)/, ''); // 'texture:look'
export const pos = (v: THREE.Vector3): string => v.toArray().map((x) => x.toFixed(1)).join(',');

/** What is wrong with what the eye meets first along a ray, if anything: the back of a face, or another face over the same place. */
export function judge(hits: Hit[], from: THREE.Vector3, dir: THREE.Vector3): { kind: 'back' | 'fight'; key: string; at: string } | null {
  const a = hits[0];
  if (!a) return null;
  if (!a.front) {
    if (hits.some((h) => h.front && Math.abs(h.t - a.t) < 1e-3 && h.face.n.dot(a.face.n) < -0.99)) return null; // a face drawn from both sides
    return { kind: 'back', key: kindOf(a.face.tag), at: `from ${pos(from)} at ${a.t.toFixed(1)} m, ${a.face.tag}` };
  }
  const pa = from.clone().addScaledVector(dir, a.t);
  for (const b of hits.slice(1)) {
    if (!b.front || a.face.n.dot(b.face.n) < COS) continue;
    if (a.face.tex.endsWith('+') || b.face.tex.endsWith('+')) continue; // relief (a trim standing off a wall) is drawn nearer than what it stands on, whichever way the snapping goes
    const pb = from.clone().addScaledVector(dir, b.t);
    const gap = a.face.n.dot(pb.clone().sub(pa));
    if (Math.abs(gap) >= WITHIN || unlike(a.face, b.face) < TONE) continue;
    if (!over(a.face, pb.addScaledVector(a.face.n, -gap))) continue; // side by side, not one over the other: the ray only slips from one to the next
    return { kind: 'fight', key: `${kindOf(a.face.tag)} ~ ${kindOf(b.face.tag)}`, at: `at ${pos(pa)} gap ${(gap * 100).toFixed(0)} cm, ${a.face.tag} | ${b.face.tag}` };
  }
  return null;
}

/** Everything the eye meets wrongly from where it stands in a dungeon's rooms. */
export function audit(d: Dungeon, opts?: Parameters<typeof sights>[1]): Finding[] {
  const grid = new FaceGrid(dungeonFaces(d));
  const out = new Map<string, Finding & { n: number }>();
  const note = (kind: Kind, room: RoomLayout, key: string, at: string): void => {
    const k = `${kind} ${key} ${room.def.id}`;
    const e = out.get(k);
    if (e) e.n++;
    else out.set(k, { kind, dungeon: d.layout.def.id, room: room.def.id, key, at, n: 1 });
  };
  for (const s of sights(d, opts)) {
    const roofless = kitOfRoom(d.layout, s.room).roof === 'open'; // a ruin stands open to the sky, its walls broken off at their own heights: nothing there to be whole
    const hits = grid.cast(s.from, s.dir, 400, 3);
    const a = hits[0];
    const exit = exitOf(s);
    if (!a || a.t > exit.t + (DUNGEON.wall + 0.2) / Math.max(Math.abs([s.dir.x, s.dir.z, s.dir.y][exit.axis]), 0.15)) { // a wall is a metre thick: the ray may run on that far in it before it meets its face
      if (!roofless && !byDoor(d, s, exit.t)) note('hole', s.room, a ? 'through the wall' : 'to nothing', `from ${pos(s.from)} dir ${pos(s.dir)}${a ? `, first ${a.t.toFixed(1)} m ${a.face.tag}` : ''}, room left at ${exit.t.toFixed(1)} m`);
      continue;
    }
    const wrong = judge(hits, s.from, s.dir);
    if (wrong) note(wrong.kind, s.room, wrong.key, wrong.at);
  }
  return [...out.values()].map(({ n, ...f }) => ({ ...f, key: `${f.key} (${n} rays)` }));
}
