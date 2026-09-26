/**
 * The shared behaviour state machine (spec §3C; the hunt reworked in playtest round 8). Every
 * creature runs it; its archetype params give it a temperament. A foe's states:
 * - hidden: lying in ambush or burrowed; strikes when a hostile comes within `reveal`.
 * - idle: keeps its post, now and then looking about; what it glimpses or hears stirs it
 *   (perception.ts builds its awareness: at once up close, over a moment farther off).
 * - alert: stirred but not yet sure: it turns to where it saw or heard something and closes in on
 *   it at a stalk; once sure it hunts, and if nothing more comes it settles back.
 * - engage: hunts its quarry (tactics.ts), rousing its kind as it begins; struck, any creature
 *   turns on whoever struck it.
 * - search: its quarry gone from sight and hearing, it goes to where it last knew it and looks
 *   about there; finding nothing, it goes home.
 * - return: walks home, keeping its wounds (only the investigator resting or dying makes a foe
 *   whole: death.ts); what it sees plainly on the way, within its leash, it turns on again.
 * Allies and bosses keep their own ways. An ally trails the player once met (follow) and turns on
 * what it notices. A boss is bound to its arena instead of a leash (bossArena.ts): it wakes as the
 * investigator steps into its ring, holds them while they stay near it, backs off only a little
 * and never past its rim.
 */

import type { Entity } from '../core/ecs';
import { distXZ, yawOf, type XZ } from '../core/geom';
import { AI, BOSS, SIM } from '../data/tuning';
import { arenaOf, within } from './bossArena';
import { isAbsent, type Actor, type ArenaCircle, type Brain, type Game, type Mover, type Transform } from './components';
import { callPack, hears, noiseOf, perceive, sight, tracks } from './perception';
import { assignTokens, fight, walk } from './tactics';
import { targetsOf } from './targets';

export { chooseAttack } from './tactics';

const LOSE_FRAMES = 120; // frames without perceiving the target before an ally gives up
const FOLLOW = [2.5, 4] as const; // allies: stop within, walk beyond (metres from the player)

/** A boss's quarry: the investigator while they are in reach of its ring (awake: its margin too); nothing beyond it. */
function arenaSight(g: Game, id: Entity, br: Brain, arena: ArenaCircle, seen: Entity | null): Entity | null {
  const c = g.ecs.c;
  const pp = c.transform.get(g.player.id)?.pos;
  const margin = br.state === 'engage' ? BOSS.margin : 0;
  const inPlay = (e: Entity | null): boolean => e !== null && within(arena, c.transform.get(e)!.pos, margin);
  if (inPlay(seen)) return seen;
  return pp && within(arena, pp, margin) && targetsOf(g, id).includes(g.player.id) ? g.player.id : null;
}

/** Home again: it faces as it was set and gathers itself, but its wounds stay. */
function settle(g: Game, id: Entity, br: Brain, m: Mover): void {
  br.state = 'idle';
  const h = g.ecs.c.home.get(id);
  if (h) m.face = h.yaw;
  const po = g.ecs.c.poise.get(id)!;
  po.value = po.max;
}

/** An ally or a boss: the ways they had before the hunt was reworked. */
function steady(g: Game, id: Entity, br: Brain, a: Actor, m: Mover, tr: Transform, arena: ArenaCircle | undefined): void {
  const p = br.def.params;
  const ally = br.def.archetype === 'ally';
  const anchor: XZ = ally ? g.ecs.c.transform.get(g.player.id)!.pos : g.ecs.c.home.get(id) ?? tr.pos;
  const perceived = perceive(g, id, br.target, p);
  const seen = arena ? arenaSight(g, id, br, arena, perceived) : perceived;
  br.lost = seen === null ? br.lost + 1 : 0;
  if (br.evadeIn) br.evadeIn--;
  if (seen !== null) br.target = seen;
  const target = br.target;
  const tp = target === null ? undefined : g.ecs.c.transform.get(target)?.pos;
  if (br.state === 'engage' && tp) m.face = yawOf(tp.x - tr.pos.x, tp.z - tr.pos.z); // also steers wind-ups
  if (a.move !== null) return;
  if (br.cooldown > 0) br.cooldown--;
  if (br.state === 'hidden') {
    if (seen !== null && tp && distXZ(tr.pos, tp) <= p.reveal) [br.state, br.cooldown] = ['engage', 0];
  } else if (br.state === 'idle' || br.state === 'follow' || br.state === 'alert' || br.state === 'search') {
    if (seen !== null) br.state = 'engage';
    else if (p.hide === 'ambush' || p.hide === 'burrow') br.state = 'hidden';
    else if (ally && (br.state === 'follow' || distXZ(tr.pos, anchor) <= p.aggro)) {
      br.state = 'follow'; // an ally waits where it stands until the investigator comes within sight
      if (distXZ(tr.pos, anchor) > FOLLOW[1]) walk(m, tr.pos, anchor, br.speed);
      else if (distXZ(tr.pos, anchor) < FOLLOW[0]) m.face = null;
    }
  } else if (br.state === 'engage') {
    const lose = arena ? BOSS.grace : LOSE_FRAMES;
    if (target === null || !tp || br.lost > lose || (!ally && !arena && distXZ(tr.pos, anchor) > p.leash)) {
      [br.state, br.target] = [ally ? 'follow' : 'return', null];
      return;
    }
    fight(g, id, br, m, target, arena);
  } else if (distXZ(tr.pos, anchor) > 0.3 && p.mobile) walk(m, tr.pos, anchor, br.speed);
  else settle(g, id, br, m);
}

