/** Non-bilateral body plans: barrel (Elder Thing), cone (Yithian), blob, orb, swarm. */

import { createRng } from '../../core/rng';
import { capsule, ellipse, poly } from './raster';
import { eyes, GROUND, MID, recoil, tentacle, tentacles, wing, type Sketch } from './parts';

const HALF_PI = Math.PI / 2;

/** A ridged barrel on a starfish base, a five-armed starfish head with eye-stalks, folded wings. */
export function barrel(s: Sketch): void {
  const { c, r, pose: p } = s;
  const [dx, dy] = recoil(p);
  const x = MID + dx;
  const b = dy - p.bob;
  if (r.wings) for (const side of [-1, 1] as const) wing(s, x + side * 7, 30 + b, side, 12, 6 + p.bob * 2);
  for (let k = 0; k < 5; k++) {
    const a = HALF_PI + (k - 2) * 0.45;
    capsule(c, x, 52 + b, x + Math.cos(a) * 12 + p.swing * (k % 2 ? 2 : -2), GROUND - 1, 2.2, 1, s.dark);
  }
  ellipse(c, x, 38 + b, 9, 15, s.body);
  for (let k = -1.5; k <= 1.5; k++) capsule(c, x + k * 3.6, 26 + b, x + k * 3.6, 50 + b, 0.5, 0.5, s.dark);
  const reach = p.attack === 2 ? 1.6 : p.attack === 1 ? 0.6 : 1;
  tentacles(s, x, 36 + b, r.tentacles ?? 5, 14 * reach, 1.1, -0.3, Math.PI + 0.3, p.bob + p.attack);
  capsule(c, x, 24 + b, x, 18 + b, 2.2, 1.8, s.body);
  const n = r.eyes ?? 5;
  for (let k = 0; k < 5; k++) {
    const a = -HALF_PI + (k * 2 * Math.PI) / 5;
    const [ex, ey] = [x + Math.cos(a) * 7, 15 + b + Math.sin(a) * 5];
    capsule(c, x, 15 + b, ex, ey, 1.8, 0.9, s.light);
    if (k < n) ellipse(c, ex, ey, 1.2, 1.2, s.eye);
  }
}

/** Yithian: a great cone with four limbs from its apex (claws, trumpets, the head). No limbs: an upright egg (the penguin). */
export function cone(s: Sketch): void {
  const { c, r, pose: p } = s;
  const [dx, dy] = recoil(p);
  const x = MID + dx;
  const b = dy - p.bob;
  if (r.limbs === 0) {
    const peck = p.attack === 2 ? 4 : p.attack === 1 ? -2 : 0; // the head bobs down to peck
    const flap = p.attack === 1 ? -8 : 0;
    for (const side of [-1, 1] as const) capsule(c, x + side * 9, 30 + b, x + side * 13, 44 + b + flap + p.swing * side * 2, 2.4, 1.2, s.dark);
    ellipse(c, x, 40 + b, 12, 21, s.body);
    ellipse(c, x, 45 + b, 8, 15, s.light);
    ellipse(c, x, 20 + b + peck, 7, 7, s.body);
    poly(c, [[x - 2, 22 + b + peck], [x + 2, 22 + b + peck], [x, 27 + b + peck * 1.5]], s.light);
    for (const side of [-1, 1] as const) ellipse(c, x + side * 4, 61, 3, 1.4, s.light);
    return;
  }
  const tip: readonly [number, number] = [x, 26 + b];
  poly(c, [[x - 3, 26 + b], [x + 3, 26 + b], [x + 16 + p.swing, GROUND - 2], [x - 16 + p.swing, GROUND - 2]], s.body);
  ellipse(c, x + p.swing, GROUND - 2, 16, 2.5, s.dark);
  const lift = p.attack === 1 ? -6 : p.attack === 2 ? 6 : 0;
  capsule(c, tip[0], tip[1], x - 14, 12 + b + lift, 2.2, 1.6, s.body);
  capsule(c, tip[0], tip[1], x + 14, 12 + b + lift, 2.2, 1.6, s.body);
  for (const side of [-1, 1] as const) {
    capsule(c, x + side * 14, 12 + b + lift, x + side * 17, 7 + b + lift, 1.1, 0.5, s.light);
    capsule(c, x + side * 14, 12 + b + lift, x + side * 11, 7 + b + lift, 1.1, 0.5, s.light);
  }
  capsule(c, tip[0], tip[1], x + 7, 4 + b, 1.6, 1.3, s.body);
  ellipse(c, x + 8, 3 + b, 2.5, 2, s.light);
  capsule(c, tip[0], tip[1], x - 6, 8 + b, 1.8, 1.4, s.body);
  ellipse(c, x - 6, 6 + b, 4.5, 3.5, s.light);
  eyes(s, x - 6, 5.5 + b, r.eyes ?? 3, 2.5, 0.9);
}

