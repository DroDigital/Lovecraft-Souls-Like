/** Small geometry helpers shared by scenes and figures: UV tiling, vertex tints, positioned boxes, rounded limbs and lumps. */

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

/** A tinted box centred at (x, y, z); `cell` > 0 splits its faces into cells at most that many metres wide (for vertex lighting). */
export function box(w: number, h: number, d: number, x: number, y: number, z: number, c: Rgb, cell = 0): THREE.BufferGeometry {
  const n = (size: number): number => (cell > 0 ? Math.max(1, Math.ceil(size / cell)) : 1);
  return tint(new THREE.BoxGeometry(w, h, d, n(w), n(h), n(d)).translate(x, y, z), c);
}

/**
 * A tapered, smooth-sided prism about the y axis (a limb, a torso, a hat's crown): `top` and `bottom`
 * radii, `h` tall, centred at `y`, squashed front to back by `sz`; `open` leaves its ends off (a collar).
 */
export const round = (top: number, bottom: number, h: number, y: number, c: Rgb, sz = 1, sides = 8, open = false): THREE.BufferGeometry =>
  tint(new THREE.CylinderGeometry(top, bottom, h, sides, 1, open).scale(1, 1, sz).translate(0, y, 0), c);

/** A rounded lump (a head, a hand, a toe): a low sphere of radius `r` scaled by `sx`, `sy`, `sz`, at (x, y, z). */
export const lump = (r: number, sx: number, sy: number, sz: number, x: number, y: number, z: number, c: Rgb): THREE.BufferGeometry =>
  tint(new THREE.SphereGeometry(r, 8, 6).scale(sx, sy, sz).translate(x, y, z), c);
