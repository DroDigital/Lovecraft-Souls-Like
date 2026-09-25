/** Beast body plans: quadruped and serpent (in profile), winged, crustacean, toad. */

import { capsule, ellipse, poly } from './raster';
import { claws, eyes, GROUND, MID, recoil, tentacle, tentacles, wing, type Sketch } from './parts';

const HALF_PI = Math.PI / 2;

/** In profile, facing right: body, legs, tail, a head that lunges on the strike. */
export function quadruped(s: Sketch): void {
  const { c, r, pose: p } = s;
  const [dx, dy] = recoil(p);
  const y = 40 + dy - p.bob;
  const x = MID - dx;
  if (r.wings) for (const side of [-1, 1] as const) wing(s, x + side * 2, y - 5, side, 16, 10 + p.bob * 3);
  capsule(c, x - 16, y - 2, x - 27, y - 9 + p.swing * 2, 2.2, 0.8, s.body);
  const legs = Math.max(2, r.limbs ?? 4);
  const per = Math.ceil(legs / 2);
  for (let i = 0; i < legs; i++) {
    const t = per === 1 ? 0.5 : Math.floor(i / 2) / (per - 1);
    const lx = x - 12 + t * 24 + (i % 2) * 2;
    const step = (i % 2 === 0 ? 1 : -1) * p.swing * 3;
    capsule(c, lx, y + 3, lx + step, GROUND - 1, 2.6, 1.6, i % 2 ? s.dark : s.body);
    ellipse(c, lx + step + 1, GROUND - 0.8, 2.4, 1.1, s.dark); // paw
  }
  ellipse(c, x, y, 17, 8.5, s.body);
  ellipse(c, x + 2, y + 3, 12, 4, s.light);
  for (let k = 0; k < 4; k++) capsule(c, x - 4 + k * 4, y - 5, x - 6 + k * 4, y + 1, 0.4, 0.3, s.dark); // ribs
  for (let k = 0; k < 6; k++) poly(c, [[x - 13 + k * 4, y - 7], [x - 11 + k * 4, y - 11 - (k % 2)], [x - 10 + k * 4, y - 7]], s.dark); // the ridge of its back
  if (r.tentacles) tentacles(s, x, y - 6, r.tentacles, 12, 1.4, -HALF_PI - 0.6, -HALF_PI + 0.6, p.bob + p.swing);
  const reach = p.attack === 1 ? -4 : p.attack === 2 ? 6 : 0;
  const [hx, hy] = [x + 18 + reach, y - 8 + (p.attack === 2 ? 3 : 0)];
  capsule(c, x + 11, y - 3, hx - 2, hy + 2, 5, 4, s.body);
  ellipse(c, hx, hy, 7, 6, s.body);
  ellipse(c, hx + 6, hy + 2, 4, 3, s.light);
  if (p.attack === 2) {
    poly(c, [[hx + 3, hy + 3], [hx + 11, hy + 1], [hx + 10, hy + 7]], s.dark);
    for (let k = 0; k < 3; k++) ellipse(c, hx + 5 + k * 2, hy + 2.6 - k * 0.3, 0.5, 0.8, s.claw); // teeth
  }
  ellipse(c, hx - 3, hy - 5, 1.4, 2.2, s.dark, -0.4); // ear
  eyes(s, hx + 2, hy - 2, r.eyes ?? 2, 2, 1.1);
}

/** A coiled body on the ground rising to a raised head (facing right). */
export function serpent(s: Sketch): void {
  const { c, r, pose: p } = s;
  const [dx, dy] = recoil(p);
  const phase = p.swing * 1.5 + p.bob * 0.5;
  const strike = p.attack === 1 ? [-4, -3] : p.attack === 2 ? [8, 10] : [0, 0];
  const pts: [number, number, number][] = [];
  for (let i = 0; i <= 28; i++) {
    const t = i / 28;
    const rad = 2.5 + 3.5 * Math.sin(Math.PI * Math.min(1, t * 1.3));
    if (t < 0.6) pts.push([4 + (t / 0.6) * 32 - dx, 55 + Math.sin(t * 13 + phase) * 3 + dy, rad]);
    else {
      const u = (t - 0.6) / 0.4;
      pts.push([36 + u * 8 + strike[0] * u - dx, 55 - u * 34 + strike[1] * u + dy, rad]);
    }
  }
  for (const [px, py, rad] of pts) ellipse(c, px, py, rad, rad, s.body);
  if (r.limbs) {
    for (let i = 0; i < r.limbs; i++) {
      const [px, py] = pts[Math.min(pts.length - 1, 3 + Math.floor((i / r.limbs) * 16))];
      capsule(c, px, py + 2, px + (i % 2 ? 2 : -2), GROUND, 0.9, 0.6, s.dark);
    }
  }
  const [hx, hy] = pts[pts.length - 1];
  ellipse(c, hx + 3, hy, 6.5, 4.5, s.body);
  if ((r.eyes ?? 2) === 0 || p.attack === 2) ellipse(c, hx + 7, hy + 1, 2.5, 2, s.dark);
  eyes(s, hx + 4, hy - 1.5, r.eyes ?? 2, 1.8, 1);
}

