/**
 * Prop shapes (spec §2: low-poly, vertex-coloured): each prop as a few pieces, each tagged with the
 * material it merges into. Dead hardwoods with forked branches and root flares, dark pines of stacked
 * boughs, lichened rocks, fluted pillars with plinths, leaning monoliths, round-topped headstones,
 * crosses, obelisks, broken walls, dry-stone field walls, rail fences, iron street lamps, fallen logs,
 * fire pits, bushes, stumps and altars. Houses are houseMesh.ts's.
 */

import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { createRng, type Rng } from '../core/rng';
import type { Prop } from '../world/props';
import { box, tileUv, tint } from './meshKit';
import { BASE, mixRgb, scaleRgb, type Rgb } from './palette';

export type PropMat = 'stone' | 'wood' | 'leaf' | 'clapboard' | 'brick' | 'shingle' | 'glow';
export interface Piece {
  mat: PropMat;
  geo: THREE.BufferGeometry;
}

const BARK: Rgb = scaleRgb(mixRgb(BASE.charcoal, BASE.rust, 0.35), 1.7);
const NEEDLES: Rgb = scaleRgb(mixRgb(BASE.seaGrey, BASE.charcoal, 0.55), 1.3);
const IRON: Rgb = scaleRgb(BASE.charcoal, 1.8);
const FLAME: Rgb = mixRgb(BASE.bone, [1, 0.8, 0.5], 0.6);

const cyl = (r0: number, r1: number, h: number, seg: number, c: Rgb, rows = 1): THREE.BufferGeometry =>
  tint(tileUv(new THREE.CylinderGeometry(r1, r0, h, seg, rows).translate(0, h / 2, 0), Math.PI * (r0 + r1), h), c);

/** A branch from the origin along (yaw, pitch from vertical), `len` long, tapering from r. */
function limb(len: number, r: number, yaw: number, pitch: number, c: Rgb): THREE.BufferGeometry {
  return cyl(r, r * 0.35, len, 4, c).rotateX(pitch).rotateY(yaw);
}

function tree(p: Prop, rng: Rng): Piece[] {
  const parts = [cyl(p.w * 1.6, p.w, 0.6, 6, scaleRgb(BARK, 0.8)), cyl(p.w, p.w * 0.45, p.h, 6, BARK, Math.ceil(p.h / 1.5))];
  const n = 3 + Math.floor(rng() * 3);
  for (let k = 0; k < n; k++) {
    const y = p.h * (0.45 + 0.45 * (k / n)) + rng() * 0.5;
    const yaw = k * 2.3 + rng();
    const len = (1.4 + rng() * 1.8) * (1 - k / (n + 2));
    const pitch = 0.55 + rng() * 0.5;
    parts.push(limb(len, p.w * 0.45, yaw, pitch, BARK).translate(0, y, 0));
    const [ex, ey, ez] = [Math.sin(yaw) * Math.sin(pitch) * len, Math.cos(pitch) * len, Math.cos(yaw) * Math.sin(pitch) * len];
    for (let t = 0; t < 2; t++) parts.push(limb(len * 0.55, p.w * 0.2, yaw + (t - 0.5) * 1.2, pitch - 0.3 + rng() * 0.4, BARK).translate(ex * 0.8, y + ey * 0.8, ez * 0.8));
  }
  return [{ mat: 'wood', geo: mergeGeometries(parts) }];
}

function pine(p: Prop, rng: Rng): Piece[] {
  const trunk = cyl(p.w, p.w * 0.5, p.h * 0.35, 5, BARK);
  const boughs: THREE.BufferGeometry[] = [];
  const tiers = 4;
  for (let k = 0; k < tiers; k++) {
    const t = k / tiers;
    const r = p.h * 0.22 * (1 - t * 0.7) * (0.9 + rng() * 0.2);
    const h = p.h * 0.34;
    const cone = tint(tileUv(new THREE.ConeGeometry(r, h, 7), Math.PI * r, h), scaleRgb(NEEDLES, 0.85 + 0.25 * t));
    boughs.push(cone.rotateY(rng() * 3).translate(0, p.h * 0.28 + p.h * 0.62 * t + h / 2 - h * 0.25, 0));
  }
  return [{ mat: 'wood', geo: trunk }, { mat: 'leaf', geo: mergeGeometries(boughs) }];
}

