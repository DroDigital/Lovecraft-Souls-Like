/**
 * The damage the investigator's blows add up to on each foe, shown beside its bar as soulslikes do
 * (playtest round 14): a run of blows adds to one number, which holds a moment after the last lands,
 * then fades; and each bar's lost share lingers pale behind it before draining (the chip).
 */

import type { Entity } from '../core/ecs';
import type { Game } from '../systems/components';

const HOLD_MS = 1500; // the number stays this long after the last blow...
const FADE_MS = 500; // ...then fades
const CHIP_HOLD_MS = 450; // a bar's lost share waits this long...
const CHIP_RATE = 0.45; // ...then drains this share of the bar a second

export interface Tally {
  /** The running total on `id` now, and how opaque it is (0: none). */
  total(id: Entity, now: number): readonly [text: string, opacity: number];
  /** The bar's chip for `id` at health share `share` now: the share it drains toward it from. */
  chip(id: Entity, share: number, now: number): number;
}

export function createTally(g: Game): Tally {
  const runs = new Map<Entity, { sum: number; at: number }>();
  const chips = new Map<Entity, { from: number; since: number; seen: number }>(); // the share it drains from, since when
  g.events.on('Hit', ({ attacker, target, damage }) => {
    if (attacker !== g.player.id || target === g.player.id || damage <= 0) return;
    const now = performance.now();
    const r = runs.get(target);
    runs.set(target, { sum: (r && now - r.at < HOLD_MS + FADE_MS ? r.sum : 0) + damage, at: now });
  });
  return {
    total(id, now) {
      const r = runs.get(id);
      if (!r) return ['', 0];
      const age = now - r.at;
      if (age >= HOLD_MS + FADE_MS) {
        runs.delete(id);
        return ['', 0];
      }
      return [String(r.sum), age < HOLD_MS ? 1 : 1 - (age - HOLD_MS) / FADE_MS];
    },
    chip(id, share, now) {
      const c = chips.get(id);
      const drained = c ? c.from - (CHIP_RATE * Math.max(0, now - c.since - CHIP_HOLD_MS)) / 1000 : share;
      if (!c || drained <= share || now - c.seen > 2000) {
        chips.set(id, { from: share, since: now, seen: now }); // caught up (or first seen): the next loss drains from here
        return share;
      }
      c.seen = now;
      return drained;
    },
  };
}
