/**
 * A dungeon as it is seen from outside (playtest round 13: every dungeon was a maze of bare walls
 * standing open in a field). Its kit (data/kits.ts) chooses: a mound heaps rock and earth over its
 * roofs and against its outer walls (steep, so feet stop at the band dungeonParts.ts sets), leaving
 * only its mouth; a building raises a pitched roof over each of its rooms at ground level or above;
 * ruins stand bare. Inside, a roof of beams hangs dark timbers under the boards. Pure geometry.
 */

import * as THREE from 'three';
import { fbm } from '../core/noise';
import type { DungeonKit } from '../data/kits';
import { DUNGEON } from '../data/tuning';
import { floorRange, kitOfRoom, type DungeonLayout, type RoomLayout } from '../world/dungeonKit';
import { MOUND_BAND, type BoxPart, type Part } from '../world/dungeonParts';
import { bankEnds, grounded, outerFace, sweeps, type BankEnd } from '../world/moundBanks';
import { DIRS } from '../world/worldMap';
import { box, tileUv, tint } from './meshKit';
import { scaleRgb, type Rgb } from './palette';

export interface ShellPiece {
  texture: 'rock' | 'mud' | 'shingle' | 'wood';
  geo: THREE.BufferGeometry;
}

const DARK_WOOD: Rgb = [0.42, 0.36, 0.3];
const top = (r: RoomLayout): number => floorRange(r)[1] + DUNGEON.height;

/** Rough earth: a small offset that is the same wherever two pieces meet. */
const lumpAt = (x: number, z: number, seed: number): number => fbm(x * 0.21, z * 0.21, seed, 2) - 0.5;

/** A lumpy cap of earth over a room's roof, higher in the middle, meeting the heaped sides at the walls. */
function cap(r: RoomLayout, c: Rgb, seed: number): THREE.BufferGeometry {
  const w = 2 * r.half + DUNGEON.wall;
  const n = Math.max(4, Math.round(w / 2.5));
  const g = new THREE.PlaneGeometry(w, w, n, n).rotateX(-Math.PI / 2);
  const p = g.getAttribute('position');
  for (let i = 0; i < p.count; i++) {
    const [x, z] = [p.getX(i), p.getZ(i)];
    const edge = Math.max(Math.abs(x), Math.abs(z)) / (w / 2); // 0 in the middle, 1 at the rim
    const lump = fbm((r.x + x) * 0.07, (r.z + z) * 0.07, seed, 3);
    p.setY(i, RIM + (1 - edge * edge) * (1.5 + r.half * 0.1 + lump * 2.2) + lumpAt(r.x + x, r.z + z, seed) * (1 - edge ** 4)); // level with the banks' brim at its rim (round 19: it stood up to half a metre off it)
  }
  g.computeVertexNormals();
  return tint(tileUv(g.translate(r.x, top(r), r.z), w, w, 4), c);
}

const RIM = 0.9; // the heap's brim above the roof

/** A bank's cross-section, out from the wall's face and up: from the brim over its top down to the ground beyond the band. */
function profileOf(base: number, height: number): [number, number][] {
  const rise = height - base;
  return [[0, height + RIM], [MOUND_BAND * 0.5, base + rise * 0.72], [MOUND_BAND, base + rise * 0.42], [MOUND_BAND + 1.4, base + 0.2], [MOUND_BAND + 2.4, base - 0.4]];
}

/** A bank's point `o` metres out from (x, z) along the unit (dx, dz), at height y, roughened by the earth's lumps (its brim and its foot stay put). */
function bankPoint(x: number, z: number, [dx, dz]: readonly [number, number], o: number, y: number, seed: number): number[] {
  const [px, pz] = [x + dx * o, z + dz * o];
  const j = o > 0.1 && o < MOUND_BAND + 2 ? lumpAt(px, pz, seed) : 0;
  return [px + dx * j * 0.8, y + j * 1.2, pz + dz * j * 0.8];
}

