/**
 * Meshes for the world's sites (spec §3D): a legacy dungeon from its kit parts (stone walls with
 * their plinths, cornices, pilasters, sconces and rubble; blocks, pillars with bases and capitals,
 * and well rims; slab floors and steps; wooden bridge decks; dark pits and chasms seen from
 * inside), and an arena's ring of standing stones (and the well at its heart). Built a few parts at
 * a time (a sliced job).
 */

import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import type { V3 } from '../core/geom';
import { getRegion } from '../data/regions';
import { DUNGEON } from '../data/tuning';
import type { Part } from '../world/dungeonParts';
import type { ArenaPlace, Dungeon } from '../world/placements';
import { box, tileUv, tint } from './meshKit';
import { mixRgb, scaleRgb, type Rgb } from './palette';
import type { LightSpot } from './worldLights';
import { createWorldMaterial } from './worldMaterial';

const STONE: Rgb = [0.9, 0.9, 0.88];
const WOOD: Rgb = [0.75, 0.7, 0.62];
const PER_STEP = 12;

type Kind = 'stone' | 'slab' | 'wood' | 'glow';
type Built = { kind: Kind; geo: THREE.BufferGeometry; light?: LightSpot }; // a flame is a light too (worldLights.ts)
const FLAME: Rgb = [1, 0.78, 0.5];
const IRON: Rgb = [0.3, 0.29, 0.3];
const materials = new Map<Kind, THREE.ShaderMaterial>();
const material = (k: Kind): THREE.ShaderMaterial => {
  let m = materials.get(k);
  if (!m) {
    const o = k === 'glow' ? { texture: 'cloth' as const, emissive: 1 } : { texture: k, vary: 0.7, ...(k === 'wood' && { uvScale: [0.5, 0.5] as const }) };
    materials.set(k, (m = createWorldMaterial({ seed: 8, vertexColors: true, ...o })));
  }
  return m;
};

/** A wall's masonry: a plinth and a cornice along it, pilasters every few metres, now and then an iron sconce with its flame, and rubble at its foot. */
function wallDetail(min: V3, max: V3, c: Rgb): Built[] {
  const [w, h, d] = [max.x - min.x, max.y - min.y, max.z - min.z];
  if (h < 2 || Math.max(w, d) < 2) return [];
  const alongX = w >= d;
  const [len, thick] = alongX ? [w, d] : [d, w];
  const [cx, cz] = [(min.x + max.x) / 2, (min.z + max.z) / 2];
  const at = (t: number, across: number): [number, number] => (alongX ? [cx + t, cz + across] : [cx + across, cz + t]);
  const slab = (l: number, t: number, hh: number, y: number, tt: number, a = 0, tone = 1): THREE.BufferGeometry => {
    const [x, z] = at(tt, a);
    return tileUv(box(alongX ? l : t, hh, alongX ? t : l, x, y, z, scaleRgb(c, tone)), l, hh);
  };
  const stone = [slab(len, thick + 0.16, 0.45, min.y + 0.22, 0, 0, 0.8), slab(len, thick + 0.12, 0.22, max.y - 0.11, 0, 0, 0.85)];
  const glow: Built[] = [];
  const n = Math.floor(len / 4);
  const seed = Math.abs(Math.round(cx * 7 + cz * 13));
  for (let k = 1; k < n; k++) {
    const t = -len / 2 + (k * len) / n;
    stone.push(slab(0.5, thick + 0.3, h - 0.3, min.y + (h - 0.3) / 2, t, 0, 0.92));
    if ((k + seed) % 3 !== 0) continue;
    for (const side of [-1, 1]) { // a sconce on either face
      const a = side * (thick / 2 + 0.28);
      const [x, z] = at(t, a);
      stone.push(tint(box(0.08, 0.3, 0.08, x, min.y + 2.1, z, IRON), IRON));
      glow.push({ kind: 'glow', geo: box(0.12, 0.18, 0.12, x, min.y + 2.35, z, FLAME), light: { x, y: min.y + 2.4, z, kind: 'torch' } });
    }
  }
  for (let k = 0; k < Math.floor(len / 3); k++) { // rubble fallen from it
    const r = 0.12 + ((seed * (k + 3)) % 7) * 0.03;
    const t = -len / 2 + ((seed * (k + 1) * 37) % 100) / 100 * len;
    const side = (seed + k) % 2 ? 1 : -1;
    const [x, z] = at(t, side * (thick / 2 + 0.35 + r));
    stone.push(tint(new THREE.IcosahedronGeometry(r, 0).scale(1, 0.6, 1).translate(x, min.y + r * 0.4, z), scaleRgb(c, 0.75)));
  }
  for (const g of stone) if (!g.index) g.setIndex([...Array(g.getAttribute('position').count).keys()]);
  return [{ kind: 'stone', geo: mergeGeometries(stone) }, ...glow];
}

/** An open-topped box seen from inside: a pit's four walls and its floor, in shadow. */
function pit(min: V3, max: V3, c: Rgb): THREE.BufferGeometry {
  const [w, h, d] = [max.x - min.x, max.y - min.y, max.z - min.z];
  const [cx, cy, cz] = [(min.x + max.x) / 2, (min.y + max.y) / 2, (min.z + max.z) / 2];
  const faces = [
    new THREE.PlaneGeometry(w, h).translate(cx, cy, min.z),
    new THREE.PlaneGeometry(w, h).rotateY(Math.PI).translate(cx, cy, max.z),
    new THREE.PlaneGeometry(d, h).rotateY(Math.PI / 2).translate(min.x, cy, cz),
    new THREE.PlaneGeometry(d, h).rotateY(-Math.PI / 2).translate(max.x, cy, cz),
    new THREE.PlaneGeometry(w, d).rotateX(-Math.PI / 2).translate(cx, min.y, cz),
  ];
  return tint(tileUv(mergeGeometries(faces), Math.max(w, d), h), scaleRgb(c, 0.22));
}

