/** Collision for the Phase 1 arena, built from `ARENA` data (pure; the meshes live in arenaScene.ts). */

import { ARENA } from '../data/arena';
import type { Collider, CollisionWorld } from './colliders';

/** The Elder Sign stone: a standing slab, width × height × depth in metres. */
export const ELDER_SIGN_SIZE = [1.2, 2.1, 0.3] as const;

/** The arena floor is flat (Phase 1); the controller still follows any heightfield. */
export const arenaGround = (): number => 0;

export function colonnadeSpots(): { x: number; z: number }[] {
  const { count, radius } = ARENA.colonnade;
  return Array.from({ length: count }, (_, i) => {
    const a = ((i + 0.5) / count) * Math.PI * 2;
    return { x: Math.cos(a) * radius, z: Math.sin(a) * radius };
  });
}

export function createArenaWorld(): CollisionWorld {
  const colliders: Collider[] = [];
  for (const [x, z, radius, h] of ARENA.pillars) colliders.push({ kind: 'cylinder', x, z, radius, y0: 0, y1: h });
  for (const { x, z } of colonnadeSpots()) {
    colliders.push({ kind: 'cylinder', x, z, radius: ARENA.colonnade.pillarRadius, y0: 0, y1: ARENA.colonnade.height });
  }
  for (const [x, z, hw, hd, h] of ARENA.walls) {
    colliders.push({ kind: 'box', min: { x: x - hw, y: 0, z: z - hd }, max: { x: x + hw, y: h, z: z + hd } });
  }
  const [w, h, d] = ELDER_SIGN_SIZE;
  const { x, z } = ARENA.elderSign;
  colliders.push({ kind: 'box', min: { x: x - w / 2, y: 0, z: z - d / 2 }, max: { x: x + w / 2, y: h, z: z + d / 2 } });
  return { colliders, ground: arenaGround, radius: ARENA.radius };
}
