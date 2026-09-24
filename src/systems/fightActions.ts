/**
 * What E does in a boss fight (spec §3E), before resting and gates: relight a snuffed lamp within
 * reach, or whatever the boss's signature offers (the Powder of Ibn Ghazi, the incantation…).
 * Only a free investigator acts. Pure: no Three.js.
 */

import { distXZ } from '../core/geom';
import type { InputFrame } from '../core/input';
import { REALITY } from '../data/tuning';
import { startMove } from './actions';
import { engagedFights } from './bossFight';
import type { Game } from './components';
import { lampsOf } from './reality';
import { SIGNATURES, type FightAction } from './signatures';

export function fightAction(g: Game): FightAction | null {
  const c = g.ecs.c;
  const a = c.actor.get(g.player.id)!;
  if (a.move !== null) return null;
  const pp = c.transform.get(g.player.id)!.pos;
  for (const [e, f] of engagedFights(g)) {
    for (const l of lampsOf(g, f)) {
      const lamp = c.prop.get(l)!;
      if (lamp.lit || distXZ(c.transform.get(l)!.pos, pp) > REALITY.lampReach) continue;
      return {
        label: 'relight the lamp',
        run() {
          lamp.lit = true;
          startMove(a, 'kindle');
          g.events.emit('LampChanged', { lamp: l, lit: true });
        },
      };
    }
    const act = SIGNATURES[f.id]?.action?.(g, e, f);
    if (act) return act;
  }
  return null;
}

/** Runs the fight action E asks for; true when E was spent on one. */
export function fightActionSystem(g: Game, input: InputFrame): boolean {
  if (!input.pressed.interact) return false;
  const act = fightAction(g);
  act?.run();
  return act !== null;
}
