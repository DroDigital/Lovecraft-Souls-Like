/**
 * How incomprehensible a body looks (render only, spec §2): the higher a creature stands in the
 * Mythos, the less it keeps to one shape, one place or one moment. Named horrors writhe a little
 * and slip now and then; great old ones writhe hard under an oily sheen, with patches of them open
 * onto a starry void; outer gods do all that while bands of them slide out of place, a ring of
 * shards turns about them, and echoes of their bodies lag a moment behind (shaders/eldritch.ts).
 */

import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import type { Rng } from '../core/rng';
import type { Tier } from '../data/schema';
import { tint } from './meshKit';
import { ANOMALY, scaleRgb, type Rgb } from './palette';

/** 0..1 by tier: how far a body refuses to hold its shape. */
export const WRONGNESS: Readonly<Record<Tier, number>> = { lesser: 0, greater: 0.12, named: 0.3, great_old_one: 0.65, outer_god: 1, ally: 0 };

/** An outer god's lagging echoes: how far behind in time (s), how much of each is dithered away, how far it drifts (× height). */
export const ECHOES: readonly { lag: number; ghost: number; drift: number }[] = [
  { lag: 0.35, ghost: 0.55, drift: 0.07 },
  { lag: 0.8, ghost: 0.78, drift: 0.12 },
];

/** Whether a body this wrong lags echoes and wears a halo. */
export const beyond = (wrongness: number): boolean => wrongness >= 0.9;

/**
 * Shards on three tilted rings about a body `h` tall, each ring a group to turn: tetrahedra in the
 * anomaly hues, `tintGain` brighter (textures average about half brightness).
 */
export function halo(h: number, rng: Rng, tintGain: number): { root: THREE.Group; rings: THREE.Group[]; geos: THREE.BufferGeometry[] } {
  const root = new THREE.Group();
  const rings: THREE.Group[] = [];
  const geos: THREE.BufferGeometry[] = [];
  const hues: Rgb[] = [ANOMALY.purple, ANOMALY.green, ANOMALY.magenta];
  for (let k = 0; k < 3; k++) {
    const ring = new THREE.Group();
    ring.position.y = h * (0.45 + 0.15 * k);
    ring.rotation.set((rng() - 0.5) * 1.4, rng() * Math.PI, (rng() - 0.5) * 1.4);
    const shards: THREE.BufferGeometry[] = [];
    const n = 8 + k * 2;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + rng() * 0.3;
      const r = h * (0.55 + 0.12 * k + rng() * 0.08);
      const s = h * (0.015 + rng() * 0.025);
      const shard = new THREE.TetrahedronGeometry(s, 0).rotateX(rng() * 6).rotateZ(rng() * 6).translate(Math.sin(a) * r, (rng() - 0.5) * h * 0.05, Math.cos(a) * r);
      shards.push(tint(shard, scaleRgb(hues[(i + k) % 3], tintGain)));
    }
    const geo = mergeGeometries(shards);
    geos.push(geo);
    ring.userData.speed = (0.15 + 0.1 * k) * (k % 2 ? -1 : 1);
    root.add(ring);
    rings.push(ring);
  }
  return { root, rings, geos };
}
