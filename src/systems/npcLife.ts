/**
 * The people have somewhere to be (round 26: everyone stood where they rose, turned to the same sign, all
 * night; round 35: they went between two fixed points and never seemed to walk, and now wander): in the
 * gloaming each strolls about where they stand, choosing a place near to go to each time (never beyond
 * their hour's reach, so they are always to be found), their path a curve and not a line, slowing to turn,
 * stopping now and then to look about, sometimes only for a breath; deep in the night they keep nearer home and stand longer; in the last hour
 * they stand at their place and do not move, turned to the sign, as if dozing on their feet. Anyone
 * talked with, or with the investigator close by, stands and turns to them, and takes up the round again
 * once they have gone. Their bodies are fixed (nothing hunts them, nothing shoves them), so this
 * moves them by hand, never through a wall and never up or down more than a step. Not kept in a
 * save: a load finds them at home. Pure: no Three.js.
 */

import type { Entity } from '../core/ecs';
import { hash2 } from '../core/rng';
import { distXZ, turnToward, wrapAngle, yawOf, type XZ } from '../core/geom';
import { npcDef } from '../data/npcs';
import { SIM } from '../data/tuning';
import { raycast } from '../world/colliders';
import { hourOf, phaseOf, type Hour } from './clock';
import type { Game } from './components';
import { npcPlace } from './npcs';

const SPEED = 1.1; // m/s: an unhurried walk
const ACCEL = 1.8; // m/s²: they get up to it, and ease off as they near a turn
const TURN = 2.2; // rad/s, standing
const STROLL_TURN = 1.7; // rad/s, walking: a path bends, it does not corner
const HOLD = 4.5; // metres from the investigator within which they stand and face them
const ARRIVE = 0.25;

/** How wide a round each hour allows (metres), and how long they stand at each turn (seconds). */
export const ROUND: Readonly<Record<Hour, { reach: number; pause: readonly [number, number] }>> = {
  gloaming: { reach: 8, pause: [3, 8] },
  deep: { reach: 5, pause: [6, 15] },
  waning: { reach: 0, pause: [20, 40] },
};

interface Walker {
  home: XZ & { yaw: number };
  goal: XZ | null; // where they are strolling to
  wait: number; // seconds to stand before going on
  look: number; // the way they look while they stand
  pace: number; // m/s now
}

const walkers = new WeakMap<Game, Map<Entity, Walker>>();

/** Whether a step from one place to another is clear: no wall (at the height of a man's waist and knee), no more than a step up or down. */
export function clearStep(g: Game, a: XZ, b: XZ): boolean {
  const [ya, yb] = [g.world.ground(a.x, a.z), g.world.ground(b.x, b.z)];
  if (Math.abs(yb - ya) > 0.7) return false;
  return [0.4, 1.1].every((h) => raycast(g.world, { x: a.x, y: ya + h, z: a.z }, { x: b.x, y: yb + h, z: b.z }) >= 1);
}

/** The points of a round about `home`: two, at angles and distances of the person's own, each reachable from the one before; fewer where walls are close. */
export function roundOf(g: Game, id: string, home: XZ, reach: number): XZ[] {
  const out: XZ[] = [];
  let from = home;
  for (let k = 0; k < 2; k++) {
    const a = (hash2(id.length * 31 + k, [...id].reduce((h, c) => h + c.charCodeAt(0), 0), 5) + k * 0.47) * Math.PI * 2;
    for (let r = reach * (0.55 + 0.45 * hash2(k, id.length, 9)); r > 1.2; r -= 0.8) {
      const to = { x: home.x + Math.sin(a) * r, z: home.z + Math.cos(a) * r };
      if (clearStep(g, from, to)) {
        out.push(to);
        from = to;
        break;
      }
    }
  }
  return out;
}

/** A place to stroll to: some metres from where they are, within `reach` of home, with nothing in the way. */
function stroll(g: Game, from: XZ, home: XZ, reach: number): XZ {
  for (let k = 0; k < 8; k++) {
    const [a, r] = [g.rng() * Math.PI * 2, 1.5 + g.rng() * Math.max(0, reach - 1.5)];
    const to = { x: home.x + Math.sin(a) * r, z: home.z + Math.cos(a) * r };
    if (distXZ(to, from) > 2 && clearStep(g, from, to)) return to;
  }
  return { x: home.x, z: home.z };
}

