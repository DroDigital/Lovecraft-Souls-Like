/**
 * Chunk props as low-poly primitives (spec §2), merged per chunk into one stone and one wood mesh:
 * dead trees, rocks, pillars, monoliths, graves and ruined walls, tinted toward their region's ground.
 * Built a few props at a time (a sliced job).
 */

import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { createRng } from '../core/rng';
import type { RegionDef } from '../data/regions';
import type { Prop } from '../world/chunks';
import { box, tileUv, tint } from './meshKit';
import { mixRgb, scaleRgb, type Rgb } from './palette';
import { createWorldMaterial } from './worldMaterial';

const STONE: Rgb = [0.86, 0.86, 0.84];
const BARK: Rgb = [0.42, 0.4, 0.38];
const PER_STEP = 6;

let stoneMaterial: THREE.ShaderMaterial | undefined;
let woodMaterial: THREE.ShaderMaterial | undefined;

function tree(p: Prop, rng: () => number): THREE.BufferGeometry {
  const parts = [tint(new THREE.CylinderGeometry(p.w * 0.6, p.w, p.h, 5, Math.ceil(p.h / 1.5)).translate(0, p.h / 2, 0), BARK)];
  for (let k = 0; k < 3; k++) {
    const len = 1.2 + rng() * 1.6;
    const branch = box(0.14, len, 0.14, 0, len / 2, 0, BARK).rotateZ(0.6 + rng() * 0.5).rotateY(k * 2.1 + rng());
    parts.push(branch.translate(0, p.h * (0.55 + 0.12 * k), 0));
  }
  return mergeGeometries(parts);
}

function rock(p: Prop, rng: () => number, c: Rgb): THREE.BufferGeometry {
  const geo = new THREE.SphereGeometry(p.w, 6, 4);
  const pos = geo.getAttribute('position');
  for (let i = 0; i < pos.count; i++) pos.setXYZ(i, pos.getX(i) * (0.8 + 0.4 * rng()), Math.max(-0.3, pos.getY(i)) * (p.h / p.w) * (0.8 + 0.4 * rng()), pos.getZ(i) * (0.8 + 0.4 * rng()));
  geo.computeVertexNormals();
  return tint(tileUv(geo, p.w * 2, p.h), c);
}

function ruin(p: Prop, rng: () => number, c: Rgb): THREE.BufferGeometry {
  const n = 3;
  const seg = (p.w * 2) / n;
  return mergeGeometries(Array.from({ length: n }, (_, k) => {
    const h = p.h * (0.45 + 0.55 * rng());
    return tileUv(box(seg, h, p.d * 2, -p.w + seg * (k + 0.5), h / 2, 0, c, 1), seg, h);
  }));
}

/** One prop's geometry, placed in the world. */
function propGeometry(p: Prop, c: Rgb): THREE.BufferGeometry {
  const rng = createRng(p.seed);
  const shade = scaleRgb(c, 0.8 + 0.3 * rng());
  let geo: THREE.BufferGeometry;
  switch (p.kind) {
    case 'tree':
      geo = tree(p, rng);
      break;
    case 'rock':
      geo = rock(p, rng, shade);
      break;
    case 'pillar':
      geo = tint(tileUv(new THREE.CylinderGeometry(p.w * 0.88, p.w, p.h, 7, Math.ceil(p.h)).translate(0, p.h / 2, 0), Math.PI * 2 * p.w, p.h), shade);
      break;
    case 'monolith':
      geo = tileUv(box(p.w * 2, p.h, p.d * 2, 0, p.h / 2, 0, scaleRgb(shade, 0.7), 1), p.w * 2, p.h);
      break;
    case 'grave':
      geo = mergeGeometries([box(p.w * 2, p.h, p.d * 2, 0, p.h / 2, 0, shade), box(p.w * 1.6, 0.12, p.d * 2.2, 0, p.h, 0, shade)]);
      break;
    case 'ruin':
      geo = ruin(p, rng, shade);
      break;
  }
  return geo.rotateY(p.yaw).translate(p.x, p.y - 0.15, p.z);
}

/** Builds the chunk's props; `done` receives up to two meshes (stone, wood). */
export function* propJob(props: readonly Prop[], region: RegionDef, done: (meshes: THREE.Mesh[]) => void): Generator<void, void> {
  const c = mixRgb(STONE, region.biome.tint, 0.5);
  const stone: THREE.BufferGeometry[] = [];
  const wood: THREE.BufferGeometry[] = [];
  for (let k = 0; k < props.length; k++) {
    (props[k].kind === 'tree' ? wood : stone).push(propGeometry(props[k], c));
    if (k % PER_STEP === PER_STEP - 1) yield;
  }
  const meshes: THREE.Mesh[] = [];
  stoneMaterial ??= createWorldMaterial({ texture: 'stone', seed: 6, vertexColors: true });
  woodMaterial ??= createWorldMaterial({ texture: 'wood', seed: 6, uvScale: [0.5, 0.5], vertexColors: true });
  if (stone.length) meshes.push(new THREE.Mesh(mergeGeometries(stone), stoneMaterial));
  if (wood.length) meshes.push(new THREE.Mesh(mergeGeometries(wood), woodMaterial));
  done(meshes);
}
