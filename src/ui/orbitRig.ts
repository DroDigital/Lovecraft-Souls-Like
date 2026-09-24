/**
 * Debug orbit camera for the look test: auto-orbits while its radius breathes (so the
 * anomaly's proximity changes), drag to rotate, wheel to zoom, O toggles the auto-orbit.
 */

import { ORBIT, type Vec3 } from '../data/tuning';

export interface OrbitRig {
  step(dt: number): void;
  /** Camera position interpolated between the last two sim steps. */
  position(alpha: number): Vec3;
  readonly target: Vec3;
}

const clamp = (x: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, x));

export function createOrbitRig(el: HTMLElement): OrbitRig {
  let yaw = 0.6;
  let phase = ORBIT.radiusPeriod * 0.25; // start mid-radius
  let prevYaw = yaw;
  let prevPhase = phase;
  let pitch = ORBIT.pitch;
  let zoom = 1;
  let auto = true;
  let dragging = false;

  el.addEventListener('pointerdown', (e) => {
    dragging = true;
    el.setPointerCapture(e.pointerId);
  });
  el.addEventListener('pointerup', () => (dragging = false));
  el.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    const dy = -e.movementX * ORBIT.dragSensitivity;
    yaw += dy;
    prevYaw += dy;
    pitch = clamp(pitch + e.movementY * ORBIT.dragSensitivity, ORBIT.pitchMin, ORBIT.pitchMax);
  });
  el.addEventListener(
    'wheel',
    (e) => {
      e.preventDefault();
      zoom = clamp(zoom * Math.exp(e.deltaY * ORBIT.zoomSensitivity), ORBIT.zoomMin, ORBIT.zoomMax);
    },
    { passive: false },
  );
  addEventListener('keydown', (e) => {
    if (e.key === 'o' || e.key === 'O') auto = !auto;
  });

  return {
    target: ORBIT.target,
    step(dt) {
      prevYaw = yaw;
      prevPhase = phase;
      if (!auto) return;
      yaw += ORBIT.yawSpeed * dt;
      phase += dt;
    },
    position(alpha) {
      const y = prevYaw + (yaw - prevYaw) * alpha;
      const p = prevPhase + (phase - prevPhase) * alpha;
      const [r0, r1] = ORBIT.radius;
      const r = zoom * (r0 + (r1 - r0) * (0.5 - 0.5 * Math.cos((Math.PI * 2 * p) / ORBIT.radiusPeriod)));
      const [tx, ty, tz] = ORBIT.target;
      const flat = Math.cos(pitch) * r;
      return [tx + Math.sin(y) * flat, ty + Math.sin(pitch) * r, tz + Math.cos(y) * flat];
    },
  };
}
