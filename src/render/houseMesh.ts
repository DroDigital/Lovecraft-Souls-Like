/**
 * Houses (spec §2, low-poly): a stone footing, walls in the town's material (clapboard, brick, weathered
 * planks or stone), a roof (Arkham's gambrels, steep gables of brick, the sagging low roofs of hill
 * hovels, the flat parapets of older stone towns), chimneys, framed windows with mullions and sills
 * and, on clapboard, shutters (a few faintly lit), a door with its step, and on some a porch. In the
 * house's own frame: front toward +z, feet at y = 0.
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

/** The profile from `floor` up: a slope that starts below it starts where it crosses it. */
function above(profile: readonly (readonly [number, number])[], floor: number): [number, number][] {
  const out: [number, number][] = [];
  const cross = (a: readonly [number, number], b: readonly [number, number]): [number, number] => [a[0] + ((b[0] - a[0]) * (floor - a[1])) / (b[1] - a[1]), floor];
  profile.forEach((p, i) => {
    if (p[1] < floor) return;
    if (i > 0 && profile[i - 1][1] < floor) out.push(cross(profile[i - 1], p));
    out.push([p[0], p[1]]);
    if (i + 1 < profile.length && profile[i + 1][1] < floor) out.push(cross(p, profile[i + 1]));
  });
  return out;
}

/**
 * A roof and its two gable ends from a profile across the depth: [z, y] points from eave to eave.
 * Round 21: the roof is seen from below too (its eaves were open sky from beneath), and a gable
 * begins where the wall ends, at `floor` (it began 20 cm under it, and lay in the wall's own plane
 * over that band, the two fighting).
 */
