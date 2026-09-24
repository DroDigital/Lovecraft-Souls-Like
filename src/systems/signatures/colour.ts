/**
 * The Colour Out of Space (spec §3E): it heals by draining the colour out of the world. While it is
 * hurt and the world still has colour to give, it mends and the world greys (reality.saturation,
 * which the post pass reads); once the world is drained it can mend no more. When it dies, or the
 * fight begins anew, the colour comes back. Its own hue lies outside the palette (its sprite
 * recipe's `outside`, drawn by creatureViews and spared by the post pass).
 */

import { COLOUR, SIM } from '../../data/tuning';
import type { Signature } from '../signatures';

export const COLOUR_SIGNATURE: Signature = {
  step(g, e) {
    const h = g.ecs.c.health.get(e)!;
    const r = g.reality;
    if (h.hp >= h.max || r.saturation <= 0) return;
    h.hp = Math.min(h.max, h.hp + COLOUR.heal / SIM.hz);
    r.saturation = Math.max(0, r.saturation - COLOUR.drain / SIM.hz);
  },
  reset: (g) => void (g.reality.saturation = 1),
  end: (g) => void (g.reality.saturation = 1),
};
