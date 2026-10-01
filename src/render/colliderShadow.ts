/**
 * What stands in the way of the lantern (round 34): every wall, pillar, trunk and stone a chunk holds is a collider the
 * simulation already knows, a closed solid, so the shape of what blocks light is built from them: boxes, turned boxes and
 * eight-sided prisms for the round ones, merged into one mesh a chunk that only the lantern's map sees
 * (render/lanternShadow.ts). Closed solids are drawn by their far faces into the map, so the surface a wall shows the room
 * is never in its own shadow. Render only.
 */

import * as THREE from 'three';
import type { Collider } from '../world/colliders';

/** The layer these meshes are on: the lantern's camera sees it, the investigator's does not. */
export const LANTERN_CASTER = 2;

const SIDES = 8; // of the prism a round thing is
const HIDDEN = new THREE.MeshBasicMaterial(); // never drawn by the investigator's camera (layer 2 alone); the lantern's pass draws it with its own

// Corners 0-3 are the bottom's (x0 z0, x1 z0, x1 z1, x0 z1), 4-7 the top's over them; each triangle is wound to look out of the solid
// (tests/lanternShadow.test.ts checks every one), which is what makes the far faces the ones the lantern's map is drawn from.
const BOX_FACES: readonly (readonly [number, number, number])[] = [
  [0, 1, 2], [0, 2, 3], // bottom
  [4, 6, 5], [4, 7, 6], // top
  [0, 5, 1], [0, 4, 5], [1, 6, 2], [1, 5, 6], [2, 7, 3], [2, 6, 7], [3, 4, 0], [3, 7, 4], // sides
];

/** The solid of a collider as corners (x, y, z in a flat list) and the triangles over them, each looking out. */
export function solidOf(c: Collider): { corners: number[]; faces: number[] } {
  const corners: number[] = [];
  const faces: number[] = [];
  if (c.kind === 'box') {
    const [x0, y0, z0, x1, y1, z1] = [c.min.x, c.min.y, c.min.z, c.max.x, c.max.y, c.max.z];
    corners.push(x0, y0, z0, x1, y0, z0, x1, y0, z1, x0, y0, z1, x0, y1, z0, x1, y1, z0, x1, y1, z1, x0, y1, z1);
    for (const f of BOX_FACES) faces.push(...f);
  } else if (c.kind === 'obox') {
    const [s, k] = [Math.sin(c.yaw), Math.cos(c.yaw)];
    const turned = (lx: number, lz: number): [number, number] => [c.x + lx * k + lz * s, c.z - lx * s + lz * k]; // the inverse of toBoxFrame
    const at: [number, number][] = [turned(-c.hx, -c.hz), turned(c.hx, -c.hz), turned(c.hx, c.hz), turned(-c.hx, c.hz)];
    for (const y of [c.y0, c.y1]) for (const [x, z] of at) corners.push(x, y, z);
    for (const f of BOX_FACES) faces.push(...f);
  } else {
    for (const y of [c.y0, c.y1]) for (let k = 0; k < SIDES; k++) corners.push(c.x + Math.cos((k / SIDES) * Math.PI * 2) * c.radius, y, c.z + Math.sin((k / SIDES) * Math.PI * 2) * c.radius);
    for (let k = 0; k < SIDES; k++) {
      const b = (k + 1) % SIDES;
      faces.push(k, SIDES + k, SIDES + b, k, SIDES + b, b); // the side
      if (k > 1) faces.push(0, k - 1, k, SIDES, SIDES + k, SIDES + k - 1); // the two ends, as fans
    }
  }
  return { corners, faces };
}

/** One mesh of the solids of `colliders`, for the lantern's map alone; null when there are none. */
export function colliderShadowMesh(colliders: readonly Collider[]): THREE.Mesh | null {
  if (!colliders.length) return null;
  const [positions, indices]: [number[], number[]] = [[], []];
  for (const c of colliders) {
    const { corners, faces } = solidOf(c);
    const base = positions.length / 3;
    positions.push(...corners);
    for (const f of faces) indices.push(base + f);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setIndex(indices);
  const mesh = new THREE.Mesh(geo, HIDDEN);
  mesh.layers.set(LANTERN_CASTER);
  return mesh;
}
