/**
 * The realms' landmarks (playtest round 12: R'lyeh, Yuggoth and the rest were flat plains of the
 * shared props, with nothing to know them by): R'lyeh's leaning cyclopean spires, Yuggoth's black
 * windowless towers, the Elder Things' star-footed cones, K'n-yan's stepped pyramids, Pnakotus's
 * half-buried basalt blocks and the Beyond's floating globes. Low-poly pieces in the prop's frame
 * (feet at the origin), merged with the chunk's other props (propMeshes.ts). Render only.
 */

import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import type { Rng } from '../core/rng';
import type { Prop } from '../world/props';
import { box, tileUv, tint } from './meshKit';
import { ANOMALY, BASE, mixRgb, scaleRgb, type Rgb } from './palette';
import type { Piece } from './propShapes';

const indexed = (g: THREE.BufferGeometry): THREE.BufferGeometry => (g.index ? g : g.setIndex([...Array(g.getAttribute('position').count).keys()]));
const merged = (parts: THREE.BufferGeometry[]): THREE.BufferGeometry => mergeGeometries(parts.map(indexed));

/** R'lyeh: slab on slab, each leaning and turned off the one below, as no sane builder would set them. */
function spire(p: Prop, rng: Rng, c: Rgb): Piece[] {
  const tone = scaleRgb(mixRgb(c, BASE.seaGrey, 0.4), 0.7);
  const parts: THREE.BufferGeometry[] = [];
  const n = 4 + Math.floor(rng() * 2);
  let [y, w, lean, turn] = [0, p.w * 2, 0, 0];
  for (let k = 0; k < n; k++) {
    const h = (p.h / n) * (1.1 - k * 0.08);
    [lean, turn] = [lean + (rng() - 0.35) * 0.16, turn + (rng() - 0.5) * 0.9];
    const g = tileUv(box(w, h, w * (0.6 + rng() * 0.3), 0, h / 2, 0, scaleRgb(tone, 0.85 + 0.25 * rng())), w * 2, h);
    parts.push(g.rotateY(turn).rotateZ(lean).translate(Math.sin(lean) * y * -0.5, y, 0));
    [y, w] = [y + h * 0.92, w * (0.72 + rng() * 0.1)];
  }
  return [{ mat: 'stone', geo: merged(parts) }];
}

/** Yuggoth: a black tower without a window, tapering in terraces, a thin crown at its top. */
function tower(p: Prop, rng: Rng, c: Rgb): Piece[] {
  const tone = scaleRgb(mixRgb(c, BASE.charcoal, 0.75), 0.6);
  const parts: THREE.BufferGeometry[] = [];
  const tiers = 3 + Math.floor(rng() * 2);
  let [y, r] = [0, p.w];
  for (let k = 0; k < tiers; k++) {
    const h = (p.h / tiers) * (k === 0 ? 1.3 : 0.9);
    parts.push(tint(tileUv(new THREE.CylinderGeometry(r * 0.86, r, h, 6, Math.ceil(h / 4)).translate(0, y + h / 2, 0), r * 6, h), scaleRgb(tone, 0.9 + 0.2 * rng())));
    parts.push(tint(new THREE.CylinderGeometry(r * 0.98, r * 0.98, 0.5, 6).translate(0, y + h, 0), scaleRgb(tone, 1.2))); // the terrace's lip
    [y, r] = [y + h, r * 0.72];
  }
  parts.push(tint(new THREE.ConeGeometry(r * 0.6, p.h * 0.18, 6).translate(0, y + p.h * 0.09, 0), tone));
  return [{ mat: 'stone', geo: merged(parts) }];
}

/** The Elder Things' city: a cone on a five-pointed star of a footing. */
function cone(p: Prop, rng: Rng, c: Rgb): Piece[] {
  const tone = scaleRgb(mixRgb(c, BASE.bone, 0.3), 0.95);
  const foot = p.h * 0.18;
  const parts = [tint(tileUv(new THREE.ConeGeometry(p.w, p.h, 10, Math.ceil(p.h / 4)).translate(0, foot + p.h / 2, 0), p.w * 6, p.h), tone)];
  for (let k = 0; k < 5; k++) {
    const a = (k / 5) * Math.PI * 2 + rng() * 0.05;
    parts.push(box(p.w * 0.9, foot, p.w * 2.4, 0, foot / 2, p.w * 0.9, scaleRgb(tone, 0.85)).rotateY(a));
  }
  return [{ mat: 'stone', geo: merged(parts) }];
}

/** K'n-yan: a stepped pyramid, a shrine on its flat top. */
function pyramid(p: Prop, rng: Rng, c: Rgb): Piece[] {
  const tone = scaleRgb(mixRgb(c, [0.55, 0.6, 0.72], 0.35), 0.85);
  const steps = 5;
  const parts: THREE.BufferGeometry[] = [];
  for (let k = 0; k < steps; k++) {
    const s = 1 - k / (steps + 1);
    const h = p.h / (steps + 1);
    parts.push(tileUv(box(p.w * 2 * s, h, p.d * 2 * s, 0, h * k + h / 2, 0, scaleRgb(tone, 0.85 + 0.05 * k)), p.w * 2 * s, h));
  }
  const top = (p.h / (steps + 1)) * steps;
  parts.push(box(p.w * 0.5, p.h / (steps + 1), p.d * 0.5, 0, top + p.h / (steps + 1) / 2, 0, scaleRgb(tone, 1.1 + 0.1 * rng())));
  return [{ mat: 'stone', geo: merged(parts) }];
}

/** Pnakotus: a cyclopean block of the Great Race's masonry, half sunk in the sand, a broken one beside it. */
function block(p: Prop, rng: Rng, c: Rgb): Piece[] {
  const tone = scaleRgb(mixRgb(c, BASE.charcoal, 0.55), 0.8);
  const big = tileUv(box(p.w * 2, p.h, p.d * 2, 0, p.h / 2 - p.h * 0.25, 0, tone), p.w * 2, p.h).rotateZ((rng() - 0.5) * 0.2).rotateX((rng() - 0.5) * 0.12);
  const small = tileUv(box(p.w, p.h * 0.45, p.d, p.w * 1.6, p.h * 0.12, p.d * 0.8, scaleRgb(tone, 0.9)), p.w, p.h * 0.45).rotateY(rng() * 0.8);
  return [{ mat: 'stone', geo: merged([big, small]) }];
}

/** The Beyond: a globe hanging in the air, lit from within in the colour that should not be. */
function globe(p: Prop, rng: Rng): Piece[] {
  const r = p.w;
  const hue = rng() < 0.7 ? ANOMALY.purple : ANOMALY.magenta;
  return [{ mat: 'glow', geo: tint(new THREE.IcosahedronGeometry(r, 1).translate(0, p.h, 0), scaleRgb(mixRgb(hue, BASE.charcoal, 0.35), 0.8)) }];
}

export function landmarkPieces(p: Prop, rng: Rng, c: Rgb): Piece[] {
  switch (p.kind) {
    case 'spire':
      return spire(p, rng, c);
    case 'tower':
      return tower(p, rng, c);
    case 'cone':
      return cone(p, rng, c);
    case 'pyramid':
      return pyramid(p, rng, c);
    case 'block':
      return block(p, rng, c);
    case 'globe':
      return globe(p, rng);
    default:
      return [];
  }
}
