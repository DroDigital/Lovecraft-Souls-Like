/**
 * A boss keeps to its arena (spec §3E): it wakes as the investigator steps into the ring, never
 * loses them while they stay within reach of it and never gives the fight up while they do, and it
 * keeps inside the ring itself; so a fight is lost only by leaving it or dying. Quick foes (and
 * the sorcerers among the bosses) may slip a blow as it winds up: a short step aside with a
 * moment's i-frames that never carries a boss out of its ring. Pure: no Three.js.
 */

import type { Entity } from '../core/ecs';
import { distXZ, type XZ } from '../core/geom';
import type { MoveDef } from '../data/moves';
import { BOSS } from '../data/tuning';
import { moveDef, startMove } from './actions';
import type { ArenaCircle, Brain, Game, Mover } from './components';

/** The sidestep of a foe with `evade` in its temperament. */
export const EVADE: MoveDef = { frames: 26, iframes: [2, 12], motion: { window: [0, 14], distance: 3.2, dir: 'input' } };

/** The ring a creature fights in: its own boss fight's (a summoned boss fights as a servant, with none). */
export const arenaOf = (g: Game, id: Entity): ArenaCircle | undefined => g.ecs.c.fight.get(id)?.arena;

/** Whether `p` lies inside the ring, or no more than `margin` metres past its edge. */
export const within = (a: ArenaCircle, p: XZ, margin: number = BOSS.margin): boolean => distXZ(a, p) <= a.radius + margin;

/** How far inside its rim a boss stands (negative: outside it). */
export const rimGap = (a: ArenaCircle, p: XZ): number => a.radius - distXZ(a, p);

/** Takes away the part of a walk that would carry the body past the rim (it slides along it) and draws a stray back in. */
export function holdInside(a: ArenaCircle, pos: XZ, m: Mover, speed: number): void {
  const [dx, dz] = [pos.x - a.x, pos.z - a.z];
  const d = Math.hypot(dx, dz);
  if (d < 1e-6 || d < a.radius - BOSS.rim) return;
  const [nx, nz] = [dx / d, dz / d];
  const out = m.vx * nx + m.vz * nz;
  if (out > 0) [m.vx, m.vz] = [m.vx - out * nx, m.vz - out * nz];
  if (d > a.radius - BOSS.rim * 0.5) [m.vx, m.vz] = [m.vx - nx * speed * 0.5, m.vz - nz * speed * 0.5];
}

/** Whether `id`'s blow is still winding up. */
function windingUp(def: MoveDef | undefined, frame: number): boolean {
  const strike = def?.hit?.window[0] ?? def?.shot?.frame;
  return strike !== undefined && frame < strike;
}

/**
 * Slips the investigator's blow if its temperament allows: a step to one side and back, whichever
 * keeps it inside its ring (and on open ground). True when it steps.
 */
export function evade(g: Game, id: Entity, br: Brain): boolean {
  const c = g.ecs.c;
  const chance = br.def.params.evade;
  if (!chance || (br.evadeIn ?? 0) > 0 || br.target !== g.player.id) return false;
  const pa = c.actor.get(g.player.id)!;
  if (!windingUp(moveDef(pa), pa.frame)) return false;
  const a = c.actor.get(id)!;
  const pos = c.transform.get(id)!.pos;
  const pp = c.transform.get(g.player.id)!.pos;
  const d = distXZ(pos, pp);
  if (d > BOSS.evadeRange + (c.body.get(id)?.radius ?? 0.5) || !a.moves.evade) return false;
  br.evadeIn = BOSS.evadeEvery;
  if (g.rng() >= chance) return false;
  const [ax, az] = [(pos.x - pp.x) / (d || 1), (pos.z - pp.z) / (d || 1)]; // away from the blow
  const arena = arenaOf(g, id);
  const side = g.rng() < 0.5 ? 1 : -1;
  const reach = EVADE.motion!.distance;
  for (const turn of [side * 0.9, -side * 0.9, side * 1.5, -side * 1.5]) {
    const [s, co] = [Math.sin(turn), Math.cos(turn)];
    const dir = { x: ax * co - az * s, z: ax * s + az * co };
    const end = { x: pos.x + dir.x * reach, z: pos.z + dir.z * reach };
    if (arena && rimGap(arena, end) < BOSS.rim) continue;
    startMove(a, 'evade');
    a.dir = dir;
    return true;
  }
  return false;
}
