/**
 * Where two walls of different kits meet (round 21). Each wall runs half its thickness past its
 * cell's corners so that its neighbours' ends are buried in it. Between two of one kit the overlap is
 * bricks over the same bricks, and shows nothing; but where the kits differ (a timber parlour beside a
 * brick cellar, a farmhouse and its mine tunnel) two walls lay one over the other in one plane, or an
 * end came out on another wall's far face, and the boards and the bricks fought for the corner. The
 * wall that lies within the other's height is cut back where its end runs into it (whole when they run
 * alike, to the other's middle when they cross), so that no face of one lies in the plane of a face of
 * the other. What stands (colliders, banks, doorways) is unchanged: only what is drawn. Pure: no
 * Three.js.
 */

import { kitOfRoom, type DungeonLayout } from './dungeonKit';
import type { BoxPart, Part } from './dungeonParts';

const EPS = 0.01;

const long = (b: BoxPart): 'x' | 'z' => (b.max.x - b.min.x >= b.max.z - b.min.z ? 'x' : 'z');
const other = (a: 'x' | 'z'): 'x' | 'z' => (a === 'x' ? 'z' : 'x');

/** `q` with its end cut back where it runs into `p`; `q` itself when it need not be. */
export function cutBack(q: BoxPart, p: BoxPart): BoxPart {
  const overlap = (a: 'x' | 'y' | 'z'): [number, number] => [Math.max(q.min[a], p.min[a]), Math.min(q.max[a], p.max[a])];
  const [ox, oy, oz] = [overlap('x'), overlap('y'), overlap('z')];
  if (ox[1] - ox[0] < EPS || oy[1] - oy[0] < EPS || oz[1] - oz[0] < EPS) return q; // they do not meet
  if (q.min.y < p.min.y - EPS || q.max.y > p.max.y + EPS) return q; // `q` is not within `p`'s height: cutting it would open a hole
  const along = long(q);
  const across = other(along);
  const [o, oa] = [{ x: ox, z: oz }[along], { x: ox, z: oz }[across]];
  if (oa[0] > q.min[across] + EPS || oa[1] < q.max[across] - EPS) return q; // it is not `q`'s whole thickness that lies in `p`
  const [atLow, atHigh] = [o[0] <= q.min[along] + EPS, o[1] >= q.max[along] - EPS];
  if (atLow === atHigh) return q; // in the middle of `q`, or all of it: no end
  const cut = long(p) === along ? o[1] - o[0] : (o[1] - o[0]) / 2; // in line: the whole stub; across: to `p`'s middle
  const out: BoxPart = { ...q, min: { ...q.min }, max: { ...q.max } };
  if (atLow) out.min[along] += cut;
  else out.max[along] -= cut;
  return out;
}

/** A dungeon's parts as they are drawn, each with the index of the part it comes from: its walls cut back where two of different kits meet. */
export function drawn(d: DungeonLayout, parts: readonly Part[]): { part: Part; index: number }[] {
  const kits = d.rooms.map((r) => kitOfRoom(d, r));
  const shape: Part[] = [...parts];
  const walls = parts.flatMap((p, i) => (p.shape === 'box' && p.look === 'wall' ? [i] : []));
  for (let a = 1; a < walls.length; a++) {
    for (let b = 0; b < a; b++) {
      const [i, j] = [walls[a], walls[b]];
      if (kits[parts[i].room] === kits[parts[j].room]) continue;
      const [q, p] = [shape[i] as BoxPart, shape[j] as BoxPart];
      const cut = cutBack(q, p);
      if (cut !== q) shape[i] = cut;
      else {
        const back = cutBack(p, q);
        if (back !== p) shape[j] = back;
      }
    }
  }
  return shape.map((part, index) => ({ part, index }));
}