/** Front view in flight: body, head (horned when faceless), beating wings, dangling legs, barbed tail. */
export function winged(s: Sketch): void {
  const { c, r, pose: p } = s;
  const [dx, dy] = recoil(p);
  const x = MID + dx;
  const b = dy - p.bob * 2 + (p.attack === 2 ? 5 : p.attack === 1 ? -3 : 0);
  const lift = p.swing > 0 || p.bob > 0 || p.attack === 1 ? 14 : -4;
  const pairs = Math.max(1, Math.round((r.wings ?? 2) / 2));
  for (let k = 0; k < pairs; k++) for (const side of [-1, 1] as const) wing(s, x + side * 4, 24 + b + k * 6, side, 26 - k * 6, lift - k * 4);
  tentacle(s, x, 38 + b, HALF_PI - 0.3, 18, 1.4, p.bob);
  for (const side of [-1, 1] as const) {
    const fx = x + side * (p.attack === 2 ? 7 : 4);
    capsule(c, x + side * 3, 38 + b, fx, 48 + b, 1.8, 1.2, s.body);
    claws(s, fx, 48 + b, side);
  }
  ellipse(c, x, 30 + b, 6, 10, s.body);
  const faceless = (r.eyes ?? 2) === 0;
  if (faceless) for (const side of [-1, 1] as const) capsule(c, x + side * 2.5, 14 + b, x + side * 6, 6 + b, 1.3, 0.5, s.dark);
  ellipse(c, x, 18 + b, 4.5, 5.5, faceless ? s.body : s.light);
  eyes(s, x, 17 + b, r.eyes ?? 2, 2, 1.1);
}

/** Mi-Go: a segmented pinkish body, jointed legs, a convoluted head of rings, membranous wings. */
export function crustacean(s: Sketch): void {
  const { c, r, pose: p } = s;
  const [dx, dy] = recoil(p);
  const x = MID + dx;
  const b = dy - p.bob;
  if (r.wings) {
    wing(s, x - 2, 28 + b, -1, 20, 10 + p.bob * 4);
    wing(s, x + 2, 26 + b, 1, 18, 10 + p.bob * 4);
  }
  const pairs = Math.max(1, Math.round((r.limbs ?? 6) / 2));
  for (let k = 0; k < pairs; k++) {
    for (const side of [-1, 1] as const) {
      const kx = x + side * (8 + k * 2);
      const ky = 44 + b - k * 2;
      const foot = side * (p.swing * (k % 2 ? 2 : -2));
      capsule(c, x + side * 3, 38 + b - k * 3, kx, ky, 1.6, 1.2, s.dark);
      capsule(c, kx, ky, kx + side * 3 + foot, GROUND - 1, 1.2, 0.7, s.dark);
    }
  }
  ellipse(c, x - 2, 42 + b, 8, 6, s.body);
  ellipse(c, x + 1, 33 + b, 7, 6, s.body);
  const claw = p.attack === 1 ? -10 : p.attack === 2 ? 8 : 0;
  for (const side of [-1, 1] as const) capsule(c, x + side * 5, 31 + b, x + side * 9 + (p.attack === 2 ? -side * 5 : 0), 22 + b + claw, 1.5, 1, s.body);
  ellipse(c, x + 3, 20 + b, 6.5, 7.5, s.light);
  for (let i = 0; i < 4; i++) ellipse(c, x + 3 + (i % 2 ? 2.5 : -2.5), 15 + i * 3 + b, 2, 1.4, s.body);
  for (const side of [-1, 1] as const) capsule(c, x + 3 + side * 2, 13 + b, x + 3 + side * 6, 5 + b, 0.6, 0.4, s.dark);
  eyes(s, x + 3, 19 + b, r.eyes ?? 0, 2, 1);
}

/** Squat and wide, head low, bulging eyes on top, splayed legs; snout tentacles; extra clawed limbs. */
export function toad(s: Sketch): void {
  const { c, r, pose: p } = s;
  const [dx, dy] = recoil(p);
  const x = MID + dx;
  const b = dy - p.bob + (p.attack === 1 ? -3 : 0);
  const limbs = Math.max(4, r.limbs ?? 4);
  for (let i = 0; i < limbs; i++) {
    const side = i % 2 ? 1 : -1;
    const k = Math.floor(i / 2);
    const fx = x + side * (18 + k * 4) + (i % 2 ? p.swing : -p.swing) * 2;
    capsule(c, x + side * 10, 46 + b - k * 4, fx, GROUND - 1 - k * 6, 3, 2, k ? s.dark : s.body);
    if (limbs > 4) claws(s, fx, GROUND - 3 - k * 6, side);
  }
  ellipse(c, x, 46 + b, 22, 14, s.body);
  ellipse(c, x, 52 + b, 15, 7, s.light);
  const gape = p.attack === 2 ? 4 : 0.8;
  ellipse(c, x, 49 + b, 11, gape, s.dark);
  for (const side of [-1, 1] as const) ellipse(c, x + side * 8, 35 + b, 4, 4, s.body);
  eyes(s, x, 35 + b, r.eyes ?? 2, 8, 1.6);
  if (r.tentacles) tentacles(s, x, 50 + b, r.tentacles, 12 + (p.attack === 2 ? 6 : 0), 1.4, HALF_PI - 0.8, HALF_PI + 0.8, p.bob + p.swing);
}
