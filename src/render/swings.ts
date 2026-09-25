/**
 * Weapon swings (procedural, no keyframes): each blow of a chain moves differently. A slash sweeps
 * flat across, a backhand rises from across the body, a thrust lunges straight in, an overhead cleave
 * comes down from above the head, a spin turns the whole body with the arm out. Every swing winds up
 * before its active frames, strikes through them, and recovers after. Joints use 'YXZ' order.
 */

import type { MoveDef } from '../data/moves';
import type { Figure } from './figures';

const DEG = Math.PI / 180;
const UP = Math.PI / 2; // arm straight ahead
const clamp01 = (t: number): number => Math.min(1, Math.max(0, t));
const ease = (t: number): number => {
  const c = clamp01(t);
  return c * c * (3 - 2 * c);
};
const bump = (t: number): number => Math.sin(Math.PI * clamp01(t));

/** Progress through a swing: `wind` 0→1 before the strike, `strike` 0→1 through it, `back` 1→0 during recovery. */
interface Phase {
  wind: number;
  strike: number;
  back: number;
  hit: boolean; // inside the active frames
}

function phase(d: MoveDef, frame: number): Phase {
  const [w0, w1] = d.hit!.window;
  if (frame < w0) return { wind: ease(frame / w0), strike: 0, back: 1, hit: false };
  if (frame < w1) return { wind: 1, strike: (frame - w0) / (w1 - w0), back: 1, hit: true };
  return { wind: 1, strike: 1, back: 1 - ease((frame - w1) / Math.max(1, d.frames - w1)), hit: false };
}

/** A stance for the legs: the lead foot forward, the back foot braced; `k` 0..1. */
function stance(f: Figure, k: number, lead = 0.35, rear = -0.3): void {
  f.legR.rotation.x = -lead * k;
  f.legL.rotation.x = -rear * k;
}

/** The arc's sweep, with a wind-up past its start. */
function slash(f: Figure, d: MoveDef, p: Phase, rising: number): void {
  const [a0, a1] = [d.hit!.arc[0] * DEG, d.hit!.arc[1] * DEG];
  const back = a0 + (a0 - a1) * 0.3;
  let yaw: number;
  let pitch: number;
  if (!p.hit && p.strike === 0) [yaw, pitch] = [back * p.wind, (UP + 0.3 - rising) * p.wind];
  else if (p.hit) [yaw, pitch] = [back + (a1 - back) * p.strike, UP + 0.3 - rising + 2 * rising * p.strike];
  else [yaw, pitch] = [a1 * p.back, (UP + rising) * p.back];
  f.armR.rotation.set(-pitch, -yaw, rising * 0.8 * p.back, 'YXZ');
  f.torso.rotation.y = -yaw * 0.45;
  f.torso.rotation.z = rising * 0.15 * Math.sign(a1 - a0) * p.back;
  f.armL.rotation.set(-0.5 * p.back, 0.3 * p.back, 0.4 * p.back, 'YXZ'); // the off-hand balances
  stance(f, p.back);
}

/** A lunge: the arm draws back, then drives straight in with the body behind it. */
function thrust(f: Figure, p: Phase): void {
  const drawn = p.strike === 0 && !p.hit;
  const reach = drawn ? 0 : p.hit ? ease(p.strike * 2) : p.back;
  const pitch = drawn ? 0.5 * p.wind : UP * reach;
  f.armR.rotation.set(drawn ? 0.5 * p.wind : -pitch, drawn ? -0.3 * p.wind : 0, 0, 'YXZ');
  f.torso.rotation.y = drawn ? 0.5 * p.wind : -0.15 * reach;
  f.body.rotation.x += drawn ? -0.1 * p.wind : 0.4 * reach;
  f.body.position.y -= 0.14 * (drawn ? p.wind : reach);
  f.armL.rotation.set(0.6 * reach, 0, 0.5 * reach, 'YXZ'); // flung back for balance
  stance(f, drawn ? p.wind * 0.5 : reach, 0.8, -0.6);
}

/** Both hands high above the head, then down in a diagonal chop; the knees give on impact. */
function overhead(f: Figure, p: Phase): void {
  const high = Math.PI + 0.35;
  let pitch: number;
  let yaw: number;
  let settle: number; // 0 raised, 1 at the bottom of the chop
  if (p.strike === 0 && !p.hit) [pitch, yaw, settle] = [high * p.wind, 0.35 * p.wind, 0];
  else if (p.hit) {
    const t = ease(p.strike);
    [pitch, yaw, settle] = [high + (0.35 - high) * t, 0.35 - 0.6 * t, t];
  } else [pitch, yaw, settle] = [0.35 * p.back, -0.25 * p.back, p.back];
  f.armR.rotation.set(-pitch, -yaw, 0, 'YXZ');
  f.armL.rotation.set(-pitch * 0.92, yaw * 0.5, -0.2, 'YXZ'); // two-handed
  f.torso.rotation.x = 0.35 * settle - 0.2 * (1 - settle) * p.wind;
  f.body.rotation.x += 0.3 * settle;
  f.body.position.y -= 0.18 * settle;
  stance(f, Math.max(p.wind * (1 - settle), settle), 0.5, -0.35);
}

/** The whole body turns once with the arm held out: the blade sweeps a full circle. */
function spin(f: Figure, p: Phase): void {
  const turn = p.hit ? ease(p.strike) : p.strike >= 1 ? 1 : 0;
  const coil = p.strike === 0 && !p.hit ? p.wind : 1 - turn;
  f.body.rotation.y += -Math.PI * 2 * turn + 0.6 * coil;
  f.armR.rotation.set(-UP * (p.strike === 0 && !p.hit ? p.wind : p.back), -1.4 * coil - 1.2 * (1 - coil) * p.back, 0, 'YXZ');
  f.armL.rotation.set(-0.8 * p.back, 0.6 * p.back, 0.6 * p.back, 'YXZ');
  f.body.position.y -= 0.16 * p.back * (p.strike === 0 ? p.wind : 1);
  stance(f, p.back, 0.45, -0.45);
}

/** Poses the figure for an attack move at a (fractional) frame. */
export function swing(f: Figure, d: MoveDef, frame: number): void {
  const p = phase(d, frame);
  const [a0, a1] = d.hit!.arc;
  switch (d.anim) {
    case 'backhand':
      slash(f, d, p, 0.35);
      break;
    case 'thrust':
      thrust(f, p);
      break;
    case 'overhead':
      overhead(f, p);
      break;
    case 'spin':
      spin(f, p);
      break;
    default:
      if (Math.abs(a0 - a1) < 45) thrust(f, p); // straight blows lunge
      else slash(f, d, p, 0);
  }
  const m = d.motion;
  if (m?.dir === 'facing') f.body.rotation.x += 0.2 * bump((frame - m.window[0]) / (m.window[1] - m.window[0] + 6));
}
