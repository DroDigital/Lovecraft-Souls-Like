/**
 * The off-hand 1920s revolver (spec §3B): a hitscan shot on the move's shot frame, aimed at the
 * lock-on target or straight ahead. A hit during a foe's wind-up (its `interrupt` window) interrupts
 * the attack and opens a riposte, Bloodborne-style. The investigator's shots (round 22) spend a round
 * from the cylinder (gun.ts), strike hard up close, and fall away with distance: the bullet may stray
 * in a cone that widens with the range to what it is aimed at, so a small or far foe is more often missed
 * (the smaller the body, the narrower the mark), and what does hit it hits for less. A shot that keeps
 * under half its damage no longer interrupts.
 */

import type { Entity } from '../core/ecs';
import type { V3 } from '../core/geom';
import { COMBAT } from '../data/tuning';
import { raycast } from '../world/colliders';
import { moveDef } from './actions';
import { capsuleGap2, strike, targetsOf } from './combat';
import { isAbsent, type Game } from './components';
import { falloff, scatterAt, shotDamage } from './gun';

const AIMED = 0.8; // metres either side of the line a foe may stand and still be the one a shot is aimed at
const INTERRUPTS = 0.5; // the share of its damage a shot must keep to interrupt a wind-up

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

/** What a bullet from `from` along `dir` meets first: the fraction of `range` it flies, and the body, if it is one. `slack` widens every body. */
function firstHit(g: Game, shooter: Entity, from: V3, dir: V3, range: number, slack = 0): { along: number; target: Entity | null } {
  const to = { x: from.x + dir.x * range, y: from.y + dir.y * range, z: from.z + dir.z * range };
  let along = raycast(g.world, from, to); // walls stop the bullet
  let target: Entity | null = null;
  for (const t of targetsOf(g, shooter)) {
    const { gap2, radius } = capsuleGap2(g, t, from, to);
    if (gap2 > (radius + COMBAT.shotRadius + slack) ** 2) continue;
    const p = g.ecs.c.transform.get(t)!.pos;
    const at = ((p.x - from.x) * dir.x + (p.z - from.z) * dir.z - radius) / range; // to its near side, not its middle (round 24: a colossus's whole width was counted in the range)
    if (at < along) {
      along = Math.max(0, at);
      target = t;
    }
  }
  return { along, target };
}

/** `dir` turned by a random angle within `cone` radians of it, evenly over the cone's disc. */
function strayed(g: Game, dir: V3, cone: number): V3 {
  const flat = Math.hypot(dir.x, dir.z);
  const u: V3 = flat > 1e-6 ? { x: -dir.z / flat, y: 0, z: dir.x / flat } : { x: 1, y: 0, z: 0 }; // level, across the line
  const v: V3 = { x: dir.y * u.z - dir.z * u.y, y: dir.z * u.x - dir.x * u.z, z: dir.x * u.y - dir.y * u.x }; // and the third axis
  const [r, a] = [Math.tan(cone * Math.sqrt(g.rng())), g.rng() * Math.PI * 2];
  const [cu, cv] = [r * Math.cos(a), r * Math.sin(a)];
  const d = { x: dir.x + cu * u.x + cv * v.x, y: dir.y + cu * u.y + cv * v.y, z: dir.z + cu * u.z + cv * v.z };
  const len = Math.hypot(d.x, d.y, d.z);
  return { x: d.x / len, y: d.y / len, z: d.z / len };
}

export function shotSystem(g: Game): void {
  const { actor, transform } = g.ecs.c;
  for (const [id, a] of actor) {
    const shot = moveDef(a)?.shot;
    if (!shot || a.frozen || a.frame !== shot.frame || isAbsent(g, id)) continue;
    const mine = id === g.player.id;
    const tr = transform.get(id)!;
    const from = { x: tr.pos.x, y: tr.pos.y + COMBAT.muzzleHeight, z: tr.pos.z };
    let dir = aimDir(g, id, from, tr.yaw);
    if (mine) {
      g.player.ammo = Math.max(0, g.player.ammo - 1);
      const aimed = firstHit(g, id, from, dir, shot.range, AIMED); // what it is aimed at, or the wall or the open air the range to which is the range of the shot
      dir = strayed(g, dir, scatterAt(aimed.along * shot.range, g.player.gun));
    }
    const { along, target } = firstHit(g, id, from, dir, shot.range);
    const end = { x: from.x + dir.x * shot.range * along, y: from.y + dir.y * shot.range * along, z: from.z + dir.z * shot.range * along };
    g.events.emit('Shot', { shooter: id, from, to: end, target });
    if (target === null) continue;
    const [d, level] = [along * shot.range, mine ? g.player.gun : 0];
    const damage = mine ? shotDamage(shot.damage, d, level) : shot.damage;
    const kept = mine ? falloff(d, level) : 1;
    strike(g, id, target, { damage, poise: shot.poise * kept, guard: damage, hitstop: shot.hitstop, parryable: false, interrupts: kept >= INTERRUPTS });
  }
}
