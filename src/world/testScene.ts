/** Phase 0 look-test scene: terrain patch, stone pillars, a wooden pier over a pool, one anomaly. */

import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { fbm } from '../core/noise';
import { createRng, type Rng } from '../core/rng';
import { ANOMALY } from '../render/palette';
import { createWorldMaterial } from '../render/worldMaterial';
import { createHeightfield, type HeightFn } from './heightfield';

const LAYOUT = {
  seed: 1337,
  terrainSize: 180, // metres
  terrainSegments: 36, // big PS1-sized polygons make the affine wobble readable
  terrainTile: 6, // metres per texture repeat
  flatRadius: 24, // flat plaza around the anomaly...
  flatBlend: 22, // ...blending into hills over this distance
  pool: { x: -17, z: 9, radius: 5.5, depth: 1.6, level: -0.35 },
  ringRadius: 5.5,
  ringCount: 8,
  anomalyHeight: 3,
};

export interface TestScene {
  scene: THREE.Scene;
  anomalyPosition: THREE.Vector3;
  groundHeight: HeightFn;
  /** Animate by (interpolated) time in seconds. */
  update(time: number): void;
}

const smoothstep = (a: number, b: number, x: number): number => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

export function createTestScene(): TestScene {
  const rng = createRng(LAYOUT.seed);
  const hills = createHeightfield({ seed: LAYOUT.seed, amplitude: 5, frequency: 1 / 26, octaves: 4 });
  const { pool } = LAYOUT;
  const groundHeight: HeightFn = (x, z) => {
    const plaza = smoothstep(LAYOUT.flatRadius, LAYOUT.flatRadius + LAYOUT.flatBlend, Math.hypot(x, z));
    const dip = 1 - smoothstep(pool.radius * 0.55, pool.radius, Math.hypot(x - pool.x, z - pool.z));
    return hills(x, z) * plaza - pool.depth * dip;
  };

  const anomaly = anomalyMesh(rng);
  const scene = new THREE.Scene();
  scene.add(terrain(groundHeight), pillars(rng, groundHeight), pier(), water(), anomaly);
  const anomalyPosition = new THREE.Vector3();
  return {
    scene,
    anomalyPosition,
    groundHeight,
    update(time) {
      anomaly.position.set(0, LAYOUT.anomalyHeight + 0.4 * Math.sin(time * 0.8), 0);
      anomaly.rotation.set(0.3 * Math.sin(time * 0.37), time * 0.35, 0);
      anomalyPosition.copy(anomaly.position);
    },
  };
}

function terrain(height: HeightFn): THREE.Mesh {
  const { terrainSize: size, terrainSegments: n, terrainTile: tile } = LAYOUT;
  const geo = new THREE.PlaneGeometry(size, size, n, n);
  geo.rotateX(-Math.PI / 2);
  const pos = geo.getAttribute('position');
  const colors = new Float32Array(pos.count * 3);
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = pos.getZ(i);
    pos.setY(i, height(x, z));
    const k = 0.65 + 0.35 * fbm(x * 0.15, z * 0.15, 99, 2); // vertex-colour variation
    colors.set([k, k, k], i * 3);
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geo.computeVertexNormals();
  const uv = size / tile;
  return new THREE.Mesh(geo, createWorldMaterial({ texture: 'rot', uvScale: [uv, uv], vertexColors: true }));
}

/** Scales a geometry's UVs so the texture repeats every 2 m. */
function tileUv(geo: THREE.BufferGeometry, width: number, height: number): void {
  const uv = geo.getAttribute('uv');
  for (let i = 0; i < uv.count; i++) uv.setXY(i, (uv.getX(i) * width) / 2, (uv.getY(i) * height) / 2);
}

