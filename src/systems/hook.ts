/**
 * The first hour's hook (round 26: nothing in it told a new investigator that the dream held anything too
 * large to fight): a few minutes in, out of doors in the waking world and with nothing hunting them,
 * something vast calls from very far off, the ground answers, and a line says where. It comes once.
 * A second, later, says that it is nearer than it was. Saved (`told`), so it is not heard again. Pure:
 * no Three.js.
 */

import type { SampleSetId } from '../data/samples';
import { HOOK, SIM } from '../data/tuning';
import { dungeonRoomAt } from '../world/terrain';
import { engagedFights } from './bossFight';
import type { Game } from './components';

export interface Omen {
  id: string;
  after: number; // seconds of play
  words: string;
  sound: SampleSetId;
  shake: number; // metres the ground trembles
  pitch: number;
}

/** What is heard, and when (seconds of play outside a fight), in the order it comes. */
export const OMENS: readonly Omen[] = [
  { id: 'call', after: HOOK.first, words: 'SOMETHING VAST CALLS FROM THE SOUTH-EAST, VERY FAR OFF', sound: 'whale', shake: 0.05, pitch: 0.62 },
  { id: 'nearer', after: HOOK.second, words: 'IT CALLS AGAIN, AND THE GROUND ANSWERS. IT IS NOT AS FAR AS IT WAS', sound: 'bellow', shake: 0.09, pitch: 0.55 },
];

/** The next omen to be heard, or undefined. */
export const nextOmen = (g: Game): Omen | undefined => OMENS.find((o) => !g.overworld?.told.has(`omen:${o.id}`));

/** Every step: when the time is come, out of doors and at peace in the waking world, the next of them is heard. */
export function hookSystem(g: Game): void {
  const ow = g.overworld;
  if (!ow || g.frame % 60 !== 0) return;
  const o = nextOmen(g);
  if (!o || g.frame / SIM.hz < o.after || !['hub', 'arkham', 'dunwich', 'innsmouth', 'providence', 'vermont'].includes(ow.region ?? '')) return;
  const me = g.ecs.c.transform.get(g.player.id)!.pos;
  if (engagedFights(g).length || dungeonRoomAt(me.x, me.z) || g.player.listening !== null || (g.ecs.c.health.get(g.player.id)?.hp ?? 0) <= 0) return;
  ow.told.add(`omen:${o.id}`);
  g.events.emit('Foreboding', { words: o.words, sound: o.sound, shake: o.shake, pitch: o.pitch });
}
