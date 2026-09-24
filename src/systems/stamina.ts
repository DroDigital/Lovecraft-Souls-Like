/**
 * Stamina rules (spec §3B): every action has a cost, regen waits after any spending, and a blocked
 * hit that empties the bar breaks the guard. As in Dark Souls, any stamina left lets an action start.
 */

import { STAMINA } from '../data/tuning';
import type { Stamina } from './components';

export type StaminaMode = 'idle' | 'guard' | 'sprint';

/** Entities without stamina (enemies) can always act. */
export const canAfford = (s: Stamina | undefined): boolean => !s || s.value > 0;

export function spend(s: Stamina, cost: number): void {
  s.value = Math.max(0, s.value - cost);
  s.delay = STAMINA.regenDelay;
}

/** Takes a blocked hit's stamina damage; true when it empties the bar (guard break). */
export function absorb(s: Stamina, amount: number): boolean {
  spend(s, amount);
  return s.value <= 0;
}

/** One sim step: sprint drains, otherwise regen resumes once the delay has run out (slower while guarding). */
export function tickStamina(s: Stamina, mode: StaminaMode, dt: number): void {
  if (mode === 'sprint') return spend(s, STAMINA.sprintDrain * dt);
  if (s.delay > 0) {
    s.delay--;
    return;
  }
  s.value = Math.min(s.max, s.value + STAMINA.regen * dt * (mode === 'guard' ? STAMINA.guardRegen : 1));
}