const between = (g: Game, [lo, hi]: readonly [number, number]): number => lo + (hi - lo) * g.rng();

/** Whether `e` lives a round of its own (its turning is its own: npcs.ts leaves it, but for the one being talked with). */
export const managed = (g: Game, e: Entity): boolean => !!walkers.get(g)?.has(e);

/** One step: each person who is not being spoken with lives their hour. */
export function npcLife(g: Game, dt: number): void {
  if (!g.overworld) return;
  const c = g.ecs.c;
  const table = walkers.get(g) ?? walkers.set(g, new Map()).get(g)!;
  const hour = hourOf(phaseOf(g.frame / SIM.hz));
  const me = c.transform.get(g.player.id)!.pos;
  for (const [e, id] of c.npc) {
    const def = npcDef(id);
    const tr = c.transform.get(e);
    if (!def || !tr || def.creature) continue;
    let w = table.get(e);
    if (!w) {
      const place = npcPlace(def);
      if (!place) continue;
      table.set(e, (w = { home: place, goal: null, wait: between(g, [1, 6]), look: place.yaw, pace: 0 }));
    }
    const near = g.player.listening === e || distXZ(tr.pos, me) < HOLD;
    if (near || w.wait > 0) w.pace = 0;
    if (near) { // they stand, and turn to the one beside them (npcs.ts does it faster for one being talked with)
      tr.prev = { ...tr.pos };
      tr.prevYaw = tr.yaw;
      if (g.player.listening !== e) tr.yaw = turnToward(tr.yaw, yawOf(me.x - tr.pos.x, me.z - tr.pos.z), TURN * dt);
      continue;
    }
    const reach = ROUND[hour].reach;
    tr.prev = { ...tr.pos };
    tr.prevYaw = tr.yaw;
    if (w.wait > 0) {
      w.wait -= dt;
      w.pace = 0;
      const face = hour === 'waning' && distXZ(tr.pos, w.home) < 1 ? w.home.yaw : w.look;
      tr.yaw = turnToward(tr.yaw, face, TURN * dt);
      continue;
    }
    if (!w.goal || (reach === 0 && distXZ(w.goal, w.home) > 0.01)) w.goal = reach > 0 ? stroll(g, tr.pos, w.home, reach) : { x: w.home.x, z: w.home.z };
    const d = distXZ(tr.pos, w.goal);
    if (d <= ARRIVE) {
      w.goal = null;
      w.pace = 0;
      w.wait = (g.rng() < 0.35 ? between(g, [0.2, 1.2]) : between(g, ROUND[hour].pause)) + 0.01; // sometimes only a breath, and on
      w.look = tr.yaw + (g.rng() - 0.5) * 2.4; // at a stop, they look about
      continue;
    }
    const want = yawOf(w.goal.x - tr.pos.x, w.goal.z - tr.pos.z);
    const off = Math.abs(wrapAngle(want - tr.yaw));
    tr.yaw = turnToward(tr.yaw, want, (off > 1 ? TURN : STROLL_TURN) * dt);
    if (off > 1) { // turned away from where they mean to go: they turn where they stand first
      w.pace = 0;
      continue;
    }
    w.pace = Math.min(SPEED * (1 - 0.5 * Math.min(1, off)), w.pace + ACCEL * dt, 0.3 + d * 1.5); // up to a walk, slower through a bend, and down toward the stop
    const step = Math.min(d, w.pace * dt);
    const next = { x: tr.pos.x + Math.sin(tr.yaw) * step, z: tr.pos.z + Math.cos(tr.yaw) * step }; // along the way they face, so the path curves
    if (!clearStep(g, tr.pos, next) || distXZ(next, w.home) > Math.max(reach + 1, distXZ(tr.pos, w.home))) { // never farther from home than their hour allows (or than they are, going back)
      w.goal = null; // something is in the way: somewhere else
      w.wait = 1;
      continue;
    }
    tr.pos = { x: next.x, y: g.world.ground(next.x, next.z), z: next.z };
  }
}
