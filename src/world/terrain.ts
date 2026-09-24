/**
 * World ground (spec §3D): the blended land (land.ts), flattened under every site by its pad, and
 * inside a dungeon its room's floor. `surface` is what the terrain mesh draws (the land and pads
 * only: dungeons lay their own floors over holes in it); `ground` is what feet stand on. Pure.
 */

import { floorAt, roomAt } from './dungeonKit';
import { landHeight, smoothstep } from './land';
import { worldLayout, type Pad } from './placements';
import { chunkOf, rectDistance } from './worldMap';

/** Pulls a height toward a pad's level: wholly inside it, fading out over its blend. */
function flatten(p: Pad, h: number, x: number, z: number): number {
  const d = p.kind === 'circle' ? Math.hypot(x - p.x, z - p.z) - p.radius : rectDistance(p.rect, x, z);
  if (d >= p.blend) return h;
  return h + (p.level - h) * (1 - smoothstep(0, p.blend, d));
}

/** The terrain mesh's height: land flattened under sites (dungeon footprints included). */
export function surface(x: number, z: number): number {
  let h = landHeight(x, z);
  for (const p of worldLayout().chunk(chunkOf(x), chunkOf(z)).pads) h = flatten(p, h, x, z);
  return h;
}

/** Where feet stand: a dungeon room's floor, else the surface. */
export function ground(x: number, z: number): number {
  for (const d of worldLayout().chunk(chunkOf(x), chunkOf(z)).dungeons) {
    const r = roomAt(d, x, z);
    if (r) return floorAt(r, x, z);
  }
  return surface(x, z);
}

/** Whether (x, z) lies on a dungeon room's floor (the terrain mesh leaves a hole there). */
export function inDungeon(x: number, z: number): boolean {
  return worldLayout().chunk(chunkOf(x), chunkOf(z)).dungeons.some((d) => roomAt(d, x, z) !== undefined);
}
