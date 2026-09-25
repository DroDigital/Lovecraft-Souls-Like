/**
 * Procedural animation (spec §3B: tweened primitives, no skeletal assets). Every joint angle is a
 * function of the current move's data (hit arc and windows, motion, parry, shot) and its progress,
 * plus a stride from ground speed (gait.ts); reactions (stagger, guard break, parried, death) are
 * tweens. Joints use 'YXZ' order: z swings sideways, x pitches forward (negative raises an arm or a
 * thigh; positive bends a knee back), y turns. Every pose ends settled on the ground (gait.ts).
 */

import type { MoveDef } from '../data/moves';
import type { Figure } from './figures';
import { settle, stride, type Ground } from './gait';
import { swing } from './swings';

export interface PoseInput {
  move: string | null;
  def: MoveDef | undefined;
  frame: number; // fractional, interpolated between sim steps
  speed: number; // horizontal m/s
  stride: number; // stride phase, radians (gait.ts): the right heel strikes at 0
  guard: boolean;
  flinch: number; // 1 right after a hit, fading to 0
  rollYaw: number; // roll direction relative to facing
  time: number;
  ground?: Ground; // the lie of the land about the feet (flat when absent)
}

const clamp01 = (t: number): number => Math.min(1, Math.max(0, t));
const ease = (t: number): number => {
  const c = clamp01(t);
  return c * c * (3 - 2 * c);
};
const bump = (t: number): number => Math.sin(Math.PI * clamp01(t)); // 0 → 1 → 0

function rest(f: Figure): void {
  f.body.position.set(0, f.hip, 0);
  f.body.rotation.set(f.hunch, 0, 0, 'YXZ');
  for (const j of [f.torso, f.head, f.armR, f.armL, f.elbowR, f.elbowL, f.handR, f.handL, f.legR, f.legL, f.kneeR, f.kneeL, f.footR, f.footL, ...f.skirt]) j.rotation.set(0, 0, 0, 'YXZ');
  f.head.rotation.x = -f.hunch * 0.8; // keep a hunched head looking ahead
  if (f.flash) f.flash.visible = false;
}

/**
 * A dodge roll: a short dive, a tucked somersault along the roll direction (knees to chest, arms
 * wrapped, head down, the body low), then coming up through a crouch.
 */
function roll(f: Figure, d: MoveDef, p: PoseInput): void {
  const [m0, m1] = d.motion!.window;
  const t = (p.frame - m0) / (m1 - m0); // 0..1 over the travel, beyond 1 while recovering
  const dive = bump(t / 0.3);
  const spin = ease((t - 0.1) / 0.72);
  const tuck = bump((t - 0.04) / 0.86);
  const crouch = bump((t - 0.78) / 0.7);
  f.body.rotation.set(0.55 * dive * (1 - spin) + Math.PI * 2 * spin, p.rollYaw, 0.1 * tuck, 'YXZ');
  f.body.position.y = f.hip * (1 - 0.52 * tuck - 0.12 * crouch);
  f.torso.rotation.x = 0.95 * tuck + 0.35 * crouch;
  f.head.rotation.x = 0.75 * tuck - 0.2 * crouch;
  f.legR.rotation.x = -2.1 * tuck - 0.5 * crouch; // the lead foot comes down first...
  f.legL.rotation.x = -1.8 * tuck + 0.35 * crouch; // ...the other braces behind
  f.kneeR.rotation.x = 2.2 * tuck + 0.5 * crouch; // knees to the chest
  f.kneeL.rotation.x = 2.0 * tuck + 0.9 * crouch;
  f.armR.rotation.set(-1.0 * tuck - 0.9 * dive, 0, -0.35 * tuck, 'YXZ');
  f.armL.rotation.set(-1.0 * tuck - 0.9 * dive, 0, 0.35 * tuck, 'YXZ');
  f.elbowR.rotation.x = f.elbowL.rotation.x = -1.2 * tuck; // arms wrapped about the shins
}

