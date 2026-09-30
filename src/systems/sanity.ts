/**
 * Sanity (spec §3A): 0–100 in four bands with 3-point hysteresis. Auras drain it by distance,
 * landed blows (once a volley) and roar/gaze moves take chunks (first sight is in insight.ts), respawning at the
 * Elder Sign and Laudanum restore it, and the band scales the damage the investigator deals and
 * takes. A band change is announced as `SanityBandChanged`, which the world hooks listen to, and a
 * sudden loss as `SanityLost`, which the HUD and the audio answer. Round 22: the mind also mends by
 * itself, slowly, while it is not in a fight (a real blow struck or taken lately, or a foe hunting them:
 * swinging at the air is neither) and nothing presses on it (an aura, a roar); the faster the nearer
 * a lamp, a fire or a torch (`Game.lit`: the Elder Signs' glow, an Echo's and the lantern's do not
 * count). Pure.
 */

import type { Entity } from '../core/ecs';
import { distXZ } from '../core/geom';
import { LAUDANUM, SANITY, SIM, UPGRADES } from '../data/tuning';
import { hasLineOfSight } from '../world/colliders';
import { inWindow, moveDef } from './actions';
import { BANDS, isAbsent, type Band, type Game, type Mind, type Toll } from './components';
import { laudanumMax } from './levels';
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
/** How far a mind has gone past the Uneasy's floor (round 26: what reshapes the world, the lamps and the map): 0 from there up, 1 at no sanity at all. */
export const madnessOf = (sanity: number): number => Math.min(1, Math.max(0, (SANITY.bands[1] - sanity) / SANITY.bands[1]));

export const bandCeiling = (b: Band): number => (b === 'lucid' ? SANITY.max : SANITY.bands[bandIndex(b) - 1]);

/** The band once sanity reaches `sanity` from band `current`: it falls at a floor at once, but climbs back only 3 points past it. */
export function nextBand(current: Band, sanity: number): Band {
  const raw = bandOf(sanity);
  if (bandIndex(raw) >= bandIndex(current)) return raw;
  return BANDS[Math.min(bandIndex(current), bandIndex(bandOf(sanity - SANITY.hysteresis)))];
}

export function createMind(): Mind {
  return { sanity: SANITY.max, band: 'lucid', insight: 0, seen: new Set(), upgrades: { resolve: 0, draught: 0 }, phantomIn: 0, fought: -Infinity, mending: 0, struck: { at: -Infinity, amount: 0 }, beheld: { at: -Infinity, amount: 0 } };
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

/** Takes sanity; each level of the Resolve upgrade lessens every loss. A loss of SANITY.jolt or more at once is announced. */
export function loseSanity(g: Pick<Game, 'mind' | 'events'>, amount: number): void {
  if (amount <= 0) return;
  const resist = g.mind.upgrades.resolve * (UPGRADES.resolve.resist ?? 0);
  const before = g.mind.sanity;
  setSanity(g, before - amount * (1 - resist));
  const lost = before - g.mind.sanity;
  if (lost >= SANITY.jolt) g.events.emit('SanityLost', { amount: lost, sanity: g.mind.sanity });
}

export const restoreSanity = (g: Pick<Game, 'mind' | 'events'>, amount: number): void => setSanity(g, g.mind.sanity + amount);

/** A failing mind hits harder and is hit harder (spec §3A), until it is Unmoored and hits weaker (round 23): the multiplier on a blow from `attacker` to `target`. */
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
  let [top, rest] = [0, 0]; // the strongest aura, and the sum of the others
  for (const [id, d] of dread) {
    if (d.aura <= 0 || isAbsent(g, id)) continue;
    const gap = distXZ(transform.get(id)!.pos, pp) - (body.get(id)?.radius ?? 0);
    const a = d.aura * auraShare(gap) * (d.tier === 'lesser' ? SANITY.lesserAura : 1);
    if (a > top) [top, rest] = [a, rest + top];
    else rest += a;
  }
  let loss = (top + SANITY.auraStack * rest) * dt; // a crowd weighs on the mind, but not as its sum (round 17)
  for (const [id, a] of actor) {
    const s = moveDef(a)?.sanity;
    if (!s || a.frozen || !inWindow(s.window, a.frame) || isAbsent(g, id) || combatant.get(id)?.faction !== 'enemy') continue;
    if (distXZ(transform.get(id)!.pos, pp) > s.range) continue;
    const seen = hasLineOfSight(g.world, aimPoint(g, id)!, playerEye(g));
    if (s.sight && !seen) continue;
    loss += (s.amount / (s.window[1] - s.window[0])) * (seen ? 1 : SANITY.muffled); // a roar past a wall is muffled (round 12)
  }
  return loss;
}

