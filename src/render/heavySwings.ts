/**
 * The heavy blows (playtest round 13: they looked silly: straight arms flung through the head, a
 * body tipped like a plank, a stiff pirouette). Each is a handful of key poses, eased from one to
 * the next: a gathering wind-up held a beat at its height, a strike that snaps through the active
 * frames with the hips and a planted step behind it, and a follow-through that carries the weight
 * before it settles. The weapon hand is placed where it should be (armReach.ts), the blade pointing
 * the way it should, and the elbow bends to get it there; a two-handed blow brings the off hand to
 * the grip, else it balances.
 *
 * Time runs 0 → 1 through the wind-up, 1 → 2 through the active frames, 2 → 3 through recovery;
 * rest is at 0 and 3. Hand points are metres from the pelvis in the frame of the way the figure
 * faces (the torso's turn taken off: x left, y up, z ahead), unless the blow turns with the body
 * (the whirl). Leg angles are from the vertical; the knees bend where the feet would sink (gait.ts).
 */

import type { MoveDef } from '../data/moves';
import { reach, type Vec } from './armReach';
import type { Figure } from './figures';

type J3 = readonly [number, number, number];
type Ease = 'smooth' | 'in' | 'out';

/** A key pose: every joint left out is at rest. */
export interface Key {
  t: number;
  ease?: Ease; // how the pose is reached from the key before
  body?: J3; // pelvis: lean forward, turn (+ = to the left), roll
  drop?: number; // metres the pelvis sinks
  torso?: J3;
  head?: readonly [number, number];
  hand?: Vec; // the weapon hand...
  blade?: Vec; // ...the way its blade points...
  pole?: Vec; // ...the way its elbow bends out...
  edge?: Vec; // ...and the way its edge faces
  grip?: boolean; // the off hand on the grip, below the weapon hand
  armL?: J3; // else the off arm (x: − raises forward; z: + out to the side)
  elbowL?: number;
  legR?: readonly [number, number]; // from the vertical: x (− forward), z
  legL?: readonly [number, number];
}

export type HeavyAnim = 'cleave' | 'wheel' | 'lunge' | 'whirl';
const TAU = Math.PI * 2;

/** At rest: the hand hangs at the side, the blade down. */
const REST: Key = { t: 0, hand: [-0.29, 0.02, 0.02], blade: [0, -1, 0.04], pole: [0, 0, -1], edge: [0, 0, 1] };

/** Both hands high behind the head, then down through the foe onto the lead foot. */
const CLEAVE: readonly Key[] = [
  { t: 0.45, drop: 0.03, body: [-0.04, 0.1, 0], torso: [-0.06, 0.12, 0], head: [0.15, -0.1], hand: [-0.08, 0.95, 0.28], blade: [0, 0.8, -0.6], pole: [-1, -0.2, 0.2], edge: [0, 0, 1], grip: true, legR: [0.12, 0], legL: [-0.16, 0] },
  { t: 0.85, drop: 0.05, body: [-0.1, 0.16, 0], torso: [-0.24, 0.16, 0], head: [0.3, -0.12], hand: [-0.06, 1.08, -0.02], blade: [0, -0.45, -0.9], pole: [-0.8, 0.3, 0.6], edge: [0, 1, 0], grip: true, legR: [0.25, 0], legL: [-0.28, 0] },
  { t: 1, drop: 0.06, body: [-0.12, 0.18, 0], torso: [-0.28, 0.18, 0], head: [0.34, -0.12], hand: [-0.06, 1.1, -0.05], blade: [0, -0.6, -0.8], pole: [-0.8, 0.3, 0.6], edge: [0, 1, 0], grip: true, legR: [0.27, 0], legL: [-0.3, 0] },
  { t: 1.3, ease: 'in', drop: 0.08, body: [0.02, 0.08, 0], torso: [0.02, 0.1, 0], head: [0.05, -0.05], hand: [-0.06, 0.92, 0.38], blade: [0, 0.85, 0.5], pole: [-1, -0.2, 0.2], edge: [0, 0.5, 1], grip: true, legR: [0.32, 0], legL: [-0.4, 0] },
  { t: 1.6, drop: 0.12, body: [0.14, -0.02, 0], torso: [0.22, 0.02, 0], head: [-0.15, 0], hand: [-0.05, 0.52, 0.52], blade: [0, -0.1, 1], pole: [-1, -0.6, 0], edge: [0, -1, 0], grip: true, legR: [0.38, 0], legL: [-0.48, 0] },
  { t: 2, ease: 'out', drop: 0.16, body: [0.2, -0.08, 0], torso: [0.34, -0.04, 0], head: [-0.32, 0.05], hand: [-0.04, 0.3, 0.48], blade: [0, -0.42, 0.9], pole: [-1, -0.3, -0.3], edge: [0, -1, -0.4], grip: true, legR: [0.4, 0], legL: [-0.5, 0] },
  { t: 2.45, drop: 0.14, body: [0.17, -0.06, 0], torso: [0.28, -0.03, 0], head: [-0.26, 0.05], hand: [-0.06, 0.32, 0.44], blade: [0, -0.38, 0.92], pole: [-1, -0.3, -0.3], edge: [0, -1, -0.4], grip: true, legR: [0.36, 0], legL: [-0.46, 0] },
];

