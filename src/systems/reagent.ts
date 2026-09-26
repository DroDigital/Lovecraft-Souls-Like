/**
 * West's Reagent, the investigator's healing: a luminous solution in a syringe. Its move's `item`
 * frame closes wounds (a share of full health) and holds them closed for REAGENT.mend seconds, in
 * which lingering hurts (pools, the void) do no harm; the doses refill on resting and on rising again, and
 * Silver Vials found in the world let it hold more. Pure: no Three.js.
 */

import { REAGENT, SIM } from '../data/tuning';
import { moveDef } from './actions';
import type { Game } from './components';

export function reagentSystem(g: Game): void {
  const id = g.player.id;
  if (g.player.mended > 0) g.player.mended--;
  const a = g.ecs.c.actor.get(id)!;
  const def = moveDef(a);
  if (a.frozen || def?.use !== 'reagent' || a.frame !== def.item) return;
  const h = g.ecs.c.health.get(id)!;
  const amount = Math.min(h.max - h.hp, Math.round(h.max * REAGENT.heal));
  h.hp += amount;
  g.player.mended = Math.round(REAGENT.mend * SIM.hz); // and holds: lingering hurts do no harm for a while (combat.ts)
  g.events.emit('Healed', { entity: id, amount });
}

/** Rising again refills the Reagent (resting does too: checkpoints.ts). */
export function registerReagent(g: Game): void {
  g.events.on('Respawned', ({ entity }) => {
    if (entity === g.player.id) g.player.reagent = g.player.reagentMax;
  });
}

/** A Silver Vial: one more dose held, and filled. */
export function addVial(g: Game): void {
  g.player.reagentMax = Math.min(REAGENT.maxDoses, g.player.reagentMax + 1);
  g.player.reagent = Math.min(g.player.reagentMax, g.player.reagent + 1);
}