/**
 * Whether the investigator is in a fight: a real blow struck or taken within SANITY.mend.delay seconds, or a foe
 * hunting them (engaged, or searching for them) within SANITY.mend.foes metres. A swing at the air is
 * none, and nor is a shot that misses, or what a hallucination does.
 */
export function fighting(g: Game): boolean {
  if (g.frame - g.mind.fought < SANITY.mend.delay * SIM.hz) return true;
  const { brain, transform, phantom } = g.ecs.c;
  const pp = transform.get(g.player.id)!.pos;
  for (const [id, b] of brain) {
    if (b.target !== g.player.id || (b.state !== 'engage' && b.state !== 'search') || phantom.has(id) || isAbsent(g, id)) continue;
    if (distXZ(transform.get(id)!.pos, pp) <= SANITY.mend.foes) return true;
  }
  return false;
}

/** Sanity mended a second now: none in a fight, or fallen, or whole; else the dark's rate, more the better lit the ground they stand on. */
export function mendRate(g: Game): number {
  if (g.mind.sanity >= SANITY.max || g.ecs.c.actor.get(g.player.id)?.move === 'death' || fighting(g)) return 0;
  const lit = Math.min(1, Math.max(0, g.lit?.(g.ecs.c.transform.get(g.player.id)!.pos) ?? 0));
  return SANITY.mend.rate + (SANITY.mend.lit - SANITY.mend.rate) * lit;
}

/** Unmoored, the body wears away as well (round 23): a little of full health a second, never to death, and none while a shot of Reagent holds the body. */
export function bleed(g: Game, dt: number): void {
  const h = g.ecs.c.health.get(g.player.id);
  if (!h || g.mind.band !== 'unmoored' || h.hp <= 1 || g.player.mended > 0) return; // (a fallen body, at 0, has nothing to lose)
  h.hp = Math.max(1, h.hp - h.max * SANITY.unmoored.bleed * dt);
}

/**
 * One step: drains, or (with nothing pressing on the mind) mends, and a swallow of Laudanum on its move's `item` frame. The swallow also steadies
 * the mind for LAUDANUM.steady seconds: auras, roars and gazes take nothing while it holds (playtest
 * round 7: a dose should stop the drain, not only refill what it took).
 */
export function sanitySystem(g: Game, dt: number): void {
  let loss = 0;
  if (g.player.steady > 0) g.player.steady--;
  else loseSanity(g, (loss = drain(g, dt)));
  g.mind.mending = loss > 0 ? 0 : mendRate(g);
  if (g.mind.mending > 0) restoreSanity(g, g.mind.mending * dt);
  bleed(g, dt);
  const a = g.ecs.c.actor.get(g.player.id)!;
  const def = moveDef(a);
  if (a.frozen || a.frame !== def?.item || (def.use ?? 'laudanum') !== 'laudanum') return;
  restoreSanity(g, LAUDANUM.sanity);
  g.player.steady = Math.round(LAUDANUM.steady * SIM.hz);
}

/**
 * What a toll of `cost` takes at `frame` when tolls within `spell` frames of the first count once
 * (round 12: a barrage's every bolt, or two horrors beheld together, took the mind whole): the whole
 * cost when the spell is over, else only what it exceeds the greatest taken in it.
 */
export function tollOnce(t: Toll, frame: number, cost: number, spell: number): number {
  if (frame - t.at >= spell) {
    [t.at, t.amount] = [frame, cost];
    return cost;
  }
  const more = Math.max(0, cost - t.amount);
  t.amount += more;
  return more;
}

/** Subscribes the event-driven rules: landed blows take the attacker's sanityDamage, once a volley; respawning restores sanity and Laudanum. */
export function registerSanity(g: Game): void {
  g.events.on('Hit', ({ attacker, target, damage, lingering }) => {
    const blow = g.ecs.c.dread.get(attacker)?.blow ?? 0;
    if (target === g.player.id && damage > 0 && !lingering && blow > 0) loseSanity(g, tollOnce(g.mind.struck, g.frame, blow, SANITY.volley));
    const me = g.player.id;
    const other = attacker === me ? target : target === me ? attacker : null; // a real blow between the investigator and a real foe (a hallucination's, a pool's and a swing at the air are none) is a fight
    if (!lingering && other !== null && !g.ecs.c.phantom.has(other) && g.ecs.c.combatant.get(other)?.faction === 'enemy') g.mind.fought = g.frame;
  });
  g.events.on('Respawned', () => {
    g.player.laudanum = laudanumMax(g);
    setSanity(g, SANITY.max);
  });
}
