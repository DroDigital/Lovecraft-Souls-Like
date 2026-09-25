/**
 * The dodging game (spec §3E): attacks read by where they will land, not by the body that makes
 * them. Marked ground bursts spot by spot (the eruption); a ring races out along the ground (the
 * quake); a beam sweeps across an arc (the sweeping beam); bolts pour out in a turning pattern (the
 * barrage); the vortex draws its prey in before it bursts. A roll's i-frames slip each of them; a
 * guard holds a quake's ring, never marked ground or a beam. A dead boss's marks fizzle. Pure: no Three.js.
 */

import type { Entity } from '../core/ecs';
import { distXZ, type V3, type XZ } from '../core/geom';
import type { BarrageDef, MarksDef, SweepDef, WaveDef } from '../data/moves';
import { SIM } from '../data/tuning';
import { raycast } from '../world/colliders';
import { inWindow, moveDef } from './actions';
import { capsuleGap2, hostiles, strike, targetsOf, type Blow } from './combat';
import { isAbsent, type Actor, type Game, type Mark, type Wave } from './components';
import { loose } from './projectiles';
import { groundNear, targetOf } from './specials';

const DEG = Math.PI / 180;
const BEAM_HEIGHT = 1; // metres above the ground a swept beam runs

const blow = (damage: number, poise: number, guarded: boolean): Blow => ({ damage, poise, guard: Math.round(damage * 1.2), hitstop: 3, parryable: false, interrupts: false, unblockable: !guarded });

function spawnAt(g: Game, at: XZ): { e: Entity; pos: V3 } {
  const e = g.ecs.spawn();
  const pos = { x: at.x, y: g.world.ground(at.x, at.z), z: at.z };
  g.ecs.c.transform.set(e, { pos, prev: { ...pos }, yaw: 0, prevYaw: 0 });
  return { e, pos };
}

/** Marks the ground: the first spot under the target, the rest in a ring about it, each bursting in turn. */
function mark(g: Game, id: Entity, m: MarksDef): void {
  const c = g.ecs.c;
  const tr = c.transform.get(id)!;
  const quarry = targetOf(g, id);
  const tp = quarry !== id ? c.transform.get(quarry)?.pos : undefined;
  const centre = tp ?? { x: tr.pos.x + Math.sin(tr.yaw) * 5, z: tr.pos.z + Math.cos(tr.yaw) * 5 };
  const arena = c.fight.get(id)?.arena;
  const faction = c.combatant.get(id)?.faction ?? 'enemy';
  const turn = g.rng() * Math.PI * 2;
  for (let i = 0; i < m.count; i++) {
    const a = turn + ((i - 1) / Math.max(1, m.count - 1)) * Math.PI * 2;
    const d = m.ring[0] + (m.ring[1] - m.ring[0]) * g.rng();
    const spot = i === 0 ? centre : { x: centre.x + Math.sin(a) * d, z: centre.z + Math.cos(a) * d };
    const { e, pos } = spawnAt(g, groundNear(g, spot, [0, 0], 0.3, arena));
    const delay = m.delay + i * m.stagger;
    c.mark.set(e, { owner: id, faction, radius: m.radius, delay, total: delay, damage: m.damage, poise: m.poise });
    if (i === 0) g.events.emit('Marked', { at: { ...pos }, by: id });
  }
}

function burst(g: Game, e: Entity, mk: Mark): void {
  const c = g.ecs.c;
  const at = c.transform.get(e)!.pos;
  const alive = c.transform.has(mk.owner) && !c.dead.has(mk.owner) && (c.health.get(mk.owner)?.hp ?? 0) > 0;
  if (alive) {
    for (const t of hostiles(g, mk.faction, false, false)) {
      const p = c.transform.get(t)!.pos;
      if (distXZ(p, at) > mk.radius + (c.body.get(t)?.radius ?? 0.4) * 0.5 || Math.abs(p.y - at.y) > 2) continue;
      strike(g, mk.owner, t, blow(mk.damage, mk.poise, false), at);
    }
    g.events.emit('Erupted', { at: { ...at }, radius: mk.radius, by: mk.owner });
  }
  g.ecs.despawn(e);
}

function quake(g: Game, id: Entity, w: WaveDef): void {
  const c = g.ecs.c;
  const from = c.transform.get(id)!.pos;
  const { e, pos } = spawnAt(g, from);
  const r = c.body.get(id)?.radius ?? 0.5;
  c.wave.set(e, { owner: id, faction: c.combatant.get(id)?.faction ?? 'enemy', r, speed: w.speed / SIM.hz, width: w.width, reach: w.reach + r, damage: w.damage, poise: w.poise, struck: [] });
  g.events.emit('Quaked', { at: { ...pos }, by: id });
}

