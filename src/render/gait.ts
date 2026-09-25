/**
 * Walking and running (spec §3B: procedural, no skeletal assets). Each gait is a handful of key poses
 * of one leg over a stride (thigh swing and knee bend, sampled smoothly), for a walk, a run and a
 * sprint, blended by ground speed; the other leg runs half a stride behind. The arms swing against
 * the legs with bent elbows, the pelvis twists against the shoulders and dips over the stance leg,
 * a run leaves the ground between steps, the body leans into its pace and the head stays level. The
 * cadence follows the speed, so the feet do not skate. After any pose, a knee gives where its foot
 * would sink into the ground, and the coat's skirt swings with the thighs so no leg pokes through.
 */

import { wrapAngle } from '../core/geom';
import type { Figure } from './figures';

/** A key pose of one leg: [stride fraction (0 = the heel strikes), thigh forward of vertical, knee bend] in degrees. */
type Key = readonly [t: number, thigh: number, knee: number];

interface GaitDef {
  keys: readonly Key[];
  stance: number; // stride fraction the foot is down
  lean: number; // radians forward
  arm: number; // arm swing per radian of thigh swing
  carry: number; // arms held forward (radians)
  elbow: readonly [bent: number, forward: number]; // elbow bend, and more as the arm swings forward
  cane: number; // the cane's trail behind the hand (radians from hanging straight down)
  lift: number; // metres the body rises between steps (runs leave the ground)
  bob: number; // share of the stance leg's dip the pelvis follows (a walk rolls over a stiffer leg)
}

const WALK: GaitDef = {
  keys: [[0, 26, 3], [0.12, 20, 13], [0.3, 0, 6], [0.5, -12, 20], [0.6, -11, 40], [0.74, 12, 60], [0.88, 28, 24]],
  stance: 0.6, lean: 0.04, arm: 0.8, carry: 0.02, elbow: [0.22, 0.3], cane: 0.12, lift: 0, bob: 0.35,
};
const RUN: GaitDef = {
  keys: [[0, 28, 16], [0.17, 12, 36], [0.34, -24, 24], [0.46, -10, 75], [0.62, 24, 108], [0.8, 44, 64], [0.92, 36, 28]],
  stance: 0.34, lean: 0.17, arm: 0.95, carry: 0.08, elbow: [1.05, 0.3], cane: 0.35, lift: 0.035, bob: 1,
};
const SPRINT: GaitDef = {
  keys: [[0, 32, 18], [0.15, 12, 40], [0.3, -32, 28], [0.42, -12, 95], [0.58, 30, 128], [0.76, 60, 78], [0.9, 44, 32]],
  stance: 0.3, lean: 0.27, arm: 1.05, carry: 0.12, elbow: [1.25, 0.3], cane: 0.55, lift: 0.05, bob: 1,
};
const GAITS = [WALK, RUN, SPRINT] as const;
const DEG = Math.PI / 180;

/** Stride cycles per second at a ground speed (m/s), fitted so the stance foot keeps pace with the ground. */
const CADENCE: readonly (readonly [speed: number, hz: number])[] = [[0, 0.75], [1, 0.76], [1.4, 1.03], [2.2, 1.36], [2.6, 1.5], [3, 1.62], [4.2, 1.76], [5, 1.93], [6.4, 1.99]];

export function cadence(speed: number): number {
  for (let i = 1; i < CADENCE.length; i++) {
    const [[s0, h0], [s1, h1]] = [CADENCE[i - 1], CADENCE[i]];
    if (speed <= s1) return h0 + ((h1 - h0) * Math.max(0, speed - s0)) / (s1 - s0);
  }
  return CADENCE[CADENCE.length - 1][1];
}

