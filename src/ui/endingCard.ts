/**
 * The ending card (spec §5, Phase 5): when one of the three endings is chosen, its title and closing
 * words fill the screen, and the ending is remembered beyond the save (records.ts). The investigator
 * may walk on in the world after it, or begin anew: asked first, then a new game with its opening,
 * as the title's New game (playtest round 12; it was the `?fresh` test route, which skipped the
 * opening and wiped the save again on any reload).
 */

import { ENDINGS, type EndingId } from '../data/endings';
import type { Game } from '../systems/components';
import { noteEnding } from '../systems/records';
import type { SaveStore } from '../systems/save';
import { BONE, el, SERIF } from './hudKit';
import { button, createScreen, heading } from './menuKit';

const BUTTON = `display:inline-block;margin:28px 10px 0;padding:6px 16px;font:14px ${SERIF};letter-spacing:2px;color:${BONE};background:#141416;border:1px solid ${BONE}55;cursor:pointer`;

/** Set before a reload: the page opens straight into a new game with its opening (main.ts). */
export const NEW_GAME_FLAG = 'lovecraft-souls-like/new-game';

export interface EndingCard {
  readonly open: boolean;
}

/** Leaves this dream for a new one: the reload finds the flag, forgets the save and plays the opening. */
export function beginAnew(): void {
  try {
    sessionStorage.setItem(NEW_GAME_FLAG, '1');
  } catch {
    // No session storage: the title's New game is still there after the reload.
  }
  location.href = location.pathname;
}

export function createEndingCard(g: Game, store: SaveStore | null): EndingCard {
  const screen = createScreen(4, '#050506', `left:50%;top:34%;width:min(640px,90vw);transform:translate(-50%,-30%);text-align:center;font:16px/1.8 ${SERIF}`);
  const walkOn = (): void => screen.close();
  g.events.on('Ending', ({ id }) => {
    const e = ENDINGS[id as EndingId];
    if (!e) return;
    const records = noteEnding(store, id as EndingId);
    const card = {
      build(page: HTMLElement) {
        el('font-size:26px;letter-spacing:10px;margin-bottom:26px', e.title, page);
        const lines = el('opacity:.85', '', page);
        for (const line of e.lines) el('margin:6px 0', line, lines);
        el('opacity:.4;font-size:12px;letter-spacing:3px;margin-top:22px', `ENDINGS REACHED · ${records.endings.length} OF 3`, page);
        const buttons = el('', '', page);
        button(buttons, 'Walk on', walkOn).style.cssText = BUTTON;
        button(buttons, 'Begin anew', () => screen.show(confirm)).style.cssText = BUTTON;
      },
    };
    const confirm = {
      back: () => screen.show(card),
      build(page: HTMLElement) {
        heading(page, 'BEGIN ANEW?');
        el('opacity:.6;margin-bottom:14px', 'This dream is forgotten and a new one begins. The endings you have reached are remembered.', page);
        const buttons = el('', '', page);
        button(buttons, 'No, go back', () => screen.show(card)).style.cssText = BUTTON;
        button(buttons, 'Yes, begin anew', beginAnew).style.cssText = BUTTON;
      },
    };
    screen.show(card);
  });
  return {
    get open() {
      return screen.open;
    },
  };
}
