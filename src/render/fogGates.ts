/**
 * The fog at an engaged ring's edge (round 12; systems/bossArena.ts `holdInVeil`): grey mist
 * rising all round the ring while it holds the investigator, thickest where they stand. Render
 * only: a steady rate of motes a second, whatever the frame rate. Round 27: the motes are of the
 * fog's own theme (data/fogThemes.ts), the same as the wall the investigator walked through.
 */

import type { Game } from '../systems/components';
import { FOG_THEMES, fogThemeOf } from '../data/fogThemes';
import type { Particles } from './particles';

const RATE = 110; // motes a second: a third of them round the whole ring, the rest near the investigator
const NEAR = 1.3; // radians of ring about them

export interface FogGates {
  update(time: number): void;
}

export function createFogGates(g: Game, particles: Particles): FogGates {
  let seed = 7;
  const rand = (): number => (seed = (seed * 16807) % 2147483647) / 2147483647;
  let last = -1;
  let owed = 0;
  return {
    update(time) {
      const dt = last < 0 ? 0 : Math.min(0.1, time - last);
      last = time;
      const me = g.ecs.c.transform.get(g.player.id)?.pos;
      const fights = [...g.ecs.c.fight.values()].filter((f) => f.veiled);
      const region = g.overworld?.region ?? '';
      if (!me || !fights.length) return void (owed = 0);
      owed += dt * RATE;
      for (; owed >= 1; owed--) {
        for (const f of fights) {
          const a = f.arena;
          const mist = FOG_THEMES[fogThemeOf([f.id], region)].base;
          const toward = Math.atan2(me.x - a.x, me.z - a.z);
          const yaw = rand() < 0.33 ? rand() * Math.PI * 2 : toward + (rand() - 0.5) * NEAR;
          const [x, z] = [a.x + Math.sin(yaw) * a.radius, a.z + Math.cos(yaw) * a.radius];
          particles.spawn({ x, y: g.world.ground(x, z) + rand() * 1.6, z, vy: 0.3 + rand() * 0.3, life: 2.4, size: 1.4, grow: 2.2, color: mist, alpha: 0.22, drag: 0.4 });
        }
      }
    },
  };
}
