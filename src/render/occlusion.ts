/**
 * Whether the investigator hides the foe they fight (playtest round 12): a short creature close in
 * (a rat swarm, a troglodyte, Brown Jenkin) disappears under the coat, locked on or not. When the
 * line from the lens to that foe passes through the investigator's body, their figure is dithered
 * part away (the eldritch shader's `uGhost`), so the foe's wind-up can be read through them.
 */

import type { Entity } from '../core/ecs';
import type { V3 } from '../core/geom';
import { OCCLUSION } from '../data/tuning';
import { isAbsent, isConcealed, type Game } from '../systems/components';

/** Closest distance between segments p0→p1 and q0→q1, and where along the first (0..1) it lies. */
export function segmentGap(p0: V3, p1: V3, q0: V3, q1: V3): { gap: number; t: number } {
  const d1 = { x: p1.x - p0.x, y: p1.y - p0.y, z: p1.z - p0.z };
  const d2 = { x: q1.x - q0.x, y: q1.y - q0.y, z: q1.z - q0.z };
  const r = { x: p0.x - q0.x, y: p0.y - q0.y, z: p0.z - q0.z };
  const dot = (a: V3, b: V3): number => a.x * b.x + a.y * b.y + a.z * b.z;
  const [a, e, f] = [dot(d1, d1), dot(d2, d2), dot(d2, r)];
  const [b, c] = [dot(d1, d2), dot(d1, r)];
  const clamp01 = (v: number): number => Math.min(1, Math.max(0, v));
  const denom = a * e - b * b;
  let s = denom > 1e-9 ? clamp01((b * f - c * e) / denom) : 0;
  let t = e > 1e-9 ? (b * s + f) / e : 0;
  if (t < 0 || t > 1) {
    t = clamp01(t);
    s = a > 1e-9 ? clamp01((b * t - c) / a) : 0;
  }
  const p = { x: p0.x + d1.x * s, y: p0.y + d1.y * s, z: p0.z + d1.z * s };
  const q = { x: q0.x + d2.x * t, y: q0.y + d2.y * t, z: q0.z + d2.z * t };
  return { gap: Math.hypot(p.x - q.x, p.y - q.y, p.z - q.z), t: s };
}

/** The foe the investigator is fighting: the lock target, else the nearest one hunting them close by. */
export function foeInFocus(g: Game): Entity | null {
  const c = g.ecs.c;
  if (g.lock.target !== null) return g.lock.target;
  const me = c.transform.get(g.player.id)!.pos;
  let best: Entity | null = null;
  let bestD = OCCLUSION.near;
  for (const [id, b] of c.brain) {
    if (b.target !== g.player.id || isAbsent(g, id) || isConcealed(g, id)) continue;
    const p = c.transform.get(id)?.pos;
    const d = p ? Math.hypot(p.x - me.x, p.z - me.z) : Infinity;
    if (d < bestD) [best, bestD] = [id, d];
  }
  return best;
}

/** Whether the investigator's body stands between the lens at `eye` and the foe in focus. */
export function veilsFoe(g: Game, eye: V3): boolean {
  const c = g.ecs.c;
  const foe = foeInFocus(g);
  const at = foe === null ? undefined : c.transform.get(foe)?.pos;
  if (foe === null || !at) return false;
  const body = c.body.get(foe);
  const aim = { x: at.x, y: at.y + (body?.aimHeight ?? 0.5), z: at.z };
  const me = c.transform.get(g.player.id)!.pos;
  const { gap, t } = segmentGap(eye, aim, { x: me.x, y: me.y + 0.2, z: me.z }, { x: me.x, y: me.y + OCCLUSION.height, z: me.z });
  return t < 0.98 && gap < OCCLUSION.radius;
}
