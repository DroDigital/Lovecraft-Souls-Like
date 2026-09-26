/**
 * The world's markers as geometry around their own origin: an Elder Sign's shrine (playtest round 7,
 * laid out by world/shrine.ts) and a gate (two jambs and a lintel banded with glowing glyphs, a dim
 * veil of Cosmic Purple between them). The shrine is its weathered stones; Lovecraft's branch-like
 * sign carved on both faces of the standing stone; the soft glow about each stroke and the ring of
 * runes on the ground, drawn by signViews.ts's glow shader (an `aQ` attribute says where a point lies
 * against its stroke, or around and across the ring); and candles on the plinth with their flames.
 * Carved faces look along +z.
 */

import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { hash2 } from '../core/rng';
import { ELDER_SIGN_SIZE } from '../world/arena';
import { PLINTH, SHRINE } from '../world/shrine';
import { box, tileUv, tint } from './meshKit';
import { ANOMALY, BASE, mixRgb, scaleRgb, type Rgb } from './palette';

/** The sign's strokes, after the veil's (veil.ts): start x and y above the stem's foot, lean from upright (radians), length. */
const STROKES: readonly (readonly [number, number, number, number])[] = [
  [0, 0, 0, 1.35], // the stem
  [0, 0.88, 0.65, 0.5], // the upper branches
  [0, 0.88, -0.65, 0.5],
  [0, 0.46, 0.8, 0.42], // the lower branches
  [0, 0.46, -0.8, 0.42],
];
const GLYPH_FOOT = 0.6; // the stem's foot above the standing stone's
export const GLOW_REACH = 0.27; // metres the glow spreads from a stroke
const ROCK: Rgb = scaleRgb(mixRgb(BASE.bone, BASE.seaGrey, 0.4), 1.5);
const WAX: Rgb = scaleRgb(BASE.bone, 1.05);
const FLAME: Rgb = [1, 0.8, 0.5];

/**
 * A standing stone from `y0`: `base` wide at its foot narrowing to `top` at its crown, `h` high and
 * `d` deep, the crown slanting down to one side with a corner knocked off, its edges weathered a
 * little (by position, so the faces still meet).
 */
function standingStone(base: number, top: number, h: number, d: number, y0: number, c: Rgb, seed: number): THREE.BufferGeometry {
  const g = new THREE.BoxGeometry(1, 1, 1, 2, 6, 1);
  const p = g.getAttribute('position');
  for (let i = 0; i < p.count; i++) {
    const [x, y, z] = [p.getX(i), p.getY(i), p.getZ(i)];
    const t = y + 0.5;
    const n = hash2(Math.round(x * 4) + 7, Math.round(t * 6) * 3 + Math.round(z * 2) + 1, seed) - 0.5;
    const crown = t > 0.99 ? (x + 0.5) * 0.18 * top + (x > 0.4 && z > 0 ? 0.09 : 0) : 0;
    p.setXYZ(i, x * (base + (top - base) * t) + n * 0.05 * base, y0 + t * h - crown, z * d + (t > 0.99 ? n * 0.04 : 0));
  }
  g.computeVertexNormals();
  return tint(tileUv(g, base, h), c);
}

/** The carved sign on one face (`side` 1: +z), `z` out from the stone's middle, its stem's foot at `y0`. */
function carved(side: 1 | -1, y0: number, z: number): THREE.BufferGeometry {
  const strokes = STROKES.map(([x, y, a, len]) => box(0.075, len, 0.03, 0, len / 2, 0, BASE.bone).rotateZ(-a * side).translate(x, y0 + y, side * z));
  return mergeGeometries(strokes);
}