function pillars(rng: Rng, height: HeightFn): THREE.Mesh {
  const parts: THREE.BufferGeometry[] = [];
  const add = (x: number, z: number, h: number, tilt: number): void => {
    const r = 0.55 + rng() * 0.15;
    const geo = new THREE.CylinderGeometry(r * 0.9, r, h, 7, Math.max(1, Math.round(h / 1.5)));
    tileUv(geo, Math.PI * 2 * r, h);
    geo.translate(0, h / 2, 0);
    geo.rotateZ(tilt);
    geo.rotateY(rng() * Math.PI * 2);
    geo.translate(x, height(x, z) - 0.3, z);
    parts.push(geo);
  };
  for (let i = 0; i < LAYOUT.ringCount; i++) {
    const a = (i / LAYOUT.ringCount) * Math.PI * 2 + rng() * 0.2;
    const h = i % 3 === 2 ? 1.5 + rng() * 1.5 : 5 + rng() * 3; // every third one broken
    add(Math.cos(a) * LAYOUT.ringRadius, Math.sin(a) * LAYOUT.ringRadius, h, (rng() - 0.5) * 0.15);
  }
  add(9, -7, 6, Math.PI / 2 - 0.06); // fallen, half-sunk
  for (let i = 0; i < 7; i++) {
    const a = rng() * Math.PI * 2;
    const d = 38 + rng() * 40; // out in the fog
    add(Math.cos(a) * d, Math.sin(a) * d, 4 + rng() * 6, (rng() - 0.5) * 0.2);
  }
  return new THREE.Mesh(mergeGeometries(parts), createWorldMaterial({ texture: 'stone' }));
}

function box(w: number, h: number, d: number, x: number, y: number, z: number, tilt = 0): THREE.BufferGeometry {
  const geo = new THREE.BoxGeometry(w, h, d);
  geo.rotateX(tilt);
  geo.translate(x, y, z);
  return geo;
}

/** A rotting pier from the plaza out over the pool, one plank missing. */
function pier(): THREE.Mesh {
  const { pool } = LAYOUT;
  const parts: THREE.BufferGeometry[] = [];
  for (let i = 0; i < 11; i++) {
    if (i === 7) continue;
    parts.push(box(0.5, 0.1, 2, pool.x + 7 - i * 0.6, 0.3, pool.z, i === 9 ? 0.15 : 0));
  }
  for (const dx of [0.5, 5.5]) {
    for (const dz of [-1.05, 1.05]) parts.push(box(0.2, 2.6, 0.2, pool.x + 7 - dx, -0.8, pool.z + dz));
  }
  return new THREE.Mesh(mergeGeometries(parts), createWorldMaterial({ texture: 'wood' }));
}

function water(): THREE.Mesh {
  const { pool } = LAYOUT;
  const geo = new THREE.CircleGeometry(pool.radius, 12);
  geo.rotateX(-Math.PI / 2);
  geo.translate(pool.x, pool.level, pool.z);
  return new THREE.Mesh(geo, createWorldMaterial({ texture: 'water', uvScale: [2.5, 2.5], uvScroll: [0.02, 0.05] }));
}

/** The anomaly: a lumpy, faceted mass whose every face is an anomaly colour. */
function anomalyMesh(rng: Rng): THREE.Mesh {
  const geo = new THREE.IcosahedronGeometry(1.5, 1);
  const pos = geo.getAttribute('position');
  const v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    v.multiplyScalar(0.75 + 0.6 * fbm(v.x * 0.9 + 5, v.y * 0.9 + v.z * 0.7, 7, 3));
    pos.setXYZ(i, v.x, v.y, v.z);
  }
  geo.computeVertexNormals();
  const choices = [ANOMALY.magenta, ANOMALY.magenta, ANOMALY.purple, ANOMALY.green];
  const colors = new Float32Array(pos.count * 3);
  for (let f = 0; f < pos.count / 3; f++) {
    const c = choices[Math.floor(rng() * choices.length)];
    for (let k = 0; k < 3; k++) colors.set(c, (f * 3 + k) * 3);
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  return new THREE.Mesh(geo, createWorldMaterial({ texture: 'flesh', uvScale: [2, 2], emissive: 0.65, vertexColors: true }));
}
