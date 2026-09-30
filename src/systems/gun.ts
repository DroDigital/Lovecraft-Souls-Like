/**
 * The investigator's revolver (round 22): a cylinder of six and spare rounds carried. A shot spends a
 * round (revolver.ts); a reload, a move of its own, loads what the cylinder has room for from the spare
 * rounds on its `item` frame, and so does resting at an Elder Sign or rising again. An empty cylinder
 * pressed to fire reloads, when there is anything to load it with, and clicks when there is not. Rounds
 * are found in boxes and caches (insight.ts reads them like tomes) and bought (trade.ts). A shot is
 * whole up close and falls away with distance in damage and in aim, the small foes escaping most of
 * it far off; levels set into the gun at an Elder Sign, in star-stones, put that off. Pure: no Three.js.
 */

import { GUN } from '../data/tuning';
import { moveDef } from './actions';
import type { Game } from './components';

const clamp01 = (x: number): number => Math.min(1, Math.max(0, x));
const RAD = Math.PI / 180;

/** The metres a shot stays whole to, and where it has fallen to its floor, for a gun of `level`. */
const reachOf = (level: number): { near: number; far: number } => ({ near: GUN.reach.near + level * GUN.level.reach, far: GUN.reach.far + level * GUN.level.reach });

/** The share of its damage a shot keeps `d` metres from the muzzle. */
export function falloff(d: number, level = 0): number {
  const { near, far } = reachOf(level);
  return d <= near ? 1 : Math.max(GUN.reach.floor, (1 - clamp01((d - near) / (far - near))) ** GUN.reach.curve);
}

/** The half-angle, in radians, of the cone a bullet may stray in at `d` metres. */
export function scatterAt(d: number, level = 0): number {
  const deg = (GUN.scatter.base + GUN.scatter.perMetre * Math.max(0, d - reachOf(level).near)) * (1 - GUN.level.scatter * level);
  return deg * RAD;
}

/** The share a gun of `level` adds to a shot's damage: 1 at none. */
export const gunEdge = (level: number): number => 1 + GUN.level.damage * level;

/** What a shot of `base` damage does at `d` metres from a gun of `level`, before the investigator's Might and mind. */
export const shotDamage = (base: number, d: number, level: number): number => base * gunEdge(level) * falloff(d, level);

const notice = (g: Game, text: string): void => g.events.emit('Notice', { text });

/** Loads the cylinder from the spare rounds; how many went in. */
export function loadRounds(g: Game): number {
  const p = g.player;
  const n = Math.min(GUN.chamber - p.ammo, p.rounds);
  p.ammo += n;
  p.rounds -= n;
  return n;
}

/**
 * What a press of the revolver's button or the reload's comes to: a shot needs a round in the cylinder
 * (an empty one reloads instead, if there are rounds to load it with), a reload needs room and rounds. Null
 * when nothing can be done: a full cylinder is left alone, and a trigger pulled with nothing to fire or
 * to load clicks and says so.
 */
export function gunAction(g: Game, action: 'shoot' | 'reload'): 'shoot' | 'reload' | null {
  const p = g.player;
  if (action === 'shoot' && p.ammo > 0) return 'shoot';
  if (action === 'reload' && p.ammo >= GUN.chamber) return null;
  if (p.rounds > 0) return 'reload';
  g.events.emit('DryFire', { entity: p.id });
  notice(g, 'NO ROUNDS');
  return null;
}

/** Rounds found or bought are carried if they all can be; false when they cannot. */
export function giveRounds(g: Game, n: number): boolean {
  if (g.player.rounds + n > GUN.carry) return false;
  g.player.rounds += n;
  notice(g, `ROUNDS · +${n}`);
  return true;
}

/** Room for `n` more spare rounds. */
export const roomFor = (g: Pick<Game, 'player'>, n: number): boolean => g.player.rounds + n <= GUN.carry;

/** Star-stones the gun's next level costs; undefined once it is fully set. */
export const gunCost = (g: Pick<Game, 'player'>): number | undefined => GUN.level.cost[g.player.gun];

export const canUpgradeGun = (g: Pick<Game, 'player'>): boolean => {
  const cost = gunCost(g);
  return cost !== undefined && g.player.stones >= cost;
};

/** Sets star-stones into the revolver for one more level; false when it is at the most or they are short. */
export function upgradeGun(g: Game): boolean {
  if (!canUpgradeGun(g)) return false;
  g.player.stones -= gunCost(g)!;
  g.player.gun++;
  return true;
}

/** One step: a reload loads the cylinder on its `item` frame. */
export function gunSystem(g: Game): void {
  const a = g.ecs.c.actor.get(g.player.id)!;
  const def = moveDef(a);
  if (a.frozen || def?.use !== 'rounds' || a.frame !== def.item) return;
  const loaded = loadRounds(g);
  if (loaded > 0) g.events.emit('Reloaded', { entity: g.player.id, loaded });
}

/** Rising again after a fall loads the cylinder (resting does too: checkpoints.ts). */
export function registerGun(g: Game): void {
  g.events.on('Respawned', ({ entity }) => {
    if (entity === g.player.id) loadRounds(g);
  });
}
