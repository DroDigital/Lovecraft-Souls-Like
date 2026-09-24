/**
 * Player input (spec §3B): buttons into the one-slot input buffer, the dodge button's tap/hold
 * split (a short press rolls, or backsteps with no direction; holding sprints), guard, lock-on
 * commands, and camera-relative locomotion intent (strafing while locked on). While the Great Race
 * holds the investigator's body (spec §3E control_swap), the thief's input replaces all but the look.
 */

import type { InputFrame } from '../core/input';
import { yawOf } from '../core/geom';
import { PLAYER } from '../data/tuning';
import type { Game } from './components';
import { bufferPress } from './inputBuffer';
import { possessed } from './realityTricks';
import { switchLock, toggleLock } from './lockOn';
import { canAfford } from './stamina';

const BUFFERED = ['light', 'heavy', 'parry', 'shoot', 'item'] as const;

export function playerControl(g: Game, real: InputFrame): void {
  const input = g.reality.stolen > 0 ? possessed(g, real) : real;
  const p = g.player;
  const { actor, mover, stamina, transform } = g.ecs.c;
  const a = actor.get(p.id)!;
  const m = mover.get(p.id)!;
  if (a.move === 'death') {
    Object.assign(m, { vx: 0, vz: 0, face: null });
    p.sprinting = false;
    return;
  }

  if (input.pressed.lock) toggleLock(g);
  else if (input.switchTarget !== 0) switchLock(g, input.switchTarget);

  if (input.pressed.dodge) p.dodgeHeld = 0;
  else if (p.dodgeHeld >= 0 && input.held.dodge) p.dodgeHeld++;
  if (p.dodgeHeld >= 0 && (input.released.dodge || !input.held.dodge)) {
    if (p.dodgeHeld <= PLAYER.dodgeTapFrames) bufferPress(p.buffer, 'dodge');
    p.dodgeHeld = -1;
  }
  for (const b of BUFFERED) if (input.pressed[b]) bufferPress(p.buffer, b);
  p.blockHeld = input.held.block;

  // Camera-relative stick: forward = (sin yaw, cos yaw), right = (-cos yaw, sin yaw).
  const fx = Math.sin(g.camera.yaw);
  const fz = Math.cos(g.camera.yaw);
  const wx = fx * input.moveY - fz * input.moveX;
  const wz = fz * input.moveY + fx * input.moveX;
  const len = Math.hypot(wx, wz);
  const mag = Math.min(1, len);
  p.sprinting = a.move === null && !p.blockHeld && mag > 0.1 && p.dodgeHeld > PLAYER.dodgeTapFrames && canAfford(stamina.get(p.id));
  const speed = (p.blockHeld ? PLAYER.guardSpeed : p.sprinting ? PLAYER.sprintSpeed : PLAYER.walkSpeed) * mag;
  m.vx = len > 1e-6 ? (wx / len) * speed : 0;
  m.vz = len > 1e-6 ? (wz / len) * speed : 0;

  const me = transform.get(p.id)!.pos;
  const target = g.lock.target === null ? undefined : transform.get(g.lock.target)?.pos;
  if (target && !p.sprinting) m.face = yawOf(target.x - me.x, target.z - me.z);
  else m.face = mag > 0.1 ? yawOf(wx, wz) : null;
}
