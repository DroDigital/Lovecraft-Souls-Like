/**
 * What a blow of the investigator's sounds like as it lands (playtest round 20; it was one stab and a
 * thump for everything). A landed blow has a weight, from its damage and what kind of blow it is; the
 * heavier, the more layers, a moment apart: the flesh it meets always, a smack or an axe's bite, bone
 * and a wet burst for a killing blow or a riposte, and a low boom for a great foe's fall or a
 * crushing one. A bigger body sounds lower. Read-only on the simulation; the table is pure.
 */

import type { SampleSetId } from '../../data/samples';
import { IMPACT } from '../../data/tuning';
import { moveDef } from '../../systems/actions';
import type { Game, GameEvents, HitOutcome } from '../../systems/components';

/** A blow that landed, as the table reads it. */
export interface Landed {
  outcome: HitOutcome;
  damage: number;
  heavy: boolean; // a heavy chain's blow, or one that would stagger a foe
  chop: boolean; // an axe's
  size: number; // the body it met: its radius, metres
  great: boolean; // a boss, or a body as big as IMPACT.big
}

export interface Layer {
  set: SampleSetId;
  gain: number;
  pitch: number;
  delay: number; // seconds after the blow
}

/** The outcomes of the investigator's blows that land on flesh. */
export const LANDS: readonly HitOutcome[] = ['hit', 'stagger', 'riposte', 'kill'];

/** How hard a blow lands, 0.5 to IMPACT.weight.most. */
export function blowWeight(l: Landed): number {
  const w = IMPACT.weight;
  const sum = w.base + w.damage * Math.min(1, l.damage / w.full) + (l.heavy ? w.heavy : 0) + (l.outcome === 'stagger' ? w.stagger : 0) + (l.outcome === 'riposte' ? w.riposte : 0) + (l.outcome === 'kill' ? w.kill : 0);
  return Math.min(w.most, sum);
}

/** The layers a landed blow sounds, none for one that struck nothing (a guard, a dodge). */
export function impactLayers(l: Landed): Layer[] {
  if (!LANDS.includes(l.outcome)) return [];
  const w = blowWeight(l);
  const pitch = Math.max(0.7, Math.min(1.25, 1.3 - 0.4 * l.size)); // a bigger body sounds lower
  const finish = l.outcome === 'kill' || l.outcome === 'riposte';
  const out: Layer[] = [{ set: 'flesh', gain: 0.55 + 0.4 * w, pitch, delay: 0 }];
  if (l.chop) out.push({ set: 'chop', gain: 0.7 * w, pitch, delay: 0.005 });
  else if (w >= 0.85) out.push({ set: 'smack', gain: 0.6 * w, pitch: pitch * 1.05, delay: 0.012 });
  if (finish || w >= 1.1) out.push({ set: 'crunch', gain: 0.6 * Math.min(1, w), pitch, delay: 0.03 });
  if (finish) out.push({ set: 'splat', gain: 0.55, pitch, delay: 0.045 });
  if ((l.outcome === 'kill' && (l.great || w >= 1.2)) || (l.heavy && w >= 1.25)) out.push({ set: 'boom', gain: 0.5 + (l.great ? 0.3 : 0), pitch: Math.min(pitch, 1), delay: 0 });
  return out;
}

/** The investigator's blow that has just landed, as the table reads it; null for anyone else's. */
export function landedBlow(g: Game, e: GameEvents['Hit']): Landed | null {
  if (e.attacker !== g.player.id || e.lingering) return null;
  const c = g.ecs.c;
  const a = c.actor.get(g.player.id);
  const def = a && moveDef(a);
  const body = c.body.get(e.target);
  const size = body?.radius ?? 0.5;
  return {
    outcome: e.outcome,
    damage: e.damage,
    heavy: !!a?.move?.startsWith('heavy') || (def?.hit?.poise ?? 0) >= 30,
    chop: g.player.weapon === 'axe',
    size,
    great: c.fight.has(e.target) || size >= IMPACT.big,
  };
}
