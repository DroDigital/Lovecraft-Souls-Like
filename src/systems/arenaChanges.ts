/**
 * Arena changes (spec §3E): what a boss phase does to its arena as it begins. What a change puts
 * up are props owned by the boss, and they all come down when the fight resets or ends.
 * - lamps: light sources around the arena, lit, for a boss that cannot bear light to snuff and the
 *   investigator to defend and relight (reality.ts).
 * - monoliths: standing stones to hide behind from a petrifying gaze (they block sight and feet).
 * - ship: the Alert, come to ram Cthulhu (signatures/cthulhu.ts).
 * Pure: no Three.js.
 */

import type { Entity } from '../core/ecs';
import type { XZ } from '../core/geom';
import { yawOf } from '../core/geom';
import type { ArenaChange } from '../data/schema';
import { BOSS, CTHULHU, REALITY } from '../data/tuning';
import type { Collider } from '../world/colliders';
import type { Fight, Game, Prop } from './components';

/** `n` points evenly round the arena at `share` of its radius, the first toward +z. */
export function ring(f: Fight, n: number, share: number): XZ[] {
  return Array.from({ length: n }, (_, k) => {
    const t = (k / n) * Math.PI * 2;
    return { x: f.arena.x + Math.sin(t) * f.arena.radius * share, z: f.arena.z + Math.cos(t) * f.arena.radius * share };
  });
}

/** A prop at `at`, turned to `yaw`; its colliders join the world until it comes down. */
export function spawnProp(g: Game, owner: Entity, kind: Prop['kind'], at: XZ, yaw = 0, colliders: Collider[] = []): Entity {
  const e = g.ecs.spawn();
  const pos = { x: at.x, y: g.world.ground(at.x, at.z), z: at.z };
  g.ecs.c.transform.set(e, { pos, prev: { ...pos }, yaw, prevYaw: yaw });
  g.ecs.c.prop.set(e, { kind, owner, lit: true, colliders });
  g.ecs.c.model.set(e, `fx:${kind}`);
  g.world.colliders.push(...colliders);
  return e;
}

function monolith(g: Game, e: Entity, p: XZ): Entity {
  const [w, h] = BOSS.monolith;
  const y = g.world.ground(p.x, p.z);
  const box: Collider = { kind: 'box', min: { x: p.x - w / 2, y: y - 0.5, z: p.z - w / 2 }, max: { x: p.x + w / 2, y: y + h, z: p.z + w / 2 } };
  return spawnProp(g, e, 'monolith', p, 0, [box]);
}

const CHANGES: Readonly<Record<ArenaChange, (g: Game, e: Entity, f: Fight) => void>> = {
  lamps: (g, e, f) => {
    for (const p of ring(f, REALITY.lamps, 0.6)) f.props.push(spawnProp(g, e, 'lamp', p));
  },
  monoliths: (g, e, f) => {
    for (const p of ring(f, BOSS.monoliths, BOSS.monolithShare)) f.props.push(monolith(g, e, p));
  },
  ship: (g, e, f) => {
    const [p] = ring(f, 1, CTHULHU.shipShare);
    f.props.push(spawnProp(g, e, 'ship', p, yawOf(f.arena.x - p.x, f.arena.z - p.z)));
  },
};

export const ARENA_CHANGE_IDS = Object.keys(CHANGES) as ArenaChange[];

export function applyChange(g: Game, e: Entity, f: Fight, change: ArenaChange): void {
  CHANGES[change](g, e, f);
}

/** Takes a prop down, colliders and all. */
export function removeProp(g: Game, p: Entity): void {
  const gone = new Set(g.ecs.c.prop.get(p)?.colliders ?? []);
  if (gone.size) g.world.colliders = g.world.colliders.filter((c) => !gone.has(c));
  g.ecs.despawn(p);
}

export function clearProps(g: Game, f: Fight): void {
  for (const p of f.props) removeProp(g, p);
  f.props = [];
}
