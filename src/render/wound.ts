/**
 * Where a blow lands on a body, for the sparks and the spray (render only; playtest round 24): on the
 * side of it that faces the attacker, at the height of the blow. A wound was put a quarter metre in
 * from the body's axis, at the height of its heart, which is the middle of a man; on a colossus it was
 * a dozen metres inside the body and several above the blade, and there was nothing to see when the
 * first blow ever struck one.
 */

import type { Entity } from '../core/ecs';
import type { V3 } from '../core/geom';
import type { Game } from '../systems/components';

/**
 * The wound of `attacker`'s blow on `target`, and the unit way the blow ran (dx, dz), or undefined
 * when the target is gone. `inset` is how far in from a slight body's axis the wound is drawn.
 */
export function woundPoint(g: Game, target: Entity, attacker: Entity, inset: number): { at: V3; dx: number; dz: number } | undefined {
  const c = g.ecs.c;
  const to = c.transform.get(target)?.pos;
  if (!to) return undefined;
  const from = c.transform.get(attacker)?.pos;
  const [dx, dz] = from ? [to.x - from.x, to.z - from.z] : [0, 0];
  const len = Math.hypot(dx, dz) || 1;
  const [ux, uz] = [dx / len, dz / len];
  const body = c.body.get(target);
  const off = Math.max(inset, (body?.radius ?? 0) > 1 ? (body?.radius ?? 0) - 0.1 : 0); // to the near side of a wide body (a man's and a brute's stay as they were)
  const aim = Math.min((body?.aimHeight ?? 1.2) * 0.9, (c.body.get(attacker)?.aimHeight ?? 1.2) * 1.1); // the height of the blow, not of a colossus's heart
  return { at: { x: to.x - ux * off, y: to.y + aim, z: to.z - uz * off }, dx: ux, dz: uz };
}
