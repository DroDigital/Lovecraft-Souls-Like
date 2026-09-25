/**
 * Arms (playtest round 4): the weapons the investigator owns and the one in hand. Taking one up
 * gives the investigator its chains in place of the last one's (data/weapons.ts). A weapon lies in
 * a house of the dream until found; picking it up makes it theirs (insight.ts reads it like a
 * tome). Pure: no Three.js.
 */

import { armedMoves, isWeapon, WEAPONS } from '../data/weapons';
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
  g.events.emit('Notice', { text: `${WEAPONS[id].name.toUpperCase()} · TAKE IT UP FROM THE MENU (ESC · ARMS)` });
}
