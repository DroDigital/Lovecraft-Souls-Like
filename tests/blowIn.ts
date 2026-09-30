/** What is about to land on the investigator (round 25, for the balance bot): a telegraphed blow eight frames off. */

import type { Game } from '../src/systems/components';
import { moveDef } from '../src/systems/actions';

/** The frames before a blow lands at which a person who reads it rolls away. */
const ROLL_AT = 8;

/** A key for the blow of a foe that is ROLL_AT frames from landing (its entity, move and the frame it starts), or undefined when none is. */
export function blowIn(g: Game): string | undefined {
  const c = g.ecs.c;
  for (const e of (g.ecs.c.combatant.has(g.player.id) ? [...g.ecs.c.combatant.keys()] : []).filter((x) => g.ecs.c.combatant.get(x)!.faction === 'enemy' && (g.ecs.c.health.get(x)?.hp ?? 0) > 0)) {
    const a = c.actor.get(e);
    const d = a && moveDef(a);
    if (!a || !d || a.frozen) continue;
    const lands = [d.hit?.window[0], d.sweep?.window[0], d.barrage?.window[0], d.volley?.frame, d.marks?.frame, d.wave?.frame, d.shot?.frame, d.pool?.frame].filter((x): x is number => x !== undefined);
    if (lands.some((t) => t - a.frame === ROLL_AT)) return `${e}:${a.move}:${g.frame - a.frame}`;
  }
  return undefined;
}
