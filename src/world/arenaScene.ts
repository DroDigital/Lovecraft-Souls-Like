/** Phase 1 arena meshes from `ARENA` data: slab floor, pillars and colonnade, low walls, the Elder Sign. */

import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { fbm } from '../core/noise';
import { createRng } from '../core/rng';
import { ARENA } from '../data/arena';
import { box, tileUv, tint } from '../render/meshKit';
import { type Rgb } from '../render/palette';
import { elderSignGeometry } from '../render/signMeshes';
import { createWorldMaterial } from '../render/worldMaterial';
import { colonnadeSpots } from './arena';

const STONE: Rgb = [0.92, 0.92, 0.9];

export function createArenaScene(): THREE.Scene {
  const scene = new THREE.Scene();
  scene.add(floor(), columns(), walls(), ...elderSign());
  return scene;
}

/** Worn flagstones, darker beyond the colonnade. */
function floor(): THREE.Mesh {
  const { floorSize: size, floorTile: tile } = ARENA;
  const cells = Math.ceil(size / ARENA.lightCell);
  const geo = new THREE.PlaneGeometry(size, size, cells, cells).rotateX(-Math.PI / 2);
  const pos = geo.getAttribute('position');
  const colors = new Float32Array(pos.count * 3);
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = pos.getZ(i);
    const worn = 0.62 + 0.38 * fbm(x * 0.18, z * 0.18, ARENA.seed, 3);
    const k = worn * (Math.hypot(x, z) > ARENA.colonnade.radius ? 0.5 : 1);
    colors.set([k, k, k], i * 3);
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  const uv = size / tile;
  return new THREE.Mesh(geo, createWorldMaterial({ texture: 'slab', uvScale: [uv, uv], vertexColors: true }));
}

/** Free-standing pillars plus the ring of columns, each with a square capital. */
function columns(): THREE.Mesh {
  const rng = createRng(ARENA.seed);
  const parts: THREE.BufferGeometry[] = [];
  const add = (x: number, z: number, r: number, h: number, capital: boolean): void => {
    const shade = 0.75 + 0.25 * rng();
    const geo = new THREE.CylinderGeometry(r * 0.88, r, h, 7, Math.max(1, Math.round(h / (ARENA.lightCell * 2))));
    tileUv(geo, Math.PI * 2 * r, h).rotateY(rng() * Math.PI * 2).translate(x, h / 2, z);
    parts.push(tint(geo, [STONE[0] * shade, STONE[1] * shade, STONE[2] * shade]));
    if (capital) parts.push(box(r * 2.3, 0.35, r * 2.3, x, h + 0.17, z, STONE));
  };
  for (const [x, z, r, h] of ARENA.pillars) add(x, z, r, h, h > 4);
  for (const { x, z } of colonnadeSpots()) add(x, z, ARENA.colonnade.pillarRadius, ARENA.colonnade.height, true);
  return new THREE.Mesh(mergeGeometries(parts), createWorldMaterial({ texture: 'stone', seed: 2, vertexColors: true }));
}

function walls(): THREE.Mesh {
  const parts = ARENA.walls.map(([x, z, hw, hd, h]) => tileUv(box(hw * 2, h, hd * 2, x, h / 2, z, STONE, ARENA.lightCell), Math.max(hw, hd) * 2, h));
  return new THREE.Mesh(mergeGeometries(parts), createWorldMaterial({ texture: 'stone', seed: 3, vertexColors: true }));
}

/** The checkpoint: a standing stone carved with Lovecraft's branch-like Elder Sign, which glows faintly. */
function elderSign(): THREE.Mesh[] {
  const { x, z } = ARENA.elderSign;
  const { slab, glyph } = elderSignGeometry(-1); // carved on the side facing the arena
  slab.translate(x, 0, z);
  glyph.translate(x, 0, z);
  return [
    new THREE.Mesh(slab, createWorldMaterial({ texture: 'rock', seed: 4, vertexColors: true })),
    new THREE.Mesh(glyph, createWorldMaterial({ texture: 'rock', seed: 4, emissive: 0.9, vertexColors: true })),
  ];
}
