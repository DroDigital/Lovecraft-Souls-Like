/**
 * A tentacle from the deep, in the distance (round 30): its centreline (a long curve that leans
 * and arches over as it rises, a wave running up it, its tip curling), its life (it comes up out of
 * the water, writhes there, and goes under), and where it may be seen (out on the water, ahead of
 * the investigator, far enough to be a silhouette in the haze). Pure.
 */

export interface Spot {
  x: number;
  z: number;
}

export const LIFE = { emerge: 3.2, hold: [3.5, 8] as const, sink: 3, height: [13, 24] as const, thick: [0.9, 1.5] as const };
export const SEE = { near: 40, far: 66, spread: 0.62 }; // metres from the investigator, and radians either side of where they look

/** How far up it is (0 under water, 1 whole) `age` seconds after it began, given how long it holds. */
export function rise(age: number, hold: number): number {
  const e = LIFE.emerge;
  if (age < 0) return 0;
  if (age < e) return smooth(age / e);
  if (age < e + hold) return 1;
  const k = (age - e - hold) / LIFE.sink;
  return k >= 1 ? 0 : 1 - smooth(k);
}
export const done = (age: number, hold: number): boolean => age > LIFE.emerge + hold + LIFE.sink;
const smooth = (x: number): number => x * x * (3 - 2 * x);

/**
 * The centreline of a tentacle `length` metres long at time `t`: `steps + 1` points (x, y, z), from
 * the base (below the water a little) to the tip, in its own frame (y up, it leans toward +x).
 */
export function centreline(length: number, t: number, seed: number, steps = 14): [number, number, number][] {
  const out: [number, number, number][] = [[0, -1.2, 0]];
  let [x, y, z] = [0, 0, 0];
  const ds = length / steps;
  for (let i = 1; i <= steps; i++) {
    const s = i / steps;
    const lean = 0.18 + 0.85 * Math.pow(s, 1.7); // upright at the root, arching over toward the tip
    const wave = 0.3 * s * Math.sin(s * 6.2 - t * 1.7 + seed * 3.1); // a ripple running up it
    const curl = 1.5 * Math.pow(Math.max(0, (s - 0.72) / 0.28), 2); // the tip curls in
    const a = lean + wave + curl;
    const side = 0.22 * s * Math.sin(s * 4.1 - t * 1.1 + seed * 5.3);
    x += Math.sin(a) * ds;
    y += Math.cos(a) * ds;
    z += side * ds;
    out.push([x, y, z]);
  }
  return out;
}

/** Its radius at `s` (0 root, 1 tip) for a root of `thick` metres: swelling a little, then drawn to a point. */
export const radius = (s: number, thick: number): number => Math.max(0.05, thick * Math.pow(1 - s, 0.85) * (1 + 0.12 * Math.sin(s * 22)));

/**
 * Somewhere to see one: out on the water, 40 to 66 metres off, within `spread` radians of where the
 * investigator looks (`yaw`: the way they face), or null if `tries` tries find only land. `water`
 * says whether a point is open water.
 */
export function pickSpot(from: Spot, yaw: number, rand: () => number, water: (x: number, z: number) => boolean, tries = 14): Spot | null {
  for (let i = 0; i < tries; i++) {
    const a = yaw + (rand() * 2 - 1) * SEE.spread;
    const d = SEE.near + (SEE.far - SEE.near) * rand();
    const p = { x: from.x + Math.sin(a) * d, z: from.z + Math.cos(a) * d };
    if (water(p.x, p.z) && water(from.x + Math.sin(a) * d * 0.6, from.z + Math.cos(a) * d * 0.6)) return p; // and the water reaches back toward them
  }
  return null;
}
