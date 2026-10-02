/**
 * Where a dungeon's torches hang on a wall (sconces.ts makes each one): evenly along it, on a face that looks into a
 * room. Round 37: a torch stood where a pilaster or a stack of shelves is built against the wall hung inside it (1124 of
 * the dungeons' 1694 lights did: a stop on the four-metre grid of the pilasters, or on the face of a stack that lies in
 * the wall's own thickness), lighting nothing but the street outside by its glow through the brick. It now moves along
 * the wall to the bay beside, or to the wall's other face where a room lies on each side, and where there is no clear
 * place it hangs none. Pure but for the geometry it makes.
 */

import { floorAt, roomAt, type DungeonLayout } from '../world/dungeonKit';
import type { Part } from '../world/dungeonParts';
import { DIRS } from '../world/worldMap';
import { EDGE, facesOf, sconce } from './sconces';

/** What a wall needs to know of its place to hang torches: which face looks into a room (outer walls have one), the floor each face looks onto, and whether a point stands inside another solid of the dungeon. */
export type WallContext = { inner: (alongX: boolean) => number; floor: (x: number, z: number, fallback: number) => number; buried: (x: number, y: number, z: number) => boolean };

/** A wall part's torch context: the face of an outer wall that looks inward, the floor under any point, and whether a point is inside another of the dungeon's solids (`solids`, but for ceilings: only those near the wall are looked through). */
export function wallContext(L: DungeonLayout, p: Part, solids: readonly Part[]): WallContext {
  const dir = 'outer' in p && p.outer ? DIRS[p.outer] : null;
  let close: readonly Part[] | undefined; // found when the first torch asks
  const near = (): readonly Part[] => (close ??= p.shape !== 'box' ? [] : solids.filter((q) => q !== p && q.shape === 'box' && q.min.x < p.max.x + 1 && q.max.x > p.min.x - 1 && q.min.z < p.max.z + 1 && q.max.z > p.min.z - 1));
  return {
    inner: (alongX) => (dir ? -(alongX ? dir.z : dir.x) : 0),
    floor: (x, z, fallback) => {
      const r = roomAt(L, x, z);
      return r ? floorAt(r, x, z) : fallback;
    },
    buried: (x, y, z) => near().some((q) => q.shape === 'box' && x > q.min.x && x < q.max.x && z > q.min.z && z < q.max.z && y > q.min.y && y < q.max.y),
  };
}

const SHIFTS = [0, 2, -2, 1, -1]; // metres along a wall that a torch may move to stand clear of what is built against it: the middle of the bay beside a pilaster, nearer one's edge

/** The torches (bracket, flame and light) of a wall `len` metres long, hung at its `stops` (metres from its middle). */
export function hangTorches(stops: readonly number[], w: { along: (t: number, across: number) => [number, number]; thick: number; alongX: boolean; base: number; len: number }, ctx: WallContext): ReturnType<typeof sconce>[] {
  const edge = Math.max(0, w.len / 2 - EDGE);
  const hung: ReturnType<typeof sconce>[] = [];
  stops.forEach((stop, j) => {
    const faces = ctx.inner(w.alongX);
    const first = facesOf(faces, j);
    for (const across of faces !== 0 ? [first] : [first, -first]) {
      for (const shift of SHIFTS) {
        const t = stop + shift;
        if (Math.abs(t) > edge + 1e-9) continue;
        const [x, z] = w.along(t, 0);
        const [px, pz] = w.along(t, across * (w.thick / 2 + 0.8));
        const s = sconce({ x, z, across, alongX: w.alongX, floor: ctx.floor(px, pz, w.base) }, w.thick);
        const l = s.light;
        const [bx, bz] = w.alongX ? [0, across] : [across, 0]; // from the flame back to the wall's face
        if ([0, 1, 2].some((k) => [-1, 0, 1].some((side) => ctx.buried(l.x - bx * 0.11 * k + (w.alongX ? side * 0.12 : 0), l.y - 0.1, l.z - bz * 0.11 * k + (w.alongX ? 0 : side * 0.12))))) continue; // flame, cup and bracket
        hung.push(s);
        return;
      }
    }
  });
  return hung;
}
