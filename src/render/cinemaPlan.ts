/**
 * A cutscene's camera, planned (playtest round 20; cinema.ts plays it): where the lens stands and
 * what it looks at, as a function of the seconds since the scene began, from the shots in
 * data/cutscenes.ts; how strongly the scene holds the camera as it comes in from and goes back to the
 * follow camera; and which beats fall in a span of time. Pure: no Three.js, no world.
 */

import { clamp, yawOf, type V3 } from '../core/geom';
import type { Beat, Ease, Scene, Shot } from '../data/cutscenes';

/** Someone, or something, the camera is about: where it stands (its feet), which way it faces, how tall it is. */
export interface Anchor extends V3 {
  yaw: number;
  height: number;
}

/** The lens: where it is, the point it looks at, its field of view (degrees) and its roll (radians). */
export interface Frame {
  pos: V3;
  look: V3;
  fov: number;
  roll: number;
}

const RAD = Math.PI / 180;
const smooth = (x: number): number => x * x * (3 - 2 * x);

export function ease(kind: Ease, x: number): number {
  const k = clamp(x, 0, 1);
  return kind === 'linear' ? k : kind === 'in' ? k * k : kind === 'out' ? 1 - (1 - k) ** 2 : smooth(k);
}

/** The seconds a scene lasts: its shots, one after another. */
export const sceneLength = (s: Scene): number => s.shots.reduce((n, sh) => n + sh.dur, 0);

/** The shot playing `t` seconds in, and how far through it (0..1). Past the end: the last, complete. */
export function shotAt(s: Scene, t: number): { shot: Shot; index: number; u: number } {
  let from = 0;
  for (let i = 0; i < s.shots.length; i++) {
    const sh = s.shots[i];
    if (t < from + sh.dur || i === s.shots.length - 1) return { shot: sh, index: i, u: clamp((t - from) / sh.dur, 0, 1) };
    from += sh.dur;
  }
  throw new Error(`scene ${s.id} has no shots`);
}

/** The slow, uneven drift of a hand-held camera: three unit offsets at `t`. */
export function drift(t: number, seed = 0): V3 {
  const wave = (a: number, b: number): number => 0.6 * Math.sin(t * a + seed) + 0.4 * Math.sin(t * b + seed * 2.3);
  return { x: wave(0.83, 1.71), y: wave(1.13, 2.03), z: wave(0.61, 1.37) };
}

/**
 * The lens for `shot` at `u` (0..1) through it, in the scene's time `t` (for its drift). `on` is who
 * it circles; `other` the party opposite (the investigator to a horror and the horror to them): the
 * line between them is the shot's zero of yaw, and without one it is the way `on` faces.
 */
export function frameOf(shot: Shot, u: number, on: Anchor, other: Anchor | null, t: number): Frame {
  const k = ease(shot.ease ?? 'inout', u);
  const mix = (p: readonly [number, number]): number => p[0] + (p[1] - p[0]) * k;
  const scale = shot.body ? on.height : 1;
  const apart = other ? Math.hypot(other.x - on.x, other.z - on.z) : 0;
  const base = other && apart > 0.5 ? yawOf(other.x - on.x, other.z - on.z) : on.yaw;
  const facing = base + mix(shot.yaw) * RAD;
  const [d, up] = [mix(shot.dist) * scale, mix(shot.up) * scale];
  const aimed = shot.aim === 'other' && other ? other : on;
  const [sway, s] = [shot.sway ?? 0, drift(t)];
  const amp = 0.07 * sway * clamp(d / 4, 0.6, 3);
  return {
    pos: { x: on.x + Math.sin(facing) * d + s.x * amp, y: on.y + up + s.y * amp, z: on.z + Math.cos(facing) * d + s.z * amp },
    look: { x: aimed.x, y: aimed.y + mix(shot.look) * aimed.height + s.y * amp * 0.5, z: aimed.z },
    fov: mix(shot.fov),
    roll: shot.roll ? mix(shot.roll) * RAD : 0,
  };
}

/** How firmly the scene holds the camera `t` seconds in (of `length`): 0 is the follow camera's, 1 the scene's; it eases in and out. */
export function holdOf(s: Scene, t: number, length = sceneLength(s)): number {
  const [into, out] = s.blend ?? [0.7, 0.9];
  const a = into > 0 ? smooth(clamp(t / into, 0, 1)) : 1;
  const b = out > 0 ? smooth(clamp((length - t) / out, 0, 1)) : 1;
  return Math.min(a, b);
}

/** The beats that fall after `from` and up to `to` (seconds into the scene), in order. */
export const beatsBetween = (s: Scene, from: number, to: number): Beat[] => s.beats.filter((b) => b.at > from && b.at <= to);

/** The trembling of the camera `since` seconds after a beat set it off, for `hold` seconds: `amount` metres dying away. */
export const tremor = (amount: number, since: number, hold: number): number => (since < 0 || since > hold ? 0 : amount * (1 - since / hold) ** 2);
