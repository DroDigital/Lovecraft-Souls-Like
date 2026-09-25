/**
 * The boss attacks' particles (render only, spec §3E): marked ground bubbling before it bursts and
 * the burst itself, a quake's dust front racing out, bolts' glowing trails, motes drawn into a
 * vortex, sparks where a sweeping beam strikes, a teleport's implosion and arrival, a summoning's
 * rising motes, darkness pouring off its caller, and the shudder of a boss entering a new phase.
 * Driven by game events and the fight state. Read-only on the simulation.
 */

import type { V3 } from '../core/geom';
import { moveDef } from '../systems/actions';
import { isAbsent, type Game } from '../systems/components';
import { beamLine } from '../systems/strikes';
import { ANOMALY, BASE, mixRgb, scaleRgb, type Rgb } from './palette';
import type { Particles } from './particles';

export interface AttackFx {
  update(alpha: number): void;
}

const HOT: Rgb = ANOMALY.magenta;
const BOLT: Rgb = mixRgb(ANOMALY.green, BASE.bone, 0.2);
const DUST: Rgb = mixRgb(BASE.bone, BASE.seaGrey, 0.55);
const SMOKE: Rgb = scaleRgb(BASE.charcoal, 0.6);

const rand = (a: number, b: number): number => a + (b - a) * Math.random();

export function createAttackFx(g: Game, fx: Particles): AttackFx {
  const c = g.ecs.c;
  /** `n` motes flung out from `at` in a ring, rising. */
  const burst = (at: V3, n: number, color: Rgb, speed: number, glow: boolean, size = 0.14, up = 2): void => {
    for (let i = 0; i < n; i++) {
      const a = rand(0, Math.PI * 2);
      const s = speed * rand(0.4, 1);
      fx.spawn({ x: at.x, y: at.y + 0.2, z: at.z, vx: Math.cos(a) * s, vy: rand(0.3, 1) * up, vz: Math.sin(a) * s, life: rand(0.4, 0.9), size, grow: glow ? 0.5 : 2.4, color, glow, alpha: glow ? 1 : 0.7, drag: 2.2, gravity: glow ? 0 : 2 });
    }
  };
  const bodyAt = (id: number): V3 | undefined => {
    const p = c.transform.get(id)?.pos;
    return p && { x: p.x, y: p.y + (c.body.get(id)?.aimHeight ?? 1.2) * 0.8, z: p.z };
  };

  g.events.on('Erupted', ({ at, radius }) => {
    burst(at, 18, HOT, 1.2 * radius, true, 0.16, 4.5);
    burst(at, 14, DUST, 2.2 * radius, false, 0.4, 1);
  });
  g.events.on('Quaked', ({ at }) => burst(at, 20, DUST, 5, false, 0.5, 0.8));
  g.events.on('Teleported', ({ from, to }) => {
    burst({ ...from, y: from.y + 1 }, 16, ANOMALY.purple, 2.5, true, 0.12, 1.5);
    burst({ ...to, y: to.y + 1 }, 22, ANOMALY.purple, 3.5, true, 0.12, 2);
  });
  g.events.on('Summoned', ({ entity }) => {
    const p = c.transform.get(entity)?.pos;
    if (p) burst(p, 20, ANOMALY.green, 1.2, true, 0.1, 3);
  });
  g.events.on('Darkened', ({ by }) => {
    const p = bodyAt(by);
    if (p) burst(p, 30, SMOKE, 3.5, false, 0.9, 1);
  });
  g.events.on('GazeBurst', () => {
    const p = bodyAt(g.player.id);
    if (p) burst(p, 14, ANOMALY.purple, 1.5, true, 0.08, 1);
  });
  g.events.on('BossPhase', ({ entity, phase }) => {
    const p = c.transform.get(entity)?.pos;
    if (!p || phase === 0) return;
    const r = c.body.get(entity)?.radius ?? 0.5;
    burst(p, 40, HOT, 3 + r * 2, true, 0.18, 3);
    burst(p, 24, DUST, 4 + r * 2, false, 0.7, 1);
  });

  let tick = 0;
  return {
    update(alpha) {
      tick++;
      if (tick % 2 === 0) {
        for (const [e, b] of c.bolt) {
          const p = c.transform.get(e)!;
          const x = p.prev.x + (p.pos.x - p.prev.x) * alpha;
          const y = p.prev.y + (p.pos.y - p.prev.y) * alpha;
          const z = p.prev.z + (p.pos.z - p.prev.z) * alpha;
          fx.spawn({ x, y, z, life: 0.28, size: b.radius * 1.2, grow: 0.3, color: b.conjured ? ANOMALY.purple : BOLT, glow: true });
        }
      }
      for (const [e, mk] of c.mark) {
        const p = c.transform.get(e)!.pos;
        if (Math.random() > 1.2 - mk.delay / mk.total) continue; // bubbling harder as it nears bursting
        const a = rand(0, Math.PI * 2);
        const d = rand(0, mk.radius);
        fx.spawn({ x: p.x + Math.cos(a) * d, y: p.y + 0.1, z: p.z + Math.sin(a) * d, vy: rand(0.8, 2), life: 0.5, size: 0.1, color: HOT, glow: true });
      }
      for (const [e, w] of c.wave) {
        const p = c.transform.get(e)!.pos;
        for (let i = 0; i < 3; i++) {
          const a = rand(0, Math.PI * 2);
          fx.spawn({ x: p.x + Math.cos(a) * w.r, y: p.y + 0.2, z: p.z + Math.sin(a) * w.r, vy: rand(0.5, 1.5), vx: Math.cos(a), vz: Math.sin(a), life: 0.45, size: 0.35, grow: 2, color: DUST, alpha: 0.6, drag: 2 });
        }
      }
      for (const [id, a] of c.actor) {
        const def = moveDef(a);
        if (!def || isAbsent(g, id)) continue;
        const pl = def.pull;
        if (pl && a.frame >= pl.window[0] - 20 && a.frame < pl.window[1]) {
          const p = c.transform.get(id)!.pos;
          const ang = rand(0, Math.PI * 2);
          const r = pl.range * rand(0.6, 1);
          const k = -r * 1.3;
          fx.spawn({ x: p.x + Math.cos(ang) * r, y: p.y + rand(0.2, 1.5), z: p.z + Math.sin(ang) * r, vx: Math.cos(ang) * k - Math.sin(ang) * 2, vz: Math.sin(ang) * k + Math.cos(ang) * 2, life: 0.7, size: 0.12, color: ANOMALY.purple, glow: true });
        }
        const sw = def.sweep;
        if (sw && a.frame >= sw.window[0] && a.frame < sw.window[1]) {
          const { to } = beamLine(g, id, sw, a.frame + alpha);
          burst(to, 2, BOLT, 2.5, true, 0.1, 2);
        }
      }
    },
  };
}
