/**
 * Action state machine for every combatant (spec §3B): move frames, hitstop, combo chains, and the
 * player's buffered action, consumed at the end of recovery or at a cancel window.
 */

import { yawOf } from '../core/geom';
import type { MoveDef, MoveSet, Window } from '../data/moves';
import { COMBAT } from '../data/tuning';
import type { Actor, Game } from './components';
import { ageBuffer, takeBuffered, type ActionId } from './inputBuffer';
import { canAfford, spend } from './stamina';

export const inWindow = (w: Window | undefined, frame: number): boolean =>
  w !== undefined && frame >= w[0] && frame < w[1];

export const moveDef = (a: Actor): MoveDef | undefined => (a.move === null ? undefined : a.moves[a.move]);

export function createActor(moves: MoveSet): Actor {
  return { moves, move: null, frame: 0, hitstop: 0, frozen: false, hits: new Set(), dir: { x: 0, z: 1 }, last: null, idle: 0, guard: false };
}

/** Free, or inside the current move's cancel window. */
export function canAct(a: Actor): boolean {
  if (a.move === null) return true;
  const cancel = moveDef(a)?.cancel;
  return cancel !== undefined && a.frame >= cancel;
}

export function startMove(a: Actor, id: string): void {
  a.move = id;
  a.frame = 0;
  a.hits.clear();
  a.guard = false;
}

/** One step: hitstop freezes the actor; a finished move frees it, except `hold` moves (death). */
export function advance(a: Actor): void {
  a.frozen = a.hitstop > 0;
  if (a.frozen) {
    a.hitstop--;
    return;
  }
  const def = moveDef(a);
  if (!def) {
    a.move = null;
    a.idle++;
  } else if (a.frame + 1 < def.frames) {
    a.frame++;
  } else if (!def.hold) {
    a.last = a.move;
    a.idle = 0;
    a.move = null;
    a.frame = 0;
  }
}

/** The move an attack button starts: the chain continues from the current move or one that just ended. */
export function comboMove(a: Actor, button: 'light' | 'heavy'): string {
  const from = a.move ?? (a.idle <= COMBAT.comboGrace ? a.last : null);
  const next = from === null ? undefined : a.moves[from]?.combo?.[button];
  return next ?? `${button}1`; // chains start at light1 / heavy1
}

/** Starts the player's action if any stamina is left: faces the lock target or the stick, rolls along the stick. */
function startAction(g: Game, a: Actor, action: ActionId): void {
  const { stamina, transform, mover } = g.ecs.c;
  const id = g.player.id;
  const st = stamina.get(id);
  if (!canAfford(st)) return;
  const m = mover.get(id)!;
  const speed = Math.hypot(m.vx, m.vz);
  const moving = speed > 0.1;
  const move =
    action === 'light' || action === 'heavy' ? comboMove(a, action) : action === 'dodge' ? (moving ? 'roll' : 'backstep') : action;
  const def = a.moves[move];
  if (!def) return;
  if (st && def.stamina) spend(st, def.stamina);
  startMove(a, move);

  const tr = transform.get(id)!;
  if (moving) a.dir = { x: m.vx / speed, z: m.vz / speed };
  const target = g.lock.target === null ? undefined : transform.get(g.lock.target)?.pos;
  if (move === 'backstep') return;
  if (move === 'roll') {
    if (!target) tr.yaw = yawOf(a.dir.x, a.dir.z);
  } else if (target) tr.yaw = yawOf(target.x - tr.pos.x, target.z - tr.pos.z);
  else if (moving) tr.yaw = yawOf(m.vx, m.vz);
}

export function actionSystem(g: Game): void {
  const { actor, dead } = g.ecs.c;
  for (const [id, a] of actor) if (!dead.has(id)) advance(a);
  const p = g.player;
  const a = actor.get(p.id)!;
  if (!a.frozen && canAct(a)) {
    const action = takeBuffered(p.buffer);
    if (action) startAction(g, a, action);
  }
  a.guard = a.move === null && p.blockHeld;
  ageBuffer(p.buffer);
}
