/**
 * Placeholder melee brain for the Phase 1 Deep One: wakes when it sees the player close by, closes
 * in, attacks from data (weighted by range bracket), and leashes home, healing on arrival.
 * Phase 2 replaces it with the shared behaviour archetypes.
 */

import { distXZ, yawOf, type V3, type XZ } from '../core/geom';
import type { Rng } from '../core/rng';
import type { BrainDef } from '../data/placeholders';
import { PLAYER } from '../data/tuning';
import { hasLineOfSight } from '../world/colliders';
import { startMove } from './actions';
import type { Game, Mover } from './components';

/** Weighted pick among the attacks whose range bracket contains `d`; null when none fits. */
export function chooseAttack(def: BrainDef, d: number, rng: Rng): string | null {
  const fits = def.attacks.filter((a) => d >= a.range[0] && d <= a.range[1]);
  let roll = rng() * fits.reduce((sum, a) => sum + a.weight, 0);
  for (const a of fits) if ((roll -= a.weight) < 0) return a.move;
  return null;
}

function walk(m: Mover, from: XZ, to: XZ, speed: number): void {
  const dx = to.x - from.x;
  const dz = to.z - from.z;
  const d = Math.hypot(dx, dz);
  if (d < 1e-6) return;
  m.vx = (dx / d) * speed;
  m.vz = (dz / d) * speed;
  m.face = yawOf(dx, dz);
}

export function brainSystem(g: Game): void {
  const { brain, actor, mover, transform, home, dead, health, poise } = g.ecs.c;
  const pp = transform.get(g.player.id)!.pos;
  const playerUp = (health.get(g.player.id)?.hp ?? 0) > 0;
  const eye = (p: V3): V3 => ({ x: p.x, y: p.y + PLAYER.eyeHeight, z: p.z });
  for (const [id, br] of brain) {
    const a = actor.get(id)!;
    const m = mover.get(id)!;
    const tr = transform.get(id)!;
    const h = home.get(id)!;
    m.vx = 0;
    m.vz = 0;
    if (dead.has(id) || a.frozen || (health.get(id)?.hp ?? 0) <= 0) continue;
    const d = distXZ(tr.pos, pp);
    if (br.state === 'chase') m.face = yawOf(pp.x - tr.pos.x, pp.z - tr.pos.z); // also steers wind-ups
    if (a.move !== null) continue;
    if (br.cooldown > 0) br.cooldown--;

    if (br.state === 'idle') {
      if (playerUp && d <= br.def.aggro && hasLineOfSight(g.world, eye(tr.pos), eye(pp))) br.state = 'chase';
    } else if (br.state === 'chase') {
      if (!playerUp || distXZ(pp, h) > br.def.leash) {
        br.state = 'return';
        continue;
      }
      const attack = br.cooldown === 0 ? chooseAttack(br.def, d, g.rng) : null;
      if (attack) {
        startMove(a, attack);
        const [lo, hi] = br.def.cooldown;
        br.cooldown = lo + Math.floor(g.rng() * (hi - lo + 1));
      } else if (d > br.def.stop) walk(m, tr.pos, pp, br.speed);
    } else if (distXZ(tr.pos, h) > 0.3) {
      walk(m, tr.pos, h, br.speed);
    } else {
      br.state = 'idle';
      m.face = h.yaw;
      const hp = health.get(id)!;
      hp.hp = hp.max;
      const po = poise.get(id)!;
      po.value = po.max;
    }
  }
}
