/**
 * The credits (playtest round 12; data/credits.ts): a page whose names roll slowly up by
 * themselves, from the title, the pause menu, and after an ending.
 */

import { CREDITS } from '../data/credits';
import { GAME_NAME } from '../data/intro';
import { glyph } from './glyphs';
import { button, el, type Page } from './menuKit';

const SPEED = 22; // px a second

export function creditsPage(back: () => void, label = 'Back'): Page {
  return {
    back,
    build(panel) {
      el(panel, 'div', GAME_NAME.toUpperCase(), 'font-size:20px;letter-spacing:8px;text-align:center;margin:6px 0 12px');
      const roll = el(panel, 'div', '', 'height:330px;overflow:hidden;text-align:center');
      const names = el(roll, 'div', '', 'padding:300px 0 40px');
      for (const b of CREDITS) {
        if (b.heading) el(names, 'div', b.heading, 'opacity:.55;font-size:11px;letter-spacing:4px;margin-top:26px');
        for (const line of b.lines) el(names, 'div', line, 'margin:5px 12px;line-height:1.5');
      }
      const start = performance.now();
      const tick = (): void => {
        if (!roll.isConnected) return; // the page is gone: so is the roll
        roll.scrollTop = ((performance.now() - start) / 1000) * SPEED;
        requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
      button(panel, `${label}  (${glyph('back')})`, back);
    },
  };
}
