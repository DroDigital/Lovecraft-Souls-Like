/**
 * Arms (playtest round 4): the weapons the investigator owns and the one in hand. Taking one up
 * gives the investigator its chains in place of the last one's (data/weapons.ts). A weapon lies in
 * a house of the dream until found; picking it up makes it theirs (insight.ts reads it like a
 * tome). Round 12: a boss slain for good leaves star-stones (the five-pointed greenish soapstones
 * of At the Mountains of Madness), and resting at an Elder Sign sets them into a weapon, each level
 * adding to its blows (the only growth was Might's, so a Great Old One took hundreds). Pure.
 */

import type { Entity } from '../core/ecs';
import { REINFORCE, STAR_STONES } from '../data/tuning';
import { getEntity } from '../data/registry';
import { armedMoves, isWeapon, WEAPON_IDS, WEAPONS, type WeaponId } from '../data/weapons';
import type { Game } from './components';

/** Puts weapon `id` in the investigator's hand; false when it is not theirs. */
export function equip(g: Game, id: string): boolean {
  if (!isWeapon(id) || !g.player.arms.includes(id)) return false;
  g.player.weapon = id;
  g.ecs.c.actor.get(g.player.id)!.moves = armedMoves(id);
  return true;
}

/** A weapon found: it is theirs now, to take up from the pause menu. */
export function takeUp(g: Game, id: string): void {
  if (!isWeapon(id) || g.player.arms.includes(id)) return;
  g.player.arms.push(id);
  g.events.emit('Notice', { text: `${WEAPONS[id].name.toUpperCase()} · TAKE IT UP FROM THE MENU ({pause} · ARMS)` }); // the HUD names the button
}

/** The share a weapon reinforced `level` times adds to its blows: 1 at none. */
export const edgeAt = (level: number): number => 1 + REINFORCE.damage * level;

/** What reinforcement adds to a melee blow from `attacker` (1 for anyone but the investigator). */
export const edge = (g: Pick<Game, 'player'>, attacker: Entity): number =>
  attacker === g.player.id ? edgeAt(g.player.reinforced[g.player.weapon]) : 1;

/** Star-stones the next level of weapon `id` costs; undefined once it is fully reinforced. */
export const reinforceCost = (g: Pick<Game, 'player'>, id: WeaponId): number | undefined => REINFORCE.cost[g.player.reinforced[id]];

export function canReinforce(g: Pick<Game, 'player'>, id: WeaponId): boolean {
  const cost = reinforceCost(g, id);
  return g.player.arms.includes(id) && cost !== undefined && g.player.stones >= cost;
}

/** Sets star-stones into weapon `id` for one more level; false when it is not theirs, is at the most, or they are short. */
export function reinforce(g: Game, id: WeaponId): boolean {
  if (!canReinforce(g, id)) return false;
  g.player.stones -= reinforceCost(g, id)!;
  g.player.reinforced[id]++;
  return true;
}

/** Star-stones a boss of roster id `id` leaves (by its tier). */
export const stonesOf = (id: string): number => STAR_STONES[getEntity(id)?.tier ?? 'lesser'] ?? 0;

/** Star-stones the bosses of an older save (spawn ids `boss:<id>`) would have left, had there been any then. */
export const stonesOfSlain = (slain: Iterable<string>): number => [...slain].reduce((n, s) => n + (s.startsWith('boss:') ? stonesOf(s.slice(5)) : 0), 0);

/** Subscribes the stones: a boss slain for good leaves its star-stones to the investigator. */
export function registerArms(g: Game): void {
  g.events.on('Vanquished', ({ entity }) => {
    const d = g.ecs.c.dread.get(entity);
    if (d) giveStones(g, stonesOf(d.id));
  });
}

/** Star-stones for the investigator (a boss's, or a quest's thanks), said on the HUD. */
export function giveStones(g: Game, n: number): void {
  if (n <= 0) return;
  g.player.stones += n;
  g.events.emit('Notice', { text: `${n === 1 ? 'A STAR-STONE' : `${n} STAR-STONES`} · SET THEM INTO YOUR ARMS AT AN ELDER SIGN` });
}

/** How far each weapon owned is reinforced, fresh: none. */
export const unreinforced = (): Record<WeaponId, number> => Object.fromEntries(WEAPON_IDS.map((id) => [id, 0])) as Record<WeaponId, number>;
