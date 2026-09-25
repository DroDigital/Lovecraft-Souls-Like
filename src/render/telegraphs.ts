/**
 * Boss telegraphs (render only, spec §3E): while a boss winds up, the ground shows where its blow
 * will land, filling as the blow comes — a swing's arc, a slam's disc, a charge's lane, the lines
 * its bolts and beams will run along, the circle a pool will spread in, the arc a sweeping beam
 * will cross, the ground an eruption will mark, a quake's gathering ring, a vortex's reach and the
 * blast at its heart, a gaze's line — and while they last, the marks themselves and each quake's
 * racing ring. Only bosses show them; other foes are read by their bodies. Read-only on the simulation.
 */

import type { Entity } from '../core/ecs';
import type { V3 } from '../core/geom';
import type { MoveDef } from '../data/moves';
import { moveDef } from '../systems/actions';
import { isAbsent, type Game } from '../systems/components';
import { targetOf } from '../systems/specials';
import type { Decals } from './decals';
import { ANOMALY, BASE, mixRgb } from './palette';

const DANGER = ANOMALY.magenta; // where a blow lands
const LINE = mixRgb(ANOMALY.green, BASE.bone, 0.25); // where a bolt or a beam runs
const RING = BASE.bone; // a quake's band: roll through it
const MIND = ANOMALY.purple; // what works on the mind or draws the body in

export interface Telegraphs {
  update(alpha: number, time: number): void;
}

export function createTelegraphs(g: Game, decals: Decals): Telegraphs {
  const c = g.ecs.c;
  const lerp = (id: Entity, alpha: number): V3 | undefined => {
    const tr = c.transform.get(id);
    if (!tr) return undefined;
    const x = tr.prev.x + (tr.pos.x - tr.prev.x) * alpha;
    const z = tr.prev.z + (tr.pos.z - tr.prev.z) * alpha;
    return { x, y: g.world.ground(x, z), z };
  };

  /** What one boss's move shows at this frame. */
  function show(id: Entity, def: MoveDef, frame: number, alpha: number): void {
    const p = lerp(id, alpha)!;
    const tr = c.transform.get(id)!;
    const yaw = tr.prevYaw + (tr.yaw - tr.prevYaw) * alpha;
    const body = c.body.get(id)?.radius ?? 0.5;
    const quarry = targetOf(g, id);
    const tp = quarry !== id ? lerp(quarry, alpha) : undefined;
    const toward = tp ? Math.atan2(tp.x - p.x, tp.z - p.z) : yaw;
    const h = def.hit;
    if (h && frame < h.window[1]) {
      const fill = frame / h.window[0];
      const mo = def.motion;
      if (mo && mo.dir === 'facing') decals.lane(p.x, p.y, p.z, yaw, mo.distance + h.reach + h.radius, h.radius + 0.3, fill, DANGER);
      else if (h.reach < 0.05) decals.disc(p.x, p.y, p.z, h.radius + 0.4, fill, DANGER);
      else if (Math.abs(h.arc[0] - h.arc[1]) < 1) {
        const a = yaw - (h.arc[0] * Math.PI) / 180;
        decals.disc(p.x + Math.sin(a) * h.reach, p.y, p.z + Math.cos(a) * h.reach, h.radius + 0.4, fill, DANGER);
      } else decals.sector(p.x, p.y, p.z, yaw, h.reach + h.radius, h.arc, fill, DANGER);
    }
    const v = def.volley;
    if (v && frame < v.frame) {
      const fill = frame / v.frame;
      if (v.lob && tp) decals.disc(tp.x, tp.y, tp.z, v.pool?.radius ?? 1.2, fill, DANGER);
      else {
        for (let i = 0; i < v.count; i++) {
          const a = toward + (v.count > 1 ? (i / (v.count - 1) - 0.5) * v.spread * (Math.PI / 180) : 0);
          decals.lane(p.x, p.y, p.z, a, Math.min(v.range, 16), 0.06 + 0.5 * v.radius * fill, fill, LINE, 0.8);
        }
      }
    }
    if (def.shot && frame < def.shot.frame) {
      const fill = frame / def.shot.frame;
      decals.lane(p.x, p.y, p.z, toward, def.shot.range, 0.08 + 0.35 * fill, fill, LINE);
    }
    if (def.pool && frame < def.pool.frame && tp) decals.disc(tp.x, tp.y, tp.z, def.pool.radius, frame / def.pool.frame, DANGER);
    const m = def.marks;
    if (m && frame < m.frame && tp) {
      decals.disc(tp.x, tp.y, tp.z, m.radius, frame / m.frame, DANGER);
      decals.ring(tp.x, tp.y, tp.z, m.ring[1] + m.radius, 0.3, DANGER, 0.5);
    }
    if (def.wave && frame < def.wave.frame) decals.ring(p.x, p.y, p.z, body + 0.6 + 2.4 * (frame / def.wave.frame), 0.35, RING, 0.9);
    const sw = def.sweep;
    if (sw && frame < sw.window[0]) { // the arc it will cross, and where it starts (the beam itself shows as it sweeps)
      decals.sector(p.x, p.y, p.z, yaw, sw.length, sw.arc, frame / sw.window[0], LINE, 0.6);
      decals.lane(p.x, p.y, p.z, yaw - (sw.arc[0] * Math.PI) / 180, sw.length, 0.12, 1, LINE);
    }
    const b = def.barrage;
    if (b && frame < b.window[0]) decals.disc(p.x, p.y, p.z, body + 1.5, frame / b.window[0], LINE, 0.8);
    const pl = def.pull;
    if (pl && frame < pl.window[1]) {
      decals.swirl(p.x, p.y, p.z, pl.range, MIND, 0.6);
      const blast = def.then ? c.actor.get(id)?.moves[def.then]?.hit : undefined;
      if (blast) decals.disc(p.x, p.y, p.z, blast.radius + 0.4, frame / pl.window[1], DANGER);
    }
    const ef = def.effect;
    if (ef?.kind === 'gaze' && frame < ef.window[1]) decals.lane(p.x, p.y, p.z, toward, ef.range, 0.25, frame / ef.window[0], MIND, 0.6);
    if (ef?.kind === 'summon' && frame < ef.window[0]) decals.ring(p.x, p.y, p.z, body + 3, 0.5, MIND, 0.8);
    const sa = def.sanity;
    if (sa && !sa.sight && frame >= sa.window[0] && frame < sa.window[1]) {
      const t = (frame - sa.window[0]) / (sa.window[1] - sa.window[0]);
      decals.ring(p.x, p.y, p.z, body + t * sa.range, 0.8, MIND, 0.7 * (1 - t));
    }
  }

  return {
    update(alpha, time) {
      decals.begin();
      for (const [id, f] of c.fight) {
        const a = c.actor.get(id);
        const def = a && moveDef(a);
        if (!def || !a || isAbsent(g, id) || c.dead.has(id) || !f) continue;
        show(id, def, a.frame + alpha, alpha);
      }
      for (const [e, mk] of c.mark) {
        const p = c.transform.get(e)?.pos;
        if (p) decals.disc(p.x, p.y, p.z, mk.radius, 1 - (mk.delay - alpha) / mk.total, DANGER);
      }
      for (const [e, w] of c.wave) {
        const p = c.transform.get(e)?.pos;
        if (p) decals.ring(p.x, p.y, p.z, w.r + w.speed * alpha, w.width, RING);
      }
      decals.end(time);
    },
  };
}
