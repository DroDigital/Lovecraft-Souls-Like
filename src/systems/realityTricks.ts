/**
 * The reality hooks that play tricks on the investigator (spec §3E); the world's are in reality.ts.
 * - decoys: false copies of the boss hunt beside it. They look and fight like it, but their blows
 *   touch only the mind, and struck they vanish (the hallucination rules, hallucinations.ts).
 * - time_skip: moments go missing: the boss is suddenly elsewhere, its blow already falling.
 * - control_swap: the Great Race's body-theft. For a few breaths the investigator's body is not
 *   their own: it walks to the nearest foe and swings, guard down (playerControl.ts asks `possessed`).
 * Pure: no Three.js.
 */

import type { Entity } from '../core/ecs';
import { distXZ, yawOf } from '../core/geom';
import { emptyInput, type InputFrame } from '../core/input';
import { attackRange } from '../data/attacks';
import type { MoveDef } from '../data/moves';
import type { RealityHook } from '../data/schema';
import { REALITY } from '../data/tuning';
import { startMove } from './actions';
import { targetsOf } from './combat';
import type { Fight, Game } from './components';
import { creatureOf, spawnCreature } from './creatures';
import { groundNear } from './specials';

export type HookStep = (g: Game, fights: readonly [Entity, Fight][]) => void;

const between = (g: Game, [lo, hi]: readonly [number, number]): number => lo + Math.floor(g.rng() * (hi - lo + 1));

/** The frame a move's blow (or effect) lands on; null for a move with none. */
export const strikeFrame = (m: MoveDef | undefined): number | null =>
  m?.hit?.window[0] ?? m?.volley?.frame ?? m?.shot?.frame ?? m?.pool?.frame ?? m?.marks?.frame ?? m?.wave?.frame ?? m?.sweep?.window[0] ?? m?.barrage?.window[0] ?? m?.effect?.window[0] ?? null;

function decoy(g: Game, e: Entity, f: Fight): void {
  const k = creatureOf(g, e);
  if (!k) return;
  const c = g.ecs.c;
  const r = c.body.get(e)?.radius ?? 1;
  const p = groundNear(g, c.transform.get(e)!.pos, [2 * r + 1, 2 * r + 4], r, f.arena);
  const pp = c.transform.get(g.player.id)!.pos;
  const d = spawnCreature(g, k.id, { ...p, yaw: yawOf(pp.x - p.x, pp.z - p.z) }, k.variant);
  if (d === undefined) return;
  c.phantom.set(d, { life: REALITY.decoyLife, decoy: true });
  for (const store of [c.dread, c.home, c.fight, c.swap]) store.delete(d); // no dread, no home, no fight of its own
  c.combatant.get(d)!.bounty = 0;
  c.minion.set(d, e);
  f.minions.push(d);
  const br = c.brain.get(d);
  if (br) Object.assign(br, { state: 'engage', target: g.player.id });
}

const decoys: HookStep = (g, fights) => {
  for (const [e, f] of fights) {
    if (--f.decoyIn > 0) continue;
    f.decoyIn = between(g, REALITY.decoyEvery);
    if (f.minions.filter((m) => g.ecs.c.phantom.get(m)?.decoy).length < REALITY.decoys) decoy(g, e, f);
  }
};

const REACTIONS = new Set(['stagger', 'guardBreak', 'parried', 'death']);

/** The boss is elsewhere all at once, a few frames from one of its blows. */
function skipAhead(g: Game, e: Entity, f: Fight): void {
  const c = g.ecs.c;
  const a = c.actor.get(e)!;
  if (a.move !== null && REACTIONS.has(a.move)) return;
  const options = f.script.phases[f.phase].attacks.filter((x) => x.id !== 'summon' && x.id !== 'teleport' && strikeFrame(a.moves[x.id]) !== null);
  let roll = g.rng() * options.reduce((s, x) => s + x.weight, 0);
  const pick = options.find((x) => (roll -= x.weight) < 0);
  if (!pick) return;
  const body = c.body.get(e)!;
  const [lo, hi] = attackRange(pick.id, body.height);
  const d = Math.min(12, Math.max(body.radius + 1, (lo + hi) / 2));
  const pp = c.transform.get(g.player.id)!.pos;
  const p = groundNear(g, pp, [d, d], body.radius, f.arena);
  const tr = c.transform.get(e)!;
  tr.pos = { x: p.x, y: g.world.ground(p.x, p.z), z: p.z };
  tr.prev = { ...tr.pos };
  tr.yaw = tr.prevYaw = yawOf(pp.x - p.x, pp.z - p.z);
  startMove(a, pick.id);
  a.frame = Math.max(0, strikeFrame(a.moves[pick.id])! - REALITY.skipLead);
  g.events.emit('TimeSkipped', { entity: e });
}

const timeSkip: HookStep = (g, fights) => {
  const r = g.reality;
  if (!fights.length) return void (r.skipIn = REALITY.skipEvery[0]);
  if (--r.skipIn > 0) return;
  r.skipIn = between(g, REALITY.skipEvery);
  for (const [e, f] of fights) skipAhead(g, e, f);
};

const bodyTheft: HookStep = (g, fights) => {
  const r = g.reality;
  if (r.stolen > 0) r.stolen--;
  if (!fights.length || g.ecs.c.actor.get(g.player.id)!.move === 'death') {
    r.swapIn = REALITY.swapFirst;
    if (!fights.length) r.stolen = 0;
    return;
  }
  if (r.stolen > 0 || --r.swapIn > 0) return;
  r.swapIn = between(g, REALITY.swapEvery);
  r.stolen = REALITY.swapFrames;
  g.events.emit('BodyStolen', { frames: REALITY.swapFrames });
};

export const REALITY_TRICKS = { decoys, time_skip: timeSkip, control_swap: bodyTheft } satisfies Partial<Record<RealityHook, HookStep>>;

/** What the thief does with a stolen body: walks it to the nearest foe and swings. The eyes stay the investigator's. */
export function possessed(g: Game, real: InputFrame): InputFrame {
  const input = { ...emptyInput(), lookX: real.lookX, lookY: real.lookY };
  const c = g.ecs.c;
  const me = c.transform.get(g.player.id)!.pos;
  let best: Entity | null = null;
  let bestD = Infinity;
  for (const t of targetsOf(g, g.player.id)) {
    const d = distXZ(c.transform.get(t)!.pos, me) - (c.body.get(t)?.radius ?? 0);
    if (d < bestD) [best, bestD] = [t, d];
  }
  if (best === null) return input;
  if (bestD <= REALITY.swapReach) {
    input.pressed.light = g.frame % 30 === 0;
    return input;
  }
  const tp = c.transform.get(best)!.pos;
  const d = yawOf(tp.x - me.x, tp.z - me.z) - g.camera.yaw;
  [input.moveX, input.moveY] = [-Math.sin(d), Math.cos(d)];
  return input;
}
