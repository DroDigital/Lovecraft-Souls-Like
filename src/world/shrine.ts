/**
 * An Elder Sign's shrine (playtest round 7), in the sign's own frame: its carved faces look along ±z,
 * the ground is at y 0. A stepped plinth, the standing stone carved with Lovecraft's branch-like sign
 * on both faces, a ring of runes on the ground about it, and a broken ring of lesser stones behind,
 * leaving the way in front open. Pure: placements.ts collides with it, render/signMeshes.ts builds it.
 */

import type { Collider } from './colliders';

export const SHRINE = {
  steps: [[2.4, 0.18, 1.7], [1.8, 0.18, 1.2]] as const, // the plinth's steps, bottom first: width, height, depth
  stone: { base: 1.25, top: 0.85, height: 2.5, depth: 0.38 }, // the standing stone on the plinth: widths at its foot and crown
  runes: [1.9, 2.35] as const, // the ring of runes on the ground: inner and outer radius
  /** The lesser stones: bearing from the carved face (radians, clockwise from above), distance, radius, height, lean (radians). */
  lesser: [
    [1.75, 2.95, 0.26, 0.95, 0.08],
    [2.3, 3.05, 0.2, 0.55, -0.22],
    [2.85, 3.15, 0.3, 1.25, 0.05],
    [3.5, 3.05, 0.22, 0.7, 0.25],
    [4.1, 2.95, 0.27, 1.05, -0.1],
  ] as const,
};

/** The plinth's height: where the standing stone's foot is. */
export const PLINTH = SHRINE.steps.reduce((h, s) => h + s[1], 0);

/**
 * The shrine's colliders for a sign at (x, y, z) facing `yaw` (a quarter turn: the world's signs face
 * a compass direction): the plinth, the standing stone, and each lesser stone.
 */
export function shrineColliders(x: number, y: number, z: number, yaw: number): Collider[] {
  const [s, c] = [Math.abs(Math.sin(yaw)), Math.abs(Math.cos(yaw))];
  const box = (w: number, d: number, y0: number, y1: number): Collider => {
    const [hx, hz] = [(c * w + s * d) / 2, (s * w + c * d) / 2];
    return { kind: 'box', min: { x: x - hx, y: y0, z: z - hz }, max: { x: x + hx, y: y1, z: z + hz } };
  };
  const [w, , d] = SHRINE.steps[0];
  const out = [box(w, d, y - 0.3, y + PLINTH), box(SHRINE.stone.base, SHRINE.stone.depth, y - 0.3, y + PLINTH + SHRINE.stone.height)];
  for (const [a, dist, radius, h] of SHRINE.lesser) {
    out.push({ kind: 'cylinder', x: x + Math.sin(yaw + a) * dist, z: z + Math.cos(yaw + a) * dist, radius, y0: y - 0.3, y1: y + h });
  }
  return out;
}
