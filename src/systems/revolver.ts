/**
 * The off-hand 1920s revolver (spec §3B): a hitscan shot on the move's shot frame, aimed at the
 * lock-on target or straight ahead. Low damage, but a hit during a foe's wind-up (its `interrupt`
 * window) interrupts the attack and opens a riposte, Bloodborne-style.
 */

import type { Entity } from '../core/ecs';
import type { V3 } from '../core/geom';
import { COMBAT } from '../data/tuning';
import { raycast } from '../world/colliders';
import { moveDef } from './actions';
import { capsuleGap2, strike, targetsOf } from './combat';
import { isAbsent, type Game } from './components';

function aimDir(g: Game, shooter: Entity, from: V3, yaw: number): V3 {
  const target = shooter === g.player.id ? g.lock.target : null;
  const p = target === null ? undefined : g.ecs.c.transform.get(target)?.pos;
  const body = target === null ? undefined : g.ecs.c.body.get(target);
  if (p && body) {
    const d = { x: p.x - from.x, y: p.y + body.aimHeight - from.y, z: p.z - from.z };
    const len = Math.hypot(d.x, d.y, d.z);
    if (len > 1e-6) return { x: d.x / len, y: d.y / len, z: d.z / len };
  }
  return { x: Math.sin(yaw), y: 0, z: Math.cos(yaw) };
}

export function shotSystem(g: Game): void {
  const { actor, transform } = g.ecs.c;
  for (const [id, a] of actor) {
    const shot = moveDef(a)?.shot;
    if (!shot || a.frozen || a.frame !== shot.frame || isAbsent(g, id)) continue;
    const tr = transform.get(id)!;
    const from = { x: tr.pos.x, y: tr.pos.y + COMBAT.muzzleHeight, z: tr.pos.z };
    const dir = aimDir(g, id, from, tr.yaw);
    const to = { x: from.x + dir.x * shot.range, y: from.y + dir.y * shot.range, z: from.z + dir.z * shot.range };
    let hitAt = raycast(g.world, from, to); // walls stop the bullet
    let target: Entity | null = null;
    for (const t of targetsOf(g, id)) {
      const { gap2, radius } = capsuleGap2(g, t, from, to);
      if (gap2 > (radius + COMBAT.shotRadius) ** 2) continue;
      const p = transform.get(t)!.pos;
      const along = ((p.x - from.x) * dir.x + (p.z - from.z) * dir.z) / shot.range;
      if (along < hitAt) {
        hitAt = Math.max(0, along);
        target = t;
      }
    }
    const end = { x: from.x + (to.x - from.x) * hitAt, y: from.y + (to.y - from.y) * hitAt, z: from.z + (to.z - from.z) * hitAt };
    g.events.emit('Shot', { shooter: id, from, to: end, target });
    if (target !== null) {
      const { damage, poise, hitstop } = shot;
      strike(g, id, target, { damage, poise, guard: damage, hitstop, parryable: false, interrupts: true });
    }
  }
}
