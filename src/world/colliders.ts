/**
 * Static collision (spec §1: no physics engine): box and vertical-cylinder colliders over a
 * heightfield, inside a walkable area (the arena's circle, or the open world's land). The open world
 * hands out only the colliders near a query (its chunk index). Kinematic capsule push-out and ray
 * casts. Pure.
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
  colliders: Collider[]; // checked everywhere
  off: Set<Collider>; // out of the world for now: hidden-layer geometry that is not shown
  ground: HeightFn;
  /** More colliders near the xz rectangle (the open world's chunks); absent in the arena. */
  near?: (x0: number, z0: number, x1: number, z1: number) => readonly Collider[];
  /** Keeps a capsule of radius `r` on walkable ground. */
  contain(pos: V3, r: number): void;
}

/** The arena's rule: inside a circle around the origin. */
export function containRadius(radius: number): CollisionWorld['contain'] {
  return (pos, r) => {
    const d = Math.hypot(pos.x, pos.z);
    const max = radius - r;
    if (d <= max) return;
    pos.x *= max / d;
    pos.z *= max / d;
  };
}

/** Pushes a circle (centre `pos`, radius `r`) out of an xz rectangle; through its nearest side if the centre is inside. */
export function pushOutOfRect(pos: V3, r: number, x0: number, z0: number, x1: number, z1: number): void {
  const dx = pos.x - clamp(pos.x, x0, x1);
  const dz = pos.z - clamp(pos.z, z0, z1);
  const d = Math.hypot(dx, dz);
  if (d >= r) return;
  if (d > 1e-6) {
    pos.x += (dx / d) * (r - d);
    pos.z += (dz / d) * (r - d);
    return;
  }
  const exits = [pos.x - x0, x1 - pos.x, pos.z - z0, z1 - pos.z];
  const i = exits.indexOf(Math.min(...exits));
  if (i === 0) pos.x = x0 - r;
  else if (i === 1) pos.x = x1 + r;
  else if (i === 2) pos.z = z0 - r;
  else pos.z = z1 + r;
}

const NONE: readonly Collider[] = [];

const GROUND_STEPS = 12;

function pushOut(w: CollisionWorld, list: readonly Collider[], pos: V3, r: number, h: number): void {
  for (const c of list) {
    if (w.off.has(c)) continue;
    if (c.kind === 'box') {
      if (pos.y + h <= c.min.y || pos.y >= c.max.y) continue;
      pushOutOfRect(pos, r, c.min.x, c.min.z, c.max.x, c.max.z);
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
}

/** Pushes a standing capsule (feet at `pos`, radius `r`, height `h`) out of every collider and back onto walkable ground. */
export function resolveCapsule(w: CollisionWorld, pos: V3, r: number, h: number): void {
  pushOut(w, w.colliders, pos, r, h);
  pushOut(w, w.near?.(pos.x - r, pos.z - r, pos.x + r, pos.z + r) ?? NONE, pos, r, h);
  w.contain(pos, r);
}

function firstHit(w: CollisionWorld, list: readonly Collider[], from: V3, d: V3, t: number): number {
  for (const c of list) {
    if (w.off.has(c)) continue;
    const hit = c.kind === 'box' ? segmentBox(from, d, c.min, c.max) : segmentCylinder(from, d, c.x, c.z, c.radius, c.y0, c.y1);
    if (hit < t) t = hit;
  }
  return t;
}

/** Fraction along from → to where the first obstacle (collider or ground) starts; 1 when the path is clear. */
export function raycast(w: CollisionWorld, from: V3, to: V3): number {
  const d = { x: to.x - from.x, y: to.y - from.y, z: to.z - from.z };
  let t = firstHit(w, w.colliders, from, d, 1);
  const near = w.near?.(Math.min(from.x, to.x), Math.min(from.z, to.z), Math.max(from.x, to.x), Math.max(from.z, to.z));
  if (near) t = firstHit(w, near, from, d, t);
  for (let i = 1; i <= GROUND_STEPS; i++) {
    const s = (i / GROUND_STEPS) * t;
    if (from.y + d.y * s < w.ground(from.x + d.x * s, from.z + d.z * s)) return ((i - 1) / GROUND_STEPS) * t;
  }
  return t;
}

export const hasLineOfSight = (w: CollisionWorld, from: V3, to: V3): boolean => raycast(w, from, to) >= 1;
