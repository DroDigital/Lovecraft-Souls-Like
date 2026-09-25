/**
 * Houses (spec §2, low-poly): a stone footing, walls in the town's material (clapboard, brick, weathered
 * planks or stone), a roof (Arkham's gambrels, steep gables of brick, the sagging low roofs of hill
 * hovels, the flat parapets of older stone towns), chimneys, framed windows (a few faintly lit), a
 * door with its step, and on some a porch. In the house's own frame: front toward +z, feet at y = 0.
 */

import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { createRng, type Rng } from '../core/rng';
import type { Prop } from '../world/props';
import { box, tileUv, tint } from './meshKit';
import { BASE, mixRgb, scaleRgb, type Rgb } from './palette';
import type { Piece, PropMat } from './propShapes';

const TRIM: Rgb = scaleRgb(BASE.bone, 1.1);
const PANE: Rgb = scaleRgb(BASE.charcoal, 0.5);
const LIT: Rgb = scaleRgb(mixRgb(BASE.bone, [1, 0.78, 0.45], 0.6), 0.85);
const DOOR: Rgb = scaleRgb(mixRgb(BASE.rust, BASE.charcoal, 0.5), 1.4);

/** A roof and its two gable ends from a profile across the depth: [z, y] points from eave to eave. */
function roof(profile: readonly (readonly [number, number])[], w: number, over: number): { roof: THREE.BufferGeometry; gables: THREE.BufferGeometry } {
  const pos: number[] = [];
  const uv: number[] = [];
  const idx: number[] = [];
  let run = 0;
  for (let i = 1; i < profile.length; i++) {
    const [[z0, y0], [z1, y1]] = [profile[i - 1], profile[i]];
    const len = Math.hypot(z1 - z0, y1 - y0);
    const base = pos.length / 3;
    pos.push(-w - over, y0, z0, w + over, y0, z0, -w - over, y1, z1, w + over, y1, z1);
    uv.push(0, run / 2, (w + over) / 1, run / 2, 0, (run + len) / 2, (w + over) / 1, (run + len) / 2);
    run += len;
    idx.push(base, base + 2, base + 1, base + 1, base + 2, base + 3); // outward (up) faces
  }
  const r = new THREE.BufferGeometry();
  r.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  r.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  r.setIndex(idx);
  r.computeVertexNormals();
  // Gables: a fan from the eave line's middle, at both ends.
  const gp: number[] = [];
  const gu: number[] = [];
  const gi: number[] = [];
  for (const side of [-1, 1]) {
    const base = gp.length / 3;
    const y0 = profile[0][1];
    gp.push(side * w, y0, 0);
    gu.push(0.5, 0);
    for (const [z, y] of profile) {
      gp.push(side * w, y, z * 0.97);
      gu.push(z / 4, (y - y0) / 2);
    }
    for (let i = 1; i < profile.length; i++) side < 0 ? gi.push(base, base + i + 1, base + i) : gi.push(base, base + i, base + i + 1); // facing out
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(gp, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(gu, 2));
  g.setIndex(gi);
  g.computeVertexNormals();
  return { roof: r, gables: g };
}

function windows(w: number, d: number, top: number, rng: Rng, lit: number): { frames: THREE.BufferGeometry[]; panes: THREE.BufferGeometry[]; glows: THREE.BufferGeometry[] } {
  const frames: THREE.BufferGeometry[] = [];
  const panes: THREE.BufferGeometry[] = [];
  const glows: THREE.BufferGeometry[] = [];
  const floors = top > 4.6 ? [0.35, 0.72] : [0.42];
  for (const f of floors) {
    const y = 0.4 + top * f;
    for (const side of [-1, 1]) {
      for (let x = -w + 1.3; x <= w - 1.2; x += 2.3) {
        if (side > 0 && f === floors[0] && Math.abs(x) < 1.1) continue; // the door
        const z = side * (d + 0.03);
        frames.push(box(0.95, 1.3, 0.05, x, y, z, TRIM));
        const on = rng() < lit; // one draw: a lit window glows in the lamplight's colour
        (on ? glows : panes).push(box(0.7, 1.05, 0.08, x, y, z, on ? LIT : PANE));
      }
      const x = side * (w + 0.03);
      frames.push(box(0.05, 1.3, 0.95, x, y, 0, TRIM));
      const on = rng() < lit;
      (on ? glows : panes).push(box(0.08, 1.05, 0.7, x, y, 0, on ? LIT : PANE));
    }
  }
  return { frames, panes, glows };
}

/** A house's pieces. */
export function housePieces(p: Prop, c: Rgb): Piece[] {
  const rng = createRng(p.seed);
  const style = p.style ?? 'clapboard';
  const { w, d } = p;
  const h = style === 'hovel' ? Math.min(p.h, 3.4) : style === 'brick' ? p.h + 1.5 : p.h;
  const [wx, wd] = style === 'hovel' ? [w * 0.75, d * 0.75] : [w, d];
  const top = 0.4 + h; // the eaves
  const tone = scaleRgb(mixRgb(BASE.bone, BASE.seaGrey, 0.25 + 0.35 * rng()), 1.25);
  const wallMat: PropMat = style === 'clapboard' ? 'clapboard' : style === 'brick' ? 'brick' : style === 'stone' ? 'stone' : 'wood';
  const wallTint = style === 'brick' ? scaleRgb(BASE.bone, 1.3) : style === 'stone' ? scaleRgb(c, 0.95) : tone;
  const walls = tileUv(box(wx * 2, h, wd * 2, 0, 0.4 + h / 2, 0, wallTint), wx * 2, h);
  const footing = tileUv(box(wx * 2 + 0.4, 0.7, wd * 2 + 0.4, 0, 0.05, 0, scaleRgb(c, 0.7)), wx * 2, 0.7);

  const rh = style === 'brick' ? wd * 1.15 : style === 'hovel' ? wd * 0.6 : wd * 0.95;
  const over = 0.35;
  const profile: [number, number][] =
    style === 'stone'
      ? [[-wd - 0.05, top], [-wd + 0.01, top + 0.6], [wd - 0.01, top + 0.6], [wd + 0.05, top]]
      : style === 'clapboard' && rng() < 0.7
        ? [[-wd - over, top - 0.2], [-wd * 0.62, top + rh * 0.78], [0, top + rh], [wd * 0.62, top + rh * 0.78], [wd + over, top - 0.2]] // a gambrel
        : [[-wd - over, top - 0.2], [0, top + rh], [wd + over, top - 0.2]];
  const sag = style === 'hovel' ? 0.25 : 0;
  if (sag) profile[1][1] -= sag;
  const { roof: roofGeo, gables } = roof(profile, wx, style === 'stone' ? 0 : over);
  const roofTint = style === 'stone' ? scaleRgb(c, 0.8) : scaleRgb(BASE.bone, 1.2);

  const chimneys: THREE.BufferGeometry[] = [];
  const stacks = style === 'brick' ? [-1, 1] : style === 'stone' ? [] : [rng() < 0.5 ? -1 : 1];
  for (const s of stacks) chimneys.push(tileUv(box(0.8, rh + 1.6, 0.8, s * wx * 0.7, top + (rh + 1.6) / 2 - 0.3, -wd * 0.2, scaleRgb(BASE.bone, 1.2)), 0.8, rh + 1.6));

  const { frames, panes, glows } = windows(wx, wd, h, rng, 0.3);
  const door = [box(1.1, 2.1, 0.1, 0, 0.4 + 1.05, wd + 0.05, DOOR), box(1.3, 0.12, 0.12, 0, 0.4 + 2.15, wd + 0.06, TRIM)];
  const step = box(1.8, 0.3, 0.8, 0, 0.15, wd + 0.5, scaleRgb(c, 0.75));
  if (style === 'clapboard' && rng() < 0.45) {
    door.push(box(2.6, 0.12, 1.6, 0, 0.4 + 2.7, wd + 0.8, DOOR));
    for (const s of [-1, 1]) door.push(box(0.14, 2.7, 0.14, s * 1.15, 0.4 + 1.35, wd + 1.5, TRIM));
  }
  const pieces: Piece[] = [
    { mat: wallMat, geo: mergeGeometries([walls, tint(tileUv(gables, 1, 1), wallTint)]) },
    { mat: 'stone', geo: mergeGeometries([footing, tileUv(step, 1, 1)]) },
    { mat: style === 'stone' ? 'stone' : 'shingle', geo: tint(roofGeo, roofTint) },
    { mat: 'wood', geo: tileUv(mergeGeometries([...frames, ...panes, ...door]), 1, 1) },
  ];
  if (chimneys.length) pieces.push({ mat: 'brick', geo: mergeGeometries(chimneys) });
  if (glows.length) pieces.push({ mat: 'glow', geo: mergeGeometries(glows) });
  return pieces;
}
