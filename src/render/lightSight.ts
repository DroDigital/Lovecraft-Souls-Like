/**
 * What of the world's lights the eye can see (round 37, "the torches still glow through the walls and are seen on the
 * outside"; round 36 had hidden a roofed light's halo by a ray): a halo is drawn toward the eye by most of its radius, so
 * the wall a flame hangs on does not cut it, and a dungeon's outer wall is drawn about where its torches stand, so from
 * the street a torch's halo, and the light it threw, lay over the brick before it. Each torch and fire in reach now has a
 * share, eased toward what a ray from the eye to a point a little before it and above it finds (a wall, a stone or the
 * ground in the way: none of it; clear: all), which its halo, its point light and the mist's glow of it take. A few
 * are looked at each frame, those longest unlooked first (the nearest among them), for a ray is a walk over the ground
 * and a pass over the colliders about it; one that ought to go is gone in a tenth of a second. A street lamp, a lit
 * window (which fades by the angle it is seen at) and an Elder Sign (which stands among its own stones) are hidden by
 * nothing but the land, which the depth test knows: they are not looked at. With no world to look through everything
 * shows. Pure: no Three.js.
 */

import type { V3 } from '../core/geom';
import { LIGHTS } from '../data/tuning';
import { raycast, type CollisionWorld } from '../world/colliders';

/** The lights that stand in a room or a camp, where a wall or a tent may come between them and the eye. */
const LOOKED_AT: ReadonlySet<string> = new Set(['torch', 'fire']);

export interface Sighted {
  s: { x: number; y: number; z: number; kind: string };
  /** The share of the light that shows (0..1): set by `update`. */
  v: number;
}

export interface LightSight {
  /** Looks at a few of `near`, eases the share of every one toward what was seen, and sets each one's `v`. `time` in seconds. */
  update(near: readonly Sighted[], eye: V3, time: number): void;
}

interface State {
  goal: number; // what the last look found: 1 clear, 0 shut off
  value: number; // eased toward it
  looked: number; // when it was last looked at
  listed: number; // and when it was last in reach (a light long out of reach starts again, dark, with the next look)
}

/**
 * Whether a light at `s` shows from `eye`: looking at a point a hand's breadth before it and a little above it (a fire's
 * flame stands over the ring of stones its embers lie in; a torch's flame, over its bracket), so what a light stands in
 * or against does not hide it from the side it is on, while a wall between it and the eye does. Null when the eye is in
 * something (a camera pressed into a wall: what was seen stands).
 */
export function clearOf(w: CollisionWorld, eye: V3, s: V3, pull: number, lift: number): boolean | null {
  const d = Math.hypot(eye.x - s.x, eye.y - s.y, eye.z - s.z);
  const k = d > 1e-6 ? Math.min(pull, d * 0.5) / d : 0;
  const to = { x: s.x + (eye.x - s.x) * k, y: s.y + (eye.y - s.y) * k + lift, z: s.z + (eye.z - s.z) * k };
  const hit = raycast(w, eye, to);
  if (hit >= 1) return true;
  return hit * Math.hypot(to.x - eye.x, to.y - eye.y, to.z - eye.z) < 0.1 ? null : false;
}

export function createLightSight(world: () => CollisionWorld | null): LightSight {
  const states = new WeakMap<object, State>();
  const [pickLight, pickState, pickAge]: [Sighted[], State[], number[]] = [[], [], []];
  const held: State[] = [];
  let last = -Infinity;
  return {
    update(near, eye, time) {
      const { perFrame, pull, lift, rise, fall, forget } = LIGHTS.sight;
      const w = world();
      const dt = Math.min(0.1, Math.max(0, time - last));
      last = time;
      let picks = 0;
      held.length = near.length;
      near.forEach((n, i) => {
        const open = !w || !LOOKED_AT.has(n.s.kind);
        let st = states.get(n.s);
        if (!st || time - st.listed > forget) states.set(n.s, (st = { goal: open ? 1 : 0, value: open ? 1 : 0, looked: -Infinity, listed: time }));
        st.listed = time;
        held[i] = st;
        if (open) {
          st.goal = 1;
          return;
        }
        const age = time - st.looked;
        if (picks < perFrame) {
          [pickLight[picks], pickState[picks], pickAge[picks]] = [n, st, age];
          picks++;
          return;
        }
        let young = 0;
        for (let k = 1; k < picks; k++) if (pickAge[k] < pickAge[young]) young = k;
        if (age > pickAge[young]) [pickLight[young], pickState[young], pickAge[young]] = [n, st, age];
      });
      for (let k = 0; k < picks && w; k++) {
        const seen = clearOf(w, eye, pickLight[k].s, pull, lift);
        pickState[k].looked = time;
        if (seen !== null) pickState[k].goal = seen ? 1 : 0;
      }
      near.forEach((n, i) => {
        const st = held[i];
        st.value += (st.goal - st.value) * (1 - Math.exp(-(st.goal > st.value ? rise : fall) * dt));
        if (Math.abs(st.goal - st.value) < 0.004) st.value = st.goal;
        n.v = st.value;
      });
    },
  };
}
