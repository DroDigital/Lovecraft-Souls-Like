/**
 * Meshes for the world's sites (spec §3D): a legacy dungeon from its kit parts (stone walls, blocks,
 * pillars and well rims; slab floors and steps; wooden bridge decks; dark pits and chasms seen from
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
import { createWorldMaterial } from './worldMaterial';

const STONE: Rgb = [0.9, 0.9, 0.88];
const WOOD: Rgb = [0.75, 0.7, 0.62];
const PER_STEP = 12;

type Kind = 'stone' | 'slab' | 'wood';
const materials = new Map<Kind, THREE.ShaderMaterial>();
const material = (k: Kind): THREE.ShaderMaterial => {
  let m = materials.get(k);
  if (!m) materials.set(k, (m = createWorldMaterial({ texture: k, seed: 8, vertexColors: true, ...(k === 'wood' && { uvScale: [0.5, 0.5] as const }) })));
  return m;
};

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

function partGeometry(p: Part, c: Rgb): { kind: Kind; geo: THREE.BufferGeometry }[] {
  if (p.shape === 'cyl') {
    if (p.look === 'rim') return well(p.x, p.z, p.radius, p.y1, c).map((geo) => ({ kind: 'stone', geo }));
    const h = p.y1 - p.y0;
    return [{ kind: 'stone', geo: tint(tileUv(new THREE.CylinderGeometry(p.radius * 0.88, p.radius, h, 7, Math.ceil(h)).translate(p.x, p.y0 + h / 2, p.z), Math.PI * 2 * p.radius, h), c) }];
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
    default:
      return [{ kind: 'stone', geo: tileUv(box(w, h, d, x, y, z, c, 1), Math.max(w, d), h) }];
  }
}

/** Merges geometry by material into meshes. */
function meshes(groups: Map<Kind, THREE.BufferGeometry[]>): THREE.Mesh[] {
  return [...groups].filter(([, g]) => g.length).map(([k, g]) => new THREE.Mesh(mergeGeometries(g), material(k)));
}

/** Builds a legacy dungeon; `done` receives its meshes. */
export function* dungeonJob(d: Dungeon, done: (meshes: THREE.Mesh[]) => void): Generator<void, void> {
  const tone = getRegion(d.layout.region)?.biome.tint ?? STONE;
  const c = mixRgb(STONE, tone, 0.35);
  const groups = new Map<Kind, THREE.BufferGeometry[]>([['stone', []], ['slab', []], ['wood', []]]);
  for (let k = 0; k < d.parts.length; k++) {
    for (const { kind, geo } of partGeometry(d.parts[k], c)) groups.get(kind)!.push(geo);
    if (k % PER_STEP === PER_STEP - 1) yield;
  }
  done(meshes(groups));
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
