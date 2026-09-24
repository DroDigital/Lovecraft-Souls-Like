/**
 * Arena changes (spec §3E): what a boss phase does to its arena as it begins. What a change puts
 * up are props owned by the boss, and they all come down when the fight resets or ends.
 * - lamps: light sources around the arena, lit, for a boss that cannot bear light to snuff and the
 *   investigator to defend and relight (reality.ts).
 * Pure: no Three.js.
 */

import type { Entity } from '../core/ecs';
import type { XZ } from '../core/geom';
import type { ArenaChange } from '../data/schema';
import { REALITY } from '../data/tuning';
import type { Fight, Game, Prop } from './components';

/** `n` points evenly round the arena at `share` of its radius, the first toward +z. */
export function ring(f: Fight, n: number, share: number): XZ[] {
  return Array.from({ length: n }, (_, k) => {
    const t = (k / n) * Math.PI * 2;
    return { x: f.arena.x + Math.sin(t) * f.arena.radius * share, z: f.arena.z + Math.cos(t) * f.arena.radius * share };
  });
}

export function spawnProp(g: Game, owner: Entity, kind: Prop['kind'], at: XZ): Entity {
  const e = g.ecs.spawn();
  const pos = { x: at.x, y: g.world.ground(at.x, at.z), z: at.z };
  g.ecs.c.transform.set(e, { pos, prev: { ...pos }, yaw: 0, prevYaw: 0 });
  g.ecs.c.prop.set(e, { kind, owner, lit: true });
  g.ecs.c.model.set(e, `fx:${kind}`);
  return e;
}

const CHANGES: Readonly<Record<ArenaChange, (g: Game, e: Entity, f: Fight) => void>> = {
  lamps: (g, e, f) => {
    for (const p of ring(f, REALITY.lamps, 0.6)) f.props.push(spawnProp(g, e, 'lamp', p));
  },
};

export const ARENA_CHANGE_IDS = Object.keys(CHANGES) as ArenaChange[];

export function applyChange(g: Game, e: Entity, f: Fight, change: ArenaChange): void {
  CHANGES[change](g, e, f);
}

export function clearProps(g: Game, f: Fight): void {
  for (const p of f.props) g.ecs.despawn(p);
  f.props = [];
}
