/** A bot that fights whatever stands in the arena (playtest round 24): it closes to the body's edge, strikes, dodges now and again, does what E offers in a boss fight, and cannot be killed. */

import type { Entity } from '../src/core/ecs';
import { createRng } from '../src/core/rng';
import { emptyInput, type Button } from '../src/core/input';
import type { Variant } from '../src/data/registry';
import type { Game } from '../src/systems/components';
import { fightAction } from '../src/systems/fightActions';
import { applyLevels } from '../src/systems/levels';
import { stepGame } from '../src/systems/game';
import { setLock } from '../src/systems/lockOn';
import { bossGame } from './bossHelpers';
import { blowIn } from './blowIn';

/** How the bot plays (round 25: a balance bot at the level a person has when they reach a boss). The default is the audits': Might 150, no care in the dodging. */
export interface BotStyle {
  levels?: Partial<Record<'vigour' | 'endurance' | 'might', number>>; // Echoes spent on the curve (else Might 150 alone)
  reinforced?: number; // levels of star-stones set into the sword-cane
  skill?: number; // 0..1: the share of telegraphed blows it rolls away from, as they are about to land (0: it only rolls now and again)
  floor?: boolean; // stops when the foe's health is at its floor as well as when it falls (a horror no blade finishes)
  smart?: boolean; // it keeps behind a monolith from a gaze that turns flesh to stone, and cuts down the spawning roots before the horror
  waive?: readonly ('petrify' | 'roots')[]; // what it is let off, to measure the rest of a fight whose mechanic the bot plays badly: the gaze never takes hold; the roots are down at once
}

export interface BotFight {
  frames: number; // how many it ran (fewer than asked when the foe fell)
  fell: boolean; // the foe fell within them
  dealt: number; // damage the bot did to the foe
  deaths: number; // times it died to what damage cannot be kept off by health (a gaze that turns flesh to stone)
  taken: number; // damage it took (it cannot be killed: the tally is what a person would have had to bear)
  nearest: number; // the least it stood from the edge of the foe's body (metres)
  bad: string[]; // what was left not a number or out of its range
}

/** The bot against `id` (in `variant`) for up to `frames` steps, in the arena. */
export function botFight(id: string, frames: number, variant?: Variant, style: BotStyle = {}): BotFight {
  const { g, boss } = bossGame(id, variant, 7);
  return driveBot(g, boss, frames, false, style);
}

const dist = (a: { x: number; z: number }, b: { x: number; z: number }): number => Math.hypot(a.x - b.x, a.z - b.z);

/** Where to stand out of a boss's sight: a little way behind the nearest standing stone, seen from the boss. */
function coverFrom(g: Game, boss: Entity, stones: Entity[], me: { x: number; z: number }): { x: number; z: number } | null {
  const at = g.ecs.c.transform.get(boss)?.pos;
  if (!at || !stones.length) return null;
  const behind = stones.map((s) => {
    const p = g.ecs.c.transform.get(s)!.pos;
    const d = dist(p, at) || 1;
    return { x: p.x + ((p.x - at.x) / d) * 1.6, z: p.z + ((p.z - at.z) / d) * 1.6 };
  });
  return behind.reduce((a, b) => (dist(a, me) <= dist(b, me) ? a : b));
}