/** The ring runs on a step; whatever its band passes over is struck once. */
function spread(g: Game, e: Entity, w: Wave): void {
  const c = g.ecs.c;
  const at = c.transform.get(e)!.pos;
  w.r += w.speed;
  for (const t of hostiles(g, w.faction, false, false)) {
    if (w.struck.includes(t)) continue;
    const p = c.transform.get(t)!.pos;
    const d = distXZ(p, at);
    const br = c.body.get(t)?.radius ?? 0.4;
    if (d - br > w.r || d + br < w.r - w.width || Math.abs(p.y - at.y) > 1.5) continue;
    w.struck.push(t);
    strike(g, w.owner, t, blow(w.damage, w.poise, true), { x: at.x, y: p.y, z: at.z });
  }
  if (w.r >= w.reach) g.ecs.despawn(e);
}

/** Where a swept beam runs on this frame of its move: from the body out along its turning line, cut short by walls. */
export function beamLine(g: Game, id: Entity, sw: SweepDef, frame: number): { from: V3; to: V3 } {
  const tr = g.ecs.c.transform.get(id)!;
  const t = (frame - sw.window[0] + 0.5) / (sw.window[1] - sw.window[0]);
  const yaw = tr.yaw - (sw.arc[0] + (sw.arc[1] - sw.arc[0]) * Math.min(1, Math.max(0, t))) * DEG;
  const from = { x: tr.pos.x, y: tr.pos.y + BEAM_HEIGHT, z: tr.pos.z };
  const far = { x: from.x + Math.sin(yaw) * sw.length, y: from.y, z: from.z + Math.cos(yaw) * sw.length };
  const k = raycast(g.world, from, far);
  return { from, to: { x: from.x + (far.x - from.x) * k, y: from.y, z: from.z + (far.z - from.z) * k } };
}

function sweep(g: Game, id: Entity, a: Actor, sw: SweepDef): void {
  const { from, to } = beamLine(g, id, sw, a.frame);
  for (const t of targetsOf(g, id)) {
    if (a.hits.has(t)) continue;
    const { gap2, radius } = capsuleGap2(g, t, from, to);
    if (gap2 > (sw.width + radius) ** 2) continue;
    a.hits.add(t);
    strike(g, id, t, blow(sw.damage, sw.poise, false), from);
  }
}

/** One burst of the barrage: a bolt along each arm, the arms turned on from the last burst. */
function barrage(g: Game, id: Entity, a: Actor, b: BarrageDef): void {
  const tr = g.ecs.c.transform.get(id)!;
  const n = (a.frame - b.window[0]) / b.every;
  const out = (g.ecs.c.body.get(id)?.radius ?? 0.5) + 0.2;
  for (let i = 0; i < b.arms; i++) {
    const yaw = tr.yaw + (i / b.arms) * Math.PI * 2 + n * b.spin * DEG;
    const [sx, sz] = [Math.sin(yaw), Math.cos(yaw)];
    const from = { x: tr.pos.x + sx * out, y: tr.pos.y + 1.1, z: tr.pos.z + sz * out };
    loose(g, id, from, { x: sx * b.speed, y: 0, z: sz * b.speed }, { ...b, lob: false });
  }
}

/** The vortex draws in whatever stands in its reach (not what is already at its heart). */
function pull(g: Game, id: Entity, p: { speed: number; range: number }): void {
  const c = g.ecs.c;
  const at = c.transform.get(id)!.pos;
  const heart = (c.body.get(id)?.radius ?? 0.5) + 0.8;
  for (const t of targetsOf(g, id)) {
    const tp = c.transform.get(t)!.pos;
    const d = distXZ(tp, at);
    if (d > p.range || d < heart || c.body.get(t)?.fixed) continue;
    const step = p.speed / SIM.hz;
    c.shove.set(t, { x: ((at.x - tp.x) / d) * step, z: ((at.z - tp.z) / d) * step, frames: 1 });
  }
}

export function strikeSystem(g: Game): void {
  const c = g.ecs.c;
  for (const [id, a] of c.actor) {
    const def = moveDef(a);
    if (!def || a.frozen || isAbsent(g, id)) continue;
    if (def.marks && a.frame === def.marks.frame) mark(g, id, def.marks);
    if (def.wave && a.frame === def.wave.frame) quake(g, id, def.wave);
    if (def.sweep && inWindow(def.sweep.window, a.frame)) {
      if (a.frame === def.sweep.window[0]) g.events.emit('Swept', { by: id });
      sweep(g, id, a, def.sweep);
    }
    const b = def.barrage;
    if (b && inWindow(b.window, a.frame) && (a.frame - b.window[0]) % b.every === 0) barrage(g, id, a, b);
    if (def.pull && inWindow(def.pull.window, a.frame)) pull(g, id, def.pull);
  }
  for (const [e, mk] of c.mark) if (--mk.delay <= 0) burst(g, e, mk);
  for (const [e, w] of c.wave) spread(g, e, w);
}

/** Clears every mark and ring (the investigator rose again). */
export function clearStrikes(g: Game): void {
  for (const e of [...g.ecs.c.mark.keys(), ...g.ecs.c.wave.keys()]) g.ecs.despawn(e);
}
