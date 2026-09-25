/**
 * Input buffer (spec §3B): one queued action with a 250 ms window (150 ms until playtest round 7). A newer press replaces the
 * queued one; the actions system consumes it at the end of recovery or at a cancel window.
 */

import { COMBAT, SIM } from '../data/tuning';

export type ActionId = 'light' | 'heavy' | 'dodge' | 'parry' | 'shoot' | 'item' | 'heal';

export interface InputBuffer {
  action: ActionId | null;
  age: number; // frames since the press
}

/** The window in sim frames: 250 ms at 60 Hz = 15. */
export const BUFFER_FRAMES = Math.round((COMBAT.bufferMs / 1000) * SIM.hz);

export const createBuffer = (): InputBuffer => ({ action: null, age: 0 });

export function bufferPress(b: InputBuffer, action: ActionId): void {
  b.action = action;
  b.age = 0;
}

/** Removes and returns the queued action, if it is still inside the window. */
export function takeBuffered(b: InputBuffer): ActionId | null {
  const a = b.age <= BUFFER_FRAMES ? b.action : null;
  b.action = null;
  return a;
}

/** Ages the queued action by one step, dropping it once the window has passed. */
export function ageBuffer(b: InputBuffer): void {
  if (b.action !== null && ++b.age > BUFFER_FRAMES) b.action = null;
}
