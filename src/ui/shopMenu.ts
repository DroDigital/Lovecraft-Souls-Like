/**
 * A merchant's wares (playtest round 12), after the last line of their talk: each with its price,
 * what is left of it and what it is for; choosing one buys it (systems/trade.ts). A menu screen
 * (menuKit.ts); the investigator takes no input while it is open, as at an Elder Sign.
 */

import { SHOPS, WARES } from '../data/wares';
import type { Game } from '../systems/components';
import { buy, canBuy, carried, hasRoom, stockLeft } from '../systems/trade';
import { fill, glyph } from './glyphs';
import { button, createScreen, el, heading, type Page } from './menuKit';

export interface ShopMenu {
  readonly open: boolean;
}

export function createShopMenu(g: Game): ShopMenu {
  const screen = createScreen(3, '#050506cc');
  g.events.on('Trade', ({ shop, name }) => {
    const wares = SHOPS[shop] ?? [];
    const page: Page = {
      back: () => screen.close(),
      build(panel) {
        el(panel, 'div', name.toUpperCase(), 'font-size:18px;letter-spacing:4px');
        el(panel, 'div', `Echoes: ${g.player.echoes}`, 'opacity:.6;margin:2px 0 8px');
        for (const id of wares) {
          const w = WARES[id];
          const left = stockLeft(g, id);
          const tail = left === 0 ? 'sold out' : !hasRoom(g, id) ? 'no room to carry it' : `${w.price} Echoes${left === undefined ? '' : `  ·  ${left} left`}`; // (a full pocket said nothing, round 24)
          button(panel, `${w.name}  ·  ${tail}`, () => (buy(g, id), page.redraw?.()), canBuy(g, id));
          const c = carried(g, id);
          el(panel, 'div', `${fill(w.note)}${c ? `  (Carried: ${c.have} of ${c.most} ${c.unit}.)` : ''}`, 'opacity:.55;font-size:13px;line-height:1.4;margin:0 0 8px 10px'); // what a pocket holds, before it is asked (round 24)
        }
        heading(panel, '');
        button(panel, `Leave  (${glyph('back')})`, () => screen.close());
      },
    };
    screen.show(page);
  });
  return {
    get open() {
      return screen.open;
    },
  };
}