function backstep(f: Figure, t: number): void {
  const b = bump(t);
  f.body.rotation.x -= 0.35 * b;
  f.body.position.y -= 0.06 * b;
  f.legR.rotation.x = -0.5 * b;
  f.legL.rotation.x = 0.3 * b;
  f.kneeL.rotation.x = 0.5 * b; // the back foot takes the weight
  f.armR.rotation.x = f.armL.rotation.x = -0.4 * b;
  f.elbowR.rotation.x = f.elbowL.rotation.x = -0.5 * b;
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

/** A shot of West's Reagent: the off-hand brings the syringe to the side of the neck, the head tips away. */
function inject(f: Figure, d: MoveDef, frame: number): void {
  const at = d.item!;
  const t = frame < at ? ease(frame / (at - 6)) : 1 - ease((frame - at - 8) / Math.max(1, d.frames - at - 16));
  f.armL.rotation.set(-2.5 * t, -0.9 * t, 0.2 * t, 'YXZ');
  f.head.rotation.z = -0.35 * t;
  f.torso.rotation.x = 0.12 * t * clamp01((frame - at + 4) / 6); // it stings
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
  f.body.position.y -= 0.05 * k * b;
  f.head.rotation.x -= 0.3 * b;
  f.armR.rotation.set(-0.5 * k * b, 0, -0.6 * k * b, 'YXZ');
  f.armL.rotation.set(-0.5 * k * b, 0, 0.6 * k * b, 'YXZ');
  f.elbowR.rotation.x = f.elbowL.rotation.x = -0.5 * b;
  f.legR.rotation.x = -0.35 * b;
  f.kneeL.rotation.x = 0.4 * b;
}

/** Parried or interrupted: sinks to one knee, open to a riposte. */
function slump(f: Figure, frame: number): void {
  const t = ease(frame / 10);
  f.body.position.y -= 0.28 * t;
  f.body.rotation.x += 0.45 * t;
  f.head.rotation.x += 0.4 * t;
  f.legR.rotation.x = -0.9 * t;
  f.legL.rotation.x = 0.25 * t;
  f.kneeR.rotation.x = 1.1 * t;
  f.kneeL.rotation.x = 1.4 * t; // down on the back knee
  f.armR.rotation.x = f.armL.rotation.x = 0.2 * t;
  f.elbowR.rotation.x = f.elbowL.rotation.x = -0.4 * t;
}

function fall(f: Figure, frame: number): void {
  const t = ease(frame / 30);
  f.body.rotation.x = f.hunch * (1 - t) - (Math.PI / 2) * t;
  f.body.position.y = f.hip - (f.hip - 0.18) * t;
  f.armR.rotation.z = -0.8 * t;
  f.armL.rotation.z = 0.8 * t;
  f.kneeR.rotation.x = 0.7 * t; // one knee drawn up
  f.legR.rotation.x = -0.5 * t;
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
  if (!d || p.move === null) stride(f, p.speed, p.stride, p.time, p.guard);
  else if (p.move === 'death') fall(f, p.frame);
  else if (p.move === 'stagger' || p.move === 'guardBreak') reel(f, p.frame / d.frames, p.move === 'guardBreak' ? 1.6 : 1);
  else if (p.move === 'parried') slump(f, p.frame);
  else if (d.hit) swing(f, d, p.frame);
  else if (d.motion?.dir === 'input') roll(f, d, p);
  else if (d.motion?.dir === 'back') backstep(f, p.frame / d.frames);
  else if (d.parry) parry(f, d, p.frame);
  else if (d.shot) aim(f, d, p.frame);
  else if (d.item !== undefined) (d.use === 'reagent' ? inject : drink)(f, d, p.frame);
  f.body.rotation.x -= 0.18 * p.flinch;
  f.head.rotation.x -= 0.25 * p.flinch;
  settle(f, p.ground);
}
