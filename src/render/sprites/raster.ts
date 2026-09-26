/**
 * A tiny software rasteriser for the sprite generator (pure, no Three.js): shaded ellipses,
 * tapered capsules and polygons written into an RGBA cell, then an outline pass. Shapes are shaded
 * as if they were rounded, lit from the upper left, in a few bands dithered where they meet, as a
 * pixel artist would (playtest round 7), with a small highlight, a cool rim on the edge turned from
 * the light, a little seeded grit and the creature's skin worked in (scales, fur, plates...;
 * skins.ts); wet hides take a hot highlight. A shape drawn over another is edged with a dark contour
 * where it overlaps, so limbs part from bodies, and the outline takes a dark shade of the body it
 * rings. Alpha marks the pixel kind: 0 empty, LIT lit by the world, GLOW self-lit (anomaly-coloured
 * markings), GLINT self-lit but muted (eye glints).
 */

import { hash2 } from '../../core/rng';
import { skinAt } from './skins';
import { luma, type Rgb } from '../palette';

export const LIT = 255;
export const GLOW = 160;
export const GLINT = 208;

export interface Canvas {
  w: number;
  h: number;
  px: Uint8Array; // RGBA, row-major, y down
  seed: number;
}

/** A surface worked into a shape's shading (skins.ts). */
export type Skin = 'scales' | 'fur' | 'warts' | 'veins' | 'plates' | 'cracks' | 'wrinkles' | 'cloth' | 'sheen' | 'wisp';

/** How a shape is painted: its colour, whether it glows or glints (both unshaded and self-lit), its surface, and whether it is wet (a hot highlight). */
export interface Ink {
  rgb: Rgb;
  glow?: boolean;
  glint?: boolean;
  skin?: Skin;
  wet?: boolean;
}

export const createCanvas = (w: number, h: number, seed = 0): Canvas => ({ w, h, px: new Uint8Array(w * h * 4), seed });

const LIGHT = ((): readonly [number, number, number] => {
  const v = [-0.45, -0.65, 0.62];
  const n = Math.hypot(v[0], v[1], v[2]);
  return [v[0] / n, v[1] / n, v[2] / n];
})();

const to8 = (x: number): number => Math.max(0, Math.min(255, Math.round(x * 255)));

/**
 * Brightness of a surface with normal (nx, ny, nz), lit from the upper left: ambient and diffuse, a
 * small highlight where it faces the light, and a cool rim where its edge turns from it.
 */
function lambert(nx: number, ny: number, nz: number): number {
  const d = Math.max(0, nx * LIGHT[0] + ny * LIGHT[1] + nz * LIGHT[2]);
  const rim = (1 - nz) ** 3 * Math.max(0, -(nx * LIGHT[0] + ny * LIGHT[1]));
  return 0.42 + 0.72 * d + 0.3 * d ** 16 + 0.3 * rim;
}

const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
const [K0, K1, BANDS] = [0.42, 1.44, 6]; // the shading's range, in this many tones

/** A brightness put into its band, dithered only near where two bands meet. */
function band(k: number, x: number, y: number): number {
  const t = ((k - K0) / (K1 - K0)) * (BANDS - 1);
  const q = Math.floor(t + 0.5 + ((BAYER[(y & 3) * 4 + (x & 3)] + 0.5) / 16 - 0.5) * 0.5);
  return K0 + (Math.max(0, Math.min(BANDS - 1, q)) / (BANDS - 1)) * (K1 - K0);
}

/** `edge`: the pixel lies on the shape's rim; drawn over another shape, it becomes a contour. */
function put(c: Canvas, x: number, y: number, ink: Ink, k: number, edge = false): void {
  if (x < 0 || y < 0 || x >= c.w || y >= c.h) return;
  const i = (y * c.w + x) * 4;
  const self = ink.glow || ink.glint;
  const grit = self ? 1 : 1 + (hash2(x, y, c.seed) - 0.5) * 0.08;
  const contour = edge && !self && c.px[i + 3] > 0 ? 0.55 : 1;
  const lit = band(ink.wet && k > 1 ? k + (k - 1) * 1.8 : k, x, y) * contour; // a wet hide catches the light
  const s = (self ? 1 : lit * (ink.skin ? skinAt(ink.skin, x, y, c.seed) : 1)) * grit;
  const rgb: Rgb = [ink.rgb[0] * s, ink.rgb[1] * s, ink.rgb[2] * s];
  write(c, i, ink.glow ? rgb : mute(rgb), ink.glow ? GLOW : ink.glint ? GLINT : LIT);
}

/** Near black, a colour greys: eight bits would round its last shades into a false saturation. */
function mute(c: Rgb): Rgb {
  const t = Math.max(0, 1 - Math.max(c[0], c[1], c[2]) / 0.12) * 0.7;
  const l = (c[0] + c[1] + c[2]) / 3;
  return [c[0] + (l - c[0]) * t, c[1] + (l - c[1]) * t, c[2] + (l - c[2]) * t];
}

function write(c: Canvas, i: number, rgb: Rgb, kind: number): void {
  [c.px[i], c.px[i + 1], c.px[i + 2], c.px[i + 3]] = [to8(rgb[0]), to8(rgb[1]), to8(rgb[2]), kind];
}

