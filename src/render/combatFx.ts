/**
 * Combat's particles (render only): blood and ichor where blows land, sparks off a guard or a
 * parry, dust where the investigator dives into a roll and comes up out of it, muzzle smoke, the
 * Reagent's green glow, and the dust of the fallen. Driven by game events and the player's move.
 */

import type { Entity } from '../core/ecs';
import type { V3 } from '../core/geom';
import type { Game } from '../systems/components';
import { ANOMALY, BASE, mixRgb, scaleRgb, type Rgb } from './palette';
import type { Particles } from './particles';

export interface CombatFx {
  update(): void;
}

const BLOOD: Rgb = scaleRgb(BASE.rust, 0.7);
const ICHOR: Rgb = mixRgb(BASE.seaGrey, BASE.charcoal, 0.5);
const SPARK: Rgb = mixRgb(BASE.bone, [1, 0.85, 0.6], 0.5);
const DUST: Rgb = mixRgb(BASE.bone, BASE.seaGrey, 0.5);

const rand = (a: number, b: number): number => a + (b - a) * Math.random();

export function createCombatFx(g: Game, fx: Particles): CombatFx {
  const c = g.ecs.c;
  const pos = (id: Entity): V3 | undefined => c.transform.get(id)?.pos;
  const height = (id: Entity): number => (c.body.get(id)?.aimHeight ?? 1.2) * 0.9;

  /** A spray of `n` droplets from `at`, flung along (dx, dz). */
  const spray = (at: V3, dx: number, dz: number, n: number, color: Rgb, speed: number, glow = false): void => {
    for (let i = 0; i < n; i++) {
      fx.spawn({
        x: at.x, y: at.y, z: at.z,
        vx: dx * speed * rand(0.4, 1.2) + rand(-1.5, 1.5), vy: rand(0.5, 3.2), vz: dz * speed * rand(0.4, 1.2) + rand(-1.5, 1.5),
        life: rand(0.35, 0.7), size: rand(0.05, 0.12), grow: 0.6, color, glow, gravity: 9, drag: 1.5,
      });
    }
  };
  const dust = (at: V3, n: number, spread: number, size = 0.35): void => {
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + rand(0, 0.5);
      fx.spawn({ x: at.x, y: at.y + 0.1, z: at.z, vx: Math.cos(a) * spread, vy: rand(0.2, 0.6), vz: Math.sin(a) * spread, life: rand(0.5, 0.9), size, grow: 2.2, color: DUST, alpha: 0.6, drag: 3 });
    }
  };

  g.events.on('Hit', (e) => {
    if (e.lingering) return;
    const to = pos(e.target);
    const from = pos(e.attacker);
    if (!to) return;
    const [dx, dz] = from ? [to.x - from.x, to.z - from.z] : [0, 0];
    const len = Math.hypot(dx, dz) || 1;
    const at = { x: to.x - (dx / len) * 0.3, y: to.y + height(e.target), z: to.z - (dz / len) * 0.3 };
    if (e.outcome === 'blocked' || e.outcome === 'guardBreak') spray(at, -dx / len, -dz / len, 10, SPARK, 2.5, true);
    else if (e.outcome === 'parried') spray(at, -dx / len, -dz / len, 18, SPARK, 4, true);
    else if (e.outcome !== 'dodged' && e.damage > 0) {
      const flesh = e.target === g.player.id ? BLOOD : ICHOR;
      spray(at, dx / len, dz / len, e.outcome === 'riposte' || e.outcome === 'kill' ? 22 : 10, flesh, 2.2);
    }
  });
  g.events.on('Shot', ({ from }) => {
    for (let i = 0; i < 5; i++) fx.spawn({ x: from.x, y: from.y, z: from.z, vy: rand(0.2, 0.7), vx: rand(-0.3, 0.3), vz: rand(-0.3, 0.3), life: rand(0.5, 1), size: 0.12, grow: 3, color: DUST, alpha: 0.5, drag: 2 });
  });
  g.events.on('Healed', ({ entity }) => {
    const p = pos(entity);
    if (!p) return;
    for (let i = 0; i < 26; i++) {
      const a = rand(0, Math.PI * 2);
      const r = rand(0.2, 0.55);
      fx.spawn({ x: p.x + Math.cos(a) * r, y: p.y + rand(0.1, 1.6), z: p.z + Math.sin(a) * r, vy: rand(0.4, 1.2), life: rand(0.6, 1.3), size: rand(0.04, 0.09), color: ANOMALY.green, glow: true, drag: 1 });
    }
  });
  g.events.on('Died', ({ entity, at }) => {
    if (entity !== g.player.id && c.combatant.has(entity)) dust(at, 12, 1.4, 0.5);
  });

  let rolling = false;
  let landed = false;
  return {
    update() {
      const a = c.actor.get(g.player.id);
      const p = pos(g.player.id);
      if (!a || !p) return;
      const roll = a.move === 'roll';
      if (roll && !rolling) dust(p, 8, 1.2); // the dive
      const mo = a.moves.roll?.motion;
      if (roll && !landed && mo && a.frame >= mo.window[0] + 0.8 * (mo.window[1] - mo.window[0])) { // as the tumble comes round
        dust(p, 10, 1.6); // coming up out of it
        landed = true;
      }
      if (!roll) landed = false;
      rolling = roll;
    },
  };
}