/** A quad about each stroke on both faces, `aQ` = (along, across, the stroke's length), in metres. */
function glowRibbons(y0: number, z: number): THREE.BufferGeometry {
  const [pos, q, index]: number[][] = [[], [], []];
  const r = GLOW_REACH;
  for (const side of [1, -1]) {
    for (const [x, y, a, len] of STROKES) {
      const [dx, dy] = [Math.sin(a * side), Math.cos(a * side)];
      const first = pos.length / 3;
      for (const [s, t] of [[-r, -r], [len + r, -r], [len + r, r], [-r, r]]) {
        pos.push(x + dx * s + dy * t, y0 + y + dy * s - dx * t, side * z);
        q.push(s, t, len);
      }
      index.push(first, first + 1, first + 2, first, first + 2, first + 3);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('aQ', new THREE.Float32BufferAttribute(q, 3));
  g.setIndex(index);
  return g;
}

/** The ring of runes on the ground: an annulus, `aQ` = (turn 0..1 around, 0 inside to 1 outside, 0). */
function runeRing(segments = 72): THREE.BufferGeometry {
  const [r0, r1] = SHRINE.runes;
  const [pos, q, index]: number[][] = [[], [], []];
  for (let i = 0; i <= segments; i++) {
    const a = (i / segments) * Math.PI * 2;
    for (const [k, r] of [[0, r0], [1, r1]]) {
      pos.push(Math.sin(a) * r, 0.05, Math.cos(a) * r);
      q.push(i / segments, k, 0);
    }
    if (i < segments) index.push(i * 2, i * 2 + 1, i * 2 + 3, i * 2, i * 2 + 3, i * 2 + 2);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('aQ', new THREE.Float32BufferAttribute(q, 3));
  g.setIndex(index);
  return g;
}

/** Candles on the upper step before the stone: x, z, height. */
const CANDLES = [[-0.62, 0.42, 0.2], [-0.5, 0.5, 0.12], [0.6, 0.46, 0.24], [0.73, 0.38, 0.1]] as const;

export interface ShrineGeometry {
  stone: THREE.BufferGeometry; // plinth, standing stone and lesser stones (rock)
  glyph: THREE.BufferGeometry; // the sign carved on both faces
  glow: THREE.BufferGeometry; // about each stroke (aQ)
  runes: THREE.BufferGeometry; // the ring on the ground (aQ)
  wax: THREE.BufferGeometry;
  flames: THREE.BufferGeometry;
}

let shrine: ShrineGeometry | null = null;

/** The shrine's geometry, built once and shared by every Elder Sign. */
export function shrineGeometry(): ShrineGeometry {
  if (shrine) return shrine;
  const { base, top, height, depth } = SHRINE.stone;
  let y = 0;
  const steps = SHRINE.steps.map(([w, h, d], i) => {
    const g = tileUv(box(w, h, d, 0, y + h / 2, 0, scaleRgb(ROCK, 0.82 - 0.05 * i), 1), w, d);
    y += h;
    return g;
  });
  const lesser = SHRINE.lesser.map(([a, dist, r, h, lean], i) =>
    standingStone(r * 2, r * 1.3, h + 0.2, r * 1.5, -0.2, scaleRgb(ROCK, 0.72), 40 + i).rotateZ(lean).rotateY(a * 2.3).translate(Math.sin(a) * dist, 0, Math.cos(a) * dist));
  const face = depth / 2 + 0.012;
  shrine = {
    stone: mergeGeometries([...steps, standingStone(base, top, height, depth, PLINTH, ROCK, 7), ...lesser]),
    glyph: mergeGeometries([carved(1, PLINTH + GLYPH_FOOT, face), carved(-1, PLINTH + GLYPH_FOOT, face)]),
    glow: glowRibbons(PLINTH + GLYPH_FOOT, depth / 2 + 0.035),
    runes: runeRing(),
    wax: mergeGeometries(CANDLES.map(([x, z, h]) => tint(new THREE.CylinderGeometry(0.03, 0.036, h, 6).translate(x, PLINTH + h / 2, z), WAX))),
    flames: mergeGeometries(CANDLES.map(([x, z, h]) => tint(new THREE.OctahedronGeometry(0.035, 0).scale(0.8, 1.6, 0.8).translate(x, PLINTH + h + 0.05, z), FLAME))),
  };
  return shrine;
}

/** The arena's Elder Sign (no plinth): a standing stone and the sign carved on one face (`side` 1: +z). */
export function elderSignGeometry(side: 1 | -1 = 1): { slab: THREE.BufferGeometry; glyph: THREE.BufferGeometry } {
  const [w, h, d] = ELDER_SIGN_SIZE;
  return { slab: standingStone(w, w * 0.72, h, d, 0, ROCK, 3), glyph: carved(side, 0.35, d / 2 + 0.012) };
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
