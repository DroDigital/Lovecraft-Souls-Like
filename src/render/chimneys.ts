/**
 * Chimney smoke (round 34: the town's houses stood cold, windows lit and not a wisp over any roof): each
 * chimney a chunk's houses stand with (houseMesh.ts reports their tops, propMeshes.ts the chunk's) sends
 * up a thin grey smoke that the wind leans over and spreads, while the night keeps its windows lit and
 * dies down as they go out (systems/clock.ts `windowShare`). Not every hearth is lit. Within sight only.
 * Render only.
 */

import type * as THREE from 'three';
import { phaseOf, windowShare } from '../systems/clock';
import type { Rgb } from './palette';
import type { Particles } from './particles';
import { worldUniforms } from './worldMaterial';

export interface Top {
  x: number;
  y: number;
  z: number;
}

const tops = new Map<number, readonly Top[]>();

/** The chimneys the streamed chunks stand with: worldScene.ts reports a chunk's when it is built and takes them back when it goes. */
export const chimneyTops = {
  add(key: number, list: readonly Top[]): void {
    if (list.length) tops.set(key, list);
  },
  remove(key: number): void {
    tops.delete(key);
  },
};

const REACH = 70; // metres: farther than this the smoke is not made (the skyline's own towns have theirs lit as windows)
const RATE = 1.3; // puffs a second from a chimney that is lit, at the night's beginning
const SMOKE: Rgb = [0.62, 0.64, 0.7];

/** Whether the hearth under a chimney is lit at all: most are. */
export const hearthLit = (t: Top): boolean => Math.abs(Math.sin(t.x * 12.9898 + t.z * 78.233)) % 1 < 0.78;

export interface Chimneys {
  update(camera: THREE.Camera, time: number, hidden: boolean): void;
}

export function createChimneys(particles: Particles): Chimneys {
  let last = -1;
  return {
    update(camera, time, hidden) {
      const dt = last < 0 ? 0 : Math.min(0.1, Math.max(0, time - last));
      last = time;
      if (hidden || dt <= 0) return;
      const share = windowShare(phaseOf(time));
      const wind = 0.5 + 0.3 * worldUniforms.uWind.value; // the stronger the wind, the flatter the smoke lies
      const eye = camera.position;
      for (const list of tops.values()) {
        for (const t of list) {
          if (Math.hypot(t.x - eye.x, t.z - eye.z) > REACH || !hearthLit(t) || Math.random() > RATE * share * dt) continue;
          particles.spawn({
            x: t.x + (Math.random() - 0.5) * 0.3, y: t.y + 0.15, z: t.z + (Math.random() - 0.5) * 0.3,
            vx: wind * (0.55 + 0.3 * Math.random()), vy: 0.75 + 0.5 * Math.random(), vz: wind * 0.25 * (Math.random() - 0.3),
            life: 5 + 2.5 * Math.random(), size: 0.4, grow: 5.5, color: SMOKE, alpha: 0.5, drag: 0.22,
          });
        }
      }
    },
  };
}
