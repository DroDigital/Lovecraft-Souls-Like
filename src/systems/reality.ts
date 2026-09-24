/**
 * Reality hooks (spec §3E): what an engaged boss's phase does to the world while it lasts. Each hook
 * steps once a frame with the fights that hold it (none: it eases off). The world's half is here;
 * the tricks on the investigator (decoys, time skips, body theft) are in realityTricks.ts.
 * - arena_reconnect: the arena's edges join; walk out of one side and you come in at the other.
 * - darkness: the light fails; also for a while after a darkness attack, and when every lamp is out.
 * - flood: water rises over the arena and drags at the investigator (movement.ts).
 * - camera_warp: the view drifts, and the lens sways (the renderer).
 * - hidden_platforms: the arena's floor is a void that hurts body and mind, but for platforms that
 *   are there only for the enlightened (insight; spending it hides them again).
 * - petrify_buildup: the boss's gaze turns flesh to stone while it has sight of the investigator;
 *   out of its sight the stone wears off. Full, they are stone: dead.
 * - light_dependency: the boss cannot bear light. In a lit lamp's reach it burns and is badly hurt;
 *   in the dark it shrugs blows off. Its darkness attack snuffs the nearest lamp; E relights one.
 * Pure: no Three.js.
 */

import type { Entity } from '../core/ecs';
import { distXZ, type XZ } from '../core/geom';
import type { RealityHook } from '../data/schema';
import { REALITY, SIM } from '../data/tuning';
import { hasLineOfSight } from '../world/colliders';
import { startMove } from './actions';
import { ring } from './arenaChanges';
import { engagedFights } from './bossFight';
import { strike } from './combat';
import type { Fight, Game, Reality } from './components';
import { playerEye } from './lockOn';
import { REALITY_TRICKS, type HookStep } from './realityTricks';
import { loseSanity } from './sanity';

export function createReality(): Reality {
  return { hooks: new Set(), darkness: 0, dark: 0, flood: 0, floodAt: null, warp: 0, gaze: 0, petrify: 0, stolen: 0, swapIn: REALITY.swapFirst, skipIn: REALITY.skipEvery[0], saturation: 1 };
}

const approach = (v: number, to: number): number => (v < to ? Math.min(to, v + REALITY.ease) : Math.max(to, v - REALITY.ease));

export const hooksOf = (f: Fight): readonly RealityHook[] => f.script.phases[f.phase]?.realityHooks ?? [];

/** The lamps in a fight's arena. */
export const lampsOf = (g: Game, f: Fight): Entity[] => f.props.filter((p) => g.ecs.c.prop.get(p)?.kind === 'lamp');

const litNear = (g: Game, f: Fight, e: Entity): boolean =>
  lampsOf(g, f).some((l) => g.ecs.c.prop.get(l)!.lit && distXZ(g.ecs.c.transform.get(l)!.pos, g.ecs.c.transform.get(e)!.pos) <= REALITY.lampRadius);

/** Where a fight's hidden platforms stand: one at the arena's heart, the rest in a ring. */
export const platformsOf = (f: Fight): XZ[] => [{ x: f.arena.x, z: f.arena.z }, ...ring(f, REALITY.platforms, 0.6)];

/** The platforms are there only for those with enough insight. */
export const platformsShown = (g: Game): boolean => g.mind.insight >= REALITY.platformInsight;

const reconnect: HookStep = (g, fights) => {
  const tr = g.ecs.c.transform.get(g.player.id)!;
  for (const [e, f] of fights) {
    const [dx, dz] = [tr.pos.x - f.arena.x, tr.pos.z - f.arena.z];
    const d = Math.hypot(dx, dz);
    if (d < f.arena.radius - REALITY.reconnectEdge) continue;
    const back = (f.arena.radius - REALITY.reconnectIn) / d;
    tr.pos = { x: f.arena.x - dx * back, y: 0, z: f.arena.z - dz * back };
    tr.pos.y = g.world.ground(tr.pos.x, tr.pos.z);
    tr.prev = { ...tr.pos };
    g.events.emit('Rewired', { entity: e });
    return;
  }
};

const darkness: HookStep = (g, fights) => {
  const unlit = engagedFights(g).some(([, f]) => hooksOf(f).includes('light_dependency') && !lampsOf(g, f).some((l) => g.ecs.c.prop.get(l)!.lit));
  g.reality.darkness = approach(g.reality.darkness, fights.length || g.reality.dark > 0 || unlit ? 1 : 0);
};

const flood: HookStep = (g, fights) => {
  const r = g.reality;
  const a = fights[0]?.[1].arena;
  if (a) r.floodAt = { ...a, y: g.world.ground(a.x, a.z) };
  r.flood = approach(r.flood, a ? 1 : 0);
  if (r.flood === 0) r.floodAt = null;
};

