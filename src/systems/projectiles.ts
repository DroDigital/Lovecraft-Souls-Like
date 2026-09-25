/**
 * Bolts (spec §3E): on its launch frame a volley looses its bolts at the attacker's target, fanned
 * across its spread, flying straight or (lobbed) arcing to land where the target stood. Walls and
 * the ground stop them; the first hostile body one touches takes the blow, which a guard can block
 * and no parry turns; a roll's i-frames let it fly on through. Spit spreads its pool where it
 * lands. Pure: no Three.js.
 */

import type { Entity } from '../core/ecs';
import type { V3 } from '../core/geom';
import type { VolleyDef } from '../data/moves';
import { BOSS, SIM } from '../data/tuning';
import { raycast } from '../world/colliders';
import { moveDef } from './actions';
import { capsuleGap2, hostiles, strike } from './combat';
import { isAbsent, type Game } from './components';
import { spawnPool } from './hazards';
import { targetOf } from './specials';

const DEG = Math.PI / 180;

/** Where a volley is aimed: the target's chest, or straight ahead. */
function aimAt(g: Game, id: Entity): V3 | null {
  const t = targetOf(g, id);
  if (t === id) return null;
  const p = g.ecs.c.transform.get(t)?.pos;
  return p ? { x: p.x, y: p.y + (g.ecs.c.body.get(t)?.aimHeight ?? 1.2), z: p.z } : null;
}

export function launch(g: Game, id: Entity, v: VolleyDef): void {
  const c = g.ecs.c;
  const tr = c.transform.get(id)!;
  const body = c.body.get(id);
  const out = (body?.radius ?? 0.5) + 0.3;
  const from = { x: tr.pos.x + Math.sin(tr.yaw) * out, y: tr.pos.y + Math.min(body?.aimHeight ?? 1.2, 4), z: tr.pos.z + Math.cos(tr.yaw) * out };
  const aim = aimAt(g, id) ?? { x: from.x + Math.sin(tr.yaw) * 10, y: from.y, z: from.z + Math.cos(tr.yaw) * 10 };
  const [dx, dy, dz] = [aim.x - from.x, aim.y - from.y, aim.z - from.z];
  const flat = Math.max(0.5, Math.hypot(dx, dz));
  const yaw0 = Math.atan2(dx, dz);
  for (let i = 0; i < v.count; i++) {
    const yaw = yaw0 + (v.count > 1 ? (i / (v.count - 1) - 0.5) * v.spread * DEG : 0);
    let vel: V3;
    if (v.lob) {
      const t = flat / v.speed; // arcs to come down where the target stands
      vel = { x: Math.sin(yaw) * v.speed, y: (dy - 1 + 0.5 * BOSS.gravity * t * t) / t, z: Math.cos(yaw) * v.speed };
    } else {
      const len = Math.hypot(flat, dy);
      vel = { x: Math.sin(yaw) * v.speed * (flat / len), y: v.speed * (dy / len), z: Math.cos(yaw) * v.speed * (flat / len) };
    }
    loose(g, id, from, vel, v);
  }
}

/** One bolt from `owner`, leaving `from` at `vel`. */
export function loose(g: Game, owner: Entity, from: V3, vel: V3, v: Pick<VolleyDef, 'speed' | 'radius' | 'range' | 'damage' | 'poise' | 'lob' | 'pool'>): void {
  const c = g.ecs.c;
  const conjured = c.phantom.has(owner);
  const yaw = Math.atan2(vel.x, vel.z);
  const e = g.ecs.spawn();
  c.transform.set(e, { pos: { ...from }, prev: { ...from }, yaw, prevYaw: yaw });
  const life = Math.min(BOSS.boltLife, Math.ceil((v.range / v.speed) * SIM.hz) + (v.lob ? 60 : 0));
  const faction = c.combatant.get(owner)?.faction ?? 'enemy';
  c.bolt.set(e, { owner, faction, vel, radius: v.radius, damage: conjured ? 0 : v.damage, poise: conjured ? 0 : v.poise, life, lob: v.lob, conjured, passed: [], pool: v.pool });
  c.model.set(e, 'fx:bolt');
}

function land(g: Game, e: Entity, at: V3): void {
  const b = g.ecs.c.bolt.get(e)!;
  if (b.pool && !b.conjured) spawnPool(g, b.owner, b.faction, at, b.pool);
  g.ecs.despawn(e);
}

export function boltSystem(g: Game): void {
  const c = g.ecs.c;
  const dt = 1 / SIM.hz;
  for (const [id, a] of c.actor) {
    const v = moveDef(a)?.volley;
    if (v && !a.frozen && a.frame === v.frame && !isAbsent(g, id)) launch(g, id, v);
  }
  for (const [e, b] of c.bolt) {
    const tr = c.transform.get(e)!;
    const from = tr.pos;
    const to = { x: from.x + b.vel.x * dt, y: from.y + b.vel.y * dt, z: from.z + b.vel.z * dt };
    if (b.lob) b.vel.y -= BOSS.gravity * dt;
    tr.prev = { ...from };
    let struck = false;
    for (const t of hostiles(g, b.faction, b.conjured, false)) {
      const { gap2, radius } = capsuleGap2(g, t, from, to);
      if (b.passed.includes(t) || gap2 > (radius + b.radius) ** 2) continue;
      const outcome = strike(g, b.owner, t, { damage: b.damage, poise: b.poise, guard: b.damage, hitstop: 2, parryable: false, interrupts: false }, from);
      if (outcome === 'dodged') {
        b.passed.push(t); // it flies on through the roll
        continue;
      }
      const p = c.transform.get(t)!.pos;
      land(g, e, { x: p.x, y: p.y, z: p.z });
      struck = true;
      break;
    }
    if (struck) continue;
    const wall = raycast(g.world, from, to);
    const ground = g.world.ground(to.x, to.z);
    if (wall < 1) land(g, e, { x: from.x + (to.x - from.x) * wall, y: 0, z: from.z + (to.z - from.z) * wall });
    else if (to.y <= ground) land(g, e, { x: to.x, y: ground, z: to.z });
    else if (--b.life <= 0) g.ecs.despawn(e);
    else tr.pos = to;
  }
}
