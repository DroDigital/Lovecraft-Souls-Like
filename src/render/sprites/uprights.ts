/** Upright body plans, drawn facing the viewer: humanoid, hunched, robed, giant, cephalopod, spectre. */

import { capsule, ellipse, poly } from './raster';
import { claws, eyes, GROUND, MID, recoil, tentacles, wing, type Pose, type Sketch } from './parts';

const HALF_PI = Math.PI / 2;

/** Arm from the shoulder to the hand for this pose; `side` +1 is the viewer's right. */
function arm(p: Pose, sx: number, sy: number, side: 1 | -1, length: number): readonly [number, number] {
  if (p.attack === 1 && side === 1) return [sx + 5, sy - length * 0.8];
  if (p.attack === 2 && side === 1) return [sx - 14, sy + length * 0.7];
  if (p.attack === 3 && side === 1) return [sx + 4, sy + length * 0.85];
  if (p.hurt) return [sx + side * 6, sy + length * 0.6];
  return [sx + side * 2 + p.swing * side * -2, sy + length - Math.abs(p.swing)];
}

export function humanoid(s: Sketch): void {
  const { c, r, pose: p } = s;
  const [dx, dy] = recoil(p);
  const x = MID + dx;
  const b = dy - p.bob;
  const [hip, sh, head] = [38 + b, 20 + b, 12 + b];
  if (r.wings) for (const side of [-1, 1] as const) wing(s, x + side * 3, sh + 2, side, 20, 8 + p.bob * 3);
  const fishy = r.palette === 'sea';
  for (const [side, ink] of [[-1, s.dark], [1, s.body]] as const) {
    const fx = x + side * (4 + p.swing * -side * 4);
    capsule(c, x + side * 3, hip, fx, GROUND - 1, 2.6, 2, ink);
    ellipse(c, x + side * 3.4 + p.swing * -side * 2, (hip + GROUND) / 2, 1.9, 1.5, s.light === ink ? s.body : ink); // knee
    ellipse(c, fx + side * 0.8, GROUND - 0.6, 2.8, 1.2, s.dark); // foot
  }
  capsule(c, x, hip, x, sh + 2, 5, 6.5, s.body);
  capsule(c, x - 4.5, hip - 1, x + 4.5, hip - 1, 0.9, 0.9, s.dark); // belt, or the line of the hips
  capsule(c, x, sh + 1, x, head + 3, 1.9, 1.7, s.body); // neck
  if (fishy) for (const gy of [sh - 1.5, sh]) capsule(c, x - 1.6, gy, x + 1.6, gy, 0.35, 0.35, s.dark); // gills
  for (const side of [-1, 1] as const) {
    const [hx, hy] = arm(p, x + side * 6.5, sh + 1, side, 17);
    ellipse(c, x + side * 6, sh + 1.5, 2.8, 2.4, s.body); // shoulder
    capsule(c, x + side * 6.5, sh + 1, hx, hy, 2.2, 1.7, s.body);
    ellipse(c, hx, hy, 1.8, 1.8, s.light);
    if (fishy || r.palette === 'mold' || r.palette === 'pallid') claws(s, hx, hy + 1, side);
  }
  if (fishy) poly(c, [[x - 1, head - 5], [x + 1, head - 5], [x + 0.5, head + 1], [x - 4, head - 1]], s.dark); // head fin
  ellipse(c, x, head, 4.5, 5.2, s.light);
  capsule(c, x - 1.6, head + 2.6, x + 1.6, head + 2.6, 0.45, 0.45, s.dark); // mouth
  eyes(s, x, head - 0.5, r.eyes ?? 2, 2, 1.1);
  if (r.tentacles) tentacles(s, x, head + 3, r.tentacles, 10, 1.1, HALF_PI - 0.6, HALF_PI + 0.6, p.bob + p.swing);
}

