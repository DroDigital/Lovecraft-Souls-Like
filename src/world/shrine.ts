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

/** Every lesser stone's index: the whole broken ring. */
export const ALL_STONES: readonly number[] = SHRINE.lesser.map((_, i) => i);

/** How far a lesser stone stands from any wall (round 20: a sign's ring reached into the dungeon's walls and stood half sunk in them). */
const STONE_CLEAR = 0.4;

/** The lesser stone `i`'s place in the world for a sign at (x, z) facing `yaw`. */
const stoneAt = (i: number, x: number, z: number, yaw: number): { x: number; z: number; radius: number } => {
  const [a, dist, radius] = SHRINE.lesser[i];
  return { x: x + Math.sin(yaw + a) * dist, z: z + Math.cos(yaw + a) * dist, radius };
};

/** How far a point lies outside a collider's footprint (0 or less: inside it). */
function outside(c: Collider, x: number, z: number): number {
  if (c.kind === 'cylinder') return Math.hypot(x - c.x, z - c.z) - c.radius;
  let [dx, dz, hx, hz] = [0, 0, 0, 0];
  if (c.kind === 'box') [dx, dz, hx, hz] = [x - (c.min.x + c.max.x) / 2, z - (c.min.z + c.max.z) / 2, (c.max.x - c.min.x) / 2, (c.max.z - c.min.z) / 2];
  else {
    const [s, k] = [Math.sin(c.yaw), Math.cos(c.yaw)];
    [dx, dz, hx, hz] = [(x - c.x) * k - (z - c.z) * s, (x - c.x) * s + (z - c.z) * k, c.hx, c.hz];
  }
  return Math.hypot(Math.max(Math.abs(dx) - hx, 0), Math.max(Math.abs(dz) - hz, 0)) || Math.max(Math.abs(dx) - hx, Math.abs(dz) - hz);
}

/**
 * The lesser stones a sign at (x, y, z) facing `yaw` can raise among the `solids` about it: a stone
 * that would stand in a wall, or hard against one, is left out (the ring is broken anyway; a shrine
 * set against a wall keeps the stones that flank it).
 */
export function standingStones(x: number, y: number, z: number, yaw: number, solids: readonly Collider[]): number[] {
  return ALL_STONES.filter((i) => {
    const [, , , h] = SHRINE.lesser[i];
    const at = stoneAt(i, x, z, yaw);
    return solids.every((c) => {
      const [lo, hi] = c.kind === 'box' ? [c.min.y, c.max.y] : [c.y0, c.y1];
      return hi <= y - 0.3 || lo >= y + h || outside(c, at.x, at.z) >= at.radius + STONE_CLEAR;
    });
  });
}

/**
 * The shrine's colliders for a sign at (x, y, z) facing `yaw` (a quarter turn: the world's signs face
 * a compass direction): the plinth, the standing stone, and the lesser stones that stand (`stones`).
 */
export function shrineColliders(x: number, y: number, z: number, yaw: number, stones: readonly number[] = ALL_STONES): Collider[] {
  const [s, c] = [Math.abs(Math.sin(yaw)), Math.abs(Math.cos(yaw))];
  const box = (w: number, d: number, y0: number, y1: number): Collider => {
    const [hx, hz] = [(c * w + s * d) / 2, (s * w + c * d) / 2];
    return { kind: 'box', min: { x: x - hx, y: y0, z: z - hz }, max: { x: x + hx, y: y1, z: z + hz } };
  };
  const [w, , d] = SHRINE.steps[0];
  const out = [box(w, d, y - 0.3, y + PLINTH), box(SHRINE.stone.base, SHRINE.stone.depth, y - 0.3, y + PLINTH + SHRINE.stone.height)];
  for (const i of stones) out.push({ kind: 'cylinder', ...stoneAt(i, x, z, yaw), y0: y - 0.3, y1: y + SHRINE.lesser[i][3] });
  return out;
}
