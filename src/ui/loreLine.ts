/**
 * The line said under the veil (round 24): a lesson for what the investigator has met and not yet been
 * told of it, else Lovecraft's; what has been said is kept in this browser with the hints (ui/hints.ts).
 */

import { pickLore } from '../data/loreLines';

export const HINTS_KEY = 'lovecraft-souls-like/hints';
const SHOWN_KEY = 'lovecraft-souls-like/lore-shown';

function read(key: string): Set<string> {
  try {
    return new Set(JSON.parse(localStorage.getItem(key) ?? '[]') as string[]);
  } catch {
    return new Set();
  }
}

/** The next line to say (and it is remembered as said). */
export function nextLore(): string {
  const shown = read(SHOWN_KEY);
  const line = pickLore(read(HINTS_KEY), shown);
  try {
    localStorage.setItem(SHOWN_KEY, JSON.stringify([...shown, line]));
  } catch {
    // No storage: the lessons come round again.
  }
  return line;
}
