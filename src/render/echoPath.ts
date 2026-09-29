/**
 * How a wisp of Echoes moves (playtest round 20; render/echoFx.ts draws it): out of the fallen body it
 * unspools upward in a slow circle, hangs and bobs a moment, then is drawn to the investigator's chest
 * along a spiral that tightens and quickens as it nears. Pure: no Three.js.
 */

import type { V3 } from '../core/geom';
import { ECHO_FX } from '../data/tuning';

export interface Wisp extends V3 {
  vx: number;
  vy: number;
  vz: number;
  age: number;
  rise: number; // seconds it unspools
  hold: number; // seconds it then hangs
  lift: number; // metres a second it leaves at
  turn: 1 | -1; // which way it circles and spirals
  phase: number; // where in its circling and bobbing it starts
  amount: number; // the Echoes it carries
}

/** How many wisps a bounty is parted into: a few for a scrap, more for each doubling. */
export function wispCount(bounty: number): number {
  const [least, most] = ECHO_FX.wisps;
  return Math.max(least, Math.min(most, least - 1 + Math.ceil(Math.log2(bounty + 1) / ECHO_FX.doubling)));
}

/** `amount` shared between `n`, whole Echoes each and the first taking the remainder, so none is lost. */
export function shares(amount: number, n: number): number[] {
  const each = Math.floor(amount / n);
  return Array.from({ length: n }, (_, i) => each + (i === 0 ? amount - each * n : 0));
}

/** Moves a wisp `dt` seconds toward `to`; true once it is taken in. */
export function stepWisp(w: Wisp, dt: number, to: V3): boolean {
  w.age += dt;
  const drawn = w.age - w.rise - w.hold; // seconds it has been drawn: negative while it rises and hangs
  if (drawn < 0) {
    const k = Math.min(1, w.age / w.rise);
    const a = w.phase + w.age * 2.2 * w.turn;
    w.vx = Math.cos(a) * ECHO_FX.sway;
    w.vz = Math.sin(a) * ECHO_FX.sway;
    w.vy = w.lift * (1 - k) ** 2 + Math.sin(w.age * 5 + w.phase) * 0.12;
  } else {
    const [dx, dy, dz] = [to.x - w.x, to.y - w.y, to.z - w.z];
    const dist = Math.hypot(dx, dy, dz);
    if (dist < ECHO_FX.arrive || drawn > ECHO_FX.give || dist > ECHO_FX.far) return true;
    const speed = Math.min(ECHO_FX.speed[1], ECHO_FX.speed[0] + ECHO_FX.quicken * drawn);
    const [ux, uy, uz] = [dx / dist, dy / dist, dz / dist];
    const side = w.turn * ECHO_FX.spiral * Math.min(1, dist / 4); // the spiral tightens as it nears
    const k = Math.min(1, ECHO_FX.turn * dt);
    w.vx += (ux * speed - uz * side - w.vx) * k;
    w.vy += (uy * speed - w.vy) * k;
    w.vz += (uz * speed + ux * side - w.vz) * k;
    if (Math.hypot(w.vx, w.vy, w.vz) * dt >= dist) return true; // it would pass through
  }
  w.x += w.vx * dt;
  w.y += w.vy * dt;
  w.z += w.vz * dt;
  return false;
}