export function hunched(s: Sketch): void {
  const { c, r, pose: p } = s;
  const [dx, dy] = recoil(p);
  const x = MID + dx;
  const b = dy - p.bob;
  capsule(c, x - 5, 46 + b, x - 7 + p.swing * 4, GROUND - 1, 3, 2.4, s.dark);
  capsule(c, x + 5, 46 + b, x + 7 - p.swing * 4, GROUND - 1, 3, 2.4, s.body);
  ellipse(c, x, 38 + b, 11, 11, s.body);
  for (let k = 0; k < 3; k++) capsule(c, x - 7 + k * 0.6, 36 + k * 3.5 + b, x + 7 - k * 0.6, 36 + k * 3.5 + b, 0.4, 0.4, s.dark); // ribs under the hide
  for (let k = 0; k < 5; k++) ellipse(c, x - 6 + k * 3, 28 + Math.abs(k - 2) * 0.8 + b, 1.2, 1.4, s.light); // the knobs of the spine
  for (const side of [-1, 1] as const) {
    const up = p.attack === 1 ? -26 : p.attack === 2 ? 8 : p.hurt ? 2 : 0;
    const [hx, hy] = [x + side * (p.attack === 2 ? 5 : 13) + p.swing * side, 56 + b + up];
    capsule(c, x + side * 9, 30 + b, hx, hy, 3, 2.2, s.body);
    claws(s, hx, hy, side);
  }
  ellipse(c, x, 25 + b, 6, 5.5, s.light);
  eyes(s, x, 24 + b, r.eyes ?? 2, 2.6, 1.2);
  capsule(c, x - 3, 28 + b, x + 3, 28 + b, 0.8, 0.8, s.dark); // wide mouth
  for (let k = -2; k <= 2; k += 2) ellipse(c, x + k, 28.3 + b, 0.5, 0.7, s.claw); // and its teeth
  if (r.tentacles) tentacles(s, x, 29 + b, r.tentacles, 9, 1.1, HALF_PI - 0.4, HALF_PI + 0.4, p.bob);
}

export function robed(s: Sketch): void {
  const { c, r, pose: p } = s;
  const [dx, dy] = recoil(p);
  const x = MID + dx;
  const b = dy - p.bob;
  if (r.tentacles) tentacles(s, x, 58, r.tentacles, 10, 1.4, 0.3, Math.PI - 0.3, p.bob);
  poly(c, [[x - 7, 20 + b], [x + 7, 20 + b], [x + 13 + p.swing, GROUND], [x - 13 + p.swing, GROUND]], s.body);
  capsule(c, x, 24 + b, x, GROUND - 2, 0.6, 0.8, s.dark);
  for (const side of [-1, 1] as const) {
    const [hx, hy] =
      p.attack === 1 ? [x + side * 11, 6 + b] : p.attack === 2 ? [x + side * 4, 26 + b] : p.attack === 3 ? [x + side * 9, 30 + b] : [x + side * 9, 36 + b];
    capsule(c, x + side * 6, 22 + b, hx, hy, 2.4, 3, s.body);
    ellipse(c, hx, hy, 1.7, 1.7, s.light);
    if (p.attack === 2 && r.glow) ellipse(c, hx, hy - 3, 2.5, 2.5, s.eye);
  }
  ellipse(c, x, 14 + b, 6.5, 7.5, s.body);
  ellipse(c, x, 15.5 + b, 4, 4.8, (r.eyes ?? 2) === 0 ? s.light : s.dark);
  eyes(s, x, 15 + b, r.eyes ?? 2, 1.6, 0.9);
}

