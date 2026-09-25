/**
 * Arms (playtest round 4), from the pause menu: the weapons the investigator owns, how each
 * handles, and which is in hand; choosing one takes it up (systems/arms.ts). A line says how many
 * more lie somewhere in the dream.
 */

import { WEAPON_IDS, WEAPONS } from '../data/weapons';
import { equip } from '../systems/arms';
import type { Game } from '../systems/components';
import { button, el, heading, type Page } from './menuKit';

export function armsPage(g: Game, back: () => void, show: (p: Page) => void): Page {
  const page: Page = {
    back,
    build(p) {
      el(p, 'div', 'ARMS', 'font-size:18px;letter-spacing:6px;margin-bottom:10px');
      for (const id of g.player.arms) {
        const w = WEAPONS[id];
        button(p, `${w.name}${id === g.player.weapon ? '  ·  in hand' : ''}`, () => {
          equip(g, id);
          show(page);
        });
        el(p, 'div', w.note, 'opacity:.55;font-size:13px;line-height:1.4;margin:0 0 10px 10px');
      }
      const unfound = WEAPON_IDS.length - g.player.arms.length;
      if (unfound > 0) el(p, 'div', `${unfound === 1 ? 'One more lies' : `${unfound} more lie`} somewhere in the dream.`, 'opacity:.4;font-style:italic;margin-top:6px');
      heading(p, '');
      button(p, 'Back  (Esc)', back);
    },
  };
  return page;
}
