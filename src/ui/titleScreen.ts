/**
 * The main menu (Phase 6): the title over black, then Continue (when a save exists), New game (which
 * asks before forgetting a save), Settings and Controls. Its choice starts the open world.
 */

import { button, createScreen, el, heading, type Page } from './menuKit';
import { controlsPage, settingsPage } from './menuPages';
import type { SettingId, Settings } from './settings';

export interface TitleOptions {
  hasSave: boolean;
  settings: Settings;
  change(id: SettingId, v: number): void;
  start(fresh: boolean): void;
}

const QUOTE = 'The oldest and strongest emotion of mankind is fear, and the oldest and strongest kind of fear is fear of the unknown.';

export function showTitle(o: TitleOptions): void {
  const screen = createScreen(5, '#000', 'left:50%;top:46%;transform:translate(-50%,-50%);width:min(460px,92vw);text-align:center');
  const begin = (fresh: boolean): void => {
    screen.close();
    o.start(fresh);
  };
  const main: Page = {
    build(p) {
      el(p, 'div', document.title.toUpperCase(), 'font-size:28px;letter-spacing:10px;margin-bottom:14px');
      el(p, 'div', QUOTE, 'opacity:.55;font-style:italic;margin:0 auto 4px;max-width:380px');
      el(p, 'div', '— H. P. Lovecraft', 'opacity:.4;margin-bottom:30px');
      const menu = el(p, 'div', '', 'width:260px;margin:0 auto;text-align:left');
      if (o.hasSave) button(menu, 'Continue', () => begin(false));
      button(menu, 'New game', () => (o.hasSave ? screen.show(confirm) : begin(true)));
      button(menu, 'Settings', () => screen.show(settingsPage(o.settings, o.change, () => screen.show(main))));
      button(menu, 'Controls', () => screen.show(controlsPage(() => screen.show(main))));
      el(p, 'div', 'arrows or pad to choose · Enter or A', 'opacity:.3;margin-top:26px');
    },
  };
  const confirm: Page = {
    back: () => screen.show(main),
    build(p) {
      heading(p, 'BEGIN ANEW?');
      el(p, 'div', 'The investigator you saved will be forgotten.', 'opacity:.6;margin-bottom:14px');
      const menu = el(p, 'div', '', 'width:260px;margin:0 auto;text-align:left');
      button(menu, 'No, go back', () => screen.show(main));
      button(menu, 'Yes, begin anew', () => begin(true));
    },
  };
  screen.show(main);
}
