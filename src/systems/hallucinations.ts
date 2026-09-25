/**
 * Hallucinations hook (spec §3A, Unmoored only): lesser horrors the mind conjures behind the
 * investigator. They look and fight like the real thing, but their blows take only sanity, only the
 * investigator sees them (allies ignore them, and they hunt no one else), and they vanish when
 * struck, when their time runs out, or once the mind climbs out of Unmoored. Pure: no Three.js.
 */

import type { Entity } from '../core/ecs';
import { yawOf } from '../core/geom';
import { ENTITIES } from '../data/registry';
import type { ArchetypeId } from '../data/schema';
import { HALLUCINATIONS } from '../data/tuning';
import { resolveCapsule } from '../world/colliders';
import type { Game, HitOutcome } from './components';
import { spawnCreature } from './creatures';
import { loseSanity } from './sanity';

const DEG = Math.PI / 180;
const HUNTERS = new Set<ArchetypeId>(['pack_hunter', 'brute', 'skirmisher']);
const LANDED = new Set<HitOutcome>(['hit', 'stagger', 'riposte', 'interrupted', 'kill']);

/** What the mind conjures: lesser sprites that walk up and fight, and are not themselves hidden. */
export const PHANTOM_POOL: readonly string[] = ENTITIES.filter(
  (d) => d.tier === 'lesser' && d.sprite && !d.hidden && HUNTERS.has(d.behavior.archetype) && d.stats.damage > 0,
).map((d) => d.id);

export function vanish(g: Game, id: Entity, struck = false): void {
  const at = g.ecs.c.transform.get(id)?.pos;
  if (at) g.events.emit('Vanished', { entity: id, at: { ...at }, struck });
  g.ecs.despawn(id);
}

/** One apparition, somewhere behind the camera, already hunting the investigator. */
export function conjure(g: Game): Entity | undefined {
  const pp = g.ecs.c.transform.get(g.player.id)!.pos;
  const [near, far] = HALLUCINATIONS.distance;
  const yaw = g.camera.yaw + Math.PI + (g.rng() - 0.5) * HALLUCINATIONS.spread * DEG;
  const d = near + (far - near) * g.rng();
  const [x, z] = [pp.x + Math.sin(yaw) * d, pp.z + Math.cos(yaw) * d];
  const pos = { x, y: g.world.ground(x, z), z };
  resolveCapsule(g.world, pos, 0.5, 2); // out of walls, inside the arena
  const id = PHANTOM_POOL[Math.floor(g.rng() * PHANTOM_POOL.length)];
  const e = spawnCreature(g, id, { x: pos.x, z: pos.z, yaw: yawOf(pp.x - pos.x, pp.z - pos.z) });
  if (e === undefined) return undefined;
  const c = g.ecs.c;
  c.phantom.set(e, { life: HALLUCINATIONS.life });
  c.dread.delete(e); // no aura, no first sight: it is not there
  c.home.delete(e); // it never resets
  c.combatant.get(e)!.bounty = 0;
  const br = c.brain.get(e);
  if (br) Object.assign(br, { state: 'engage', target: g.player.id });
  return e;
}

/** One step: apparitions fade when their time is up, and new ones come while Unmoored. */
export function hallucinationSystem(g: Game): void {
  const { phantom } = g.ecs.c;
  for (const [id, p] of phantom) if (--p.life <= 0) vanish(g, id);
  const conjured = [...phantom.values()].filter((p) => !p.decoy).length; // a boss's decoys are not the mind's
  if (g.mind.band !== 'unmoored' || --g.mind.phantomIn > 0 || conjured >= HALLUCINATIONS.max) return;
  conjure(g);
  const [lo, hi] = HALLUCINATIONS.interval;
  g.mind.phantomIn = lo + Math.floor(g.rng() * (hi - lo + 1));
}

export function registerHallucinations(g: Game): void {
  g.events.on('SanityBandChanged', ({ to }) => {
    if (to === 'unmoored') g.mind.phantomIn = HALLUCINATIONS.onset;
    else for (const [id, p] of [...g.ecs.c.phantom]) if (!p.decoy) vanish(g, id);
  });
  g.events.on('Hit', ({ attacker, target, outcome }) => {
    const { phantom } = g.ecs.c;
    if (phantom.has(target) && outcome !== 'dodged') vanish(g, target, true);
    else if (phantom.has(attacker) && target === g.player.id && LANDED.has(outcome)) loseSanity(g, HALLUCINATIONS.sanity);
  });
}
