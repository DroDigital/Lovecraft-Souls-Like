/**
 * Action state machine for every combatant (spec §3B): move frames, hitstop, combo chains, and the
 * player's buffered action, consumed at the end of recovery or at a cancel window. Raising the guard
 * (block pressed, or a parry) calls off the investigator's attack while it winds up or recovers,
 * though not while the blow is landing; a blow struck with the guard already up plays out. Moving
 * walks the investigator out of a move's late recovery (its `release` frame: a dodge, a blow, a
 * swallow), and a move that must `rest` cannot be chained into itself (the backstep). A dodge may cut
 * a blow short soon after it lands; without a lock a blow or a shot turns to a foe just off its line
 * (playtest round 7). The item action swallows a dose of Laudanum (its sanity returns on the move's `item` frame, sanity.ts).
 */

import { wrapAngle, yawOf, type V3 } from '../core/geom';
import type { MoveDef, MoveSet, Window } from '../data/moves';
import { COMBAT } from '../data/tuning';
import { isAbsent, type Actor, type Game } from './components';
import { ageBuffer, takeBuffered, type ActionId } from './inputBuffer';
import { canAfford, spend } from './stamina';
import { targetsOf } from './targets';

export const inWindow = (w: Window | undefined, frame: number): boolean =>
  w !== undefined && frame >= w[0] && frame < w[1];

export const moveDef = (a: Actor): MoveDef | undefined => (a.move === null ? undefined : a.moves[a.move]);

export function createActor(moves: MoveSet): Actor {
  return { moves, move: null, frame: 0, hitstop: 0, frozen: false, hits: new Set(), dir: { x: 0, z: 1 }, last: null, idle: 0, guard: false };
}

/**
 * Free, or inside the current move's cancel window; a dodge may also cut short a blow's recovery a
 * few frames after it has landed (COMBAT.evadeAfter), before the cancel window opens for the rest.
 */
export function canAct(a: Actor, action: ActionId | null = null): boolean {
  if (a.move === null) return true;
  const def = moveDef(a);
  const cancel = def?.cancel;
  if (cancel === undefined) return false;
  if (a.frame >= cancel) return true;
  const landed = def?.hit ? def.hit.window[1] : def?.shot ? def.shot.frame + 1 : undefined;
  return action === 'dodge' && landed !== undefined && a.frame >= landed + COMBAT.evadeAfter;
}

/** Without a lock, the foe a blow or a shot turns to: the nearest within COMBAT.assist of `yaw` (a longer reach for a shot). */
export function assistTarget(g: Game, from: V3, yaw: number, shot: boolean): V3 | undefined {
  const [range, arc] = shot ? [COMBAT.assist.range * 3, COMBAT.assist.arcDeg / 3] : [COMBAT.assist.range, COMBAT.assist.arcDeg];
  let best: V3 | undefined;
  let bestD = Infinity;
  for (const t of targetsOf(g, g.player.id)) {
    const p = g.ecs.c.transform.get(t)!.pos;
    const d = Math.hypot(p.x - from.x, p.z - from.z) - (g.ecs.c.body.get(t)?.radius ?? 0);
    if (d > range || d >= bestD) continue;
    if (Math.abs(wrapAngle(yawOf(p.x - from.x, p.z - from.z) - yaw)) > (arc * Math.PI) / 180) continue;
    [best, bestD] = [p, d];
  }
  return best;
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
    if (def.then && a.moves[def.then]) startMove(a, def.then); // a creature's chain runs straight on
  }
}

/** The move an attack button starts: the chain continues from the current move or one that just ended. */
export function comboMove(a: Actor, button: 'light' | 'heavy'): string {
  const from = a.move ?? (a.idle <= COMBAT.comboGrace ? a.last : null);
  const next = from === null ? undefined : a.moves[from]?.combo?.[button];
  return next ?? `${button}1`; // chains start at light1 / heavy1
}

/** Whether the guard may cut the move short now: an attack (a blow or a shot) winding up or recovering, not while it lands. */
export function guardCancels(a: Actor): boolean {
  const def = moveDef(a);
  if (def?.hit) return a.frame < def.hit.window[0] || a.frame >= def.hit.window[1];
  if (def?.shot) return a.frame !== def.shot.frame;
  return false;
}

/** Ends the move as if it had run its course. */
function finish(a: Actor): void {
  Object.assign(a, { last: a.move, idle: 0, move: null, frame: 0 });
}

const walking = (g: Game): boolean => {
  const m = g.ecs.c.mover.get(g.player.id);
  return !!m && Math.hypot(m.vx, m.vz) > 0.1;
};

/** Calls the move off; a chain begins afresh after it. */
function callOff(a: Actor): void {
  Object.assign(a, { move: null, frame: 0, last: null });
  a.hits.clear();
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
  const dodge = moving ? 'roll' : 'backstep';
  const move = action === 'light' || action === 'heavy' ? comboMove(a, action) : action === 'dodge' ? dodge : action === 'item' ? 'drink' : action === 'heal' ? 'inject' : action;
  const def = a.moves[move];
  if (!def) return;
  if (def.rest !== undefined && (a.move === move || (a.move === null && a.last === move && a.idle < def.rest))) return; // not again until it has rested
  if (action === 'item') {
    if (g.player.laudanum <= 0) return;
    g.player.laudanum--; // spent as the vial comes up, even if a blow cuts the swallow short
  }
  if (action === 'heal') {
    if (g.player.reagent <= 0) return;
    g.player.reagent--; // likewise the Reagent, as the needle comes up
  }
  if (st && def.stamina) spend(st, def.stamina);
  startMove(a, move);
  g.player.blockRaised = false; // a blow struck from behind a raised guard plays out

  const tr = transform.get(id)!;
  if (moving) a.dir = { x: m.vx / speed, z: m.vz / speed };
  const target = g.lock.target === null ? undefined : transform.get(g.lock.target)?.pos;
  if (move === 'backstep') return;
  if (move === 'roll') {
    if (!target) tr.yaw = yawOf(a.dir.x, a.dir.z);
    return;
  }
  const aim = target ?? (def.hit || def.shot ? assistTarget(g, tr.pos, moving ? yawOf(m.vx, m.vz) : tr.yaw, !!def.shot) : undefined); // without a lock, to a foe just off the line
  if (aim) tr.yaw = yawOf(aim.x - tr.pos.x, aim.z - tr.pos.z);
  else if (moving) tr.yaw = yawOf(m.vx, m.vz);
}

export function actionSystem(g: Game): void {
  const { actor } = g.ecs.c;
  for (const [id, a] of actor) if (!isAbsent(g, id)) advance(a);
  const p = g.player;
  const a = actor.get(p.id)!;
  const parrying = p.buffer.action === 'parry' && canAfford(g.ecs.c.stamina.get(p.id)); // a parry that cannot start calls nothing off
  if (!a.frozen && guardCancels(a) && (p.blockRaised || parrying)) callOff(a); // raising the guard cuts an attack short
  const release = moveDef(a)?.release;
  if (!a.frozen && release !== undefined && a.frame >= release && walking(g)) finish(a); // walked out of a dodge's recovery
  if (!a.frozen && canAct(a, p.buffer.action)) {
    const action = takeBuffered(p.buffer);
    if (action) startAction(g, a, action);
  }
  a.guard = a.move === null && p.blockHeld;
  ageBuffer(p.buffer);
}
