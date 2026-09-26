/**
 * What outlives a save (playtest round 12): the endings reached and the dreams finished, kept beside
 * the settings rather than in the save, so beginning anew never forgets them. Pure: no Three.js.
 */

import { ENDING_IDS, type EndingId } from '../data/endings';
import type { SaveStore } from './save';

export const RECORDS_KEY = 'lovecraft-souls-like/records';

export interface Records {
  endings: EndingId[]; // every ending reached, in the order first reached
  finished: number; // dreams brought to an ending
}

const EMPTY = (): Records => ({ endings: [], finished: 0 });

export function loadRecords(store: SaveStore | null): Records {
  try {
    const raw = JSON.parse(store?.getItem(RECORDS_KEY) ?? 'null') as Partial<Records> | null;
    if (!raw || typeof raw !== 'object') return EMPTY();
    const endings = Array.isArray(raw.endings) ? raw.endings.filter((e): e is EndingId => (ENDING_IDS as readonly string[]).includes(e)) : [];
    const finished = typeof raw.finished === 'number' && raw.finished >= 0 ? Math.floor(raw.finished) : endings.length;
    return { endings: [...new Set(endings)], finished };
  } catch {
    return EMPTY();
  }
}

/** Notes an ending reached; returns the records as they now stand. */
export function noteEnding(store: SaveStore | null, id: EndingId): Records {
  const r = loadRecords(store);
  if (!r.endings.includes(id)) r.endings.push(id);
  r.finished++;
  try {
    store?.setItem(RECORDS_KEY, JSON.stringify(r));
  } catch {
    // Storage refused: the ending is still shown, only not remembered.
  }
  return r;
}