function rock(p: Prop, rng: Rng, c: Rgb): Piece[] {
  const geo = new THREE.SphereGeometry(p.w, 8, 6);
  const pos = geo.getAttribute('position');
  const colors = new Float32Array(pos.count * 3);
  for (let i = 0; i < pos.count; i++) {
    const [x, y, z] = [pos.getX(i), pos.getY(i), pos.getZ(i)];
    const k = 0.78 + 0.44 * rng();
    pos.setXYZ(i, x * k, Math.max(-0.25 * p.w, y) * (p.h / p.w) * (0.85 + 0.3 * rng()), z * (0.78 + 0.44 * rng()));
    const moss = Math.max(0, y / p.w) * 0.5; // lichen on the top
    colors.set(mixRgb(c, scaleRgb(mixRgb(BASE.seaGrey, BASE.charcoal, 0.3), 1.6), moss), i * 3);
  }
  geo.computeVertexNormals();
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  return [{ mat: 'stone', geo: tileUv(geo, p.w * 2, p.h) }];
}

function pillar(p: Prop, rng: Rng, c: Rgb): Piece[] {
  const broken = rng() < 0.4 ? p.h * (0.5 + 0.3 * rng()) : p.h;
  const parts = [box(p.w * 2.6, 0.4, p.w * 2.6, 0, 0.2, 0, scaleRgb(c, 0.85)), cyl(p.w * 0.95, p.w * 0.85, broken, 10, c, Math.ceil(broken))];
  if (broken === p.h) parts.push(box(p.w * 2.3, 0.35, p.w * 2.3, 0, p.h + 0.17, 0, scaleRgb(c, 0.9)));
  return [{ mat: 'stone', geo: tileUv(mergeGeometries(parts), 2, 2) }];
}

function monolith(p: Prop, rng: Rng, c: Rgb): Piece[] {
  const geo = new THREE.CylinderGeometry(Math.SQRT1_2 * 0.75, Math.SQRT1_2, 1, 4, Math.ceil(p.h / 2)).rotateY(Math.PI / 4);
  geo.scale(p.w * 2, p.h, p.d * 2).translate(0, p.h / 2, 0).rotateZ((rng() - 0.5) * 0.12);
  return [{ mat: 'stone', geo: tint(tileUv(geo, p.w * 4, p.h), scaleRgb(c, 0.75)) }];
}

function headstone(p: Prop, rng: Rng, c: Rgb): Piece[] {
  const tone = scaleRgb(c, 0.8 + 0.3 * rng());
  const top = tint(new THREE.CylinderGeometry(p.w, p.w, p.d * 2, 8, 1, false, 0, Math.PI).rotateZ(Math.PI / 2).rotateY(Math.PI / 2).translate(0, p.h - p.w, 0), tone);
  const parts = [box(p.w * 2, p.h - p.w, p.d * 2, 0, (p.h - p.w) / 2, 0, tone), top, box(p.w * 2.4, 0.1, p.d * 5, 0, 0.05, p.d * 1.5, scaleRgb(tone, 0.8))];
  return [{ mat: 'stone', geo: tileUv(mergeGeometries(parts), 1, 1).rotateX((rng() - 0.5) * 0.18) }];
}

function cross(p: Prop, rng: Rng, c: Rgb): Piece[] {
  const stone = rng() < 0.5;
  const tone = stone ? scaleRgb(c, 0.9) : scaleRgb(BARK, 1.1);
  const geo = mergeGeometries([box(0.14, p.h, 0.12, 0, p.h / 2, 0, tone), box(0.62, 0.12, 0.12, 0, p.h * 0.72, 0, tone)]).rotateZ((rng() - 0.5) * 0.2);
  return [{ mat: stone ? 'stone' : 'wood', geo: tileUv(geo, 1, 1) }];
}

