/**
 * The title's save slots (playtest round 12: one save, in the browser's storage): each slot's line
 * (where the investigator stands, their level, time in the dream, the journey), for choosing one to
 * load or to begin a new game in.
 */

import { DEFAULT_DIFFICULTY, DIFFICULTIES, isDifficulty } from '../data/tuning';
import { levelsOf } from '../systems/levels';
import { loadSave, SLOTS, type SaveStore } from '../systems/save';
import { playTime } from '../systems/tally';
import { regionAt } from '../world/worldMap';

/** What slot `slot` holds, in a line; null when it is empty. */
export function slotLine(store: SaveStore | null, slot: number): string | null {
  const s = store && loadSave(store, slot);
  if (!s) return null;
  const where = regionAt(s.at.x, s.at.z)?.name ?? 'the dream';
  const journey = s.cycle ? `  ·  journey ${s.cycle + 1}` : '';
  const hard = isDifficulty(s.difficulty) && s.difficulty !== DEFAULT_DIFFICULTY ? `  ·  ${DIFFICULTIES[s.difficulty].name.toLowerCase()}` : ''; // the one it was begun at (round 38)
  return `${where}  ·  level ${levelsOf(s.levels) + 1}  ·  ${playTime(s.tally?.frames ?? 0)}${journey}${hard}`;
}

/** Every slot's line, first to last. */
export const slotLines = (store: SaveStore | null): (string | null)[] => Array.from({ length: SLOTS }, (_, k) => slotLine(store, k + 1));
