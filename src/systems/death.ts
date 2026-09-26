/**
 * Death and the Echo loop (spec §3B). The player drops their Echoes where they fell and respawns at
 * the last Elder Sign; enemies reset (in the open world, slain bosses are gone for good and killed
 * foes return: overworld.ts); touching the drop recovers it. Only one drop exists: dying again before
 * recovering it loses the old one. Kills pay the foe's bounty.
 */

import type { Entity } from '../core/ecs';
import { distXZ, type V3 } from '../core/geom';
import type { Place } from '../data/arena';
import { CAMERA, PLAYER } from '../data/tuning';
import type { Game, GameEvents } from './components';
import { createBuffer } from './inputBuffer';
import { setLock } from './lockOn';
import { spawnDrop } from './spawn';

function echoes(g: Game, change: GameEvents['Echoes']['change'], amount: number): void {
  g.events.emit('Echoes', { change, amount, total: g.player.echoes });
}

function dropEchoes(g: Game, at: V3): void {
  for (const id of g.ecs.query('drop')) {
    echoes(g, 'lost', g.ecs.c.drop.get(id)!.amount);
    g.ecs.despawn(id);
  }
  const amount = g.player.echoes;
  g.player.echoes = 0;
  if (amount <= 0) return;
  spawnDrop(g, amount, at);
  echoes(g, 'dropped', amount);
}

/** Subscribes the Echo rules to deaths. Call once per game. */
export function registerDeath(g: Game): void {
  g.events.on('Died', ({ entity, killer, at }) => {
    if (entity === g.player.id) return dropEchoes(g, at);
    const bounty = g.ecs.c.combatant.get(entity)?.bounty ?? 0;
    if (killer !== g.player.id || bounty <= 0) return;
    g.player.echoes += bounty;
    echoes(g, 'earned', bounty);
  });
}

/** Puts an entity back at `at`, whole: full health, poise and stamina, no move. */
export function restore(g: Game, id: Entity, at: Place): void {
  const { transform, health, poise, stamina, actor, mover, dead } = g.ecs.c;
  const tr = transform.get(id)!;
  tr.pos = { x: at.x, y: g.world.ground(at.x, at.z), z: at.z };
  tr.prev = { ...tr.pos };
  tr.yaw = at.yaw;
  tr.prevYaw = at.yaw;
  const h = health.get(id);
  if (h) [h.hp, h.calm] = [h.max, 0];
  const po = poise.get(id);
  if (po) [po.value, po.calm] = [po.max, 0];
  const st = stamina.get(id);
  if (st) [st.value, st.delay] = [st.max, 0];
  const a = actor.get(id);
  if (a) Object.assign(a, { move: null, frame: 0, hitstop: 0, frozen: false, last: null, idle: 0, guard: false });
  a?.hits.clear();
  const m = mover.get(id);
  if (m) Object.assign(m, { vx: 0, vz: 0, face: at.yaw });
  dead.delete(id);
}

/** Every enemy with a home goes back to it, whole and calm (on death, and on resting at an Elder Sign). */
export function resetFoes(g: Game): void {
  for (const [id, home] of g.ecs.c.home) {
    restore(g, id, home);
    const br = g.ecs.c.brain.get(id);
    if (br) Object.assign(br, { state: 'idle', target: null, lost: 0, cooldown: 0, aware: 0, last: null, searching: 0, fallBack: 0, detour: 0, stuck: 0 });
  }
}

/** Respawn at the last Elder Sign; the foes reset. */
function respawn(g: Game): void {
  const p = g.player;
  restore(g, p.id, p.checkpoint);
  resetFoes(g);
  Object.assign(p, { buffer: createBuffer(), dodgeHeld: -1, sprinting: false, blockRaised: false });
  setLock(g, null);
  Object.assign(g.camera, { yaw: p.checkpoint.yaw, prevYaw: p.checkpoint.yaw, pitch: CAMERA.pitch, prevPitch: CAMERA.pitch });
  g.events.emit('Respawned', { entity: p.id });
}

export function deathSystem(g: Game): void {
  const { actor, dead, transform, drop } = g.ecs.c;
  for (const [id, a] of actor) {
    if (a.move !== 'death' || dead.has(id) || a.frame < a.moves.death.frames - 1) continue;
    if (id === g.player.id) respawn(g);
    else dead.set(id, true);
  }
  if (actor.get(g.player.id)!.move === 'death') return;
  const pp = transform.get(g.player.id)!.pos;
  for (const [id, d] of drop) {
    if (distXZ(transform.get(id)!.pos, pp) > PLAYER.pickupRadius) continue;
    g.player.echoes += d.amount;
    echoes(g, 'recovered', d.amount);
    g.ecs.despawn(id);
  }
}
