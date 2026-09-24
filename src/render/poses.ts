/**
 * Procedural animation (spec §3B: tweened primitives, no keyframes). Every joint angle is a
 * function of the current move's data (hit arc and windows, motion, parry, shot) and its progress,
 * plus a walk cycle from ground speed; reactions (stagger, guard break, parried, death) are tweens.
 * Joints use 'YXZ' order: z swings sideways, x pitches forward (negative raises an arm), y turns.
 */

import type { MoveDef } from '../data/moves';
import { PLAYER } from '../data/tuning';
import type { Figure } from './figures';

export interface PoseInput {
  move: string | null;
  def: MoveDef | undefined;
  frame: number; // fractional, interpolated between sim steps
  speed: number; // horizontal m/s
  stride: number; // walk-cycle phase, radians
  guard: boolean;
  flinch: number; // 1 right after a hit, fading to 0
  rollYaw: number; // roll direction relative to facing
  time: number;
}

const DEG = Math.PI / 180;
const clamp01 = (t: number): number => Math.min(1, Math.max(0, t));
const ease = (t: number): number => {
  const c = clamp01(t);
  return c * c * (3 - 2 * c);
};
const bump = (t: number): number => Math.sin(Math.PI * clamp01(t)); // 0 → 1 → 0

function rest(f: Figure): void {
  f.body.position.set(0, f.hip, 0);
  f.body.rotation.set(f.hunch, 0, 0, 'YXZ');
  for (const j of [f.torso, f.head, f.armR, f.armL, f.legR, f.legL]) j.rotation.set(0, 0, 0, 'YXZ');
  f.head.rotation.x = -f.hunch * 0.8; // keep a hunched head looking ahead
  if (f.flash) f.flash.visible = false;
}

function locomotion(f: Figure, p: PoseInput): void {
  const k = Math.min(1.5, p.speed / PLAYER.walkSpeed);
  const s = Math.sin(p.stride);
  f.legR.rotation.x = 0.6 * k * s;
  f.legL.rotation.x = -0.6 * k * s;
  f.armR.rotation.x = -0.45 * k * s;
  f.armL.rotation.x = 0.45 * k * s;
  f.body.position.y += 0.04 * k * Math.abs(Math.cos(p.stride));
  f.body.rotation.x += 0.2 * Math.max(0, k - 1); // sprint lean
  f.torso.rotation.x = 0.03 * Math.sin(p.time * 1.7); // breathing
  if (p.guard) f.armR.rotation.set(-1.25, -0.2, 0.6, 'YXZ'); // cane across the body
}

/** The weapon arm follows the hit arc: wind up past its start, sweep it during the active frames, return. */
function swing(f: Figure, d: MoveDef, frame: number): void {
  const h = d.hit!;
  const [w0, w1] = h.window;
  const a0 = h.arc[0] * DEG;
  const a1 = h.arc[1] * DEG;
  const back = a0 + (a0 - a1) * 0.25;
  const up = Math.PI / 2;
  let yaw: number;
  let pitch: number;
  if (frame < w0) {
    const t = ease(frame / w0);
    [yaw, pitch] = [back * t, (up + 0.35) * t];
  } else if (frame < w1) {
    const t = (frame - w0) / (w1 - w0);
    [yaw, pitch] = [back + (a1 - back) * t, up + 0.35 * (1 - t)];
  } else {
    const t = 1 - ease((frame - w1) / Math.max(1, d.frames - w1));
    [yaw, pitch] = [a1 * t, up * t];
  }
  f.armR.rotation.set(-pitch, -yaw, 0, 'YXZ'); // + arc = the figure's right = -x
  if (Math.abs(a0 - a1) < 0.8) f.armL.rotation.set(-pitch, yaw, 0, 'YXZ'); // thrusts and lunges use both arms
  f.torso.rotation.y = -yaw * 0.35;
  f.legR.rotation.x = 0.3;
  f.legL.rotation.x = -0.25;
  const m = d.motion;
  if (m?.dir === 'facing') f.body.rotation.x += 0.3 * bump((frame - m.window[0]) / (m.window[1] - m.window[0] + 6));
}

function roll(f: Figure, d: MoveDef, p: PoseInput): void {
  const [m0, m1] = d.motion!.window;
  const t = (p.frame - m0) / (m1 - m0);
  const tuck = bump(t);
  f.body.rotation.set(2 * Math.PI * ease(t), p.rollYaw, 0, 'YXZ');
  f.body.position.y = f.hip * (1 - 0.5 * tuck);
  f.legR.rotation.x = f.legL.rotation.x = -1.3 * tuck;
  f.armR.rotation.x = f.armL.rotation.x = -1.1 * tuck;
  f.head.rotation.x = 0.5 * tuck;
}

