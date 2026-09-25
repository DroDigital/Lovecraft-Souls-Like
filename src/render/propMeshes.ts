/**
 * Chunk props as low-poly primitives (spec §2): every prop's pieces (propShapes.ts, houseMesh.ts)
 * turned and placed, then merged per chunk into one mesh per material (stone, wood, needles and
 * leaves, clapboard, brick, shingles, and the self-lit glow of lamps, fires and lit windows), tinted
 * toward the region's ground; the lamps, fires and windows are reported as lights (worldLights.ts). Built a few props at a time (a sliced job).
 */

import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import type { RegionDef } from '../data/regions';
import type { Prop } from '../world/props';
import { housePieces } from './houseMesh';
import { mixRgb, type Rgb } from './palette';
import { propPieces, type PropMat } from './propShapes';
import type { LightSpot } from './worldLights';
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

/** Builds the chunk's props; `done` receives one mesh per material used, and the lights among them. */
export function* propJob(props: readonly Prop[], region: RegionDef, done: (meshes: THREE.Mesh[], lights: LightSpot[]) => void, cover?: Partial<Record<PropMat, THREE.BufferGeometry>>): Generator<void, void> {
  const c = mixRgb(STONE, region.biome.tint, 0.5);
  const groups = new Map<PropMat, THREE.BufferGeometry[]>();
  for (const [m, geo] of Object.entries(cover ?? {}) as [PropMat, THREE.BufferGeometry][]) groups.set(m, [geo]);
  const lights: LightSpot[] = [];
  let spent = 0;
  for (const p of props) {
    const [s, cs] = [Math.sin(p.yaw), Math.cos(p.yaw)];
    for (const piece of p.kind === 'house' ? housePieces(p, c) : propPieces(p, c)) {
      const geo = piece.geo.rotateY(p.yaw).translate(p.x, p.y - 0.15, p.z);
      groups.get(piece.mat)?.push(geo) ?? groups.set(piece.mat, [geo]);
      if (!piece.light) continue;
      if (piece.at) {
        const [x, y, z] = piece.at; // turned as the piece was (rotateY), then placed
        lights.push({ x: p.x + x * cs + z * s, y: p.y - 0.15 + y, z: p.z - x * s + z * cs, kind: piece.light });
      } else {
        geo.computeBoundingBox();
        const m = geo.boundingBox!.getCenter(new THREE.Vector3());
        lights.push({ x: m.x, y: m.y, z: m.z, kind: piece.light });
      }
    }
    spent += p.kind === 'house' ? 4 : 1;
    if (spent >= BUDGET) {
      spent = 0;
      yield;
    }
  }
  const meshes: THREE.Mesh[] = [];
  for (const [m, geos] of groups) {
    for (const g of geos) if (!g.index) g.setIndex([...Array(g.getAttribute('position').count).keys()]); // merging needs all indexed or none
    meshes.push(new THREE.Mesh(mergeGeometries(geos), material(m)));
    yield;
  }
  done(meshes, lights);
}
