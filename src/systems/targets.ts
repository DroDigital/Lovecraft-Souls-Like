/** Who can be struck (spec §3B): the bodies a blow, a shot or a pool from one side may touch. Pure: no Three.js. */

import type { Entity } from '../core/ecs';
import { isAbsent, isConcealed, type Combatant, type Game } from './components';

/** Who a blow from `faction` can touch: living, present, unconcealed combatants of the other side with a body. Hallucinations and the investigator touch only each other. */
export function hostiles(g: Game, faction: Combatant['faction'] | undefined, conjured: boolean, byPlayer: boolean): Entity[] {
  const { combatant, health, body, phantom } = g.ecs.c;
  const out: Entity[] = [];
  for (const [t, c] of combatant) {
    if (c.faction === faction || isAbsent(g, t) || !body.has(t) || isConcealed(g, t)) continue;
    if (phantom.has(t) ? !byPlayer : conjured && t !== g.player.id) continue;
    if ((health.get(t)?.hp ?? 0) > 0) out.push(t);
  }
  return out;
}

export const targetsOf = (g: Game, id: Entity): Entity[] => hostiles(g, g.ecs.c.combatant.get(id)?.faction, g.ecs.c.phantom.has(id), id === g.player.id);