/** The bot against `boss` in `g`, wherever it stands, for up to `frames` steps (or to its first landed blow, if `stopAtHit`). */
export function driveBot(g: Game, boss: Entity, frames: number, stopAtHit = false, style: BotStyle = {}): BotFight {
  const rng = createRng(77);
  const c = g.ecs.c;
  const me = c.health.get(g.player.id)!;
  Object.assign(g.player.levels, style.levels ?? { might: 150 });
  if (style.levels) applyLevels(g);
  g.player.reinforced[g.player.weapon] = style.reinforced ?? 0;
  me.hp = me.max = 1e7;
  const brain = c.brain.get(boss);
  if (brain) Object.assign(brain, { state: 'engage', target: g.player.id, cooldown: 0 });
  let [dealt, taken, deaths] = [0, 0, 0];
  let nearest = Infinity;
  g.events.on('Hit', (e) => {
    if (e.attacker === g.player.id && e.target === boss) dealt += e.damage;
    if (e.target === g.player.id) taken += e.damage;
  });
  g.events.on('Died', (e) => void (e.entity === g.player.id && deaths++));
  const rolled = new Set<string>(); // the blows it has already decided about
  let focus = boss; // what it strikes: the boss, or (smart) the spawning roots first
  let hiding = false;
  const propsOf = (kind: string): Entity[] => (c.fight.get(boss)?.props ?? []).filter((p) => c.prop.get(p)?.kind === kind && (kind !== 'root' || (c.health.get(p)?.hp ?? 0) > 0));
  let held = new Set<Button>();
  let dodgeIn = 60;
  let frame = 0;
  for (; frame < frames; frame++) {
    const from = c.transform.get(g.player.id)!;
    const hp = c.health.get(boss);
    if (style.smart && c.transform.has(boss)) {
      const roots = propsOf('root');
      const next = roots.length ? roots.reduce((a, b) => (dist(c.transform.get(a)!.pos, from.pos) <= dist(c.transform.get(b)!.pos, from.pos) ? a : b)) : boss;
      if (next !== focus || frame === 2) setLock(g, (focus = next));
      if (g.reality.petrify > 0.3) hiding = true;
      else if (g.reality.petrify < 0.02) hiding = false;
    }
    const at = c.transform.get(focus) ?? c.transform.get(boss);
    if (!at || c.dead.has(boss) || (stopAtHit && dealt > 0) || (style.floor && hp && hp.hp <= 1.01)) break;
    const reach = Math.hypot(at.pos.x - from.pos.x, at.pos.z - from.pos.z) - (c.body.get(focus)?.radius ?? 0.5) + 0.5; // to the edge of the body
    nearest = Math.min(nearest, reach);
    g.camera.yaw = g.camera.prevYaw = Math.atan2(at.pos.x - from.pos.x, at.pos.z - from.pos.z);
    if (style.waive?.includes('petrify')) g.reality.petrify = 0;
    if (style.waive?.includes('roots') && frame === 3) for (const r of propsOf('root')) c.health.get(r)!.hp = 0;
    if (frame === 2 && !style.smart) setLock(g, boss);
    const want = new Set<Button>();
    const f = emptyInput();
    f.moveY = reach > 2.1 ? 1 : reach < 1.2 ? -0.5 : 0;
    f.moveX = Math.sin(frame / 90) * 0.5;
    const shipPos = style.smart && !c.fight.get(boss)?.sig.sailing ? c.transform.get(propsOf('ship')[0] ?? -1)?.pos : undefined; // the Alert has come: to her helm
    const cover = hiding ? coverFrom(g, boss, propsOf('monolith'), from.pos) : shipPos ? { x: shipPos.x, z: shipPos.z } : null; // out of the gaze: behind the nearest stone
    if (cover) {
      const [dx, dz] = [cover.x - from.pos.x, cover.z - from.pos.z];
      const d = Math.hypot(dx, dz);
      const yaw = g.camera.yaw;
      [f.moveY, f.moveX] = d < 0.3 ? [0, 0] : [(dx * Math.sin(yaw) + dz * Math.cos(yaw)) / d, (dx * -Math.cos(yaw) + dz * Math.sin(yaw)) / d];
    }
    if (!cover && reach < 2.6) {
      if (frame % 22 === 0) want.add('light');
      else if (frame % 61 === 0) want.add('heavy');
    }
    if (reach > 4 && frame % 90 === 45) want.add('shoot'); // and, from afar, the revolver
    if (fightAction(g)) want.add('interact'); // the helm, the powder, the incantation
    if (style.skill !== undefined) { // it reads the wind-ups of what is about to strike it, and rolls away from some
      const key = blowIn(g);
      if (key && !rolled.has(key)) {
        rolled.add(key);
        if (rng() < style.skill) {
          want.add('dodge');
          f.moveX = rng() < 0.5 ? -1 : 1;
        }
      }
    } else if (--dodgeIn <= 0) {
      want.add('dodge');
      f.moveX = rng() < 0.5 ? -1 : 1;
      dodgeIn = 70 + Math.floor(rng() * 60);
    }
    for (const b of ['light', 'heavy', 'dodge', 'shoot', 'interact'] as const) {
      f.held[b] = want.has(b);
      f.pressed[b] = want.has(b) && !held.has(b);
      f.released[b] = held.has(b) && !want.has(b);
    }
    held = want;
    stepGame(g, f);
    if (frame % 300 === 0) me.hp = me.max;
    if (frame % 600 === 0) g.player.rounds = 12;
  }
  const bad: string[] = [];
  for (const [e, t] of c.transform) if (![t.pos.x, t.pos.y, t.pos.z, t.yaw].every(Number.isFinite)) bad.push(`entity ${e} (${c.model.get(e) ?? '?'}) not a number: ${JSON.stringify(t.pos)}`);
  for (const [e, h] of c.health) if (!Number.isFinite(h.hp) || h.hp < 0 || h.hp > h.max + 1e-6) bad.push(`entity ${e} hp ${h.hp}/${h.max}`);
  return { frames: frame, fell: frame < frames, dealt, taken, deaths, nearest, bad };
}
