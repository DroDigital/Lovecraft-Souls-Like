/**
 * How the small lives live, moment to moment (playtest round 18; data/fauna.ts). A bird sits on its
 * perch turning its head, and at the investigator's approach (twice as far if they run), a shot or a
 * blow struck near it, takes wing away from them, climbing, until the dark has it. A rat dashes about
 * its haunt and bolts into a crack when come upon; a bat loops about its tree; moths circle their
 * lamp; a firefly drifts and blinks; a cat sits, strolls a little way now and then, and slinks off
 * when come too close (from a wall top, down out of sight behind it). Gone, a critter comes back to
 * its haunt once the investigator is well away, showing again over a moment. Pure: no Three.js.
 */

import type { V3 } from '../core/geom';
import { createRng, type Rng } from '../core/rng';
import { CRITTERS, type Critter } from '../data/fauna';
import { FAUNA } from '../data/tuning';
import type { Nest } from '../world/haunts';
import { surface } from '../world/terrain';

export type Mode = 'rest' | 'move' | 'flee' | 'gone';

export interface Life extends V3 {
  nest: Nest;
  def: Critter;
  vx: number; // m/s
  vy: number;
  vz: number;
  mode: Mode;
  t: number; // seconds in this mode (below 0: about to go)
  wait: number; // seconds before its next doing
  to: { x: number; z: number } | null; // where it runs or strolls to
  look: 1 | -1; // which way it faces at rest
  seen: number; // 0..1: how much of it shows (a firefly: how brightly it glows)
  phase: number; // its own rhythm
  high: boolean; // sitting up on something (a cat on a wall)
  rng: Rng;
}

export function birth(nest: Nest): Life {
  const rng = createRng(nest.seed);
  const high = nest.y - surface(nest.x, nest.z) > 0.4;
  return { x: nest.x, y: nest.y, z: nest.z, nest, def: CRITTERS[nest.critter], vx: 0, vy: 0, vz: 0, mode: 'rest', t: 0, wait: 1 + rng() * 5, to: null, look: rng() < 0.5 ? 1 : -1, seen: 1, phase: rng() * 100, high, rng };
}

const between = (rng: Rng, [lo, hi]: readonly [number, number]): number => lo + (hi - lo) * rng();

/** Sends it off, away from `from`, if it minds such things and is not already going: true if it went. */
export function startle(l: Life, from: V3): boolean {
  if (!l.def.startle || l.mode === 'flee' || l.mode === 'gone') return false;
  const d = Math.hypot(l.x - from.x, l.z - from.z) || 1;
  const turn = (l.rng() - 0.5) * 1.1; // not quite straight away
  const [ux, uz, s, c] = [(l.x - from.x) / d, (l.z - from.z) / d, Math.sin(turn), Math.cos(turn)];
  [l.vx, l.vz] = [(ux * c - uz * s) * l.def.speed, (ux * s + uz * c) * l.def.speed];
  l.vy = l.def.habit === 'perch' ? 1.6 + l.rng() * 1.4 : 0;
  [l.mode, l.t, l.to] = ['flee', -l.rng() * 0.35, null]; // a flock goes a beat apart
  return true;
}

/** Where a looping, circling or drifting critter is at `time`. */
function wander(l: Life, time: number, dt: number): void {
  const [n, R, p, t] = [l.nest, l.def.reach, l.phase, time];
  let [x, y, z] = [n.x, n.y, n.z];
  if (l.def.habit === 'flit') {
    const w = l.def.speed / R;
    x += R * (0.72 * Math.sin(w * t + p) + 0.28 * Math.sin(w * 2.7 * t + p * 1.3));
    z += R * (0.72 * Math.sin(w * 0.8 * t + p * 0.7 + 1.2) + 0.28 * Math.cos(w * 2.2 * t + p));
    y += 0.3 + 1.1 * Math.sin(w * 1.3 * t + p * 0.5);
  } else if (l.def.habit === 'orbit') {
    const [a, r] = [t * (2.4 + (p % 1) * 1.6) + p, R * (0.6 + 0.4 * Math.sin(t * 1.7 + p))];
    x += Math.cos(a) * r + 0.06 * Math.sin(t * 23 + p);
    z += Math.sin(a) * r;
    y += 0.25 * Math.sin(t * 2.3 + p) + 0.05 * Math.sin(t * 31 + p);
  } else {
    x += R * (0.6 * Math.sin(0.23 * t + p) + 0.4 * Math.sin(0.51 * t + 2 * p));
    z += R * (0.6 * Math.cos(0.19 * t + 1.7 * p) + 0.4 * Math.sin(0.43 * t + p));
    y += 0.5 + 0.5 * (1 + Math.sin(0.37 * t + p));
    const on = ((t + p) % (2.2 + (p % 1) * 2)) / 1.3; // it glows a second or so, every few
    l.seen = on < 1 ? Math.sin(on * Math.PI) : 0;
  }
  if (dt > 0) [l.vx, l.vy, l.vz] = [(x - l.x) / dt, (y - l.y) / dt, (z - l.z) / dt];
  [l.x, l.y, l.z, l.mode] = [x, y, z, 'move'];
}

