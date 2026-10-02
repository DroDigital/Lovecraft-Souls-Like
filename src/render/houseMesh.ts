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

// Round 35 (every house was the same house in a grey): what a town's houses are painted, built of and roofed with, each house taking its own.
const PAINT: readonly Rgb[] = [[0.82, 0.8, 0.74], [0.78, 0.7, 0.5], [0.6, 0.68, 0.6], [0.56, 0.62, 0.7], [0.7, 0.44, 0.38], [0.56, 0.46, 0.36], [0.7, 0.74, 0.76], [0.46, 0.5, 0.44]];
const BRICKS: readonly Rgb[] = [[1.05, 0.95, 0.9], [0.95, 0.7, 0.58], [0.88, 0.78, 0.55], [0.7, 0.62, 0.6], [0.72, 0.76, 0.84], [0.82, 0.62, 0.5]];
const ROOFS: readonly Rgb[] = [[0.62, 0.64, 0.7], [0.72, 0.6, 0.5], [0.6, 0.7, 0.56], [0.46, 0.46, 0.5], [0.74, 0.5, 0.42], [0.82, 0.8, 0.76]];
const DOORS: readonly Rgb[] = [DOOR, [0.3, 0.42, 0.34], [0.52, 0.2, 0.18], [0.2, 0.2, 0.22], [0.42, 0.32, 0.22]];
const pick = <T,>(rng: Rng, list: readonly T[]): T => list[Math.floor(rng() * list.length)];

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
function roof(profile: readonly (readonly [number, number])[], w: number, over: number, floor: number, wallHalf = 0): { roof: THREE.BufferGeometry; gables: THREE.BufferGeometry } {
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
    gu.push(wallHalf, floor - 0.4);
    for (const [z, y] of pts) {
      gp.push(side * w, y, z * 0.995); // a hair inside the roof's edge (0.97 left a sliver of open air along each slope)
      gu.push(z + wallHalf, y - 0.4); // metres, as the wall's own (tileUv halves them): the courses run on into the gable (round 35: its bricks were four times the wall's, and began afresh at the eaves)
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
  g.setAttribute('aPaneUv', g.getAttribute('uv').clone()); // where on the glass (0..1), for whoever passes behind it (paneLife.ts; round 35)
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

function windows(w: number, d: number, top: number, rng: Rng, lit: number, shutters: boolean, door = true, skipSide = 0): { frames: THREE.BufferGeometry[]; panes: THREE.BufferGeometry[]; glows: Lit[] } {
  const frames: THREE.BufferGeometry[] = [];
  const panes: THREE.BufferGeometry[] = [];
  const glows: Lit[] = [];
  const floors = top > 4.6 ? [0.35, 0.72] : [0.42];
  for (const f of floors) {
    const y = 0.4 + top * f;
    for (const side of [-1, 1]) {
      for (let x = -w + 1.3; x <= w - 1.2; x += 2.3) {
        if (door && side > 0 && f === floors[0] && Math.abs(x) < 1.1) continue; // the door
        const z = side * (d + GLASS);
        frames.push(...frame(x, y, side * d, side, false, shutters));
        const on = rng() < lit; // one draw: a lit window glows in the lamplight's colour
        const seed = seedOf(x, y, z, w, d);
        if (on) glows.push({ geo: paneBox(0.7, 1.05, 0.06, x, y, z, seed), at: [x, y, side * (d + GLASS + 0.52)], glass: [x, y, z], pane: seed });
        else panes.push(box(0.7, 1.05, 0.06, x, y, z, PANE));
      }
      if (side === skipSide) continue; // the side a wing joins
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

/** A lower wing built onto a side of the house (round 35): its walls, its roof and gables, and its windows, all in the house's own frame. */
function wing(side: 1 | -1, wx: number, wd: number, h: number, tone: Rgb, rng: Rng): { walls: THREE.BufferGeometry; roof: THREE.BufferGeometry; gables: THREE.BufferGeometry; win: ReturnType<typeof windows> } {
  const [ww, wwd, hw] = [wx * (0.45 + 0.2 * rng()), wd * (0.6 + 0.15 * rng()), Math.max(2.6, h * 0.72)];
  const at = side * (wx + ww - 0.35); // its middle, along x, sunk a little into the wall it joins
  const z0 = -(wd - wwd); // flush with the back, so its front stands behind the house's
  const topw = 0.4 + hw;
  const rh = wwd * 0.9;
  const walls = tileUv(box(ww * 2, hw, wwd * 2, at, 0.4 + hw / 2, z0, tone), ww * 2, hw);
  const r = roof([[-wwd - 0.3, topw - 0.2], [0, topw + rh], [wwd + 0.3, topw - 0.2]], ww, 0.3, topw, wwd);
  r.roof.translate(at, 0, z0);
  r.gables.translate(at, 0, z0);
  tileUv(r.gables, 1, 1);
  const win = windows(ww, wwd, hw, rng, 0.3, false, false, -side);
  for (const g of [...win.frames, ...win.panes, ...win.glows.map((l) => l.geo)]) g.translate(at, 0, z0);
  return { walls, roof: r.roof, gables: tint(r.gables, tone), win: { ...win, glows: win.glows.map((l) => ({ ...l, at: [l.at[0] + at, l.at[1], l.at[2] + z0], glass: [l.glass[0] + at, l.glass[1], l.glass[2] + z0] })) } };
}

/** A house's pieces. */
export function housePieces(p: Prop, c: Rgb): Piece[] {
  const rng = createRng(p.seed);
  const style = p.style ?? 'clapboard';
  const { w, d } = p;
  const h = style === 'hovel' ? Math.min(p.h, 3.4) : style === 'brick' ? p.h + 1.5 : p.h;
  const [wx, wd] = style === 'hovel' ? [w * 0.75, d * 0.75] : [w, d];
  const top = 0.4 + h; // the eaves
  const tone0 = scaleRgb(mixRgb(BASE.bone, BASE.seaGrey, 0.25 + 0.35 * rng()), 1.25);
  const tone = style === 'clapboard' || style === 'hovel' ? scaleRgb(mixRgb(pick(rng, PAINT), tone0, 0.35), 1.2) : tone0; // each house its own paint (round 35)
  const wallMat: PropMat = style === 'clapboard' ? 'clapboard' : style === 'brick' ? 'brick' : style === 'stone' ? 'stone' : 'wood';
  const wallTint = style === 'brick' ? scaleRgb(pick(rng, BRICKS), 1.25) : style === 'stone' ? scaleRgb(c, 0.95 + 0.12 * (rng() - 0.5)) : tone;
  const walls = tileUv(box(wx * 2, h, wd * 2, 0, 0.4 + h / 2, 0, wallTint), wx * 2, h);
  const footing = tileUv(box(wx * 2 + 0.4, 0.7, wd * 2 + 0.4, 0, 0.05, 0, scaleRgb(c, 0.7)), wx * 2, 0.7);

  const pitch = 0.78 + 0.45 * rng(); // steep and shallow roofs
  const rh = (style === 'brick' ? wd * 1.15 : style === 'hovel' ? wd * 0.6 : wd * 0.95) * pitch;
  const over = 0.25 + 0.2 * rng();
  const form = rng();
  const profile: [number, number][] =
    style === 'stone'
      ? [[-wd - 0.05, top], [-wd + 0.01, top + 0.6], [wd - 0.01, top + 0.6], [wd + 0.05, top]]
      : style === 'clapboard' && form < 0.45
        ? [[-wd - over, top - 0.2], [-wd * 0.62, top + rh * 0.78], [0, top + rh], [wd * 0.62, top + rh * 0.78], [wd + over, top - 0.2]] // a gambrel
        : style !== 'hovel' && form > 0.8
          ? [[-wd - over, top - 0.2], [-wd * 0.25, top + rh], [wd + over, top - 0.2]] // a saltbox: the ridge off the middle, one slope long and shallow
          : [[-wd - over, top - 0.2], [0, top + rh], [wd + over, top - 0.2]];
  const sag = style === 'hovel' ? 0.25 : 0;
  if (sag) profile[1][1] -= sag;
  const { roof: roofGeo, gables } = roof(profile, wx, style === 'stone' ? 0 : over, top, wd);
  const roofTint = style === 'stone' ? scaleRgb(c, 0.8) : scaleRgb(pick(rng, ROOFS), 1.15);

  const chimneys: THREE.BufferGeometry[] = [];
  const stacks = style === 'brick' ? [-1, 1] : style === 'stone' ? [] : rng() < 0.2 ? [] : [rng() < 0.5 ? -1 : 1];
  const smoke = stacks.map((s): [number, number, number] => [s * wx * 0.7, top + rh + 1.3, -wd * 0.2]); // the top of each stack
  for (const s of stacks) chimneys.push(tileUv(box(0.8, rh + 1.6, 0.8, s * wx * 0.7, top + (rh + 1.6) / 2 - 0.3, -wd * 0.2, scaleRgb(BASE.bone, 1.2)), 0.8, rh + 1.6));

  const { frames, panes, glows } = windows(wx, wd, h, rng, 0.3, style === 'clapboard' && rng() < 0.6);
  const doorC = pick(rng, DOORS);
  const door = [box(1.1, 2.1, 0.1, 0, 0.4 + 1.05, wd + 0.05, doorC), box(1.3, 0.12, 0.12, 0, 0.4 + 2.15, wd + 0.06, TRIM)];
  const step = box(1.8, 0.3, 1.1, 0, 0.15, wd + 0.35, scaleRgb(c, 0.75)); // its back face inside the footing, not within a hand of its front (round 35: the audit)
  if (style === 'clapboard' && rng() < 0.45) {
    door.push(box(2.6, 0.12, 1.6, 0, 0.4 + 2.7, wd + 0.8, DOOR));
    for (const s of [-1, 1]) door.push(box(0.14, 2.7, 0.14, s * 1.15, 0.4 + 1.35, wd + 1.5, TRIM));
  }

  const body = [walls];
  if (style !== 'stone') { // a soffit under each eave, from the wall out to the roof's edge: a roof that rises steeply over its overhang stood well above the wall's top and left a slit between them, open to the sky (found by the view audit on seeds it had not been run on)
    for (const side of [-1, 1]) body.push(tileUv(box((wx + over) * 2, 0.04, over + 0.2, 0, top - 0.22, side * (wd + (over - 0.2) / 2), wallTint), 2, 1));
  }
  const roofs = [roofGeo];
  const gabs = [tint(tileUv(gables, 1, 1), wallTint)];
  const extras: THREE.BufferGeometry[] = [...frames, ...panes, ...door];
  const glowing = [...glows];
  if (style !== 'hovel' && style !== 'stone' && rng() < 0.5) { // a wing built on, lower, with its own roof
    const wg = wing(rng() < 0.5 ? -1 : 1, wx, wd, h, wallTint, rng);
    body.push(wg.walls);
    roofs.push(wg.roof);
    gabs.push(wg.gables);
    extras.push(...wg.win.frames, ...wg.win.panes);
    glowing.push(...wg.win.glows);
  }
  if (style !== 'hovel' && style !== 'stone' && rng() < 0.35) { // a bay window on the front, standing out of the wall
    const bx = (rng() < 0.5 ? -1 : 1) * wx * 0.5;
    const by = 0.4 + h * 0.3;
    body.push(tileUv(box(1.9, 1.7, 0.7, bx, by + 0.15, wd + 0.3, wallTint), 1.9, 1.7));
    extras.push(box(2.1, 0.1, 0.9, bx, by + 1.05, wd + 0.35, TRIM), box(2.1, 0.1, 0.9, bx, by - 0.7, wd + 0.35, TRIM)); // its roof and sill
    const seed = seedOf(bx, by, wd, wx, wd);
    if (rng() < 0.35) glowing.push({ geo: paneBox(1.3, 1.0, 0.06, bx, by + 0.15, wd + 0.67, seed), at: [bx, by + 0.15, wd + 1.2], glass: [bx, by + 0.15, wd + 0.67], pane: seed });
    else extras.push(box(1.3, 1.0, 0.06, bx, by + 0.15, wd + 0.67, PANE));
  }
  if (style !== 'stone') for (const side of [-1, 1]) { // a small window in each gable, up under the ridge
    const y = top + rh * 0.3;
    extras.push(box(0.12, 0.74, 0.74, side * (wx + 0.04), y, 0, TRIM)); // its frame, standing off the gable
    const seed = seedOf(side * wx, y, 0, wx, wd);
    if (rng() < 0.3) glowing.push({ geo: paneBox(0.06, 0.56, 0.56, side * (wx + GLASS + 0.04), y, 0, seed), at: [side * (wx + GLASS + 0.55), y, 0], glass: [side * (wx + GLASS + 0.04), y, 0], pane: seed });
    else extras.push(box(0.06, 0.56, 0.56, side * (wx + GLASS + 0.04), y, 0, PANE));
  }
  const pieces: Piece[] = [
    { mat: wallMat, geo: mergeGeometries([...body, ...gabs]) },
    { mat: 'stone', geo: mergeGeometries([footing, tileUv(step, 1, 1)]) },
    { mat: style === 'stone' ? 'stone' : 'shingle', geo: tint(mergeGeometries(roofs), roofTint) },
    { mat: 'trim', geo: tileUv(mergeGeometries(extras), 1, 1) }, // relief on the walls, drawn nearer than they are (round 21)
  ];
  if (chimneys.length) pieces.push({ mat: 'brick', geo: mergeGeometries(chimneys), smoke });
  for (const g of glowing) pieces.push({ mat: 'pane', geo: g.geo, light: 'window', at: g.at, glass: g.glass, pane: g.pane });
  return pieces;
}