const warp: HookStep = (g, fights) => {
  const r = g.reality;
  r.warp = approach(r.warp, fights.length ? 1 : 0);
  if (r.warp > 0) g.camera.yaw += (r.warp * REALITY.warpDrift * Math.sin((2 * Math.PI * REALITY.warpHz * g.frame) / SIM.hz)) / SIM.hz;
};

const platforms: HookStep = (g, fights) => {
  const pp = g.ecs.c.transform.get(g.player.id)!.pos;
  const [e, f] = fights.find(([, x]) => distXZ(pp, x.arena) < x.arena.radius) ?? [];
  if (e === undefined || !f || g.frame % REALITY.voidTick !== 0 || g.ecs.c.actor.get(g.player.id)!.move === 'death') return;
  if (platformsShown(g) && platformsOf(f).some((p) => distXZ(p, pp) <= REALITY.platformRadius)) return;
  const blow = { damage: REALITY.voidDamage, poise: 0, guard: 0, hitstop: 0, parryable: false, interrupts: false, unblockable: true, lingering: true };
  if (strike(g, e, g.player.id, blow, { x: f.arena.x, y: pp.y, z: f.arena.z }) !== 'dodged') loseSanity(g, REALITY.voidSanity);
};

const petrify: HookStep = (g, fights) => {
  const r = g.reality;
  const c = g.ecs.c;
  const eye = playerEye(g);
  const seer = fights.find(([e]) => {
    const p = c.transform.get(e)!.pos;
    const from = { x: p.x, y: p.y + (c.body.get(e)?.aimHeight ?? 2), z: p.z };
    return distXZ(p, eye) <= REALITY.petrifyRange && hasLineOfSight(g.world, from, eye);
  });
  const a = c.actor.get(g.player.id)!;
  r.petrify = seer && a.move !== 'death' ? Math.min(1, r.petrify + REALITY.petrifyRate) : Math.max(0, r.petrify - REALITY.petrifyDecay);
  if (r.petrify < 1 || !seer) return;
  r.petrify = 0;
  const h = c.health.get(g.player.id)!;
  h.hp = 0;
  startMove(a, 'death');
  g.events.emit('Petrified', { by: seer[0] });
  g.events.emit('Died', { entity: g.player.id, killer: seer[0], at: { ...c.transform.get(g.player.id)!.pos } });
};

const lightBound: HookStep = (g, fights) => {
  for (const [e, f] of fights) {
    const h = g.ecs.c.health.get(e)!;
    const lit = litNear(g, f, e);
    h.ward = (h.ward ?? 1) * (lit ? REALITY.inLight : REALITY.inDark); // on top of any signature's (bossFight.ts clears it each step)
    if (lit) h.hp = Math.max(1, h.hp - REALITY.lightBurn / SIM.hz);
  }
};

/** Every reality hook's step. */
export const HOOKS: Readonly<Record<RealityHook, HookStep>> = {
  arena_reconnect: reconnect,
  darkness,
  flood,
  camera_warp: warp,
  hidden_platforms: platforms,
  petrify_buildup: petrify,
  light_dependency: lightBound,
  decoys: REALITY_TRICKS.decoys,
  time_skip: REALITY_TRICKS.time_skip,
  control_swap: REALITY_TRICKS.control_swap,
};

export function realitySystem(g: Game): void {
  const fights = engagedFights(g);
  g.reality.hooks = new Set(fights.flatMap(([, f]) => hooksOf(f)));
  for (const [hook, step] of Object.entries(HOOKS) as [RealityHook, HookStep][]) step(g, fights.filter(([, f]) => hooksOf(f).includes(hook)));
}

/** A light-bound boss's darkness snuffs the lit lamp nearest it; death clears what the hooks did to the investigator. */
export function registerReality(g: Game): void {
  g.events.on('Darkened', ({ by }) => {
    const f = g.ecs.c.fight.get(by);
    if (!f?.engaged || !hooksOf(f).includes('light_dependency')) return;
    const at = g.ecs.c.transform.get(by)!.pos;
    const lit = lampsOf(g, f).filter((l) => g.ecs.c.prop.get(l)!.lit);
    const lamp = lit.sort((a, b) => distXZ(g.ecs.c.transform.get(a)!.pos, at) - distXZ(g.ecs.c.transform.get(b)!.pos, at))[0];
    if (lamp === undefined) return;
    g.ecs.c.prop.get(lamp)!.lit = false;
    g.events.emit('LampChanged', { lamp, lit: false });
  });
  g.events.on('Respawned', () => Object.assign(g.reality, { gaze: 0, petrify: 0, stolen: 0, dark: 0 }));
}