/** A quad's two faces: seen from outside whichever way it runs. */
const quad = (pos: number[], q: readonly number[][]): void => {
  for (const i of [0, 2, 1, 0, 3, 2, 0, 1, 2, 0, 2, 3]) pos.push(...q[i]);
};

const CORNER_STEPS = 4; // a corner's sweep, in quarter-right-angle steps

/**
 * Earth and rock heaped against an outer wall: straight along it, swept round a corner the dungeon
 * ends at (the other wall's bank sweeps none there), and closed where it stops at a doorway or meets
 * the next wall's bank at the cells' edge (round 19: it ran two metres straight on past every end, so
 * at a corner two banks crossed in the air like a tent's flaps, and along a row of rooms each lay
 * over the next).
 */
function skirt(p: BoxPart, ends: readonly [BankEnd, BankEnd], base: number, height: number, c: Rgb, seed: number): THREE.BufferGeometry {
  const n = DIRS[p.outer!];
  const alongX = n.z !== 0;
  const face = outerFace(p);
  const out: [number, number] = [n.x, n.z];
  const profile = profileOf(base, height);
  const cut = (e: BankEnd): number => (e === 'joined' ? DUNGEON.wall / 2 : 0);
  const [a0, a1] = alongX ? [p.min.x + cut(ends[0]), p.max.x - cut(ends[1])] : [p.min.z + cut(ends[0]), p.max.z - cut(ends[1])];
  const onFace = (a: number): [number, number] => (alongX ? [a, face] : [face, a]);
  const band = (x0: number, z0: number, u: readonly [number, number], x1: number, z1: number, v: readonly [number, number], pos: number[]): void => {
    for (let k = 0; k < profile.length - 1; k++) {
      const [[o0, y0], [o1, y1]] = [profile[k], profile[k + 1]];
      quad(pos, [bankPoint(x0, z0, u, o0, y0, seed), bankPoint(x1, z1, v, o0, y0, seed), bankPoint(x1, z1, v, o1, y1, seed), bankPoint(x0, z0, u, o1, y1, seed)]);
    }
  };
  const pos: number[] = [];
  const steps = Math.max(1, Math.round((a1 - a0) / 2));
  for (let s = 0; s < steps; s++) band(...onFace(a0 + ((a1 - a0) * s) / steps), out, ...onFace(a0 + ((a1 - a0) * (s + 1)) / steps), out, pos);
  for (const [e, a, sign, end] of [[ends[0], a0, -1, 0], [ends[1], a1, 1, 1]] as const) {
    const [cx, cz] = onFace(a);
    const [tx, tz] = alongX ? [sign, 0] : [0, sign]; // on, past the end
    if (e === 'corner') {
      if (!sweeps(p, end)) continue; // the corner's other wall sweeps it
      const turn = (i: number): [number, number] => {
        const t = (i / CORNER_STEPS) * (Math.PI / 2);
        return [n.x * Math.cos(t) + tx * Math.sin(t), n.z * Math.cos(t) + tz * Math.sin(t)];
      };
      for (let i = 0; i < CORNER_STEPS; i++) band(cx, cz, turn(i), cx, cz, turn(i + 1), pos);
      continue;
    }
    const low = base - 0.4; // closed: the bank's end, down to the ground
    for (let k = 0; k < profile.length - 1; k++) {
      const [[o0, y0], [o1, y1]] = [profile[k], profile[k + 1]];
      quad(pos, [bankPoint(cx, cz, out, o0, y0, seed), bankPoint(cx, cz, out, o1, y1, seed), [cx + n.x * o1, low, cz + n.z * o1], [cx + n.x * o0, low, cz + n.z * o0]]);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  const uv: number[] = [];
  for (let i = 0; i < pos.length; i += 3) uv.push((alongX ? pos[i] : pos[i + 2]) / 4, pos[i + 1] / 4);
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.computeVertexNormals();
  return tint(g, c);
}

/** A pitched roof over a room, its ridge along the room's axis, with gable ends. */
function roof(r: RoomLayout, c: Rgb): THREE.BufferGeometry {
  const over = 0.7;
  const w = r.half + DUNGEON.wall / 2 + over;
  const rise = Math.min(7, w * 0.62);
  const y0 = top(r) + 0.4;
  const alongX = DIRS[r.axis].x !== 0;
  const pts = (a: number, b: number, y: number): number[] => (alongX ? [r.x + a, y, r.z + b] : [r.x + b, y, r.z + a]);
  const [A, B, C, D, E, F] = [pts(-w, -w, y0), pts(w, -w, y0), pts(w, 0, y0 + rise), pts(-w, 0, y0 + rise), pts(-w, w, y0), pts(w, w, y0)];
  const tris = [A, C, B, A, D, C, E, F, C, E, C, D, A, E, D, B, C, F]; // two slopes and the gables
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(tris.flat(), 3));
  const uv: number[] = [];
  for (const p of tris) uv.push((alongX ? p[0] : p[2]) / 3, (alongX ? p[2] : p[0]) / 3 + p[1] / 3);
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.computeVertexNormals();
  const back = g.clone(); // seen from below too, under the eaves
  const idx = back.getAttribute('position');
  for (let i = 0; i < idx.count; i += 3) {
    const [x, y, z] = [idx.getX(i + 1), idx.getY(i + 1), idx.getZ(i + 1)];
    idx.setXYZ(i + 1, idx.getX(i + 2), idx.getY(i + 2), idx.getZ(i + 2));
    idx.setXYZ(i + 2, x, y, z);
  }
  back.computeVertexNormals();
  return tint(mergeTwo(g, back), c);
}

function mergeTwo(a: THREE.BufferGeometry, b: THREE.BufferGeometry): THREE.BufferGeometry {
  const g = new THREE.BufferGeometry();
  for (const name of ['position', 'normal', 'uv']) {
    const [x, y] = [a.getAttribute(name), b.getAttribute(name)];
    const arr = new Float32Array(x.array.length + y.array.length);
    arr.set(x.array as Float32Array);
    arr.set(y.array as Float32Array, x.array.length);
    g.setAttribute(name, new THREE.BufferAttribute(arr, x.itemSize));
  }
  return g;
}

/** Dark beams across a roof of boards, under it. */
function beams(r: RoomLayout): THREE.BufferGeometry[] {
  const y = top(r) - 0.3;
  const alongX = DIRS[r.axis].x !== 0; // beams run across the axis
  const span = 2 * r.half;
  const out: THREE.BufferGeometry[] = [];
  for (let t = -r.half + 2; t <= r.half - 2; t += 3) {
    out.push(alongX ? box(0.35, 0.5, span, r.x + t, y, r.z, DARK_WOOD) : box(span, 0.5, 0.35, r.x, y, r.z + t, DARK_WOOD));
  }
  return out;
}

/** What a dungeon wears outside, and its beams within. */
export function dungeonShell(d: DungeonLayout, parts: readonly Part[], tone: (kit: DungeonKit) => Rgb): ShellPiece[] {
  const out: ShellPiece[] = [];
  const seed = Math.abs(Math.round(d.origin.x * 3 + d.origin.z * 7));
  for (const r of d.rooms) {
    const kit = kitOfRoom(d, r);
    if (kit.roof === 'beams') out.push(...beams(r).map((geo) => ({ texture: 'wood' as const, geo })));
    if (kit.shell === 'mound' && kit.roof !== 'open') out.push({ texture: 'rock', geo: cap(r, scaleRgb(tone(kit), 0.85), seed) });
    if (kit.shell === 'building' && kit.roof !== 'open' && floorRange(r)[0] >= d.base - 1.5) out.push({ texture: 'shingle', geo: roof(r, scaleRgb([0.62, 0.6, 0.6], 1)) });
  }
  for (const p of parts) {
    if (!grounded(d, p)) continue; // not a lintel over the way in
    const r = d.rooms[p.room];
    const kit = kitOfRoom(d, r);
    if (kit.shell !== 'mound' || kit.roof === 'open') continue;
    out.push({ texture: 'rock', geo: skirt(p, bankEnds(d, parts, p), d.base, top(r), scaleRgb(tone(kit), 0.85), seed) });
  }
  return out;
}