/** Wound far round to the right, the blade swept flat across to the left with the hips turning after it. */
const FOREHAND: readonly Key[] = [
  { t: 0.5, drop: 0.07, body: [0.05, -0.35, 0], torso: [0.05, -0.45, 0], head: [0, 0.55], hand: [-0.52, 0.5, -0.12], blade: [-0.45, 0.25, -0.86], pole: [-0.2, -1, 0.3], edge: [-1, 0, 0], armL: [-1.1, -0.7, -0.3], elbowL: -1.3, legR: [0.25, 0.05], legL: [-0.3, -0.05] },
  { t: 1, drop: 0.12, body: [0.08, -0.5, 0.03], torso: [0.08, -0.6, 0], head: [0, 0.85], hand: [-0.56, 0.52, -0.22], blade: [-0.3, 0.15, -0.94], pole: [-0.2, -1, 0.3], edge: [-1, 0, 0.2], armL: [-1.25, -1.0, -0.4], elbowL: -1.4, legR: [0.35, 0.08], legL: [-0.4, -0.05] },
  { t: 1.25, ease: 'in', drop: 0.15, body: [0.12, -0.25, 0], torso: [0.1, -0.3, 0], head: [0, 0.4], hand: [-0.55, 0.5, 0.25], blade: [-0.85, 0.05, 0.5], pole: [-0.3, -1, -0.2], edge: [0.3, 0, 1], armL: [-0.9, -0.4, -0.1], elbowL: -1.0, legR: [0.38, 0.03], legL: [-0.48, 0] },
  { t: 1.55, drop: 0.18, body: [0.16, 0.05, 0], torso: [0.12, 0.08, 0], head: [0, -0.05], hand: [-0.1, 0.55, 0.56], blade: [0.1, 0, 1], pole: [-0.6, -1, 0], edge: [1, 0, 0], armL: [-0.5, 0.3, 0.5], elbowL: -0.6, legR: [0.4, 0], legL: [-0.55, 0] },
  { t: 2, ease: 'out', drop: 0.2, body: [0.15, 0.4, -0.03], torso: [0.1, 0.55, 0], head: [0, -0.8], hand: [0.36, 0.6, 0.36], blade: [0.95, 0.05, 0.3], pole: [0, -1, -0.4], edge: [0.2, 0, -1], armL: [-0.25, 0.2, 0.35], elbowL: -0.7, legR: [0.45, 0], legL: [-0.55, 0] },
  { t: 2.45, drop: 0.16, body: [0.12, 0.34, 0], torso: [0.08, 0.45, 0], head: [0, -0.65], hand: [0.3, 0.5, 0.36], blade: [0.85, -0.25, 0.45], pole: [0, -1, -0.4], edge: [0.2, 0, -1], armL: [-0.25, 0.2, 0.3], elbowL: -0.7, legR: [0.4, 0], legL: [-0.5, 0] },
];

