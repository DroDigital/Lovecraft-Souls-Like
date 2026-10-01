/**
 * Every line said aloud, gathered (the voices): what the people of the realms say (data/npcs.ts,
 * each found in its performed form in speechNpcs.ts and speechFar.ts by its words) and what the
 * horrors that speak say (speechBosses.ts). The game looks a line up by `clipOf`; the tests, and
 * whoever makes the recordings, read them from here. Data and pure helpers.
 */

import { NPCS } from './npcs';
import { plain, shown, wordsOf, type Line } from './speech';
import { BOSS_SAY } from './speechBosses';
import { CAST } from './speechCast';
import { FAR_SAID } from './speechFar';
import { NPC_SAID } from './speechNpcs';

export type Moment = 'arrive' | 'fall';

const SAID: Readonly<Record<string, readonly string[]>> = { ...NPC_SAID, ...FAR_SAID };

/** How a person's line is performed: the entry with its words, or none. */
export const performed = (npc: string, text: string): string | undefined => SAID[npc]?.find((s) => wordsOf(s) === wordsOf(text));

/** Every line the people say, in the order they say them; one without a performance is given its own words. */
export function npcLines(): Line[] {
  return NPCS.flatMap((n) => n.topics.flatMap((t) => t.lines.map((text): Line => ({ speaker: `npc:${n.id}`, text, say: performed(n.id, text) ?? text }))));
}

/** A horror's line as it arrives or falls, if it says one. */
export function bossLine(id: string, moment: Moment): Line | undefined {
  const say = BOSS_SAY[id]?.[moment];
  return say === undefined ? undefined : { speaker: `boss:${id}`, text: shown(say), say };
}

/** Every line the horrors say. */
export const bossLines = (): Line[] => Object.keys(BOSS_SAY).flatMap((id) => (['arrive', 'fall'] as const).map((m) => bossLine(id, m)).filter((l): l is Line => !!l));

/** All of them. */
export const speechLines = (): Line[] => [...npcLines(), ...bossLines()];

/** About how many seconds a line takes to say (the recordings run 12 to 15 letters and marks a second, with their pauses; a lowered voice takes longer): a caption is held that long. */
export const spokenFor = (speaker: string, text: string): number => (0.8 + plain(text).length / 13) / (CAST[speaker]?.rate ?? 1);
