/**
 * A tiny software rasteriser for the sprite generator (pure, no Three.js): shaded ellipses,
 * tapered capsules and polygons written into an RGBA cell, then a dark outline pass. Shapes are
 * shaded as if they were rounded, lit from the upper left, with a little seeded grit. Alpha marks
 * the pixel kind: 0 empty, LIT lit by the world, GLOW self-lit (anomaly-coloured markings).
 */

import { hash2 } from '../../core/rng';
import type { Rgb } from '../palette';

export const LIT = 255;
export const GLOW = 160;

export interface Canvas {
  w: number;
  h: number;
  px: Uint8Array; // RGBA, row-major, y down
  seed: number;
}

/** How a shape is painted: its colour, and whether it glows (unshaded, self-lit). */
export interface Ink {
  rgb: Rgb;
  glow?: boolean;
}

export const createCanvas = (w: number, h: number, seed = 0): Canvas => ({ w, h, px: new Uint8Array(w * h * 4), seed });

const LIGHT = ((): readonly [number, number, number] => {
  const v = [-0.45, -0.65, 0.62];
  const n = Math.hypot(v[0], v[1], v[2]);
  return [v[0] / n, v[1] / n, v[2] / n];
})();

const to8 = (x: number): number => Math.max(0, Math.min(255, Math.round(x * 255)));

/** Brightness of a surface with normal (nx, ny, nz): ambient plus light from the upper left. */
const lambert = (nx: number, ny: number, nz: number): number => 0.5 + 0.7 * Math.max(0, nx * LIGHT[0] + ny * LIGHT[1] + nz * LIGHT[2]);

function put(c: Canvas, x: number, y: number, ink: Ink, k: number): void {
  if (x < 0 || y < 0 || x >= c.w || y >= c.h) return;
  const i = (y * c.w + x) * 4;
  const grit = ink.glow ? 1 : 1 + (hash2(x, y, c.seed) - 0.5) * 0.14;
  const s = (ink.glow ? 1 : k) * grit;
  c.px[i] = to8(ink.rgb[0] * s);
  c.px[i + 1] = to8(ink.rgb[1] * s);
  c.px[i + 2] = to8(ink.rgb[2] * s);
  c.px[i + 3] = ink.glow ? GLOW : LIT;
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
      put(c, x, y, ink, lambert(nx, ny, Math.sqrt(1 - d2)));
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
      put(c, x, y, ink, lambert((ex / (d || 1)) * a, (ey / (d || 1)) * a, Math.sqrt(1 - a * a)));
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
      for (let x = Math.ceil(xs[i] - 0.5); x <= Math.floor(xs[i + 1] - 0.5); x++) put(c, x, y, ink, k);
    }
  }
}

/** Rings every shape with a one-pixel dark outline, so silhouettes read at low resolution. */
export function outline(c: Canvas, rgb: Rgb): void {
  const solid = (x: number, y: number): boolean => x >= 0 && y >= 0 && x < c.w && y < c.h && c.px[(y * c.w + x) * 4 + 3] > 0;
  const edge: number[] = [];
  for (let y = 0; y < c.h; y++) {
    for (let x = 0; x < c.w; x++) {
      if (!solid(x, y) && (solid(x - 1, y) || solid(x + 1, y) || solid(x, y - 1) || solid(x, y + 1))) edge.push(x, y);
    }
  }
  for (let i = 0; i < edge.length; i += 2) put(c, edge[i], edge[i + 1], { rgb }, 1);
}
