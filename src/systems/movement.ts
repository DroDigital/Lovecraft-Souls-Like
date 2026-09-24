/**
 * Kinematic capsule movement (spec §1, §3B): free locomotion from Mover intent, root motion and
 * tracking of moves, heightfield ground, collider push-out and body separation. No physics engine.
 */

import { turnToward } from '../core/geom';
import { resolveCapsule } from '../world/colliders';
import { inWindow, moveDef } from './actions';
import { isAbsent, type Game } from './components';

export function movementSystem(g: Game, dt: number): void {
  const { transform, body, mover, actor } = g.ecs.c;
  for (const [id, tr] of transform) {
    tr.prev.x = tr.pos.x;
    tr.prev.y = tr.pos.y;
    tr.prev.z = tr.pos.z;
    tr.prevYaw = tr.yaw;
    const b = body.get(id);
    const a = actor.get(id);
    if (!b || b.fixed || isAbsent(g, id) || a?.frozen) continue;
    const m = mover.get(id);
    const def = a && moveDef(a);
    if (a && def) {
      const mo = def.motion;
      if (mo && inWindow(mo.window, a.frame)) {
        const step = (mo.distance / (mo.window[1] - mo.window[0])) * (mo.dir === 'back' ? -1 : 1);
        const [dx, dz] = mo.dir === 'input' ? [a.dir.x, a.dir.z] : [Math.sin(tr.yaw), Math.cos(tr.yaw)];
        tr.pos.x += dx * step;
        tr.pos.z += dz * step;
      }
      const tk = def.track;
      if (tk && m?.face != null && inWindow(tk.window, a.frame)) tr.yaw = turnToward(tr.yaw, m.face, tk.rate * dt);
    } else if (m) {
      tr.pos.x += m.vx * dt;
      tr.pos.z += m.vz * dt;
      if (m.face !== null) tr.yaw = turnToward(tr.yaw, m.face, m.turnRate * dt);
    }
    tr.pos.y = g.world.ground(tr.pos.x, tr.pos.z);
    resolveCapsule(g.world, tr.pos, b.radius, b.height);
    tr.pos.y = g.world.ground(tr.pos.x, tr.pos.z);
  }
  separate(g);
}

/** Pushes overlapping bodies apart; fixed bodies never move. */
function separate(g: Game): void {
  const { transform, body } = g.ecs.c;
  const ids = [...body.keys()].filter((id) => !isAbsent(g, id) && transform.has(id));
  for (let i = 0; i < ids.length; i++) {
    for (let j = i + 1; j < ids.length; j++) {
      const ba = body.get(ids[i])!;
      const bb = body.get(ids[j])!;
      if (ba.fixed && bb.fixed) continue;
      const pa = transform.get(ids[i])!.pos;
      const pb = transform.get(ids[j])!.pos;
      const dx = pb.x - pa.x;
      const dz = pb.z - pa.z;
      const d = Math.hypot(dx, dz);
      const push = ba.radius + bb.radius - d;
      if (push <= 0) continue;
      const [nx, nz] = d > 1e-6 ? [dx / d, dz / d] : [1, 0];
      const wa = ba.fixed ? 0 : bb.fixed ? 1 : 0.5;
      pa.x -= nx * push * wa;
      pa.z -= nz * push * wa;
      pb.x += nx * push * (1 - wa);
      pb.z += nz * push * (1 - wa);
    }
  }
}