/** A well: a stone rim knee-high above its floor and the dark water far below. */
function well(x: number, z: number, radius: number, top: number, c: Rgb): THREE.BufferGeometry[] {
  const rim = tint(tileUv(new THREE.CylinderGeometry(radius, radius, 0.9, 10, 1, true).translate(x, top - 0.45, z), Math.PI * 2 * radius, 0.9), c);
  const lip = tint(new THREE.RingGeometry(radius - 0.35, radius, 10).rotateX(-Math.PI / 2).translate(x, top, z), c);
  const shaft = tint(new THREE.CircleGeometry(radius - 0.35, 10).rotateX(-Math.PI / 2).translate(x, top - 0.6, z), scaleRgb(c, 0.08));
  return [rim, lip, shaft];
}

function partGeometry(p: Part, c: Rgb): Built[] {
  if (p.shape === 'cyl') {
    if (p.look === 'rim') return well(p.x, p.z, p.radius, p.y1, c).map((geo) => ({ kind: 'stone', geo }));
    const h = p.y1 - p.y0;
    const shaft = tint(tileUv(new THREE.CylinderGeometry(p.radius * 0.88, p.radius, h, 7, Math.ceil(h)).translate(p.x, p.y0 + h / 2, p.z), Math.PI * 2 * p.radius, h), c);
    const base = tint(new THREE.CylinderGeometry(p.radius * 1.3, p.radius * 1.4, 0.4, 8).translate(p.x, p.y0 + 0.2, p.z), scaleRgb(c, 0.85));
    const capital = tint(new THREE.CylinderGeometry(p.radius * 1.35, p.radius * 1.05, 0.35, 8).translate(p.x, p.y1 - 0.17, p.z), scaleRgb(c, 0.9));
    return [{ kind: 'stone', geo: mergeGeometries([shaft, base, capital]) }];
  }
  const [w, h, d] = [p.max.x - p.min.x, p.max.y - p.min.y, p.max.z - p.min.z];
  const [x, y, z] = [(p.min.x + p.max.x) / 2, (p.min.y + p.max.y) / 2, (p.min.z + p.max.z) / 2];
  switch (p.look) {
    case 'chasm':
      return [{ kind: 'stone', geo: pit(p.min, p.max, c) }];
    case 'floor':
    case 'step':
      return [{ kind: 'slab', geo: tileUv(box(w, h, d, x, y, z, scaleRgb(c, 0.9), 1), w, d) }];
    case 'deck':
      return [{ kind: 'wood', geo: box(w, h, d, x, y, z, WOOD, 1) }];
    case 'none':
      return [];
    case 'wall':
      return [{ kind: 'stone', geo: tileUv(box(w, h, d, x, y, z, c, 1), Math.max(w, d), h) }, ...wallDetail(p.min, p.max, c)];
    default:
      return [{ kind: 'stone', geo: tileUv(box(w, h, d, x, y, z, c, 1), Math.max(w, d), h) }];
  }
}

/** Merges geometry by material into meshes. */
function meshes(groups: Map<Kind, THREE.BufferGeometry[]>): THREE.Mesh[] {
  return [...groups].filter(([, g]) => g.length).map(([k, g]) => new THREE.Mesh(mergeGeometries(g), material(k)));
}

/** Builds a legacy dungeon; `done` receives its meshes and its sconces' flames as lights. */
export function* dungeonJob(d: Dungeon, done: (meshes: THREE.Mesh[], lights: LightSpot[]) => void): Generator<void, void> {
  const tone = getRegion(d.layout.region)?.biome.tint ?? STONE;
  const c = mixRgb(STONE, tone, 0.35);
  const groups = new Map<Kind, THREE.BufferGeometry[]>([['stone', []], ['slab', []], ['wood', []], ['glow', []]]);
  const lights: LightSpot[] = [];
  for (let k = 0; k < d.parts.length; k++) {
    for (const { kind, geo, light } of partGeometry(d.parts[k], c)) {
      groups.get(kind)!.push(geo);
      if (light) lights.push(light);
    }
    if (k % PER_STEP === PER_STEP - 1) yield;
  }
  done(meshes(groups), lights);
}

/** Builds an arena's ring of standing stones (and its well); `done` receives the mesh. */
export function* arenaJob(a: ArenaPlace, done: (meshes: THREE.Mesh[]) => void): Generator<void, void> {
  const c = mixRgb(STONE, getRegion(a.region)?.biome.tint ?? STONE, 0.5);
  const parts = a.stones.map((s, k) => {
    const lean = ((k * 37) % 11) / 11 - 0.5;
    return tint(tileUv(new THREE.CylinderGeometry(s.radius * 0.7, s.radius, s.height, 6, Math.ceil(s.height)).translate(0, s.height / 2 - 0.2, 0), 4, s.height), scaleRgb(c, 0.75 + 0.1 * lean))
      .rotateZ(lean * 0.12)
      .translate(s.x, a.y, s.z);
  });
  yield;
  if (a.well) parts.push(...well(a.x, a.z, DUNGEON.well + 0.35, a.y + 0.9, c));
  done([new THREE.Mesh(mergeGeometries(parts), material('stone'))]);
}
