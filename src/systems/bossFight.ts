/**
 * Boss fights (spec §3E). A creature with a boss script fights by it. The fight begins when it turns
 * on the investigator; each time its health falls below the next phase's `hpBelow` that phase begins:
 * its weighted attacks replace the last ones, its summons rise (unless it calls them itself with a
 * summon attack), its arena change happens, and its reality hooks hold while it lasts (reality.ts).
 * A signature mechanic runs beside it where the spec gives one (signatures.ts). The investigator's
 * death, or the boss giving up the chase, resets the fight; the boss's death ends it. Its summons,
 * decoys and props go with it either way. Pure: no Three.js.
 */

import type { Entity } from '../core/ecs';
import { applyChange, clearProps, removeProp } from './arenaChanges';
import type { ArenaCircle, Fight, Game } from './components';
import { defOf } from './creatures';
import { phaseAt, phaseBrain } from './fightPhase';
import { SIGNATURES } from './signatures';
import { summon } from './specials';

/** Fights under way: engaged, with their boss alive. */
export const engagedFights = (g: Game): [Entity, Fight][] =>
  [...g.ecs.c.fight].filter(([e, f]) => f.engaged && !g.ecs.c.dead.has(e) && (g.ecs.c.health.get(e)?.hp ?? 0) > 0);

/** Where the boss holds its fight (its arena site or dungeon room). */
export function setArena(g: Game, e: Entity, arena: ArenaCircle): void {
  const f = g.ecs.c.fight.get(e);
  if (f) f.arena = { ...arena };
}

/** The boss's brain for its current phase, with whatever its signature lends it. */
export function refreshBrain(g: Game, e: Entity, f: Fight): void {
  f.form = g.ecs.c.model.get(e) ?? '';
  const def = defOf(g, e);
  const body = g.ecs.c.body.get(e);
  const br = g.ecs.c.brain.get(e);
  if (def && body && br) br.def = phaseBrain(def, f.phase, body.height, SIGNATURES[f.id]?.extra?.(g, e, f), f.script);
}

function enterPhase(g: Game, e: Entity, f: Fight, i: number): void {
  f.phase = i;
  refreshBrain(g, e, f);
  const po = g.ecs.c.poise.get(e);
  if (po && i > 0) po.value = po.max; // a new phase shrugs off the stagger
  const ph = f.script.phases[i];
  if (ph.arenaChange && !f.changes.has(ph.arenaChange)) {
    f.changes.add(ph.arenaChange);
    applyChange(g, e, f, ph.arenaChange);
  }
  if (!ph.attacks.some((a) => a.id === 'summon')) for (const id of ph.summons ?? []) summon(g, e, id);
  g.events.emit('BossPhase', { entity: e, phase: i });
}

function engage(g: Game, e: Entity, f: Fight): void {
  Object.assign(f, { engaged: true, frames: 0, sig: {} });
  g.events.emit('BossEngaged', { entity: e, name: g.ecs.c.combatant.get(e)?.name ?? f.id });
  SIGNATURES[f.id]?.engage?.(g, e, f);
  enterPhase(g, e, f, 0);
}

/** Its summons, decoys and props go. */
function clearArena(g: Game, f: Fight): void {
  for (const m of f.minions) g.ecs.despawn(m);
  f.minions = [];
  clearProps(g, f);
  f.changes.clear();
}

/** Back to before the fight began: its first phase returns (its health is the reset's business). */
export function resetFight(g: Game, e: Entity, f: Fight): void {
  if (f.engaged) SIGNATURES[f.id]?.reset?.(g, e, f);
  clearArena(g, f);
  Object.assign(f, { engaged: false, frames: 0, phase: 0, sig: {} });
  refreshBrain(g, e, f);
  const h = g.ecs.c.health.get(e);
  if (h) h.ward = undefined;
}

function endFight(g: Game, e: Entity, f: Fight): void {
  SIGNATURES[f.id]?.end?.(g, e, f);
  clearArena(g, f);
  f.engaged = false;
}

/** Summons and props whose summoner or boss is gone go too; dead summons are cleared away. */
function sweep(g: Game): void {
  const c = g.ecs.c;
  for (const [m, by] of c.minion) if (c.dead.has(m) || !c.transform.has(by)) g.ecs.despawn(m);
  for (const [p, prop] of c.prop) if (!c.fight.has(prop.owner)) removeProp(g, p);
}

export function fightSystem(g: Game): void {
  sweep(g);
  const c = g.ecs.c;
  for (const [e, f] of c.fight) {
    const h = c.health.get(e);
    if (c.dead.has(e) || !h || h.hp <= 0) continue;
    const hunting = c.brain.get(e)?.state === 'engage';
    if (!f.engaged) {
      if (hunting) engage(g, e, f);
      continue;
    }
    if (!hunting) {
      resetFight(g, e, f); // it gave up the chase
      continue;
    }
    f.frames++;
    h.ward = undefined; // the signature and the hooks set it afresh each step
    if (c.model.get(e) !== f.form) refreshBrain(g, e, f); // it changed form (a variant swap)
    f.minions = f.minions.filter((m) => c.transform.has(m));
    const at = phaseAt(f.script, h.hp / h.max);
    for (let i = f.phase + 1; i <= at; i++) enterPhase(g, e, f, i);
    SIGNATURES[f.id]?.step?.(g, e, f);
  }
}

/** Subscribes the fights to deaths: a boss's ends its fight; the investigator's resets them all. */
export function registerFights(g: Game): void {
  g.events.on('Died', ({ entity }) => {
    const f = g.ecs.c.fight.get(entity);
    if (f?.engaged) endFight(g, entity, f);
  });
  g.events.on('Respawned', () => {
    for (const [e, f] of g.ecs.c.fight) resetFight(g, e, f);
    for (const m of [...g.ecs.c.minion.keys()]) g.ecs.despawn(m);
  });
}
