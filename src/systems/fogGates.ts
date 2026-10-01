/**
 * The fog before a horror is a wall (round 35: it was a picture the investigator, and anything else,
 * walked through, and the horror saw them across it): while its horrors live nothing crosses it, not
 * the investigator, not a foe, and nothing sees across it; the one way through is E, near it. E turns
 * the investigator to it and they walk in on their own, slowly, the fog parting about them, to a
 * place a few steps beyond. The fog is gone, for good, once every horror it keeps is slain. Pure: no
 * Three.js (render/bossFog.ts draws it, and the parting).
 */

import { distXZ, type XZ } from '../core/geom';
import { gatePlan, type FogWall } from '../world/gatePlan';
import { worldLayout } from '../world/placements';
import type { Game } from './components';

export const FOG_REACH = 2.6; // metres from a wall within which E passes it
const FOG_BEYOND = 2.4; // metres past the wall they are walked to
const FOG_PACE = 1.5; // metres a second they walk through it
const JAMB = 0.35; // a doorway's wall reaches this far past its opening, into the jambs

let plan: FogWall[] | null = null;
/** Every fog wall of the world. */
export const allFogs = (): readonly FogWall[] => (plan ??= gatePlan(worldLayout()).fogs);

/** The walls still standing: those whose horrors are not all slain. */
export function fogsUp(g: Game): FogWall[] {
  const ow = g.overworld;
  return ow ? allFogs().filter((w) => !w.spawns.every((s) => ow.slain.has(s))) : [];
}

/** Which side of a wall `p` is on: positive on its far (in-room, or inside the ring) side, negative on the near, 0 on it. */
export function sideOf(w: Pick<FogWall, 'kind' | 'x' | 'z' | 'yaw' | 'radius'>, p: XZ): number {
  if (w.kind === 'ring') return w.radius - Math.hypot(p.x - w.x, p.z - w.z);
  return (p.x - w.x) * Math.sin(w.yaw) + (p.z - w.z) * Math.cos(w.yaw);
}

/** How far along a doorway's wall `p` lies from its middle (across the opening). */
const across = (w: FogWall, p: XZ): number => (p.x - w.x) * Math.cos(w.yaw) - (p.z - w.z) * Math.sin(w.yaw);

/** Whether the step from `a` to `b` crosses the wall. */
export function crosses(w: FogWall, a: XZ, b: XZ): boolean {
  const [sa, sb] = [sideOf(w, a), sideOf(w, b)];
  if (sa * sb > 0 || (sa === 0 && sb === 0)) return false;
  if (w.kind === 'ring') return true;
  const t = sa / (sa - sb); // where along the step it meets the wall's plane
  const at = { x: a.x + (b.x - a.x) * t, z: a.z + (b.z - a.z) * t };
  return Math.abs(across(w, at)) <= w.width / 2 + JAMB;
}

/** Whether any standing wall lies between `a` and `b`: nothing sees, hears or reaches across one. */
export const fogBetween = (g: Game, a: XZ, b: XZ): boolean => fogsUp(g).some((w) => crosses(w, a, b));

/** The standing wall within reach of `p`, and how far (the nearest). */
export function fogNear(g: Game, p: XZ, reach = FOG_REACH): { wall: FogWall; gap: number } | null {
  let best: { wall: FogWall; gap: number } | null = null;
  for (const wall of fogsUp(g)) {
    const gap = wall.kind === 'ring' ? Math.abs(sideOf(wall, p)) : Math.hypot(Math.abs(sideOf(wall, p)), Math.max(0, Math.abs(across(wall, p)) - wall.width / 2));
    if (gap <= reach && (!best || gap < best.gap)) best = { wall, gap };
  }
  return best;
}

/** Whether the fog the investigator would pass is one a fight holds them behind (they may not leave it). */
function held(g: Game, w: FogWall): boolean {
  for (const f of g.ecs.c.fight.values()) if (f.veiled && w.bosses.includes(f.id)) return true;
  return false;
}

