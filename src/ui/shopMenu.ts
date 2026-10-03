/**
 * A merchant's wares (playtest round 12), after the last line of their talk: each with its price,
 * what is left of it and what it is for; choosing one buys it (systems/trade.ts). A menu screen
 * (menuKit.ts); the investigator takes no input while it is open, as at an Elder Sign.
 */

import { SHOPS, WARES } from '../data/wares';
import type { Game } from '../systems/components';
import { buy, canBuy, carried, hasRoom, stockLeft } from '../systems/trade';
import { fill } from './glyphs';
import { GOLD } from './hudKit';
import { button, createScreen, el, footer, title, type Page } from './menuKit';
import { menuKeys } from './menuKeys';

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
        title(panel, name.toUpperCase());
        const stat = el(panel, 'div', `ECHOES ${g.player.echoes}`, `margin:-6px 0 12px;text-align:center;font-size:11px;letter-spacing:3px;color:${GOLD}`);
        stat.dataset.pin = '';
        for (const id of wares) {
          const w = WARES[id];
          const left = stockLeft(g, id);
          const ok = canBuy(g, id);
          const why = left === 0 ? 'Sold out.' : !hasRoom(g, id) ? 'No room to carry it.' : 'Not enough Echoes.';
          const tail = left === 0 ? 'sold out' : !hasRoom(g, id) ? 'no room to carry it' : `${w.price} Echoes${left === undefined ? '' : `  ·  ${left} left`}`; // (a full pocket said nothing, round 24)
          const c = carried(g, id);
          const note = `${fill(w.note)}${c ? `  (Carried: ${c.have} of ${c.most} ${c.unit}.)` : ''}`; // what a pocket holds, before it is asked (round 24)
          const row = button(panel, `${w.name}  ·  ${tail}`, () => (ok ? (buy(g, id), page.redraw?.()) : void (panel.querySelector('.hint')!.textContent = why)), true, note);
          if (!ok) row.style.opacity = '.5'; // round 38: still a line to choose, so that what it is can be read, and why it cannot be bought
        }
        footer(panel, '', menuKeys(false, 'Choose'), () => screen.close());
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
