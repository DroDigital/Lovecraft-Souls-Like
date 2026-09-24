/**
 * A boss's brain for one phase of its script (spec §3E): the archetype's temperament with that
 * phase's weighted attacks, each used inside its distance bracket for the boss's size. Creatures
 * without a script choose evenly among their own attacks. Pure: no Three.js.
 */

import { brainOf, type AttackChoice, type BrainDef } from '../data/archetypes';
import { attackRange } from '../data/attacks';
import type { AttackId, BossScript, EntityDef } from '../data/schema';

/** The weighted attacks a creature fights with in `phase` of its script (clamped); without one, its own attacks evenly. */
export function phaseAttacks(def: EntityDef, phase = 0, script = def.bossScript): readonly { id: AttackId; weight: number }[] {
  const phases = script?.phases;
  if (!phases?.length) return def.behavior.attacks.map((id) => ({ id, weight: 1 }));
  return phases[Math.min(phase, phases.length - 1)].attacks;
}

export function phaseBrain(def: EntityDef, phase: number, height: number, extra: readonly AttackChoice[] = [], script = def.bossScript): BrainDef {
  const choices: AttackChoice[] = phaseAttacks(def, phase, script).map((a) => ({ move: a.id, weight: a.weight, range: attackRange(a.id, height) }));
  return brainOf(def.behavior.archetype, def.behavior.params, [...choices, ...extra]);
}

/** The phase a boss at this health fraction has reached: the deepest whose `hpBelow` it has fallen under. */
export function phaseAt(script: BossScript | undefined, fraction: number): number {
  let at = 0;
  script?.phases.forEach((p, i) => {
    if (i > 0 && fraction < p.hpBelow) at = i;
  });
  return at;
}
