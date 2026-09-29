/**
 * The particles of the Echoes' wisps (playtest round 20; render/echoFx.ts moves them): a body giving
 * up its Echoes, a wisp's bone-white heart in its halo of Void Green with the motes it leaves, and a
 * wisp drawn in. All self-lit.
 */

import type { V3 } from '../core/geom';
import { ECHO_FX } from '../data/tuning';
import type { Wisp } from './echoPath';
import { ANOMALY, BASE, mixRgb, type Rgb } from './palette';
import type { Particles } from './particles';

export interface EchoLook {
  /** A body giving up its Echoes: a soft flash and a ring of motes rising. */
  breath(at: V3, radius: number): void;
  /** A wisp's heart and halo for this frame (`dt` long), and the motes it drops. */
  trail(w: Wisp, dt: number): void;
  /** A wisp taken into the chest. */
  taken(at: V3): void;
}

const HEART: Rgb = mixRgb(BASE.bone, ANOMALY.green, 0.3);
const GREEN: Rgb = ANOMALY.green;
const rand = (a: number, b: number): number => a + (b - a) * Math.random();

export function echoLook(fx: Particles): EchoLook {
  return {
    breath(at, radius) {
      for (let i = 0; i < 14; i++) {
        const a = (i / 14) * Math.PI * 2 + rand(0, 0.4);
        const r = rand(0.1, radius);
        fx.spawn({
          x: at.x + Math.cos(a) * r, y: at.y + rand(-0.4, 0.3), z: at.z + Math.sin(a) * r,
          vx: Math.cos(a) * rand(0.2, 0.7), vy: rand(0.5, 1.5), vz: Math.sin(a) * rand(0.2, 0.7),
          life: rand(0.6, 1.1), size: rand(0.05, 0.1), grow: 0.4, color: mixRgb(GREEN, HEART, Math.random()), glow: true, drag: 1.2,
        });
      }
      fx.spawn({ x: at.x, y: at.y, z: at.z, life: 0.45, size: radius * 2.2, grow: 1.6, color: GREEN, alpha: 0.35, glow: true });
    },
    trail(w, dt) {
      const life = Math.max(0.06, dt * 1.6); // long enough to bridge to the next frame's
      const pulse = 1 + 0.25 * Math.sin(w.age * 14 + w.phase);
      fx.spawn({ x: w.x, y: w.y, z: w.z, life, size: 0.2 * pulse, color: HEART, glow: true });
      fx.spawn({ x: w.x, y: w.y, z: w.z, life, size: 0.55 * pulse, color: GREEN, alpha: 0.32, glow: true });
      for (let owed = ECHO_FX.trail * dt * 60; owed > 0; owed--) {
        if (Math.random() >= owed) continue;
        fx.spawn({
          x: w.x + rand(-0.06, 0.06), y: w.y + rand(-0.06, 0.06), z: w.z + rand(-0.06, 0.06),
          vx: rand(-0.15, 0.15), vy: rand(-0.05, 0.25), vz: rand(-0.15, 0.15),
          life: rand(0.5, 0.9), size: rand(0.06, 0.11), grow: 0.3, color: mixRgb(GREEN, ANOMALY.purple, rand(0, 0.6)), glow: true, alpha: 0.9, drag: 1.5,
        });
      }
    },
    taken(at) {
      for (let i = 0; i < 6; i++) {
        const a = rand(0, Math.PI * 2);
        fx.spawn({
          x: at.x, y: at.y + rand(-0.15, 0.15), z: at.z,
          vx: Math.cos(a) * rand(0.8, 2), vy: rand(-0.3, 0.8), vz: Math.sin(a) * rand(0.8, 2),
          life: rand(0.25, 0.45), size: rand(0.04, 0.08), color: HEART, glow: true, drag: 3,
        });
      }
      fx.spawn({ x: at.x, y: at.y, z: at.z, life: 0.2, size: 0.55, grow: 0.5, color: GREEN, alpha: 0.6, glow: true });
    },
  };
}
