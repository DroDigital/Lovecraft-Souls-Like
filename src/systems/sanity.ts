/**
 * Sanity (spec §3A): 0–100 in four bands with 3-point hysteresis. Auras drain it by distance,
 * landed blows and roar/gaze moves take chunks (first sight is in insight.ts), respawning at the
 * Elder Sign and Laudanum restore it, and the band scales the damage the investigator deals and
 * takes. A band change is announced as `SanityBandChanged`, which the world hooks listen to. Pure.
 */

import type { Entity } from '../core/ecs';
import { distXZ } from '../core/geom';
import { LAUDANUM, SANITY, UPGRADES } from '../data/tuning';
import { hasLineOfSight } from '../world/colliders';
import { inWindow, moveDef } from './actions';
import { BANDS, isAbsent, type Band, type Game, type Mind } from './components';
import { aimPoint, playerEye } from './lockOn';

export const bandIndex = (b: Band): number => BANDS.indexOf(b);

/** At or below band `b`: `atOrBelow(m, 'fractured')` holds while Fractured or Unmoored. */
export const atOrBelow = (m: Mind, b: Band): boolean => bandIndex(m.band) >= bandIndex(b);

/** The band a sanity value falls in, ignoring history: Lucid ≥ 70, Uneasy ≥ 40, Fractured ≥ 15, else Unmoored. */
export function bandOf(sanity: number): Band {
  const i = SANITY.bands.findIndex((floor) => sanity >= floor);
  return BANDS[i === -1 ? BANDS.length - 1 : i];
}

/** The top of a band: 100 for Lucid, else the floor of the band above. */
export const bandCeiling = (b: Band): number => (b === 'lucid' ? SANITY.max : SANITY.bands[bandIndex(b) - 1]);

/** The band once sanity reaches `sanity` from band `current`: it falls at a floor at once, but climbs back only 3 points past it. */
export function nextBand(current: Band, sanity: number): Band {
  const raw = bandOf(sanity);
  if (bandIndex(raw) >= bandIndex(current)) return raw;
  return BANDS[Math.min(bandIndex(current), bandIndex(bandOf(sanity - SANITY.hysteresis)))];
}

export function createMind(): Mind {
  return { sanity: SANITY.max, band: 'lucid', insight: 0, seen: new Set(), upgrades: { vigour: 0, endurance: 0, resolve: 0 }, phantomIn: 0 };
}

/** Sets sanity (clamped to 0–100) and moves the band, announcing a change. */
export function setSanity(g: Pick<Game, 'mind' | 'events'>, value: number): void {
  const m = g.mind;
  m.sanity = Math.min(SANITY.max, Math.max(0, value));
  const to = nextBand(m.band, m.sanity);
  if (to === m.band) return;
  const from = m.band;
  m.band = to;
  g.events.emit('SanityBandChanged', { from, to, sanity: m.sanity });
}

/** Takes sanity; each level of the Resolve upgrade lessens every loss. */
export function loseSanity(g: Pick<Game, 'mind' | 'events'>, amount: number): void {
  if (amount <= 0) return;
  const resist = g.mind.upgrades.resolve * (UPGRADES.resolve.resist ?? 0);
  setSanity(g, g.mind.sanity - amount * (1 - resist));
}

export const restoreSanity = (g: Pick<Game, 'mind' | 'events'>, amount: number): void => setSanity(g, g.mind.sanity + amount);

/** A failing mind hits harder and is hit harder (spec §3A): the multiplier on a blow from `attacker` to `target`. */
export function damageScale(g: Pick<Game, 'mind' | 'player'>, attacker: Entity, target: Entity): number {
  const i = bandIndex(g.mind.band);
  return (attacker === g.player.id ? SANITY.dealt[i] : 1) * (target === g.player.id ? SANITY.taken[i] : 1);
}

/** Share of an aura felt `gap` metres beyond the creature's body: whole within auraNear, none past auraFar. */
export const auraShare = (gap: number): number => Math.min(1, Math.max(0, (SANITY.auraFar - gap) / (SANITY.auraFar - SANITY.auraNear)));

/** Sanity lost this step to auras and to the roars and gazes of foes. */
function drain(g: Game, dt: number): number {
  const { dread, transform, body, actor, combatant } = g.ecs.c;
  const me = g.player.id;
  const pp = transform.get(me)!.pos;
  let loss = 0;
  for (const [id, d] of dread) {
    if (d.aura <= 0 || isAbsent(g, id)) continue;
    const gap = distXZ(transform.get(id)!.pos, pp) - (body.get(id)?.radius ?? 0);
    loss += d.aura * auraShare(gap) * dt;
  }
  for (const [id, a] of actor) {
    const s = moveDef(a)?.sanity;
    if (!s || a.frozen || !inWindow(s.window, a.frame) || isAbsent(g, id) || combatant.get(id)?.faction !== 'enemy') continue;
    if (distXZ(transform.get(id)!.pos, pp) > s.range) continue;
    if (s.sight && !hasLineOfSight(g.world, aimPoint(g, id)!, playerEye(g))) continue;
    loss += s.amount / (s.window[1] - s.window[0]);
  }
  return loss;
}

/** One step: drains, and a swallow of Laudanum on its move's `item` frame. */
export function sanitySystem(g: Game, dt: number): void {
  loseSanity(g, drain(g, dt));
  const a = g.ecs.c.actor.get(g.player.id)!;
  if (!a.frozen && a.frame === moveDef(a)?.item) restoreSanity(g, LAUDANUM.sanity);
}

/** Subscribes the event-driven rules: landed blows take the attacker's sanityDamage; respawning restores sanity and Laudanum. */
export function registerSanity(g: Game): void {
  g.events.on('Hit', ({ attacker, target, damage }) => {
    if (target === g.player.id && damage > 0) loseSanity(g, g.ecs.c.dread.get(attacker)?.blow ?? 0);
  });
  g.events.on('Respawned', () => {
    g.player.laudanum = LAUDANUM.doses;
    setSanity(g, SANITY.max);
  });
}
