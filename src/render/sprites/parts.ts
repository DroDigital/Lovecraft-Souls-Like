/**
 * Shared sprite parts for the body plans: eye clusters, tentacle chains, bat wings, claws.
 * Coordinates are cell pixels (64×64), y down; the ground line is y = GROUND, centre x = MID.
 */

import type { Rng } from '../../core/rng';
import type { SpriteRecipe } from '../../data/schema';
import { capsule, ellipse, poly, type Canvas, type Ink } from './raster';

export const MID = 32;
export const GROUND = 62;

/** One animation frame: idle breathing, walk phase, attack beat, hurt beat. */
export interface Pose {
  bob: number; // pixels the body rises (idle breathing)
  swing: number; // -1..1 walk phase
  attack: 0 | 1 | 2 | 3; // 0 none, 1 wind-up, 2 strike, 3 recovery
  hurt: 0 | 1 | 2; // 0 none, 1 recoil, 2 slump
}

/** Everything a body plan needs to draw one frame. */
export interface Sketch {
  c: Canvas;
  r: SpriteRecipe;
  pose: Pose;
  rng: Rng;
  body: Ink;
  dark: Ink;
  light: Ink;
  eye: Ink;
  claw: Ink;
}

/** Recoil offset for hurt frames: [dx, dy]. */
export const recoil = (p: Pose): readonly [number, number] => (p.hurt === 1 ? [3, -1] : p.hurt === 2 ? [2, 3] : [0, 0]);

/** `n` eyes around (cx, cy): a row for up to three, a scattered cluster beyond. */
export function eyes(s: Sketch, cx: number, cy: number, n: number, spread: number, size = 1.3): void {
  if (n <= 0) return;
  if (n <= 3) {
    for (let i = 0; i < n; i++) {
      const x = cx + (n === 1 ? 0 : (i / (n - 1) - 0.5) * spread * 2);
      ellipse(s.c, x, cy, size, size, s.eye);
    }
    return;
  }
  for (let i = 0; i < n; i++) {
    const a = s.rng() * Math.PI * 2;
    const d = Math.sqrt(s.rng()) * spread;
    ellipse(s.c, cx + Math.cos(a) * d, cy + Math.sin(a) * d * 0.7, size * (0.7 + 0.5 * s.rng()), size * (0.7 + 0.5 * s.rng()), s.eye);
  }
}

/** A tapering, curling chain of capsules from (x, y) toward `angle` (radians, 0 = right, π/2 = down). */
export function tentacle(s: Sketch, x: number, y: number, angle: number, len: number, thick: number, wave: number, ink: Ink = s.body): void {
  const segs = 5;
  let [px, py, a] = [x, y, angle];
  for (let k = 0; k < segs; k++) {
    a += Math.sin(wave + k * 1.1) * 0.35;
    const nx = px + (Math.cos(a) * len) / segs;
    const ny = py + (Math.sin(a) * len) / segs;
    capsule(s.c, px, py, nx, ny, thick * (1 - k / (segs + 1)), thick * (1 - (k + 1) / (segs + 1)), ink);
    [px, py] = [nx, ny];
  }
}

/** `n` tentacles fanned between two angles. */
export function tentacles(s: Sketch, x: number, y: number, n: number, len: number, thick: number, from: number, to: number, wave: number): void {
  for (let i = 0; i < n; i++) {
    const t = n === 1 ? 0.5 : i / (n - 1);
    tentacle(s, x + (t - 0.5) * thick * 2, y, from + (to - from) * t, len * (0.8 + 0.4 * ((i * 7) % 5) / 4), thick, wave + i * 1.7);
  }
}

/** A membranous bat wing from the shoulder (sx, sy) on one side; `lift` raises the tip. */
export function wing(s: Sketch, sx: number, sy: number, side: 1 | -1, span: number, lift: number): void {
  const tip: [number, number] = [sx + side * span, sy - lift];
  poly(
    s.c,
    [
      [sx, sy],
      tip,
      [sx + side * span * 0.85, sy + span * 0.35 - lift * 0.3],
      [sx + side * span * 0.55, sy + span * 0.2],
      [sx + side * span * 0.3, sy + span * 0.42],
      [sx + side * 2, sy + span * 0.3],
    ],
    s.dark,
  );
  capsule(s.c, sx, sy, tip[0], tip[1], 1.4, 0.6, s.body);
  capsule(s.c, sx + side * span * 0.45, sy - lift * 0.45, sx + side * span * 0.55, sy + span * 0.2, 0.8, 0.5, s.body);
}

/** Three short claws at the end of a limb. */
export function claws(s: Sketch, x: number, y: number, dir = 1): void {
  for (let i = -1; i <= 1; i++) capsule(s.c, x + i * 1.5, y, x + i * 2.2 + dir, y + 3, 0.7, 0.3, s.claw);
}
