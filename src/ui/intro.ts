/**
 * The new game's opening (playtest round 1): a telegram and the investigator's notebook, a card at
 * a time over black, before they wake in the dream. E, Enter or Space (pad A) turns the card; Esc
 * (pad B) skips to the end. The world waits until it is done (main.ts).
 */

import { INTRO } from '../data/intro';
import { BONE } from './hudKit';
import { button, createScreen, el, type Page } from './menuKit';

export interface Intro {
  readonly open: boolean;
}

export function showIntro(done: () => void): Intro {
  const screen = createScreen(9, '#000', 'left:50%;top:50%;transform:translate(-50%,-50%);width:min(560px,90vw)');
  let i = 0;
  const finish = (): void => {
    screen.close();
    done();
  };
  const next = (): void => {
    if (++i >= INTRO.length) finish();
    else screen.show(page);
  };
  const page: Page = {
    back: finish,
    keys: (e) => void (e.code === 'KeyE' && !e.repeat && next()),
    build(p) {
      const card = INTRO[i];
      el(p, 'div', card.heading, `letter-spacing:3px;color:${BONE};opacity:.8;margin-bottom:14px`);
      const telegram = i === 0;
      for (const para of card.text) el(p, 'p', para, `font-size:${telegram ? 13 : 14}px;line-height:1.7;margin:0 0 12px;${telegram ? 'letter-spacing:2px' : ''}`);
      const row = el(p, 'div', '', 'display:flex;justify-content:space-between;align-items:center;margin-top:18px');
      el(row, 'div', 'Esc · skip', 'opacity:.3;font-size:10px');
      button(row, i < INTRO.length - 1 ? 'E · Turn the page' : 'E · Wake', next).style.cssText = 'width:auto;display:inline-block';
    },
  };
  screen.show(page);
  return {
    get open() {
      return screen.open;
    },
  };
}
