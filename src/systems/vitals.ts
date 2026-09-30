/** Per-step recovery: stamina regen (or sprint drain), poise refill after a calm spell, the training dummy's heal. */

import { COMBAT, SANITY } from '../data/tuning';
import type { Game } from './components';
import { tickStamina } from './stamina';

export function vitalsSystem(g: Game, dt: number): void {
  const { stamina, poise, health, actor } = g.ecs.c;
  for (const [id, s] of stamina) {
    const sprint = id === g.player.id && g.player.sprinting;
    const unmoored = id === g.player.id && g.mind.band === 'unmoored'; // a mind come apart tires the body (round 23)
    tickStamina(s, sprint ? 'sprint' : actor.get(id)?.guard ? 'guard' : 'idle', dt, unmoored ? SANITY.unmoored.stamina : 1);
  }
  for (const po of poise.values()) {
    if (++po.calm >= COMBAT.poiseReset) po.value = po.max;
    if (po.grace) po.grace--;
  }
  for (const h of health.values()) if (h.immortal && ++h.calm >= COMBAT.dummyReset) h.hp = h.max;
}
