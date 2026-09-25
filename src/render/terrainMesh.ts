/**
 * A chunk's terrain mesh (spec §2, §3D): a vertex-coloured grid over the world surface, one vertex
 * a metre so the lantern's vertex-lit pool stays round, textured and tinted by its region, with
 * holes where dungeon rooms lay their own floors, and its roads' texture blended in along them (a
 * per-vertex share, aSplat). Built a few rows at a time (a sliced job).
 */

import * as THREE from 'three';
import { fbm } from '../core/noise';
import { REGION_LAYOUTS, type RoadTexture } from '../data/regionFeatures';
import type { GroundTexture } from '../data/regions';
import { chunkContent } from '../world/chunks';
import { roadShare } from '../world/regionPlan';
import { WORLD } from '../data/tuning';
import { inDungeon, surface } from '../world/terrain';
import { regionOfChunk, regionsNearChunk } from '../world/worldMap';
import { createWorldMaterial } from './worldMaterial';

const TILE = 2; // metres per ground texture repeat: 32 px/m, the arena floor's and the pillars' density
const GAIN = 2; // textures average about half brightness; tints are doubled (as figures do) so the lantern pool reads
const ROWS_PER_STEP = 8;

const materials = new Map<string, THREE.ShaderMaterial>();
const ORGANIC = new Set<GroundTexture>(['rot', 'grass', 'mud', 'sand', 'snow', 'flesh', 'water']);

/**
 * One shared material per ground and road texture: varied in world space, (organic ground) bombed
 * with a turned second sample so it never repeats, and the road texture blended in along the roads.
 */
export function groundMaterial(texture: GroundTexture, road: RoadTexture = 'cobble'): THREE.ShaderMaterial {
  const key = `${texture}|${road}`;
  let m = materials.get(key);
  if (!m) materials.set(key, (m = createWorldMaterial({ texture, texture2: road, vertexColors: true, vary: 0.9, bomb: ORGANIC.has(texture) })));
  return m;
}

/** Builds the chunk's terrain; `done` receives the mesh, or null when it all lies under the sea. */
export function* terrainJob(cx: number, cz: number, done: (mesh: THREE.Mesh | null) => void): Generator<void, void> {
  const region = regionOfChunk(cx, cz) ?? regionsNearChunk(cx, cz, WORLD.coast)[0];
  if (!region) return done(null);
  const s = WORLD.meshCell;
  const n = WORLD.chunk / s;
  const w = n + 3; // a one-vertex border for the normals
  const [x0, z0] = [cx * WORLD.chunk, cz * WORLD.chunk];
  const h = new Float32Array(w * w);
  let top = -Infinity;
  for (let j = 0; j < w; j++) {
    for (let i = 0; i < w; i++) top = Math.max(top, (h[j * w + i] = surface(x0 + (i - 1) * s, z0 + (j - 1) * s)));
    if (j % ROWS_PER_STEP === ROWS_PER_STEP - 1) yield;
  }
  if (top < WORLD.seaLevel - 0.5) return done(null);
  const count = (n + 1) * (n + 1);
  const pos = new Float32Array(count * 3);
  const nor = new Float32Array(count * 3);
  const uv = new Float32Array(count * 2);
  const col = new Float32Array(count * 3);
  const splat = new Float32Array(count);
  const roads = chunkContent(cx, cz).roads;
  const tint = region.biome.tint;
  const at = (i: number, j: number): number => h[(j + 1) * w + (i + 1)];
  for (let j = 0, v = 0; j <= n; j++) {
    for (let i = 0; i <= n; i++, v++) {
      const [x, z] = [x0 + i * s, z0 + j * s];
      pos.set([x, at(i, j), z], v * 3);
      const dx = (at(i + 1, j) - at(i - 1, j)) / (2 * s);
      const dz = (at(i, j + 1) - at(i, j - 1)) / (2 * s);
      const len = Math.hypot(dx, 1, dz);
      nor.set([-dx / len, 1 / len, -dz / len], v * 3);
      uv.set([x / TILE, z / TILE], v * 2);
      const k = GAIN * (0.62 + 0.38 * fbm(x * 0.15, z * 0.15, 99, 2));
      col.set([tint[0] * k, tint[1] * k, tint[2] * k], v * 3);
      splat[v] = roadShare(roads, x, z);
    }
    if (j % ROWS_PER_STEP === ROWS_PER_STEP - 1) yield;
  }
  const index: number[] = [];
  const sunk = WORLD.seaLevel - 1;
  for (let j = 0; j < n; j++) {
    for (let i = 0; i < n; i++) {
      if (Math.max(at(i, j), at(i + 1, j), at(i, j + 1), at(i + 1, j + 1)) < sunk) continue; // drowned: the sea covers it
      if (inDungeon(x0 + (i + 0.5) * s, z0 + (j + 0.5) * s)) continue; // the room lays its own floor
      const a = j * (n + 1) + i;
      const [b, c, d] = [a + 1, a + n + 1, a + n + 2];
      index.push(a, c, b, b, c, d);
    }
    if (j % (ROWS_PER_STEP * 2) === ROWS_PER_STEP * 2 - 1) yield;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  geo.setAttribute('aSplat', new THREE.BufferAttribute(splat, 1));
  geo.setIndex(index);
  geo.computeBoundingSphere();
  done(new THREE.Mesh(geo, groundMaterial(region.biome.texture, (REGION_LAYOUTS[region.id] ?? REGION_LAYOUTS.hub).road)));
}