const clamp01 = (t: number): number => Math.min(1, Math.max(0, t));
const smooth = (a: number, b: number, x: number): number => {
  const t = clamp01((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};

/** Key `i` of a looping track, its time unwrapped past the loop's ends. */
function key(keys: readonly Key[], i: number, c: 1 | 2): readonly [number, number] {
  const wrap = Math.floor(i / keys.length);
  const k = keys[i - wrap * keys.length];
  return [k[0] + wrap, k[c]];
}

/** A looping track at stride fraction `t` (0..1): a cubic through the keys, its slopes from the neighbours. */
function track(keys: readonly Key[], t: number, c: 1 | 2): number {
  let j = keys.length - 1;
  while (j > 0 && keys[j][0] > t) j--;
  const [[t0, p0], [t1, p1], [t2, p2], [t3, p3]] = [key(keys, j - 1, c), key(keys, j, c), key(keys, j + 1, c), key(keys, j + 2, c)];
  const h = t2 - t1;
  const u = (t - t1) / h;
  const [m1, m2] = [((p2 - p0) / (t2 - t0)) * h, ((p3 - p1) / (t3 - t1)) * h];
  const [u2, u3] = [u * u, u * u * u];
  return (2 * u3 - 3 * u2 + 1) * p1 + (u3 - 2 * u2 + u) * m1 + (3 * u2 - 2 * u3) * p2 + (u3 - u2) * m2;
}

/** How much of each gait a speed is: stride (standing 0 → striding 1), run (walk → run), sprint (run → sprint). */
function blendAt(speed: number): { stride: number; run: number; sprint: number } {
  return { stride: smooth(0, 0.9, speed), run: smooth(2.3, 3.8, speed), sprint: smooth(4.6, 6.2, speed) };
}

export interface Leg {
  thigh: number; // radians forward of vertical
  knee: number; // radians bent
}

/** Everything a stride sets, at a speed and a stride phase (radians; the right heel strikes at 0). */
export interface Stride {
  right: Leg;
  left: Leg;
  stance: number; // stride fraction a foot is down
  lean: number;
  lift: number; // the pelvis above its lowest foot's reach (the flight between running steps)
  bob: number;
  arm: number;
  carry: number;
  elbow: readonly [number, number];
  cane: number;
  centre: number; // the thigh's mid swing, which the arms swing about
}

export function strideAt(speed: number, phase: number): Stride {
  const w = blendAt(speed);
  const mix = (get: (d: GaitDef) => number): number => {
    const walkRun = get(WALK) + (get(RUN) - get(WALK)) * w.run;
    return walkRun + (get(SPRINT) - walkRun) * w.sprint;
  };
  const reach = 1.06 + 0.3 * smooth(1.4, 2.3, speed) * (1 - w.run); // a brisk walk lengthens its steps
  const leg = (t: number): Leg => ({
    thigh: mix((d) => track(d.keys, t, 1)) * DEG * w.stride * reach,
    knee: Math.max(0, mix((d) => track(d.keys, t, 2)) * DEG * w.stride),
  });
  const t = (((phase / (2 * Math.PI)) % 1) + 1) % 1;
  const tl = (t + 0.5) % 1;
  const stance = mix((d) => d.stance);
  const flight = (x: number): number => (x > stance && x < 0.5 ? Math.sin((Math.PI * (x - stance)) / (0.5 - stance)) : 0);
  return {
    right: leg(t),
    left: leg(tl),
    stance,
    lean: mix((d) => d.lean) * w.stride,
    lift: mix((d) => d.lift) * w.stride * (flight(t) + flight(tl)),
    bob: mix((d) => d.bob),
    arm: mix((d) => d.arm),
    carry: mix((d) => d.carry) * w.stride,
    elbow: [mix((d) => d.elbow[0]), mix((d) => d.elbow[1])],
    cane: mix((d) => d.cane),
    centre: mix((d) => centreOf(d)) * DEG * w.stride * reach,
  };
}

const centres = new Map<GaitDef, number>(GAITS.map((d) => [d, (Math.max(...d.keys.map((k) => k[1])) + Math.min(...d.keys.map((k) => k[1]))) / 2]));
const centreOf = (d: GaitDef): number => centres.get(d)!;

/** How far below the hip a leg reaches with its foot level (metres). */
export const reachOf = (f: Pick<Figure, 'thigh' | 'shin' | 'ankle'>, l: Leg): number =>
  f.thigh * Math.cos(l.thigh) + (f.shin - f.ankle) * Math.cos(l.thigh - l.knee) + f.ankle;

/**
 * Poses a figure striding at `speed` (m/s), `phase` radians into its stride; `guard` keeps the cane
 * across the body. Standing still (speed 0) it stands at ease, breathing.
 */
export function stride(f: Figure, speed: number, phase: number, time: number, guard: boolean): void {
  const s = strideAt(speed, phase);
  const still = 1 - blendAt(speed).stride;
  const clearance = f.hip - f.thigh - f.shin; // the soles' height when standing
  const low = Math.max(reachOf(f, s.right), reachOf(f, s.left)) + clearance;
  f.body.position.y = f.hip - (f.hip - low) * s.bob + s.lift;
  const pitch = f.hunch + s.lean;
  f.body.rotation.x = pitch;
  const twist = s.right.thigh - s.left.thigh;
  f.body.rotation.y = 0.14 * twist; // the hip of the leg ahead leads...
  f.torso.rotation.y = -0.28 * twist; // ...and the shoulders turn against it
  f.torso.rotation.x = 0.03 * Math.sin(time * 1.7) * still; // breathing
  f.head.rotation.x = -f.hunch * 0.8 - s.lean * 0.8; // eyes level
  f.head.rotation.y = 0.1 * twist;
  for (const [legJ, knee, l] of [[f.legR, f.kneeR, s.right], [f.legL, f.kneeL, s.left]] as const) {
    legJ.rotation.x = -l.thigh - pitch; // thigh angles are from the vertical, whatever the lean
    knee.rotation.x = l.knee;
  }
  const out = 0.12 + 0.05 * clamp01(speed / 4); // arms held clear of the coat, lantern and satchel
  for (const [arm, elbow, l, side] of [[f.armR, f.elbowR, s.right, -1], [f.armL, f.elbowL, s.left, 1]] as const) {
    const swing = s.arm * (l.thigh - s.centre); // back while its own leg is forward
    const ahead = clamp01(-swing / 0.5);
    arm.rotation.set(swing - s.carry - s.lean, 0, side * out, 'YXZ');
    elbow.rotation.x = -(0.12 * still + (s.elbow[0] + s.elbow[1] * ahead) * (1 - still));
  }
  if (guard) {
    f.armR.rotation.set(-1.25, -0.2, 0.6, 'YXZ'); // cane across the body
    f.elbowR.rotation.x = 0;
    return;
  }
  // The cane hangs from the hand, trailing more the faster the stride.
  const forearm = pitch + f.torso.rotation.x + f.armR.rotation.x + f.elbowR.rotation.x;
  f.handR.rotation.x = s.cane * (1 - still) + 0.3 * (f.armR.rotation.x + s.lean) * (1 - s.cane) - forearm;
}

/** The ground's height at a point in the figure's own frame (x right-to-left, z forward), relative to its feet's origin. */
export type Ground = (x: number, z: number) => number;

/**
 * Settles any pose on the ground (never a figure rolling or lying down): the pelvis sinks to a foot
 * whose ground lies lower than where the figure stands (down a slope or a step), a knee bends where
 * its foot would sink into the ground, a foot lies level on the ground and lets its toes drop as it
 * lifts, and each coat panel follows its thigh.
 */
export function settle(f: Figure, ground?: Ground): void {
  const pitch = wrapAngle(f.body.rotation.x);
  const clearance = f.hip - f.thigh - f.shin;
  const shank = f.shin - f.ankle; // knee to ankle
  if (Math.abs(pitch) < 1.1) {
    const legs = [[f.legR, f.kneeR, f.footR], [f.legL, f.kneeL, f.footL]] as const;
    const under = legs.map(([legJ, knee]) => {
      const a = pitch + legJ.rotation.x; // the thigh from the vertical, positive with the foot behind
      return ground?.(legJ.position.x, -(f.thigh * Math.sin(a) + shank * Math.sin(a + knee.rotation.x))) ?? 0;
    });
    f.body.position.y += Math.min(0, ...under);
    legs.forEach(([legJ, knee, foot], i) => {
      const thigh = pitch + legJ.rotation.x;
      const room = f.body.position.y - clearance - under[i] - f.ankle; // how far below the hip the ankle may go
      const c = (room - f.thigh * Math.cos(thigh)) / shank;
      if (c > -1 && c < 1 && f.thigh * Math.cos(thigh) + shank * Math.cos(thigh + knee.rotation.x) > room) {
        knee.rotation.x = Math.min(2.6, Math.max(knee.rotation.x, Math.acos(c) - thigh));
      }
      const shin = thigh + knee.rotation.x;
      const lifted = room - f.thigh * Math.cos(thigh) - shank * Math.cos(shin);
      foot.rotation.x = Math.min(0.5, Math.max(0, lifted * 3)) - shin; // level, the toes dropping as it lifts
    });
  }
  f.skirt.forEach((panel, i) => (panel.rotation.x = 0.9 * (i === 0 ? f.legR : f.legL).rotation.x));
}
