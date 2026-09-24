/**
 * The world's markers as geometry around their own origin: the Elder Sign (a standing slab carved
 * with Lovecraft's branch-like sign, which glows faintly) and a gate (two jambs and a lintel banded
 * with glowing glyphs, a dim veil of Cosmic Purple between them). Their carved faces look along +z.
 */

import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { ARENA } from '../data/arena';
import { ELDER_SIGN_SIZE } from '../world/arena';
import { box, tileUv } from './meshKit';
import { ANOMALY, BASE, scaleRgb } from './palette';

/** The slab and its glyph; `side` 1 carves the +z face, -1 the -z face. */
export function elderSignGeometry(side: 1 | -1 = 1): { slab: THREE.BufferGeometry; glyph: THREE.BufferGeometry } {
  const [w, h, d] = ELDER_SIGN_SIZE;
  const slab = tileUv(box(w, h, d, 0, h / 2, 0, BASE.bone, ARENA.lightCell), w, h);
  const face = side * (d / 2 + 0.02);
  const twig = (len: number, angle: number, y: number): THREE.BufferGeometry => box(0.06, len, 0.04, 0, len / 2, 0, BASE.bone).rotateZ(angle).translate(0, y, face);
  const glyph = mergeGeometries([
    box(0.07, 1.25, 0.04, 0, 1.12, face, BASE.bone),
    twig(0.45, 0.65, 1.3),
    twig(0.45, -0.65, 1.3),
    twig(0.38, 0.8, 0.95),
    twig(0.38, -0.8, 0.95),
    twig(0.25, 0, 1.72),
  ]);
  return { slab, glyph };
}

/** A gate's stone frame, its glowing glyph bands, and the veil between its jambs. */
export function gateGeometry(): { frame: THREE.BufferGeometry; glyphs: THREE.BufferGeometry; veil: THREE.BufferGeometry } {
  const stone = scaleRgb(BASE.seaGrey, 1.6);
  const jamb = (x: number): THREE.BufferGeometry => tileUv(box(0.5, 3.8, 0.5, x, 1.9, 0, stone, 0.5), 0.5, 3.8);
  const frame = mergeGeometries([jamb(-1.9), jamb(1.9), tileUv(box(4.3, 0.5, 0.6, 0, 4.05, 0, stone, 0.5), 4.3, 0.5)]);
  const bands: THREE.BufferGeometry[] = [];
  for (let y = 0.4; y < 3.7; y += 0.6) for (const x of [-1.9, 1.9]) bands.push(box(0.53, 0.08, 0.53, x, y, 0, ANOMALY.purple));
  bands.push(box(4.33, 0.08, 0.63, 0, 4.05, 0, ANOMALY.purple));
  const veil = box(3.3, 3.8, 0.04, 0, 1.9, 0, scaleRgb(ANOMALY.purple, 0.35));
  return { frame, glyphs: mergeGeometries(bands), veil };
}