/** A filled ellipse centred at (cx, cy), radii (rx, ry), turned by `rot` radians. */
export function ellipse(c: Canvas, cx: number, cy: number, rx: number, ry: number, ink: Ink, rot = 0): void {
  if (rx <= 0 || ry <= 0) return;
  const r = Math.max(rx, ry);
  const [cs, sn] = [Math.cos(rot), Math.sin(rot)];
  for (let y = Math.floor(cy - r); y <= Math.ceil(cy + r); y++) {
    for (let x = Math.floor(cx - r); x <= Math.ceil(cx + r); x++) {
      const dx = x + 0.5 - cx;
      const dy = y + 0.5 - cy;
      const u = (dx * cs + dy * sn) / rx;
      const v = (-dx * sn + dy * cs) / ry;
      const d2 = u * u + v * v;
      if (d2 > 1) continue;
      const nx = u * cs - v * sn;
      const ny = u * sn + v * cs;
      put(c, x, y, ink, lambert(nx, ny, Math.sqrt(1 - d2)), Math.sqrt(d2) > 1 - 1.1 / Math.min(rx, ry));
    }
  }
}

/** A tapered capsule from (x0, y0) radius r0 to (x1, y1) radius r1: limbs, necks, tentacles. */
export function capsule(c: Canvas, x0: number, y0: number, x1: number, y1: number, r0: number, r1: number, ink: Ink): void {
  const dx = x1 - x0;
  const dy = y1 - y0;
  const len2 = dx * dx + dy * dy || 1e-6;
  const r = Math.max(r0, r1);
  for (let y = Math.floor(Math.min(y0, y1) - r); y <= Math.ceil(Math.max(y0, y1) + r); y++) {
    for (let x = Math.floor(Math.min(x0, x1) - r); x <= Math.ceil(Math.max(x0, x1) + r); x++) {
      const px = x + 0.5 - x0;
      const py = y + 0.5 - y0;
      const t = Math.max(0, Math.min(1, (px * dx + py * dy) / len2));
      const ex = px - t * dx;
      const ey = py - t * dy;
      const rad = Math.max(0.5, r0 + (r1 - r0) * t);
      const d = Math.hypot(ex, ey);
      if (d > rad) continue;
      const a = d / rad;
      put(c, x, y, ink, lambert((ex / (d || 1)) * a, (ey / (d || 1)) * a, Math.sqrt(1 - a * a)), d > rad - 1.05);
    }
  }
}

/** A filled polygon (even-odd), shaded top-bright to bottom-dark. */
export function poly(c: Canvas, pts: readonly (readonly [number, number])[], ink: Ink): void {
  const ys = pts.map((p) => p[1]);
  const [y0, y1] = [Math.min(...ys), Math.max(...ys)];
  for (let y = Math.floor(y0); y <= Math.ceil(y1); y++) {
    const sy = y + 0.5;
    const xs: number[] = [];
    for (let i = 0; i < pts.length; i++) {
      const [ax, ay] = pts[i];
      const [bx, by] = pts[(i + 1) % pts.length];
      if (ay <= sy !== by <= sy) xs.push(ax + ((sy - ay) / (by - ay)) * (bx - ax));
    }
    xs.sort((a, b) => a - b);
    const k = 1.15 - 0.45 * ((sy - y0) / Math.max(1, y1 - y0));
    for (let i = 0; i + 1 < xs.length; i += 2) {
      const [a, b] = [Math.ceil(xs[i] - 0.5), Math.floor(xs[i + 1] - 0.5)];
      for (let x = a; x <= b; x++) put(c, x, y, ink, k, x === a || x === b || y === Math.floor(y0) || y === Math.ceil(y1));
    }
  }
}

/**
 * Rings every shape with a one-pixel outline, so silhouettes read at low resolution: a dark shade of
 * the lit body it rings (a pixel artist's selective outline), or `rgb` beside glowing markings.
 */
export function outline(c: Canvas, rgb: Rgb): void {
  const at = (x: number, y: number): number => (x >= 0 && y >= 0 && x < c.w && y < c.h ? c.px[(y * c.w + x) * 4 + 3] : 0);
  const edge: number[] = [];
  for (let y = 0; y < c.h; y++) {
    for (let x = 0; x < c.w; x++) {
      if (!at(x, y) && (at(x - 1, y) || at(x + 1, y) || at(x, y - 1) || at(x, y + 1))) edge.push(x, y);
    }
  }
  for (let i = 0; i < edge.length; i += 2) {
    const [x, y] = [edge[i], edge[i + 1]];
    const sum = [0, 0, 0];
    let n = 0;
    for (const [nx, ny] of [[x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1]]) {
      if (at(nx, ny) !== LIT) continue;
      const j = (ny * c.w + nx) * 4;
      for (let k = 0; k < 3; k++) sum[k] += c.px[j + k] / 255;
      n++;
    }
    const avg: Rgb = [sum[0] / Math.max(1, n), sum[1] / Math.max(1, n), sum[2] / Math.max(1, n)];
    const k = Math.min(0.3, (2.5 * luma(rgb)) / Math.max(1e-3, luma(avg))); // never lighter than 2.5 × `rgb`
    write(c, (y * c.w + x) * 4, mute(n ? [avg[0] * k, avg[1] * k, avg[2] * k] : rgb), LIT);
  }
}
