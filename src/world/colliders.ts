/**
 * Static collision (spec §1: no physics engine): box and vertical-cylinder colliders over a
 * heightfield, inside a round walkable area. Kinematic capsule push-out and ray casts. Pure.
 */

import { clamp, segmentBox, segmentCylinder, type V3 } from '../core/geom';
import type { HeightFn } from './heightfield';

export interface BoxCollider {
  kind: 'box';
  min: V3;
  max: V3;
}

export interface CylinderCollider {
  kind: 'cylinder';
  x: number;
  z: number;
  radius: number;
  y0: number;
  y1: number;
}

export type Collider = BoxCollider | CylinderCollider;

export interface CollisionWorld {
  colliders: readonly Collider[];
  ground: HeightFn;
  /** Walkable radius around the origin. */
  radius: number;
}

const GROUND_STEPS = 12;

/** Pushes a standing capsule (feet at `pos`, radius `r`, height `h`) out of every collider and back inside the arena. */
export function resolveCapsule(w: CollisionWorld, pos: V3, r: number, h: number): void {
  for (const c of w.colliders) {
    if (c.kind === 'box') {
      if (pos.y + h <= c.min.y || pos.y >= c.max.y) continue;
      const dx = pos.x - clamp(pos.x, c.min.x, c.max.x);
      const dz = pos.z - clamp(pos.z, c.min.z, c.max.z);
      const d = Math.hypot(dx, dz);
      if (d >= r) continue;
      if (d > 1e-6) {
        pos.x += (dx / d) * (r - d);
        pos.z += (dz / d) * (r - d);
        continue;
      }
      // Centre inside the footprint: leave through the nearest face.
      const exits = [pos.x - c.min.x, c.max.x - pos.x, pos.z - c.min.z, c.max.z - pos.z];
      const i = exits.indexOf(Math.min(...exits));
      if (i === 0) pos.x = c.min.x - r;
      else if (i === 1) pos.x = c.max.x + r;
      else if (i === 2) pos.z = c.min.z - r;
      else pos.z = c.max.z + r;
    } else {
      if (pos.y + h <= c.y0 || pos.y >= c.y1) continue;
      const dx = pos.x - c.x;
      const dz = pos.z - c.z;
      const d = Math.hypot(dx, dz);
      const min = r + c.radius;
      if (d >= min) continue;
      if (d > 1e-6) {
        pos.x = c.x + (dx / d) * min;
        pos.z = c.z + (dz / d) * min;
      } else {
        pos.x = c.x + min;
      }
    }
  }
  const d = Math.hypot(pos.x, pos.z);
  const max = w.radius - r;
  if (d > max) {
    pos.x *= max / d;
    pos.z *= max / d;
  }
}

/** Fraction along from → to where the first obstacle (collider or ground) starts; 1 when the path is clear. */
export function raycast(w: CollisionWorld, from: V3, to: V3): number {
  const d = { x: to.x - from.x, y: to.y - from.y, z: to.z - from.z };
  let t = 1;
  for (const c of w.colliders) {
    const hit =
      c.kind === 'box'
        ? segmentBox(from, d, c.min, c.max)
        : segmentCylinder(from, d, c.x, c.z, c.radius, c.y0, c.y1);
    if (hit < t) t = hit;
  }
  for (let i = 1; i <= GROUND_STEPS; i++) {
    const s = (i / GROUND_STEPS) * t;
    if (from.y + d.y * s < w.ground(from.x + d.x * s, from.z + d.z * s)) return ((i - 1) / GROUND_STEPS) * t;
  }
  return t;
}

export const hasLineOfSight = (w: CollisionWorld, from: V3, to: V3): boolean => raycast(w, from, to) >= 1;
