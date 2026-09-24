/**
 * 'Umr at-Tawil, the Guide (spec §3E and the endings): in its last phase it yields. It strikes no
 * more, and offers passage through the Ultimate Gate (E, within reach): one of the three endings.
 * Strike it down instead, and the way goes on to Yog-Sothoth and Azathoth's Court.
 */

import { distXZ } from '../../core/geom';
import { ENDINGS } from '../../data/endings';
import type { Fight } from '../components';
import { endGame } from '../endings';
import type { Signature } from '../signatures';

const REACH = 8; // metres from the Guide where its offer is heard

const yields = (f: Fight): boolean => f.phase === f.script.phases.length - 1;

export const UMR_SIGNATURE: Signature = {
  step(g, e, f) {
    if (yields(f)) g.ecs.c.brain.get(e)!.cooldown = Infinity; // it strikes no more
  },
  action(g, e, f) {
    if (!yields(f) || g.overworld?.ending) return null;
    const gap = distXZ(g.ecs.c.transform.get(e)!.pos, g.ecs.c.transform.get(g.player.id)!.pos) - (g.ecs.c.body.get(e)?.radius ?? 0);
    const choice = ENDINGS.silver_key.choice;
    return gap > REACH ? null : { label: choice[0].toLowerCase() + choice.slice(1), run: () => endGame(g, 'silver_key') };
  },
  status: (_g, _e, f) => (yields(f) ? 'IT YIELDS' : null),
};
