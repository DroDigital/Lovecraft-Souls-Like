/** Small geometry helpers shared by scenes and figures: UV tiling, vertex tints, positioned boxes, light baked toward the ground. */

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
 * Darkens a geometry's vertex colours toward the ground it stands on (y 0 in its own frame): whole
 * from `reach` metres up, `low` of itself at the foot, as light baked into the vertices of the
 * PS1's worlds (playtest round 7).
 */
export function groundShade(geo: THREE.BufferGeometry, low = 0.55, reach = 1.6): THREE.BufferGeometry {
  const pos = geo.getAttribute('position');
  const col = geo.getAttribute('color');
  if (!col) return geo;
  for (let i = 0; i < pos.count; i++) {
    const t = Math.min(1, Math.max(0, pos.getY(i) / reach));
    const k = low + (1 - low) * t * t * (3 - 2 * t);
    col.setXYZ(i, col.getX(i) * k, col.getY(i) * k, col.getZ(i) * k);
  }
  col.needsUpdate = true;
  return geo;
}
