/** Entity factories for the Phase 1 arena: the player, data-defined combatants and Echo drops. */

import type { Entity } from '../core/ecs';
import type { V3 } from '../core/geom';
import type { Place } from '../data/arena';
import { PLAYER_MOVES } from '../data/moves';
import type { CombatantDef } from '../data/placeholders';
import { PLAYER } from '../data/tuning';
import { createActor } from './actions';
import type { Game } from './components';

type Spawner = Pick<Game, 'ecs' | 'world'>;

/** The investigator, as combatant data built from tuning numbers and the player moveset. */
export const PLAYER_DEF: CombatantDef = {
  name: 'Investigator',
  model: 'player',
  hp: PLAYER.hp,
  poise: PLAYER.poise,
  speed: PLAYER.walkSpeed,
  radius: PLAYER.radius,
  height: PLAYER.height,
  aimHeight: PLAYER.aimHeight,
  bounty: 0,
  moves: PLAYER_MOVES,
};

export function spawnCombatant(g: Spawner, def: CombatantDef, at: Place, faction: 'player' | 'enemy'): Entity {
  const e = g.ecs.spawn();
  const c = g.ecs.c;
  const pos = { x: at.x, y: g.world.ground(at.x, at.z), z: at.z };
  c.transform.set(e, { pos, prev: { ...pos }, yaw: at.yaw, prevYaw: at.yaw });
  c.body.set(e, { radius: def.radius, height: def.height, aimHeight: def.aimHeight, fixed: !!def.fixed });
  c.health.set(e, { hp: def.hp, max: def.hp, immortal: !!def.immortal, calm: 0 });
  c.poise.set(e, { value: def.poise, max: def.poise, calm: 0 });
  c.actor.set(e, createActor(def.moves));
  c.combatant.set(e, { name: def.name, faction, bounty: def.bounty });
  c.model.set(e, def.model);
  if (!def.fixed) c.mover.set(e, { vx: 0, vz: 0, face: at.yaw, turnRate: def.brain?.params.turnRate ?? PLAYER.turnRate });
  if (def.brain) {
    const hides = def.brain.params.hide === 'ambush' || def.brain.params.hide === 'burrow';
    c.brain.set(e, { def: def.brain, state: hides ? 'hidden' : 'idle', target: null, lost: 0, strafe: 1, cooldown: 0, speed: def.speed });
  }
  if (faction === 'enemy') c.home.set(e, { ...at });
  return e;
}

export function spawnPlayer(g: Spawner, at: Place): Entity {
  const e = spawnCombatant(g, PLAYER_DEF, at, 'player');
  g.ecs.c.stamina.set(e, { value: PLAYER.stamina, max: PLAYER.stamina, delay: 0 });
  return e;
}

export function spawnDrop(g: Spawner, amount: number, at: V3): Entity {
  const e = g.ecs.spawn();
  const pos = { ...at };
  g.ecs.c.transform.set(e, { pos, prev: { ...pos }, yaw: 0, prevYaw: 0 });
  g.ecs.c.drop.set(e, { amount });
  g.ecs.c.model.set(e, 'echo');
  return e;
}
