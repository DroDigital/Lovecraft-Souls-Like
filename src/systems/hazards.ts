/**
 * Pools (spec §3E): what the pool attack spreads and lobbed spit leaves where it lands. Each one
 * hurts every hostile standing in it once a tick until it dries up; a guard is no use, a roll's
 * i-frames are. Pure: no Three.js.
 */

import type { Entity } from '../core/ecs';
import { distXZ, type XZ } from '../core/geom';
import type { PoolDef } from '../data/moves';
import { hostiles, strike } from './combat';
import type { Combatant, Game } from './components';

export function spawnPool(g: Game, owner: Entity, faction: Combatant['faction'], at: XZ, pool: PoolDef): Entity {
  const e = g.ecs.spawn();
  const pos = { x: at.x, y: g.world.ground(at.x, at.z), z: at.z };
  g.ecs.c.transform.set(e, { pos, prev: { ...pos }, yaw: 0, prevYaw: 0 });
  g.ecs.c.hazard.set(e, { owner, faction, radius: pool.radius, damage: pool.damage, tick: pool.tick, life: pool.life, next: 0 });
  g.ecs.c.model.set(e, 'fx:pool');
  return e;
}

export function hazardSystem(g: Game): void {
  const { hazard, transform, body } = g.ecs.c;
  for (const [id, h] of hazard) {
    if (--h.life <= 0) {
      g.ecs.despawn(id);
      continue;
    }
    if (--h.next > 0) continue;
    h.next = h.tick;
    const at = transform.get(id)!.pos;
    for (const t of hostiles(g, h.faction, false, false)) {
      const p = transform.get(t)!.pos;
      if (distXZ(p, at) > h.radius + (body.get(t)?.radius ?? 0) * 0.5 || Math.abs(p.y - at.y) > 1.5) continue;
      strike(g, h.owner, t, { damage: h.damage, poise: 0, guard: 0, hitstop: 0, parryable: false, interrupts: false, unblockable: true, lingering: true }, at);
    }
  }
}
