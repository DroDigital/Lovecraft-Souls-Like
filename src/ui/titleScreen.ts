/**
 * The main menu (Phase 6): the name and its lines over black, the veil's purple haunting the edges
 * (playtest round 8), then Continue (when a save exists), New game (which asks before forgetting a
 * save), Settings and Controls. It opens on the first key press or click (what lets a browser play
 * the title's theme), or by itself when the theme sounds without one (main.ts). Its choice starts the
 * open world; the title stays until the veil has covered it.
 */

import { GAME_NAME, TITLE_LINES } from '../data/intro';
import { button, createScreen, el, heading, type Page } from './menuKit';
import { controlsPage, settingsPage } from './menuPages';
import type { SettingId, Settings } from './settings';

export interface TitleOptions {
  hasSave: boolean;
  settings: Settings;
  change(id: SettingId, v: number): void;
  /** Resolves when the title may open without a key press or click (its theme sounds without one). */
  byItself: Promise<void>;
  /** The title opens: its first key press or click, or by itself. */
  open(): void;
  start(fresh: boolean, close: () => void): void;
}

export function showTitle(o: TitleOptions): void {
  const screen = createScreen(5, '#000', 'left:50%;top:46%;transform:translate(-50%,-50%);width:min(460px,92vw);text-align:center');
  let begun = false;
  const begin = (fresh: boolean): void => {
    if (begun) return;
    begun = true;
    o.start(fresh, () => screen.close());
  };
  const titleBlock = (p: HTMLElement): void => {
    el(p, 'div', GAME_NAME.toUpperCase(), 'font-size:28px;letter-spacing:10px;margin-bottom:14px');
    el(p, 'div', TITLE_LINES[0], 'opacity:.6;letter-spacing:2px;margin:0 auto 6px');
    el(p, 'div', TITLE_LINES[1], 'opacity:.45;font-style:italic;margin:0 auto 30px;max-width:380px');
  };
  let awake = false;
  const wake = (): void => {
    if (awake) return;
    awake = true;
    o.open();
    removeEventListener('pointerdown', wake, true);
    setTimeout(() => screen.show(main), 350); // a beat, and the waking key or click is spent before the menu stands under it
  };
  void o.byItself.then(wake);
  const gate: Page = {
    keys: wake,
    build(p) {
      titleBlock(p);
      const call = button(el(p, 'div', '', 'width:260px;margin:0 auto'), 'press any key', wake);
      call.style.cssText += ';text-align:center;border-color:transparent;background:none;letter-spacing:3px';
      call.animate([{ opacity: 0.2 }, { opacity: 0.75 }], { duration: 1600, direction: 'alternate', iterations: Infinity, easing: 'ease-in-out' });
    },
  };
  addEventListener('pointerdown', wake, true);
  const main: Page = {
    build(p) {
      titleBlock(p);
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
      el(p, 'div', 'This deletes your saved game.', 'opacity:.6;margin-bottom:14px');
      const menu = el(p, 'div', '', 'width:260px;margin:0 auto;text-align:left');
      button(menu, 'No, go back', () => screen.show(main));
      button(menu, 'Yes, begin anew', () => begin(true));
    },
  };
  screen.show(gate);
}
