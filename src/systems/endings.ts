/**
 * The three endings (spec §5, Phase 5): wake and seal the Gate · pass through with 'Umr at-Tawil ·
 * become Nyarlathotep's herald. 'Umr at-Tawil offers the second when it yields (signatures/umr.ts);
 * the other two are chosen at the Court's Elder Sign once Azathoth slumbers (ui/signMenu.ts). An
 * ending closes the dream: the world remembers which (it is saved), and the investigator may walk
 * on in it. Pure: no Three.js.
 */

import type { EndingId } from '../data/endings';
import type { Game } from './components';

/** The Elder Sign in Azathoth's Court, where the court's two endings are chosen. */
export const COURT_SIGN = 'beyond_court';

/** Azathoth slumbers: its piping has been outlasted. */
export const courtOpen = (g: Game): boolean => !!g.overworld?.slain.has('boss:azathoth');

/** The endings on offer when resting at this Elder Sign. */
export const courtEndings = (g: Game, sign: string): EndingId[] => (sign === COURT_SIGN && courtOpen(g) ? ['seal', 'herald'] : []);

export function endGame(g: Game, id: EndingId): void {
  if (g.overworld) g.overworld.ending = id;
  g.events.emit('Ending', { id });
}