function obelisk(p: Prop, c: Rgb): Piece[] {
  const shaft = new THREE.CylinderGeometry(p.w * 0.6, p.w, p.h, 4, 3).rotateY(Math.PI / 4).translate(0, p.h / 2 + 0.4, 0);
  const tip = new THREE.ConeGeometry(p.w * 0.6, p.w * 1.2, 4).rotateY(Math.PI / 4).translate(0, p.h + 0.4 + p.w * 0.6, 0);
  const base = new THREE.BoxGeometry(p.w * 3, 0.4, p.w * 3).translate(0, 0.2, 0);
  return [{ mat: 'stone', geo: tint(tileUv(mergeGeometries([shaft, tip, base]), 1, 2), scaleRgb(c, 0.95)) }];
}

function brokenWall(p: Prop, rng: Rng, c: Rgb): Piece[] {
  const n = 3;
  const seg = (p.w * 2) / n;
  const parts = Array.from({ length: n }, (_, k) => {
    const h = p.h * (0.35 + 0.65 * rng());
    return tileUv(box(seg, h, p.d * 2, -p.w + seg * (k + 0.5), h / 2, 0, scaleRgb(c, 0.85 + 0.2 * rng()), 1), seg, h);
  });
  for (let k = 0; k < 3; k++) parts.push(tileUv(box(0.5, 0.35, 0.5, (rng() - 0.5) * p.w * 2, 0.17, p.d + 0.5 + rng(), c), 0.5, 0.5));
  return [{ mat: 'stone', geo: mergeGeometries(parts) }];
}

/** A dry-stone field wall: a waist-high run of rough stones, uneven along its top. */
function fieldWall(p: Prop, rng: Rng, c: Rgb): Piece[] {
  const parts: THREE.BufferGeometry[] = [];
  const n = Math.max(2, Math.round(p.w * 1.4));
  for (let k = 0; k < n; k++) {
    const len = (p.w * 2) / n;
    const h = p.h * (0.8 + 0.35 * rng());
    parts.push(tileUv(box(len * 1.02, h, p.d * 2 * (0.85 + 0.3 * rng()), -p.w + len * (k + 0.5), h / 2, (rng() - 0.5) * 0.1, scaleRgb(c, 0.75 + 0.3 * rng())), len, h));
  }
  return [{ mat: 'stone', geo: mergeGeometries(parts) }];
}

function fence(p: Prop, rng: Rng): Piece[] {
  const parts: THREE.BufferGeometry[] = [];
  const posts = Math.max(2, Math.round(p.w) + 1);
  for (let k = 0; k < posts; k++) parts.push(box(0.12, p.h * (0.95 + 0.1 * rng()), 0.12, -p.w + (2 * p.w * k) / (posts - 1), p.h / 2, 0, BARK));
  for (const y of [0.4, 0.8]) parts.push(box(p.w * 2, 0.08, 0.05, 0, p.h * y, 0.07, scaleRgb(BARK, 1.2)).rotateZ((rng() - 0.5) * 0.06));
  return [{ mat: 'wood', geo: tileUv(mergeGeometries(parts), 1, 1) }];
}

function lamp(p: Prop): Piece[] {
  const post = mergeGeometries([cyl(0.09, 0.06, p.h, 6, IRON), box(0.26, 0.2, 0.26, 0, 0.1, 0, IRON), box(0.4, 0.06, 0.4, 0, p.h + 0.46, 0, IRON), box(0.06, 0.06, 0.06, 0, p.h + 0.52, 0, IRON)]);
  const glass = box(0.28, 0.4, 0.28, 0, p.h + 0.22, 0, FLAME);
  return [{ mat: 'wood', geo: tileUv(post, 1, 1) }, { mat: 'glow', geo: glass }];
}

function log(p: Prop, rng: Rng): Piece[] {
  const geo = cyl(p.d, p.d * 0.9, p.w * 2, 7, scaleRgb(BARK, 0.9 + 0.2 * rng())).translate(0, -p.w, 0).rotateZ(Math.PI / 2).translate(0, p.d, 0);
  return [{ mat: 'wood', geo }];
}

