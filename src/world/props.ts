/**
 * Props (spec §3D): what stands on open ground. Scattered ones (dead trees, rocks, pillars,
 * monoliths, graves, ruined walls) and those region plans place in order (pines, crosses, obelisks,
 * houses, field walls, fences, street lamps, fallen logs, fire pits, bushes, stumps, altars): their
 * sizes and colliders. `w` × `d` are half extents (round props use `w` as their radius), `h` the
 * height. Pure: no Three.js.
 */

import type { Rng } from '../core/rng';
import type { HouseStyle } from '../data/regionFeatures';
import type { PropKind } from '../data/regions';
import type { Collider } from './colliders';
import { surface } from './terrain';

export interface Prop {
  kind: PropKind;
  x: number;
  y: number;
  z: number;
  w: number;
  d: number;
  h: number;
  yaw: number;
  seed: number;
  style?: HouseStyle; // houses: how they are built
}

const ROUND = new Set<PropKind>(['tree', 'pine', 'rock', 'pillar', 'lamp', 'obelisk', 'cross', 'stump']);
const OPEN = new Set<PropKind>(['bush', 'firepit']); // no collider: walked through or over

type Size = readonly [w: number, d: number, h: number];

/** A prop of `kind` at (x, z) on the ground, sized from `rng` unless `size` is given. */
export function makeProp(kind: PropKind, x: number, z: number, rng: Rng, yaw?: number, size?: Size, style?: HouseStyle): Prop {
  const r = (lo: number, hi: number): number => lo + (hi - lo) * rng();
  const sizes: Record<PropKind, () => Size> = {
    tree: () => [r(0.25, 0.4), 0, r(5, 9)],
    pine: () => [r(0.22, 0.34), 0, r(7, 12)],
    rock: () => {
      const s = r(0.8, 2.2);
      return [s, 0, s * 0.8];
    },
    pillar: () => [r(0.5, 0.75), 0, r(3, 7)],
    monolith: () => [r(0.5, 0.9), r(0.35, 0.5), r(3, 6)],
    grave: () => [0.35, 0.12, r(0.8, 1.2)],
    cross: () => [0.1, 0, r(1.1, 1.6)],
    obelisk: () => [r(0.3, 0.45), 0, r(2.2, 3.4)],
    ruin: () => [r(1.5, 3.5), 0.35, r(1, 3)],
    house: () => [r(3.5, 5), r(3, 4.5), r(5, 7)],
    wall: () => [r(3, 6), 0.3, r(0.7, 1.1)],
    fence: () => [r(2, 4), 0.05, 1],
    lamp: () => [0.12, 0, 3.4],
    log: () => [r(1.2, 2.2), 0.25, 0.45],
    firepit: () => [0.7, 0.7, 0.3],
    bush: () => [r(0.6, 1.2), 0, r(0.6, 1.1)],
    stump: () => [r(0.3, 0.5), 0, r(0.4, 0.8)],
    altar: () => [1.2, 0.7, 1],
  };
  const [w, d, h] = size ?? sizes[kind]();
  const turn = yaw ?? (ROUND.has(kind) ? r(0, Math.PI * 2) : rng() < 0.5 ? 0 : Math.PI / 2);
  return { kind, x, y: surface(x, z), z, w, d, h, yaw: turn, seed: Math.floor(rng() * 1e6), ...(style && { style }) };
}

/** The prop's collider, or null for what is walked through (bushes, fire pits). */
export function propCollider(p: Prop): Collider | null {
  if (OPEN.has(p.kind)) return null;
  if (ROUND.has(p.kind)) {
    const radius = p.kind === 'rock' ? p.w * 0.8 : p.kind === 'lamp' || p.kind === 'cross' ? 0.18 : p.w + 0.05;
    return { kind: 'cylinder', x: p.x, z: p.z, radius, y0: p.y - 0.5, y1: p.y + p.h };
  }
  return { kind: 'obox', x: p.x, z: p.z, hx: p.w, hz: p.d, yaw: p.yaw, y0: p.y - 0.5, y1: p.y + p.h + (p.kind === 'house' ? p.w : 0) };
}