function roof(profile: readonly (readonly [number, number])[], w: number, over: number, floor: number): { roof: THREE.BufferGeometry; gables: THREE.BufferGeometry } {
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
  const under = r.clone();
  const turned = under.getIndex()!;
  for (let i = 0; i < turned.count; i += 3) {
    const b = turned.getX(i + 1);
    turned.setX(i + 1, turned.getX(i + 2));
    turned.setX(i + 2, b);
  }
  under.computeVertexNormals();
  // Gables: a fan from the eave line's middle, at both ends.
  const pts = above(profile, floor);
  const gp: number[] = [];
  const gu: number[] = [];
  const gi: number[] = [];
  for (const side of [-1, 1]) {
    const base = gp.length / 3;
    gp.push(side * w, floor, 0);
    gu.push(0.5, 0);
    for (const [z, y] of pts) {
      gp.push(side * w, y, z * 0.995); // a hair inside the roof's edge (0.97 left a sliver of open air along each slope)
      gu.push(z / 4, (y - floor) / 2);
    }
    for (let i = 1; i < pts.length; i++) side < 0 ? gi.push(base, base + i + 1, base + i) : gi.push(base, base + i, base + i + 1); // facing out
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(gp, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(gu, 2));
  g.setIndex(gi);
  g.computeVertexNormals();
  return { roof: mergeGeometries([r, under]), gables: g };
}

/** A lit window's glass, where its light spills from (half a metre out from the wall), and the glass's middle, where its glow sits. */
interface Lit {
  geo: THREE.BufferGeometry;
  at: [number, number, number];
  glass: [number, number, number];
  pane: number; // its seed (paneLife.ts)
}

/** A lit pane's seed, from where it is on its house (the house's random draws are left as they were). */
const seedOf = (x: number, y: number, z: number, w: number, d: number): number => {
  const s = Math.sin(x * 12.9898 + y * 78.233 + z * 37.719 + w * 4.1 + d * 7.3) * 43758.5453;
  return s - Math.floor(s);
};

/** A lit pane, carrying its seed to every vertex. */
function paneBox(w: number, h: number, d: number, x: number, y: number, z: number, seed: number): THREE.BufferGeometry {
  const g = box(w, h, d, x, y, z, LIT);
  g.setAttribute('aPane', new THREE.Float32BufferAttribute(new Array(g.getAttribute('position').count).fill(seed), 1));
  return g;
}

// Round 19: the glass stood 1.5 cm before a slab of frame and 2 cm behind its mullions, and the PS1's
// snapping moves a face's depth by more than that on a wall seen aslant: windows flickered, lit and
// dark, as the view turned. Now nothing lies behind the glass but the wall, 7 cm back, and the frame
// stands about it, its mullions 7 cm before it.
const GLASS = 0.04; // the glass's middle, out from the wall's face (0.06 thick)

/** A window's frame about its glass, its cross of mullions and its sill, and shutters if it has them; (x, y, z) on the wall's face, `turn` a quarter turn for a side wall. */
function frame(x: number, y: number, z: number, out: number, turn: boolean, shutters: boolean): THREE.BufferGeometry[] {
  const at = (w: number, h: number, d: number, dx: number, dy: number, dz: number, c: Rgb): THREE.BufferGeometry =>
    turn ? box(d, h, w, x + dz * out, y + dy, z + dx, c) : box(w, h, d, x + dx, y + dy, z + dz * out, c);
  const parts = [
    ...[-1, 1].map((s) => at(0.95, 0.125, 0.12, 0, s * 0.5875, 0.065, TRIM)), // head and foot
    ...[-1, 1].map((s) => at(0.125, 1.05, 0.12, s * 0.4125, 0, 0.065, TRIM)), // the jambs
    at(0.05, 1.05, 0.1, 0, 0, 0.09, TRIM),
    at(0.7, 0.05, 0.1, 0, 0.08, 0.09, TRIM),
    at(1.1, 0.08, 0.18, 0, -0.68, 0.1, TRIM),
  ];
  if (shutters) for (const s of [-1, 1]) parts.push(at(0.42, 1.25, 0.04, s * 0.72, 0, 0.05, DOOR));
  return parts;
}

function windows(w: number, d: number, top: number, rng: Rng, lit: number, shutters: boolean): { frames: THREE.BufferGeometry[]; panes: THREE.BufferGeometry[]; glows: Lit[] } {
  const frames: THREE.BufferGeometry[] = [];
  const panes: THREE.BufferGeometry[] = [];
  const glows: Lit[] = [];
  const floors = top > 4.6 ? [0.35, 0.72] : [0.42];
  for (const f of floors) {
    const y = 0.4 + top * f;
    for (const side of [-1, 1]) {
      for (let x = -w + 1.3; x <= w - 1.2; x += 2.3) {
        if (side > 0 && f === floors[0] && Math.abs(x) < 1.1) continue; // the door
        const z = side * (d + GLASS);
        frames.push(...frame(x, y, side * d, side, false, shutters));
        const on = rng() < lit; // one draw: a lit window glows in the lamplight's colour
        const seed = seedOf(x, y, z, w, d);
        if (on) glows.push({ geo: paneBox(0.7, 1.05, 0.06, x, y, z, seed), at: [x, y, side * (d + GLASS + 0.52)], glass: [x, y, z], pane: seed });
        else panes.push(box(0.7, 1.05, 0.06, x, y, z, PANE));
      }
      const x = side * (w + GLASS);
      frames.push(...frame(side * w, y, 0, side, true, shutters));
      const on = rng() < lit;
      const seed = seedOf(x, y, 0, w, d);
      if (on) glows.push({ geo: paneBox(0.06, 1.05, 0.7, x, y, 0, seed), at: [side * (w + GLASS + 0.52), y, 0], glass: [x, y, 0], pane: seed });
      else panes.push(box(0.06, 1.05, 0.7, x, y, 0, PANE));
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
  const { roof: roofGeo, gables } = roof(profile, wx, style === 'stone' ? 0 : over, top);
  const roofTint = style === 'stone' ? scaleRgb(c, 0.8) : scaleRgb(BASE.bone, 1.2);

  const chimneys: THREE.BufferGeometry[] = [];
  const stacks = style === 'brick' ? [-1, 1] : style === 'stone' ? [] : [rng() < 0.5 ? -1 : 1];
  for (const s of stacks) chimneys.push(tileUv(box(0.8, rh + 1.6, 0.8, s * wx * 0.7, top + (rh + 1.6) / 2 - 0.3, -wd * 0.2, scaleRgb(BASE.bone, 1.2)), 0.8, rh + 1.6));

  const { frames, panes, glows } = windows(wx, wd, h, rng, 0.3, style === 'clapboard' && rng() < 0.6);
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
    { mat: 'trim', geo: tileUv(mergeGeometries([...frames, ...panes, ...door]), 1, 1) }, // relief on the walls, drawn nearer than they are (round 21)
  ];
  if (chimneys.length) pieces.push({ mat: 'brick', geo: mergeGeometries(chimneys) });
  for (const g of glows) pieces.push({ mat: 'pane', geo: g.geo, light: 'window', at: g.at, glass: g.glass, pane: g.pane });
  return pieces;
}