/** Gathered back over the left shoulder, then unwound out to the right, the back of the hand leading. */
const BACKHAND: readonly Key[] = [
  { t: 0.5, drop: 0.07, body: [0.05, 0.35, 0], torso: [0.05, 0.45, 0], head: [0, -0.55], hand: [0.12, 0.62, 0.24], blade: [0.35, 0.45, -0.82], pole: [-0.3, -1, 0.5], edge: [1, 0, 0], armL: [-0.35, 0.1, 0.12], elbowL: -1.2, legR: [-0.25, 0.05], legL: [0.25, -0.05] },
  { t: 1, drop: 0.12, body: [0.08, 0.5, -0.03], torso: [0.1, 0.62, 0], head: [0, -0.85], hand: [0.16, 0.66, 0.2], blade: [0.3, 0.3, -0.9], pole: [-0.3, -1, 0.5], edge: [1, 0, 0.2], armL: [-0.45, 0.15, 0.1], elbowL: -1.35, legR: [-0.38, 0.05], legL: [0.35, -0.05] },
  { t: 1.25, ease: 'in', drop: 0.15, body: [0.12, 0.25, 0], torso: [0.1, 0.3, 0], head: [0, -0.4], hand: [0.1, 0.58, 0.42], blade: [0.8, 0.1, 0.6], pole: [-0.4, -1, 0], edge: [-0.3, 0, 1], armL: [-0.4, 0, -0.2], elbowL: -1.0, legR: [-0.48, 0], legL: [0.38, 0] },
  { t: 1.55, drop: 0.18, body: [0.16, -0.05, 0], torso: [0.12, -0.08, 0], head: [0, 0.05], hand: [-0.2, 0.55, 0.52], blade: [-0.15, 0, 1], pole: [-0.7, -1, 0], edge: [-1, 0, 0], armL: [-0.4, -0.2, -0.6], elbowL: -0.5, legR: [-0.55, 0], legL: [0.4, 0] },
  { t: 2, ease: 'out', drop: 0.2, body: [0.14, -0.4, 0.03], torso: [0.1, -0.55, 0], head: [0, 0.8], hand: [-0.62, 0.52, 0.16], blade: [-0.96, 0, -0.2], pole: [0, -1, -0.4], edge: [-0.2, 0, -1], armL: [-0.2, -0.3, -1.0], elbowL: -0.3, legR: [-0.58, 0], legL: [0.45, 0] },
  { t: 2.45, drop: 0.16, body: [0.1, -0.34, 0], torso: [0.08, -0.45, 0], head: [0, 0.65], hand: [-0.55, 0.4, 0.2], blade: [-0.85, -0.4, 0.2], pole: [0, -1, -0.4], edge: [-0.2, 0, -1], armL: [-0.25, -0.2, -0.8], elbowL: -0.4, legR: [-0.52, 0], legL: [0.4, 0] },
];

/** Side on, the blade drawn back level at the chest, then driven out full length on a deep lunge; the off arm thrown back. */
const LUNGE: readonly Key[] = [
  { t: 0.55, drop: 0.08, body: [0, 0.45, 0], torso: [0.02, 0.25, 0], head: [0, -0.65], hand: [-0.2, 0.5, -0.14], blade: [0.05, 0.05, 1], pole: [-0.4, -0.3, -1], edge: [-1, 0, 0], armL: [-1.7, 0.2, 0.9], elbowL: -1.3, legR: [-0.25, 0], legL: [0.25, 0] },
  { t: 1, drop: 0.14, body: [-0.04, 0.55, 0], torso: [-0.02, 0.3, 0], head: [0.05, -0.8], hand: [-0.16, 0.52, -0.2], blade: [0.05, 0.06, 1], pole: [-0.4, -0.3, -1], edge: [-1, 0, 0], armL: [-2.2, 0.2, 1.0], elbowL: -1.5, legR: [-0.35, 0], legL: [0.3, 0] },
  { t: 1.4, ease: 'in', drop: 0.26, body: [0.24, 0.45, 0], torso: [0.1, 0.25, 0], head: [-0.2, -0.65], hand: [-0.05, 0.56, 0.62], blade: [0, 0.02, 1], pole: [-0.6, -1, 0], edge: [-1, 0, 0], armL: [0.75, 0.1, 0.5], elbowL: -0.2, legR: [-0.9, 0], legL: [0.6, 0] },
  { t: 2, drop: 0.28, body: [0.26, 0.45, 0], torso: [0.12, 0.25, 0], head: [-0.22, -0.65], hand: [-0.04, 0.56, 0.64], blade: [0, 0.02, 1], pole: [-0.6, -1, 0], edge: [-1, 0, 0], armL: [0.8, 0.1, 0.55], elbowL: -0.15, legR: [-0.95, 0], legL: [0.62, 0] },
  { t: 2.5, drop: 0.2, body: [0.15, 0.35, 0], torso: [0.06, 0.2, 0], head: [-0.12, -0.5], hand: [-0.12, 0.45, 0.4], blade: [0, -0.2, 1], pole: [-0.6, -1, 0], edge: [-1, 0, 0], armL: [0.3, 0.1, 0.4], elbowL: -0.4, legR: [-0.65, 0], legL: [0.42, 0] },
];