/** On its way out of sight. */
function flee(l: Life, dt: number): void {
  if (l.t < 0) return; // about to go
  const out = l.def.habit === 'perch' ? FAUNA.flight : l.high ? 0.5 : l.def.habit === 'prowl' ? 2 : 1.1; // seconds it is in sight
  const fade = Math.min(1.5, out);
  if (l.def.habit === 'perch') {
    const turn = (l.phase % 1 < 0.5 ? -0.25 : 0.25) * dt; // it banks as it goes
    [l.vx, l.vz] = [l.vx * Math.cos(turn) - l.vz * Math.sin(turn), l.vx * Math.sin(turn) + l.vz * Math.cos(turn)];
    l.vy = Math.max(0.4, l.vy - 0.35 * dt);
    [l.x, l.y, l.z] = [l.x + l.vx * dt, l.y + l.vy * dt, l.z + l.vz * dt];
  } else if (l.high) l.y -= 2 * dt; // down off the wall, out of sight
  else {
    [l.x, l.z] = [l.x + l.vx * dt, l.z + l.vz * dt];
    l.y = surface(l.x, l.z);
  }
  l.seen = Math.min(l.seen, 1 - Math.max(0, Math.min(1, (l.t - out + fade) / fade))); // the dark takes it
  if (l.t >= out) [l.mode, l.wait, l.seen] = ['gone', between(l.rng, FAUNA.goneFor), 0];
}

/** Idling about its haunt: a head turned, a dash, a stroll. */
function idle(l: Life, dt: number): void {
  l.seen = Math.min(1, l.seen + dt / FAUNA.fade);
  if (l.mode === 'move' && l.to) {
    const [dx, dz] = [l.to.x - l.x, l.to.z - l.z];
    const d = Math.hypot(dx, dz);
    const pace = l.def.habit === 'scurry' ? l.def.speed * 0.8 : 0.9;
    if (d < 0.15) [l.mode, l.to, l.vx, l.vz, l.wait] = ['rest', null, 0, 0, l.def.habit === 'scurry' ? between(l.rng, [1, 5]) : between(l.rng, [6, 16])];
    else {
      const step = Math.min(d, pace * dt);
      [l.vx, l.vz] = [(dx / d) * pace, (dz / d) * pace];
      [l.x, l.z] = [l.x + (dx / d) * step, l.z + (dz / d) * step];
      l.y = surface(l.x, l.z);
    }
    return;
  }
  if ((l.wait -= dt) > 0) return;
  const walks = l.def.habit === 'scurry' || (l.def.habit === 'prowl' && !l.high);
  if (walks) {
    const [a, r] = [l.rng() * Math.PI * 2, l.def.reach * Math.sqrt(l.rng())];
    [l.mode, l.to] = ['move', { x: l.nest.x + Math.sin(a) * r, z: l.nest.z + Math.cos(a) * r }];
  } else [l.look, l.wait] = [l.rng() < 0.4 ? (-l.look as 1 | -1) : l.look, between(l.rng, [1.5, 5])]; // it looks the other way
}

/** One moment of its life; `me` where the investigator stands, `pace` how fast they go (m/s). True as it takes fright. */
export function live(l: Life, dt: number, time: number, me: V3, pace: number): boolean {
  l.t += dt;
  const habit = l.def.habit;
  if (habit === 'flit' || habit === 'orbit' || habit === 'drift') return wander(l, time, dt), false;
  if (l.mode === 'gone') {
    if ((l.wait -= dt) <= 0 && Math.hypot(me.x - l.nest.x, me.z - l.nest.z) > FAUNA.backBeyond) {
      Object.assign(l, { x: l.nest.x, y: l.nest.y, z: l.nest.z, vx: 0, vy: 0, vz: 0, mode: 'rest', t: 0, wait: between(l.rng, [2, 6]), to: null, seen: 0 });
    }
    return false;
  }
  if (l.mode === 'flee') return flee(l, dt), false;
  const nerve = l.def.startle * (pace > 4 ? 2 : 1);
  if (nerve > 0 && Math.hypot(l.x - me.x, l.z - me.z) < nerve) return startle(l, me);
  idle(l, dt);
  return false;
}

/** Which of its frames it shows: on the move (wings beating, legs running) or at rest, and how fast they turn over. */
export function gait(l: Life): { moving: boolean; fps: number } {
  const h = l.def.habit;
  if (h === 'flit') return { moving: true, fps: 12 };
  if (h === 'orbit') return { moving: true, fps: 16 };
  if (l.mode === 'flee' && l.t >= 0) return { moving: true, fps: h === 'perch' ? 9 : 10 };
  if (l.mode === 'move') return { moving: true, fps: h === 'scurry' ? 10 : 5 };
  return { moving: false, fps: h === 'scurry' ? 1.5 : 0.45 };
}
