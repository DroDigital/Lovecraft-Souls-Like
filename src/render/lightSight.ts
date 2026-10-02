/**
 * Which lights show their glow from where the camera is (round 36: a torch on the inside of a dungeon's
 * outer wall hung its halo, drawn toward the eye, out through the wall, and its glow showed to anyone
 * walking by outside): a flame in a roofed room is seen only from its own room, or from where nothing
 * solid lies between it and the eye. The test is a ray on the colliders, redone every few frames for
 * each light, not each frame. Render only.
 */

import type { V3 } from '../core/geom';
import { hasLineOfSight, type CollisionWorld } from '../world/colliders';
import { dungeonRoomAt, roofedAt } from '../world/terrain';
import type { LightSpot } from './worldLights';

const EVERY = 8; // frames between looks at one light

export interface LightSight {
  /** Whether the glow of `s` shows from `eye`, at frame `frame`. */
  sees(s: LightSpot, eye: V3, frame: number): boolean;
}

export function createLightSight(world: CollisionWorld): LightSight {
  const memo = new WeakMap<LightSpot, { at: number; seen: boolean; roofed: boolean }>();
  return {
    sees(s, eye, frame) {
      let m = memo.get(s);
      if (!m) memo.set(s, (m = { at: -999, seen: true, roofed: roofedAt(s.x, s.z) }));
      if (!m.roofed) return true; // under the sky: nothing to hide behind but the lie of the land, which the depth test knows
      if (frame - m.at < EVERY) return m.seen;
      m.at = frame;
      const [a, b] = [dungeonRoomAt(s.x, s.z)?.room, dungeonRoomAt(eye.x, eye.z)?.room];
      m.seen = (!!a && a === b) || hasLineOfSight(world, eye, { x: s.x, y: s.y, z: s.z });
      return m.seen;
    },
  };
}
