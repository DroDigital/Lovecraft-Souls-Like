/**
 * The open world's collision (spec §3D): feet on the world ground, colliders looked up by chunk
 * (props, sites, dungeon walls), and the edge of the land: no walking into the sea or the abyss.
 * Pure: no Three.js.
 */

import { chunkContent } from './chunks';
import { pushOutOfRect, type Collider, type CollisionWorld } from './colliders';
import { ground } from './terrain';
import { chunkOf, chunkRect, walkableChunk } from './worldMap';

export function createWorldCollision(): CollisionWorld {
  return {
    colliders: [],
    off: new Set(),
    ground,
    near(x0, z0, x1, z1) {
      const [cx0, cz0, cx1, cz1] = [chunkOf(x0), chunkOf(z0), chunkOf(x1), chunkOf(z1)];
      if (cx0 === cx1 && cz0 === cz1) return chunkContent(cx0, cz0).colliders;
      const out: Collider[] = [];
      for (let cx = cx0; cx <= cx1; cx++) for (let cz = cz0; cz <= cz1; cz++) out.push(...chunkContent(cx, cz).colliders);
      return out;
    },
    contain(pos, r) {
      const [cx, cz] = [chunkOf(pos.x), chunkOf(pos.z)];
      for (let dx = -1; dx <= 1; dx++) {
        for (let dz = -1; dz <= 1; dz++) {
          if (walkableChunk(cx + dx, cz + dz)) continue;
          const c = chunkRect(cx + dx, cz + dz);
          pushOutOfRect(pos, r, c.x0, c.z0, c.x1, c.z1);
        }
      }
    },
  };
}