function firepit(p: Prop, rng: Rng, c: Rgb): Piece[] {
  const stones: THREE.BufferGeometry[] = [];
  for (let k = 0; k < 9; k++) {
    const a = (k / 9) * Math.PI * 2;
    stones.push(box(0.3, 0.22, 0.24, Math.sin(a) * p.w, 0.11, Math.cos(a) * p.w, scaleRgb(c, 0.7 + 0.3 * rng())).rotateY(-a));
  }
  const wood = [0, 1.2, 2.4].map((a) => cyl(0.07, 0.06, 1.1, 5, scaleRgb(BARK, 0.6)).translate(0, -0.55, 0).rotateZ(Math.PI / 2).rotateY(a).translate(0, 0.12, 0));
  const embers = tint(new THREE.ConeGeometry(0.4, 0.5, 6).translate(0, 0.25, 0), FLAME);
  return [{ mat: 'stone', geo: tileUv(mergeGeometries(stones), 1, 1) }, { mat: 'wood', geo: mergeGeometries(wood) }, { mat: 'glow', geo: tileUv(embers, 1, 1) }];
}

function bush(p: Prop, rng: Rng): Piece[] {
  const parts = Array.from({ length: 3 + Math.floor(rng() * 2) }, () => {
    const r = p.w * (0.5 + 0.4 * rng());
    return tint(tileUv(new THREE.SphereGeometry(r, 6, 4), r * 3, r * 2), scaleRgb(NEEDLES, 0.8 + 0.4 * rng())).scale(1, p.h / p.w, 1).translate((rng() - 0.5) * p.w, r * 0.6, (rng() - 0.5) * p.w);
  });
  return [{ mat: 'leaf', geo: mergeGeometries(parts) }];
}

function stump(p: Prop): Piece[] {
  return [{ mat: 'wood', geo: mergeGeometries([cyl(p.w * 1.3, p.w, p.h, 7, BARK), cyl(p.w * 0.2, p.w * 0.05, p.h * 0.6, 3, BARK).rotateZ(1.2).translate(p.w, 0, 0)]) }];
}

function altar(p: Prop, rng: Rng, c: Rgb): Piece[] {
  const slab = box(p.w * 2, 0.3, p.d * 2, 0, p.h - 0.15, 0, scaleRgb(c, 0.8));
  const legs = [-1, 1].map((s) => box(0.5, p.h - 0.3, p.d * 1.6, s * p.w * 0.6, (p.h - 0.3) / 2, 0, scaleRgb(c, 0.7)));
  const stain = box(p.w * 1.2, 0.02, p.d * 1.2, (rng() - 0.5) * 0.3, p.h + 0.01, 0, scaleRgb(BASE.rust, 0.5));
  return [{ mat: 'stone', geo: tileUv(mergeGeometries([slab, ...legs, stain]), 1, 1) }];
}

/** A prop's pieces in its own frame (feet at the origin, facing +z); houses are handled apart. */
export function propPieces(p: Prop, c: Rgb): Piece[] {
  const rng = createRng(p.seed);
  switch (p.kind) {
    case 'tree':
      return tree(p, rng);
    case 'pine':
      return pine(p, rng);
    case 'rock':
      return rock(p, rng, c);
    case 'pillar':
      return pillar(p, rng, c);
    case 'monolith':
      return monolith(p, rng, c);
    case 'grave':
      return headstone(p, rng, c);
    case 'cross':
      return cross(p, rng, c);
    case 'obelisk':
      return obelisk(p, c);
    case 'ruin':
      return brokenWall(p, rng, c);
    case 'wall':
      return fieldWall(p, rng, c);
    case 'fence':
      return fence(p, rng);
    case 'lamp':
      return lamp(p);
    case 'log':
      return log(p, rng);
    case 'firepit':
      return firepit(p, rng, c);
    case 'bush':
      return bush(p, rng);
    case 'stump':
      return stump(p);
    case 'altar':
      return altar(p, rng, c);
    case 'house':
      return [];
  }
}