function backstep(f: Figure, t: number): void {
  const b = bump(t);
  f.body.rotation.x -= 0.35 * b;
  f.legR.rotation.x = -0.5 * b;
  f.legL.rotation.x = 0.3 * b;
  f.armR.rotation.x = f.armL.rotation.x = -0.4 * b;
}

/** The off-hand sweeps out across the parry window. */
function parry(f: Figure, d: MoveDef, frame: number): void {
  const [p0, p1] = d.parry!;
  const out = frame < p1 ? ease(frame / p0) : 1 - ease((frame - p1) / (d.frames - p1));
  f.armL.rotation.set(-1.3 * out, 0.4 * out, 0.9 * out, 'YXZ');
  f.torso.rotation.y = -0.3 * out;
}

/** A swallow of Laudanum: the off-hand comes up to the mouth and the head tips back, then down again. */
function drink(f: Figure, d: MoveDef, frame: number): void {
  const at = d.item!;
  const t = frame < at ? ease(frame / (at - 4)) : 1 - ease((frame - at - 6) / Math.max(1, d.frames - at - 14));
  f.armL.rotation.set(-2.2 * t, -0.7 * t, 0, 'YXZ'); // forward, up and across, so the hand is at the lips
  f.head.rotation.x -= 0.4 * clamp01((frame - at + 10) / 10) * t;
}

/** Off-hand revolver: raise, fire (muzzle flash and kick), lower. */
function aim(f: Figure, d: MoveDef, frame: number): void {
  const s = d.shot!;
  const raise = ease(frame / Math.max(1, s.frame)) * (1 - ease((frame - (d.frames - 8)) / 8));
  const kick = frame >= s.frame ? 0.45 * Math.exp(-(frame - s.frame) / 3) : 0;
  f.armL.rotation.set(-(Math.PI / 2) * raise - kick, 0, 0, 'YXZ');
  f.torso.rotation.y = -0.25 * raise;
  if (f.flash) f.flash.visible = frame >= s.frame && frame < s.frame + 2;
}

function reel(f: Figure, t: number, k: number): void {
  const b = bump(t);
  f.body.rotation.x -= 0.4 * k * b;
  f.head.rotation.x -= 0.3 * b;
  f.armR.rotation.set(-0.5 * k * b, 0, -0.6 * k * b, 'YXZ');
  f.armL.rotation.set(-0.5 * k * b, 0, 0.6 * k * b, 'YXZ');
  f.legR.rotation.x = -0.35 * b;
}

/** Parried or interrupted: sinks to one knee, open to a riposte. */
function slump(f: Figure, frame: number): void {
  const t = ease(frame / 10);
  f.body.position.y -= 0.28 * t;
  f.body.rotation.x += 0.45 * t;
  f.head.rotation.x += 0.4 * t;
  f.legR.rotation.x = -0.9 * t;
  f.legL.rotation.x = 0.4 * t;
  f.armR.rotation.x = f.armL.rotation.x = 0.2 * t;
}

function fall(f: Figure, frame: number): void {
  const t = ease(frame / 30);
  f.body.rotation.x = f.hunch * (1 - t) - (Math.PI / 2) * t;
  f.body.position.y = f.hip - (f.hip - 0.18) * t;
  f.armR.rotation.z = -0.8 * t;
  f.armL.rotation.z = 0.8 * t;
}

export function pose(f: Figure, p: PoseInput): void {
  rest(f);
  if (f.rig === 'prop') return;
  if (f.rig === 'echo') {
    f.body.position.y += 0.08 * Math.sin(p.time * 2.2);
    f.body.rotation.y = p.time * 1.6;
    return;
  }
  const d = p.def;
  if (f.rig === 'dummy') {
    const t = p.move === 'stagger' && d ? p.frame / d.frames : 1;
    f.body.rotation.x = -0.35 * Math.sin(t * Math.PI * 3) * (1 - t) - 0.1 * p.flinch * Math.sin(p.time * 40);
    return;
  }
  if (!d || p.move === null) locomotion(f, p);
  else if (p.move === 'death') fall(f, p.frame);
  else if (p.move === 'stagger' || p.move === 'guardBreak') reel(f, p.frame / d.frames, p.move === 'guardBreak' ? 1.6 : 1);
  else if (p.move === 'parried') slump(f, p.frame);
  else if (d.hit) swing(f, d, p.frame);
  else if (d.motion?.dir === 'input') roll(f, d, p);
  else if (d.motion?.dir === 'back') backstep(f, p.frame / d.frames);
  else if (d.parry) parry(f, d, p.frame);
  else if (d.shot) aim(f, d, p.frame);
  else if (d.item !== undefined) drink(f, d, p.frame);
  f.body.rotation.x -= 0.18 * p.flinch;
  f.head.rotation.x -= 0.25 * p.flinch;
}