/** A foe: its senses, its awareness, and what it does about them. */
function hunt(g: Game, id: Entity, br: Brain, a: Actor, m: Mover, tr: Transform, noise: number): void {
  const c = g.ecs.c;
  const p = br.def.params;
  const post = c.home.get(id);
  const anchor: XZ = post ?? tr.pos;
  const dt = 1 / SIM.hz;
  if (br.evadeIn) br.evadeIn--;
  let [quarry, clarity]: [Entity | null, number] = [null, 0];
  if (br.state === 'engage' && br.target !== null && tracks(g, id, br.target, p, noise)) [quarry, clarity] = [br.target, 1];
  else for (const f of targetsOf(g, id)) {
    const s = sight(g, id, f, p);
    if (s > clarity) [quarry, clarity] = [f, s];
  }
  const pp = c.transform.get(g.player.id)?.pos;
  const heard = quarry === null && pp !== undefined && noise > 0 && targetsOf(g, id).includes(g.player.id) && hears(g, id, pp, noise);
  if (quarry !== null || heard) {
    const at = quarry !== null ? c.transform.get(quarry)!.pos : pp!;
    [br.target, br.last, br.lost] = [quarry ?? g.player.id, { x: at.x, z: at.z }, 0];
    br.aware = clarity >= 1 ? 1 : Math.min(1, Math.max(br.aware ?? 0, heard ? 0.5 : 0) + ((heard ? 0.5 : clarity) * dt) / AI.notice);
  } else {
    br.lost++;
    if (br.state !== 'engage') br.aware = Math.max(0, (br.aware ?? 0) - dt / AI.forget);
  }
  const tp = br.target === null ? undefined : c.transform.get(br.target)?.pos;
  if (br.state === 'engage' && tp) m.face = yawOf(tp.x - tr.pos.x, tp.z - tr.pos.z); // also steers wind-ups
  if (a.move !== null) return;
  if (br.cooldown > 0) br.cooldown--;
  if (br.state === 'hidden') {
    if (quarry !== null && tp && distXZ(tr.pos, tp) <= p.reveal) [br.state, br.cooldown] = ['engage', 0];
    return;
  }
  const home = distXZ(tr.pos, anchor);
  if (br.state !== 'engage' && (br.aware ?? 0) >= 1 && br.target !== null && (br.state !== 'return' || home < p.leash * 0.8)) {
    br.state = 'engage';
    callPack(g, id, br.target);
  }
  if (br.state === 'engage') {
    if (br.target === null || !tp || home > p.leash) return void Object.assign(br, { state: 'return', target: null, aware: 0 });
    if (br.lost > AI.lose * SIM.hz) return void Object.assign(br, { state: 'search', searching: Math.round(AI.search * SIM.hz), aware: 0.5 });
    fight(g, id, br, m, br.target, undefined);
  } else if (br.state === 'search' || br.state === 'alert') {
    const last = br.last ?? anchor;
    const searching = br.state === 'search' && (br.searching = (br.searching ?? 0) - 1) > 0;
    if (br.state === 'search' ? !searching : (br.aware ?? 0) <= 0) return void Object.assign(br, { state: 'return', target: null, aware: 0 });
    if (distXZ(tr.pos, last) > 1.5 && p.mobile) walk(m, tr.pos, last, br.speed * (br.state === 'search' ? 0.8 : AI.stalk));
    else if (br.state === 'search' && (br.searching ?? 0) % 50 === 0) m.face = g.rng() * Math.PI * 2; // it looks about
    else if (br.state === 'alert') m.face = yawOf(last.x - tr.pos.x, last.z - tr.pos.z);
  } else if (br.state === 'return' || home > 0.3) {
    if (home > 0.3 && p.mobile) walk(m, tr.pos, anchor, br.speed);
    else settle(g, id, br, m);
  } else if ((br.aware ?? 0) > 0) br.state = 'alert';
  else if ((br.lookIn = (br.lookIn ?? 0) - 1) <= 0) { // idle at its post: now and then it looks about
    const [lo, hi] = AI.lookEvery;
    br.lookIn = Math.round((lo + (hi - lo) * g.rng()) * SIM.hz);
    if (p.mobile && p.hide === 'none') m.face = (post?.yaw ?? tr.yaw) + (g.rng() - 0.5) * 2.4;
  }
}

export function brainSystem(g: Game): void {
  const { brain, actor, mover, transform, health } = g.ecs.c;
  const noise = noiseOf(g);
  assignTokens(g);
  for (const [id, br] of brain) {
    const a = actor.get(id)!;
    const m = mover.get(id)!;
    const tr = transform.get(id)!;
    m.vx = 0;
    m.vz = 0;
    if (isAbsent(g, id) || a.frozen || (health.get(id)?.hp ?? 0) <= 0) continue;
    const arena = arenaOf(g, id);
    if (arena || br.def.archetype === 'ally') steady(g, id, br, a, m, tr, arena);
    else hunt(g, id, br, a, m, tr, noise);
  }
}