/** Crouched and coiled, then a full turn on the balls of the feet with the blade held out at the shoulder (the torso's frame). */
function whirl(dir: 1 | -1): Key[] {
  // Written turning left (the arc from the right across to the left); mirrored for the other way.
  const k: Key[] = [
    { t: 0.5, drop: 0.1, body: [0.1, -0.5, 0], torso: [0.1, -0.4, 0], head: [0, 0.75], hand: [-0.2, 0.3, -0.15], blade: [-0.3, 0.2, -0.93], pole: [-0.5, -1, 0.3], edge: [-1, 0, 0], armL: [-1.1, -0.9, -0.4], elbowL: -1.4, legR: [0.3, 0.1], legL: [-0.3, -0.1] },
    { t: 1, drop: 0.2, body: [0.15, -0.8, 0], torso: [0.12, -0.55, 0], head: [0, 1.1], hand: [-0.25, 0.3, -0.2], blade: [-0.2, 0.1, -0.97], pole: [-0.5, -1, 0.3], edge: [-1, 0, 0], armL: [-1.2, -1.2, -0.5], elbowL: -1.6, legR: [0.4, 0.1], legL: [-0.4, -0.1] },
    { t: 1.35, ease: 'in', drop: 0.2, body: [0.14, 0.6, 0], torso: [0.08, 0.1, 0], head: [0, -0.2], hand: [-0.8, 0.55, 0.12], blade: [-0.92, 0.02, 0.4], pole: [0, -1, -0.3], edge: [0.3, 0, 1], armL: [-0.55, 0.3, 0.45], elbowL: -1.2, legR: [0.35, 0.12], legL: [-0.35, -0.12] },
    { t: 2, drop: 0.22, body: [0.12, TAU - 0.2, 0], torso: [0.08, 0.2, 0], head: [0, -0.35], hand: [-0.78, 0.55, 0.2], blade: [-0.85, 0.02, 0.52], pole: [0, -1, -0.3], edge: [0.4, 0, 1], armL: [-0.55, 0.3, 0.5], elbowL: -1.2, legR: [0.35, 0.12], legL: [-0.35, -0.12] },
    { t: 2.5, ease: 'out', drop: 0.14, body: [0.08, TAU + 0.12, 0], torso: [0.05, 0.25, 0], head: [0, -0.3], hand: [-0.2, 0.42, 0.45], blade: [0.5, -0.1, 0.86], pole: [-0.6, -1, 0], edge: [1, 0, 0], armL: [-0.3, 0.3, 0.6], elbowL: -0.6, legR: [0.3, 0], legL: [-0.35, 0] },
    { ...REST, t: 3, body: [0, TAU, 0] },
  ];
  if (dir > 0) return k;
  const m = (j?: J3): J3 | undefined => j && [j[0], -j[1], -j[2]];
  const flip = (v?: Vec): Vec | undefined => v && [-v[0], v[1], v[2]];
  const own = (v?: Vec): Vec | undefined => v && [v[0] < -0.3 ? v[0] : -v[0] - 0.58, v[1], v[2]]; // the right hand swings out on its own side still
  return k.map((x) =>
    x.t >= 3
      ? { ...x, body: m(x.body) }
      : { ...x, body: m(x.body), torso: m(x.torso), head: x.head && [x.head[0], -x.head[1]], hand: own(x.hand), blade: flip(x.blade), edge: flip(x.edge), armL: m(x.armL), legR: x.legR && [x.legR[0], -x.legR[1]], legL: x.legL && [x.legL[0], -x.legL[1]] },
  );
}
const WHIRL_LEFT = whirl(1);
const WHIRL_RIGHT = whirl(-1);

/** The keys for a heavy blow, its arc deciding which way a sweep goes (+ = the attacker's right). */
export function heavyKeys(anim: HeavyAnim, arc: readonly [number, number]): readonly Key[] {
  const leftward = arc[1] < arc[0]; // from the right across to the left
  switch (anim) {
    case 'cleave':
      return CLEAVE;
    case 'wheel':
      return leftward ? FOREHAND : BACKHAND;
    case 'lunge':
      return LUNGE;
    case 'whirl':
      return leftward ? WHIRL_LEFT : WHIRL_RIGHT;
  }
}

/** Where a move is along its keys' time (0..3) at a (fractional) frame. */
export function heavyTime(d: MoveDef, frame: number): number {
  const [w0, w1] = d.hit!.window;
  if (frame < w0) return frame / Math.max(1, w0);
  if (frame < w1) return 1 + (frame - w0) / Math.max(1, w1 - w0);
  return Math.min(3, 2 + (frame - w1) / Math.max(1, d.frames - w1));
}

