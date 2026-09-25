/**
 * The title's backdrop (playtest round 4): the Seventy Steps of Light Slumber as a stone stair cut
 * down into the earth between walls, a pilaster either side every fourth step (every eighth with a
 * lit sconce, a row of flames going down into the fog) and a broken stretch every eighth, so it repeats every eight steps and a walk down it loops without a seam. Built
 * descending toward −z from the origin, the treads' middles on the line slopeAt draws.
 */

import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { box, tileUv } from '../render/meshKit';
import type { Rgb } from '../render/palette';
import { createWorldMaterial } from '../render/worldMaterial';

export const STAIR = { run: 0.9, rise: 0.35, width: 5.6, wall: 2.8, period: 8, from: -8, to: 72 };

const WEAR = [0.92, 0.84, 0.9, 0.8, 0.95, 0.86, 0.82, 0.9]; // each tread's tone within the eight-step repeat

const stepOf = (z: number): number => Math.max(STAIR.from, Math.floor(-z / STAIR.run));
/** The height of the tread under z. */
export const treadAt = (z: number): number => -stepOf(z) * STAIR.rise;
/** A line through the treads' middles: where a walker's hips ride down. */
export const slopeAt = (z: number): number => ((z + STAIR.run / 2) * STAIR.rise) / STAIR.run;

export function titleStair(): THREE.Group {
  const { run, rise, width, wall } = STAIR;
  const treads: THREE.BufferGeometry[] = [];
  const walls: THREE.BufferGeometry[] = [];
  const pillars: THREE.BufferGeometry[] = [];
  const flames: THREE.BufferGeometry[] = [];
  const grey = (k: number): Rgb => [k, k, k * 0.97];
  for (let n = STAIR.from; n < STAIR.to; n++) {
    const k = ((n % STAIR.period) + STAIR.period) % STAIR.period;
    const [top, z, deep] = [-n * rise, -(n + 0.5) * run, rise + 0.8];
    treads.push(tileUv(box(width, deep, run, 0, top - deep / 2, z, grey(WEAR[k] * (n % 2 ? 0.86 : 1))), width, run));
    treads.push(tileUv(box(width, 0.07, 0.12, 0, top - 0.035, -(n + 1) * run + 0.04, grey(1.15)), width, 0.12)); // a worn pale nosing, so each step's edge reads
    for (const side of [-1, 1]) {
      const h = side < 0 && k === 5 ? 1.2 : wall; // a broken stretch of the left wall
      walls.push(tileUv(box(0.9, h + deep, run, side * (width / 2 + 0.45), top + (h - deep) / 2, z, grey(0.75 + 0.1 * WEAR[(k + 3) % 8])), run, h + deep));
      if (k % 4 !== 0) continue;
      const tall = side < 0 && k === 4 ? 1.7 : wall + 1.1; // one pilaster in eight broken off
      pillars.push(tileUv(new THREE.CylinderGeometry(0.3, 0.34, tall, 8).translate(side * (width / 2 - 0.05), top + tall / 2, z), 2, tall));
      if (tall > 2) pillars.push(box(0.8, 0.28, 0.8, side * (width / 2 - 0.05), top + tall + 0.14, z, grey(0.9)));
      if (k !== 0) continue;
      const x = side * (width / 2 - 0.42);
      pillars.push(box(0.22, 0.08, 0.22, x, top + 2.02, z, grey(0.45))); // an iron sconce...
      flames.push(box(0.12, 0.2, 0.12, x, top + 2.16, z, [1, 0.8, 0.52])); // ...and its flame
    }
  }
  const group = new THREE.Group();
  const vc = (geos: THREE.BufferGeometry[]): THREE.BufferGeometry => {
    for (const g of geos) if (!g.getAttribute('color')) g.setAttribute('color', new THREE.Float32BufferAttribute(new Float32Array(g.getAttribute('position').count * 3).fill(0.85), 3));
    return mergeGeometries(geos);
  };
  group.add(
    new THREE.Mesh(mergeGeometries(treads), createWorldMaterial({ texture: 'slab', seed: 4, vertexColors: true })),
    new THREE.Mesh(mergeGeometries(walls), createWorldMaterial({ texture: 'stone', seed: 5, vertexColors: true })),
    new THREE.Mesh(vc(pillars), createWorldMaterial({ texture: 'stone', seed: 6, vertexColors: true })),
    new THREE.Mesh(mergeGeometries(flames), createWorldMaterial({ texture: 'cloth', emissive: 1, vertexColors: true })),
  );
  return group;
}