/** The wall E would pass now, if any: within reach, and the fight does not hold them. */
export function fogToPass(g: Game): FogWall | null {
  const p = g.player;
  if (p.fogPass || g.ecs.c.actor.get(p.id)?.move !== null || p.listening !== null) return null;
  const me = g.ecs.c.transform.get(p.id)!.pos;
  const n = fogNear(g, me);
  return n && !held(g, n.wall) ? n.wall : null;
}

/** Sets the investigator walking through `w`. */
export function passFog(g: Game, w: FogWall): void {
  const me = g.ecs.c.transform.get(g.player.id)!.pos;
  const side = Math.sign(sideOf(w, me)) || 1;
  const to =
    w.kind === 'ring'
      ? (() => {
          const a = Math.atan2(me.x - w.x, me.z - w.z);
          const r = w.radius + (side < 0 ? -FOG_BEYOND : FOG_BEYOND); // from outside, in; from within, out
          return { x: w.x + Math.sin(a) * r, z: w.z + Math.cos(a) * r };
        })()
      : { x: w.x - Math.sin(w.yaw) * side * FOG_BEYOND, z: w.z - Math.cos(w.yaw) * side * FOG_BEYOND };
  const from = { x: me.x, z: me.z };
  const frames = Math.max(40, Math.round(((distXZ(from, to)) / FOG_PACE) * 60));
  g.player.fogPass = { wall: w.id, from, to, frame: 0, frames };
  g.player.kneeling = null;
  g.events.emit('FogPassing', { wall: w.id, x: me.x, z: me.z });
}

/** One step of a pass: the walk, and its end. Runs before the movement system, which it leaves nothing to move. */
export function fogPassSystem(g: Game): void {
  const p = g.player;
  const pass = p.fogPass;
  if (!pass) return;
  const c = g.ecs.c;
  const [tr, m, a] = [c.transform.get(p.id)!, c.mover.get(p.id), c.actor.get(p.id)];
  if (!a || a.move === 'death' || (c.health.get(p.id)?.hp ?? 0) <= 0) {
    p.fogPass = null;
    return;
  }
  pass.frame++;
  const u = Math.min(1, pass.frame / pass.frames);
  const ease = u * u * (3 - 2 * u) * 0.35 + u * 0.65; // a slow start, a steady walk, a slow end
  const [x, z] = [pass.from.x + (pass.to.x - pass.from.x) * ease, pass.from.z + (pass.to.z - pass.from.z) * ease];
  tr.pos.x = x;
  tr.pos.z = z;
  tr.pos.y = g.world.ground(x, z);
  if (m) {
    m.vx = m.vz = 0;
    m.face = Math.atan2(pass.to.x - pass.from.x, pass.to.z - pass.from.z);
  }
  tr.yaw = m?.face ?? tr.yaw;
  if (u >= 1) {
    p.fogPass = null;
    g.events.emit('FogPassed', { wall: pass.wall, x: x, z: z });
  }
}

/** After movement: nothing but the investigator on their way through crosses a standing wall; a step that would is undone. */
export function fogBlockSystem(g: Game): void {
  const walls = fogsUp(g);
  if (!walls.length) return;
  const { transform, body } = g.ecs.c;
  for (const [id, tr] of transform) {
    const b = body.get(id);
    if (!b || b.fixed || (id === g.player.id && g.player.fogPass)) continue;
    const step = Math.hypot(tr.pos.x - tr.prev.x, tr.pos.z - tr.prev.z);
    if (step < 1e-6 || step > 3) continue; // still, or taken in a leap (a journey): not walked
    for (const w of walls) {
      if (!crosses(w, tr.prev, tr.pos)) continue;
      [tr.pos.x, tr.pos.z] = [tr.prev.x, tr.prev.z];
      tr.pos.y = g.world.ground(tr.pos.x, tr.pos.z);
      const m = g.ecs.c.mover.get(id);
      if (m) m.vx = m.vz = 0;
      break;
    }
  }
}
