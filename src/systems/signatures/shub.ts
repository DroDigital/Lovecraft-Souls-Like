/**
 * Shub-Niggurath (spec §3E): it endlessly spawns the Thousand Young from the spawning roots its
 * arena raises (arenaChanges.ts), one from each standing root every few seconds, until the roots are
 * cut down; while any root stands it takes only a fifth of each blow. Pure: no Three.js.
 */

import type { Entity } from '../../core/ecs';
import { SHUB } from '../../data/tuning';
import type { Fight, Game } from '../components';
import type { Signature } from '../signatures';
import { summon } from '../specials';

/** The roots still standing. */
export const rootsOf = (g: Game, f: Fight): Entity[] =>
  f.props.filter((p) => g.ecs.c.prop.get(p)?.kind === 'root' && (g.ecs.c.health.get(p)?.hp ?? 0) > 0);

export const SHUB_SIGNATURE: Signature = {
  engage: (_g, _e, f) => void (f.sig.bearIn = SHUB.every),
  step(g, e, f) {
    const roots = rootsOf(g, f);
    if (!roots.length) return;
    const h = g.ecs.c.health.get(e)!;
    h.ward = (h.ward ?? 1) * SHUB.shielded;
    if (--f.sig.bearIn > 0) return;
    f.sig.bearIn = SHUB.every;
    for (const r of roots) summon(g, e, 'thousand_young', g.ecs.c.transform.get(r)!.pos, SHUB.young);
  },
  status(g, _e, f) {
    const n = rootsOf(g, f).length;
    return n ? `SPAWNING ROOTS ${n}` : null;
  },
};
