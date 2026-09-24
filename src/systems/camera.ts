/**
 * Third-person camera (spec §3B), simulated at 60 Hz: orbits a pivot above the player from look
 * input, swings toward the lock-on target, and pulls in when the boom hits a collider or the
 * ground (then eases back out). The boom hangs slightly over the right shoulder. Pure: the renderer
 * applies it to a Three.js camera.
 */

import { clamp, wrapAngle, yawOf, type V3 } from '../core/geom';
import { CAMERA } from '../data/tuning';
import { raycast, type CollisionWorld } from '../world/colliders';

export interface CameraRig {
  yaw: number; // the direction the camera looks (0 = +z)
  pitch: number; // positive looks down from above
  dist: number; // boom length after collision
  prevYaw: number;
  prevPitch: number;
  prevDist: number;
  pos: V3; // lens position after the last step
  recenter: number; // frames left swinging behind the player
}

export interface CameraInput {
  lookX: number;
  lookY: number;
  pivot: V3;
  focus: V3 | null; // lock-on aim point
  behind: number; // the player's yaw, for recentring
}

export function createCameraRig(yaw: number): CameraRig {
  const { pitch, distance } = CAMERA;
  return { yaw, pitch, dist: distance, prevYaw: yaw, prevPitch: pitch, prevDist: distance, pos: { x: 0, y: 0, z: 0 }, recenter: 0 };
}

/** Unit vector from the pivot toward the lens. */
export function boomDir(yaw: number, pitch: number): V3 {
  return { x: -Math.sin(yaw) * Math.cos(pitch), y: Math.sin(pitch), z: -Math.cos(yaw) * Math.cos(pitch) };
}

/** The point the boom hangs from: the pivot moved over the player's right shoulder, short of any wall. */
export function shoulderPoint(w: CollisionWorld, pivot: V3, yaw: number): V3 {
  const rx = -Math.cos(yaw);
  const rz = Math.sin(yaw);
  const reach = CAMERA.shoulder + CAMERA.margin;
  const end = { x: pivot.x + rx * reach, y: pivot.y, z: pivot.z + rz * reach };
  const k = clamp(raycast(w, pivot, end) * reach - CAMERA.margin, 0, CAMERA.shoulder);
  return { x: pivot.x + rx * k, y: pivot.y, z: pivot.z + rz * k };
}

/** Lens position for a boom hanging from `base`, kept above the ground. */
export function lensPosition(w: CollisionWorld, base: V3, yaw: number, pitch: number, dist: number): V3 {
  const d = boomDir(yaw, pitch);
  const p = { x: base.x + d.x * dist, y: base.y + d.y * dist, z: base.z + d.z * dist };
  p.y = Math.max(p.y, w.ground(p.x, p.z) + CAMERA.clearance);
  return p;
}

export function stepCamera(rig: CameraRig, inp: CameraInput, w: CollisionWorld, dt: number): void {
  rig.prevYaw = rig.yaw;
  rig.prevPitch = rig.pitch;
  rig.prevDist = rig.dist;
  const k = Math.min(1, CAMERA.follow * dt);
  if (inp.focus) {
    const dx = inp.focus.x - inp.pivot.x;
    const dz = inp.focus.z - inp.pivot.z;
    rig.yaw = wrapAngle(rig.yaw + wrapAngle(yawOf(dx, dz) - rig.yaw) * k);
    const want = CAMERA.lockPitch + Math.atan2(inp.pivot.y - inp.focus.y + CAMERA.lockLift, Math.max(1, Math.hypot(dx, dz)));
    rig.pitch += (clamp(want, CAMERA.pitchMin, CAMERA.pitchMax) - rig.pitch) * k;
    rig.recenter = 0;
  } else if (rig.recenter > 0) {
    rig.recenter--;
    rig.yaw = wrapAngle(rig.yaw + wrapAngle(inp.behind - rig.yaw) * k);
    rig.pitch += (CAMERA.pitch - rig.pitch) * k;
  } else {
    rig.yaw = wrapAngle(rig.yaw - inp.lookX);
    rig.pitch = clamp(rig.pitch + inp.lookY, CAMERA.pitchMin, CAMERA.pitchMax);
  }
  const base = shoulderPoint(w, inp.pivot, rig.yaw);
  const d = boomDir(rig.yaw, rig.pitch);
  const reach = CAMERA.distance + CAMERA.margin;
  const end = { x: base.x + d.x * reach, y: base.y + d.y * reach, z: base.z + d.z * reach };
  const allowed = Math.max(CAMERA.minDistance, raycast(w, base, end) * reach - CAMERA.margin);
  rig.dist = allowed < rig.dist ? allowed : Math.min(allowed, rig.dist + CAMERA.easeOut * dt);
  rig.pos = lensPosition(w, base, rig.yaw, rig.pitch, rig.dist);
}
