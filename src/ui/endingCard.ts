/**
 * The ending card (spec §5, Phase 5): when one of the three endings is chosen, its title and closing
 * words fill the screen. The investigator may walk on in the world after it, or begin anew.
 */

import { ENDINGS, type EndingId } from '../data/endings';
import type { Game } from '../systems/components';
import { BONE, el, SERIF } from './hudKit';
import { button, createScreen } from './menuKit';

const BUTTON = `display:inline-block;margin:28px 10px 0;padding:6px 16px;font:14px ${SERIF};letter-spacing:2px;color:${BONE};background:#141416;border:1px solid ${BONE}55;cursor:pointer`;

export interface EndingCard {
  readonly open: boolean;
}

export function createEndingCard(g: Game): EndingCard {
  const screen = createScreen(4, '#050506', `left:50%;top:34%;width:min(640px,90vw);transform:translate(-50%,-30%);text-align:center;font:16px/1.8 ${SERIF}`);
  const walkOn = (): void => screen.close();
  g.events.on('Ending', ({ id }) => {
    const e = ENDINGS[id as EndingId];
    if (!e) return;
    screen.show({
      build(page) {
        el('font-size:26px;letter-spacing:10px;margin-bottom:26px', e.title, page);
        const lines = el('opacity:.85', '', page);
        for (const line of e.lines) el('margin:6px 0', line, lines);
        const buttons = el('', '', page);
        button(buttons, 'Walk on', walkOn).style.cssText = BUTTON;
        button(buttons, 'Begin anew', () => void (location.href = '?fresh')).style.cssText = BUTTON;
      },
    });
  });
  return {
    get open() {
      return screen.open;
    },
  };
}
