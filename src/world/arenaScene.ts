/** Phase 1 arena meshes from `ARENA` data: stone floor, pillars and colonnade, low walls, the Elder Sign. */

import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { fbm } from '../core/noise';
import { createRng } from '../core/rng';
import { ARENA } from '../data/arena';
import { box, tileUv, tint } from '../render/meshKit';
import { BASE, type Rgb } from '../render/palette';
import { createWorldMaterial } from '../render/worldMaterial';
import { colonnadeSpots, ELDER_SIGN_SIZE } from './arena';

const STONE: Rgb = [0.92, 0.92, 0.9];

export function createArenaScene(): THREE.Scene {
  const scene = new THREE.Scene();
  scene.add(floor(), columns(), walls(), ...elderSign());
  return scene;
}

/** Worn flagstones, darker beyond the colonnade. */
function floor(): THREE.Mesh {
  const { floorSize: size, floorTile: tile } = ARENA;
  const geo = new THREE.PlaneGeometry(size, size, 32, 32).rotateX(-Math.PI / 2);
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
  return new THREE.Mesh(geo, createWorldMaterial({ texture: 'stone', uvScale: [uv, uv], vertexColors: true }));
}

/** Free-standing pillars plus the ring of columns, each with a square capital. */
function columns(): THREE.Mesh {
  const rng = createRng(ARENA.seed);
  const parts: THREE.BufferGeometry[] = [];
  const add = (x: number, z: number, r: number, h: number, capital: boolean): void => {
    const shade = 0.75 + 0.25 * rng();
    const geo = new THREE.CylinderGeometry(r * 0.88, r, h, 7, Math.max(1, Math.round(h / 1.5)));
    tileUv(geo, Math.PI * 2 * r, h).rotateY(rng() * Math.PI * 2).translate(x, h / 2, z);
    parts.push(tint(geo, [STONE[0] * shade, STONE[1] * shade, STONE[2] * shade]));
    if (capital) parts.push(box(r * 2.3, 0.35, r * 2.3, x, h + 0.17, z, STONE));
  };
  for (const [x, z, r, h] of ARENA.pillars) add(x, z, r, h, h > 4);
  for (const { x, z } of colonnadeSpots()) add(x, z, ARENA.colonnade.pillarRadius, ARENA.colonnade.height, true);
  return new THREE.Mesh(mergeGeometries(parts), createWorldMaterial({ texture: 'stone', seed: 2, vertexColors: true }));
}

function walls(): THREE.Mesh {
  const parts = ARENA.walls.map(([x, z, hw, hd, h]) => tileUv(box(hw * 2, h, hd * 2, x, h / 2, z, STONE), Math.max(hw, hd) * 2, h));
  return new THREE.Mesh(mergeGeometries(parts), createWorldMaterial({ texture: 'stone', seed: 3, vertexColors: true }));
}

/** The checkpoint: a standing slab carved with Lovecraft's branch-like Elder Sign, which glows faintly. */
function elderSign(): THREE.Mesh[] {
  const [w, h, d] = ELDER_SIGN_SIZE;
  const { x, z } = ARENA.elderSign;
  const slab = tileUv(box(w, h, d, x, h / 2, z, BASE.bone), w, h);
  const face = z - d / 2 - 0.02; // the side facing the arena
  const twig = (len: number, angle: number, y: number): THREE.BufferGeometry =>
    box(0.06, len, 0.04, 0, len / 2, 0, BASE.bone).rotateZ(angle).translate(x, y, face);
  const glyph = mergeGeometries([
    box(0.07, 1.25, 0.04, x, 1.12, face, BASE.bone),
    twig(0.45, 0.65, 1.3),
    twig(0.45, -0.65, 1.3),
    twig(0.38, 0.8, 0.95),
    twig(0.38, -0.8, 0.95),
    twig(0.25, 0, 1.72),
  ]);
  return [
    new THREE.Mesh(slab, createWorldMaterial({ texture: 'stone', seed: 4, vertexColors: true })),
    new THREE.Mesh(glyph, createWorldMaterial({ texture: 'stone', seed: 4, emissive: 0.9, vertexColors: true })),
  ];
}