/** A heaped, bubbling mass with eyes all over and pseudopods that lash out on the strike. */
export function blob(s: Sketch): void {
  const { c, r, pose: p } = s;
  const [dx, dy] = recoil(p);
  const x = MID + dx;
  const shape = createRng((r.seed ?? 0) + 11);
  const pulse = 1 + 0.07 * (p.bob + p.swing * 0.5) - (p.attack === 1 ? 0.08 : 0);
  const reach = p.attack === 2 ? 1.8 : 1;
  if (r.tentacles) tentacles(s, x, 44 + dy, r.tentacles, 16 * reach, 1.8, Math.PI + 0.4, -0.4, p.bob + p.swing + p.attack);
  ellipse(c, x, 52 + dy, 22 * pulse, 10, s.body);
  for (let k = 0; k < 7; k++) {
    const rad = (6 + shape() * 6) * pulse;
    ellipse(c, x + (shape() - 0.5) * 30, 40 + dy + (shape() - 0.5) * 18, rad, rad * 0.9, k % 3 ? s.body : s.light);
  }
  if (p.attack === 2 && !r.tentacles) {
    for (const side of [-1, 1] as const) tentacle(s, x + side * 14, 42 + dy, side === 1 ? -0.3 : Math.PI + 0.3, 18, 2.4, p.bob);
  }
  eyes(s, x, 42 + dy, r.eyes ?? 0, 13, 1.3);
}

/** A floating sphere with a bright core (when it glows), trailing tentacles and motes. */
export function orb(s: Sketch): void {
  const { c, r, pose: p } = s;
  const [dx, dy] = recoil(p);
  const x = MID + dx;
  const b = dy - p.bob * 2 + p.swing;
  const grow = p.attack === 1 ? 2 : p.attack === 2 ? -1 : 0;
  if (r.tentacles) tentacles(s, x, 34 + b, r.tentacles, 22, 1.2, HALF_PI - 0.5, HALF_PI + 0.5, p.bob + p.swing);
  ellipse(c, x, 26 + b, 12 + grow, 12 + grow, s.body);
  ellipse(c, x - 3, 22 + b, 5, 4, s.light);
  if (r.glow) {
    ellipse(c, x, 27 + b, 4 + (p.attack === 2 ? 3 : 0), 4 + (p.attack === 2 ? 3 : 0), s.eye);
    const motes = createRng((r.seed ?? 0) + p.bob * 7 + p.attack * 13 + 3);
    for (let k = 0; k < 7; k++) ellipse(c, x + (motes() - 0.5) * 40, 26 + b + (motes() - 0.5) * 36, 0.8, 0.8, s.eye);
  }
  eyes(s, x, 26 + b, r.eyes ?? 0, 6, 1.2);
}

/** Many small things underfoot (rats, snakes): a stable layout that jitters from frame to frame. */
export function swarm(s: Sketch): void {
  const { c, r, pose: p } = s;
  const layout = createRng((r.seed ?? 0) + 5);
  const jitter = createRng((r.seed ?? 0) + p.bob * 3 + (p.swing + 1) * 7 + p.attack * 11 + p.hurt * 17);
  const serpentine = (r.eyes ?? 2) === 1;
  for (let k = 0; k < 12; k++) {
    const x = 8 + layout() * 48 + (jitter() - 0.5) * 3 + (p.attack === 2 ? 3 : 0);
    const y = 48 + layout() * 12 + (jitter() - 0.5) * 2 - (p.attack === 1 ? 2 : 0);
    const dir = layout() < 0.5 ? -1 : 1;
    tentacle(s, x - dir * 2, y, dir === 1 ? Math.PI : 0, serpentine ? 9 : 6, serpentine ? 1.4 : 0.7, k + p.swing);
    ellipse(c, x, y, serpentine ? 2.2 : 3.6, serpentine ? 1.6 : 2.4, s.body);
    ellipse(c, x + dir * (serpentine ? 1.5 : 3), y - 1, 1.6, 1.4, s.body);
    ellipse(c, x + dir * (serpentine ? 2 : 3.6), y - 1.4, 0.6, 0.6, s.eye);
  }
}
