/** Small geometry helpers shared by scenes and figures: UV tiling, vertex tints, positioned boxes. */

import * as THREE from 'three';
import type { Rgb } from './palette';

/** Scales a geometry's UVs so the texture repeats every `metres` metres. */
export function tileUv(geo: THREE.BufferGeometry, width: number, height: number, metres = 2): THREE.BufferGeometry {
  const uv = geo.getAttribute('uv');
  for (let i = 0; i < uv.count; i++) uv.setXY(i, (uv.getX(i) * width) / metres, (uv.getY(i) * height) / metres);
  return geo;
}

/** Paints every vertex one colour (multiplied into the texture by world materials with vertexColors). */
export function tint(geo: THREE.BufferGeometry, c: Rgb): THREE.BufferGeometry {
  const n = geo.getAttribute('position').count;
  const colors = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) colors.set(c, i * 3);
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  return geo;
}

/** A tinted box centred at (x, y, z). */
export function box(w: number, h: number, d: number, x: number, y: number, z: number, c: Rgb): THREE.BufferGeometry {
  return tint(new THREE.BoxGeometry(w, h, d).translate(x, y, z), c);
}