export function giant(s: Sketch): void {
  const { c, r, pose: p } = s;
  const [dx, dy] = recoil(p);
  const x = MID + dx;
  const b = dy - p.bob;
  capsule(c, x - 7, 38 + b, x - 9 + p.swing * 3, GROUND - 1, 4.5, 3.5, s.dark);
  capsule(c, x + 7, 38 + b, x + 9 - p.swing * 3, GROUND - 1, 4.5, 3.5, s.body);
  if (r.tentacles) tentacles(s, x, 40 + b, r.tentacles, 18, 1.8, HALF_PI - 0.7, HALF_PI + 0.7, p.bob + p.swing);
  ellipse(c, x, 27 + b, 14, 14, s.body);
  const pairs = Math.max(1, Math.round((r.limbs ?? 2) / 2));
  for (let k = 0; k < pairs; k++) {
    for (const side of [-1, 1] as const) {
      const sy = 20 + k * 9 + b;
      const lift = p.attack === 1 ? -30 : p.attack === 2 ? 4 : 0;
      const [hx, hy] = [x + side * (p.attack === 2 ? 8 : 17 + k * 2), 44 + k * 6 + b + lift];
      capsule(c, x + side * 12, sy, hx, hy, 4, 3, s.body);
      claws(s, hx, hy, side);
    }
  }
  const big = (r.limbs ?? 2) >= 4; // gugs: a huge head split by a vertical mouth
  ellipse(c, x, 10 + b, big ? 8 : 5, big ? 9 : 5.5, s.light);
  if (big) capsule(c, x, 3 + b, x, 17 + b, 1.5, 1.5, s.dark);
  eyes(s, x, 8 + b, r.eyes ?? 2, big ? 5 : 2.2, 1.2);
}

export function cephalopod(s: Sketch): void {
  const { c, r, pose: p } = s;
  const [dx, dy] = recoil(p);
  const x = MID + dx;
  const b = dy - p.bob;
  if (r.wings) for (const side of [-1, 1] as const) wing(s, x + side * 5, 24 + b, side, 18, 10 + p.bob * 2);
  capsule(c, x - 6, 40 + b, x - 7 + p.swing * 3, GROUND - 1, 4, 3, s.dark);
  capsule(c, x + 6, 40 + b, x + 7 - p.swing * 3, GROUND - 1, 4, 3, s.body);
  ellipse(c, x, 32 + b, 11, 12, s.body);
  for (const side of [-1, 1] as const) {
    const [hx, hy] = arm(p, x + side * 9, 26 + b, side, 20);
    capsule(c, x + side * 9, 26 + b, hx, hy, 3, 2.4, s.body);
    claws(s, hx, hy, side);
  }
  ellipse(c, x, 13 + b, 9, 10, s.light);
  eyes(s, x, 11 + b, r.eyes ?? 2, 3.5, 1.3);
  tentacles(s, x, 19 + b, r.tentacles ?? 6, 15, 1.4, HALF_PI - 0.5, HALF_PI + 0.5, p.bob + p.attack);
}

export function spectre(s: Sketch): void {
  const { c, r, pose: p } = s;
  const [dx, dy] = recoil(p);
  const x = MID + dx;
  const b = dy - p.bob - 3 + p.swing; // floats and sways
  if (r.tentacles) tentacles(s, x, 48 + b, r.tentacles, 14, 1.3, HALF_PI - 0.9, HALF_PI + 0.9, p.bob + p.swing);
  poly(
    c,
    [[x - 6, 16 + b], [x + 6, 16 + b], [x + 11, 40 + b], [x + 7, 54 + b], [x + 3, 47 + b], [x, 57 + b], [x - 3, 47 + b], [x - 7, 54 + b], [x - 11, 40 + b]],
    s.body,
  );
  for (const side of [-1, 1] as const) {
    const reach = p.attack === 2 ? 4 : p.attack === 1 ? 14 : 11;
    capsule(c, x + side * 6, 20 + b, x + side * reach, (p.attack === 1 ? 8 : 36) + b, 1.6, 1, s.body);
  }
  ellipse(c, x, 11 + b, 5, 6, s.body);
  ellipse(c, x, 12 + b, 3, 3.8, s.dark);
  eyes(s, x, 12 + b, r.eyes ?? 2, 1.4, 0.9);
}
