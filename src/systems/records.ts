/**
 * What outlives a save (playtest round 12): the endings reached and the dreams finished, kept beside
 * the settings rather than in the save, so beginning anew never forgets them, and the achievements
 * earned (round 12); and, between an
 * ending and the new journey it begins, the strength carried into it (cycles.ts). Pure: no Three.js.
 */

import { ACHIEVEMENTS } from '../data/achievements';
import { ENDING_IDS, type EndingId } from '../data/endings';
import type { SaveStore } from './save';
import { parseCarry, type Carry } from './cycles';

export const CARRY_KEY = 'lovecraft-souls-like/carry';

export const RECORDS_KEY = 'lovecraft-souls-like/records';

export interface Records {
  endings: EndingId[]; // every ending reached, in the order first reached
  finished: number; // dreams brought to an ending
  achievements: string[]; // earned, over every dream (achievements.ts; round 12)
}

const EMPTY = (): Records => ({ endings: [], finished: 0, achievements: [] });

export function loadRecords(store: SaveStore | null): Records {
  try {
    const raw = JSON.parse(store?.getItem(RECORDS_KEY) ?? 'null') as Partial<Records> | null;
    if (!raw || typeof raw !== 'object') return EMPTY();
    const endings = Array.isArray(raw.endings) ? raw.endings.filter((e): e is EndingId => (ENDING_IDS as readonly string[]).includes(e)) : [];
    const finished = typeof raw.finished === 'number' && raw.finished >= 0 ? Math.floor(raw.finished) : endings.length;
    const achievements = Array.isArray(raw.achievements) ? raw.achievements.filter((a): a is string => typeof a === 'string' && a in ACHIEVEMENTS) : [];
    return { endings: [...new Set(endings)], finished, achievements: [...new Set(achievements)] };
  } catch {
    return EMPTY();
  }
}

const keep = (store: SaveStore | null, r: Records): Records => {
  try {
    store?.setItem(RECORDS_KEY, JSON.stringify(r));
  } catch {
    // Storage refused: it is still shown, only not remembered.
  }
  return r;
};

/** Notes an ending reached; returns the records as they now stand. */
export function noteEnding(store: SaveStore | null, id: EndingId): Records {
  const r = loadRecords(store);
  if (!r.endings.includes(id)) r.endings.push(id);
  r.finished++;
  return keep(store, r);
}

/** Notes achievements earned; returns the records as they now stand. */
export function noteAchievements(store: SaveStore | null, ids: readonly string[]): Records {
  const r = loadRecords(store);
  for (const id of ids) if (!r.achievements.includes(id)) r.achievements.push(id);
  return keep(store, r);
}

/** Keeps the strength to carry into the next journey, for the reload that begins it. */
export function storeCarry(store: SaveStore | null, carry: Carry): void {
  try {
    store?.setItem(CARRY_KEY, JSON.stringify(carry));
  } catch {
    // Storage refused: the new dream begins as a first journey.
  }
}

/** The strength carried into this new journey, taken once (null when none waits). */
export function takeCarry(store: SaveStore | null): Carry | null {
  try {
    const raw = store?.getItem(CARRY_KEY) ?? null;
    store?.removeItem(CARRY_KEY);
    return raw ? parseCarry(JSON.parse(raw)) : null;
  } catch {
    return null;
  }
}
