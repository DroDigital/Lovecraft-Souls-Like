/**
 * Chunk props as low-poly primitives (spec §2): every prop's pieces (propShapes.ts, houseMesh.ts)
 * turned and placed, then merged per chunk into one mesh per material (stone, wood, needles and
 * leaves, clapboard, brick, shingles, and the self-lit glow of lamps, fires and lit windows), tinted
 * toward the region's ground. Built a few props at a time (a sliced job).
 */

import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import type { RegionDef } from '../data/regions';
import type { Prop } from '../world/props';
import { housePieces } from './houseMesh';
import { mixRgb, type Rgb } from './palette';
import { propPieces, type PropMat } from './propShapes';
import { createWorldMaterial, type WorldMaterialOptions } from './worldMaterial';

const STONE: Rgb = [0.86, 0.86, 0.84];
const BUDGET = 8; // prop weight per slice (a house weighs 4)

const OPTIONS: Record<PropMat, WorldMaterialOptions> = {
  stone: { texture: 'stone', seed: 6, vertexColors: true, vary: 0.6 },
  wood: { texture: 'wood', seed: 6, uvScale: [0.5, 0.5], vertexColors: true, vary: 0.4 },
  leaf: { texture: 'grass', seed: 9, vertexColors: true, vary: 0.4 },
  clapboard: { texture: 'clapboard', seed: 3, vertexColors: true, vary: 0.5 },
  brick: { texture: 'brick', seed: 3, vertexColors: true, vary: 0.5 },
  shingle: { texture: 'shingle', seed: 3, vertexColors: true, vary: 0.5 },
  glow: { texture: 'cloth', emissive: 1, vertexColors: true },
};
const materials = new Map<PropMat, THREE.ShaderMaterial>();
const material = (m: PropMat): THREE.ShaderMaterial => {
  let mat = materials.get(m);
  if (!mat) materials.set(m, (mat = createWorldMaterial(OPTIONS[m])));
  return mat;
};

/** Builds the chunk's props; `done` receives one mesh per material used. */
export function* propJob(props: readonly Prop[], region: RegionDef, done: (meshes: THREE.Mesh[]) => void): Generator<void, void> {
  const c = mixRgb(STONE, region.biome.tint, 0.5);
  const groups = new Map<PropMat, THREE.BufferGeometry[]>();
  let spent = 0;
  for (const p of props) {
    for (const piece of p.kind === 'house' ? housePieces(p, c) : propPieces(p, c)) {
      const geo = piece.geo.rotateY(p.yaw).translate(p.x, p.y - 0.15, p.z);
      groups.get(piece.mat)?.push(geo) ?? groups.set(piece.mat, [geo]);
    }
    spent += p.kind === 'house' ? 4 : 1;
    if (spent >= BUDGET) {
      spent = 0;
      yield;
    }
  }
  const meshes: THREE.Mesh[] = [];
  for (const [m, geos] of groups) {
    meshes.push(new THREE.Mesh(mergeGeometries(geos), material(m)));
    yield;
  }
  done(meshes);
}