const shape = (e: Ease | undefined, u: number): number => {
  const c = Math.min(1, Math.max(0, u));
  return e === 'in' ? c * c * (2 - c) : e === 'out' ? 1 - (1 - c) ** 3 : c * c * (3 - 2 * c);
};

/** The two keys about `t` and how far between them. */
function between(keys: readonly Key[], t: number): [Key, Key, number] {
  let a = REST;
  for (const b of [...keys, { ...REST, t: 3 }]) {
    if (t <= b.t) return [a, b, shape(b.ease, (t - a.t) / Math.max(1e-6, b.t - a.t))];
    a = b;
  }
  return [a, a, 0];
}

const mix = (a: number | undefined, b: number | undefined, u: number): number => (a ?? 0) + ((b ?? 0) - (a ?? 0)) * u;
const mixV = (a: Vec | undefined, b: Vec | undefined, fb: Vec, u: number): [number, number, number] => {
  const [p, q] = [a ?? fb, b ?? fb];
  return [mix(p[0], q[0], u), mix(p[1], q[1], u), mix(p[2], q[2], u)];
};
/** `v` (in the facing frame) turned into the torso's, which is turned `yaw` from it. */
const unturn = ([x, y, z]: Vec, yaw: number): Vec => [x * Math.cos(yaw) - z * Math.sin(yaw), y, x * Math.sin(yaw) + z * Math.cos(yaw)];

/** Poses the figure for a heavy blow at a (fractional) frame. */
export function heavySwing(f: Figure, d: MoveDef, anim: HeavyAnim, frame: number): void {
  const [a, b, u] = between(heavyKeys(anim, d.hit!.arc), heavyTime(d, frame));
  const j3 = (k: 'body' | 'torso' | 'armL'): [number, number, number] => mixV(a[k], b[k], [0, 0, 0], u);
  const [bx, by, bz] = j3('body');
  f.body.rotation.set(f.body.rotation.x + bx, by, bz, 'YXZ');
  const drop = mix(a.drop, b.drop, u);
  f.body.position.y -= drop;
  const [tx, ty, tz] = j3('torso');
  f.torso.rotation.set(tx, ty, tz, 'YXZ');
  f.head.rotation.x += mix(a.head?.[0], b.head?.[0], u);
  f.head.rotation.y = mix(a.head?.[1], b.head?.[1], u);

  // The weapon hand where the keys put it; the facing frame's points turned into the torso's.
  const yaw = anim === 'whirl' ? 0 : by + ty;
  const v = (k: 'hand' | 'blade' | 'pole' | 'edge'): Vec => unturn(mixV(a[k], b[k], REST[k]!, u), yaw);
  const [hand, blade] = [v('hand'), v('blade')];
  reach({ arm: f.armR, elbow: f.elbowR, hand: f.handR, upper: -f.elbowR.position.y, fore: -f.handR.position.y }, hand, blade, v('pole'), v('edge'));
  const grip = (a.grip ? 1 - u : 0) + (b.grip ? u : 0); // the off hand comes to the grip and leaves it
  if (grip > 0.5) {
    const len = Math.hypot(...blade) || 1;
    const at: Vec = [hand[0] - (blade[0] / len) * 0.11, hand[1] - (blade[1] / len) * 0.11, hand[2] - (blade[2] / len) * 0.11];
    const pole = v('pole');
    reach({ arm: f.armL, elbow: f.elbowL, hand: f.handL, upper: -f.elbowL.position.y, fore: -f.handL.position.y }, at, blade, [-pole[0], pole[1], pole[2]], v('edge'));
  } else {
    const [lx, ly, lz] = j3('armL');
    f.armL.rotation.set(lx, ly, lz, 'YXZ');
    f.elbowL.rotation.x = mix(a.elbowL, b.elbowL, u);
  }

  const lean = f.body.rotation.x;
  const [rx, lx] = [mix(a.legR?.[0], b.legR?.[0], u), mix(a.legL?.[0], b.legL?.[0], u)];
  f.legR.rotation.set(rx - lean, 0, mix(a.legR?.[1], b.legR?.[1], u), 'YXZ');
  f.legL.rotation.set(lx - lean, 0, mix(a.legL?.[1], b.legL?.[1], u), 'YXZ');
  // Legs apart, the pelvis must come down to keep both feet on the ground (settle bends the knees).
  f.body.position.y -= Math.max(0, (f.thigh + f.shin) * (1 - Math.cos(Math.max(Math.abs(rx), Math.abs(lx)))) * 0.8 - drop);
}
