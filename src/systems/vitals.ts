/** Per-step recovery: stamina regen (or sprint drain), poise refill after a calm spell, the training dummy's heal. */

import { COMBAT } from '../data/tuning';
import type { Game } from './components';
import { tickStamina } from './stamina';

export function vitalsSystem(g: Game, dt: number): void {
  const { stamina, poise, health, actor } = g.ecs.c;
  for (const [id, s] of stamina) {
    const sprint = id === g.player.id && g.player.sprinting;
    tickStamina(s, sprint ? 'sprint' : actor.get(id)?.guard ? 'guard' : 'idle', dt);
  }
  for (const po of poise.values()) if (++po.calm >= COMBAT.poiseReset) po.value = po.max;
  for (const h of health.values()) if (h.immortal && ++h.calm >= COMBAT.dummyReset) h.hp = h.max;
}
