/**
 * The main menu (Phase 6): the name set as a logo over its stair (playtest round 4), Continue (when a
 * save exists), New game (which asks before forgetting a save), Settings and Controls. It opens on
 * the first key press or click (what lets a browser play the title's theme), or by itself when the
 * theme sounds without one (main.ts). Its choice starts the open world; the title stays until the
 * veil has covered it, over the live stair behind it (titleBackdrop.ts).
 */

import { GAME_NAME, TITLE_LINES } from '../data/intro';
import { BONE, SERIF } from './hudKit';
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


/** The logo's stair: seven treads going down into the dark, and at their foot a faint purple glow. */
function stair(): string {
  const treads = Array.from({ length: 7 }, (_, i) => {
    const [x, y] = [14 + i * 26, 6 + i * 5];
    return `<path d="M${x} ${y}h26v5" stroke="${BONE}" stroke-opacity="${(1 - i * 0.12).toFixed(2)}" stroke-width="1.4" fill="none"/>`;
  }).join('');
  return `<svg width="220" height="52" viewBox="0 0 220 52" style="display:block;margin:12px 0 16px" aria-hidden="true"><defs><radialGradient id="gate"><stop offset="0" stop-color="#6A0DAD" stop-opacity=".9"/><stop offset="1" stop-color="#6A0DAD" stop-opacity="0"/></radialGradient></defs>${treads}<circle cx="198" cy="44" r="9" fill="url(#gate)"/></svg>`;
}

export function showTitle(o: TitleOptions): void {
  const screen = createScreen(5, 'linear-gradient(90deg,#050506f0 0%,#050506c4 30%,#05050600 60%)', 'left:max(24px,7vw);top:50%;transform:translateY(-50%);width:min(470px,86vw);text-align:left');
  let begun = false;
  const begin = (fresh: boolean): void => {
    if (begun) return;
    begun = true;
    o.start(fresh, () => screen.close());
  };
  const titleBlock = (p: HTMLElement): void => {
    el(p, 'div', GAME_NAME.toUpperCase(), `font:400 44px/1.1 ${SERIF};letter-spacing:13px;white-space:nowrap;text-shadow:0 0 22px ${BONE}55,0 2px 3px #000`);
    p.insertAdjacentHTML('beforeend', stair());
    el(p, 'div', TITLE_LINES[0], 'opacity:.65;letter-spacing:3px;font-size:13px;margin:0 0 6px;text-shadow:0 1px 2px #000');
    el(p, 'div', TITLE_LINES[1], 'opacity:.5;font-style:italic;margin:0 0 30px;max-width:380px;text-shadow:0 1px 2px #000');
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
      const call = button(el(p, 'div', '', 'width:260px'), 'press any key', wake);
      call.style.cssText += ';padding-left:0;border-color:transparent;background:none;letter-spacing:3px';
      call.animate([{ opacity: 0.2 }, { opacity: 0.75 }], { duration: 1600, direction: 'alternate', iterations: Infinity, easing: 'ease-in-out' });
    },
  };
  addEventListener('pointerdown', wake, true);
  const main: Page = {
    build(p) {
      titleBlock(p);
      const menu = el(p, 'div', '', 'width:260px');
      if (o.hasSave) button(menu, 'Continue', () => begin(false));
      button(menu, 'New game', () => (o.hasSave ? screen.show(confirm) : begin(true)));
      button(menu, 'Settings', () => screen.show(settingsPage(o.settings, o.change, () => screen.show(main))));
      button(menu, 'Controls', () => screen.show(controlsPage(() => screen.show(main))));
      el(p, 'div', 'arrows or pad to choose · Enter or A', 'opacity:.3;margin-top:26px;font-size:12px');
    },
  };
  const confirm: Page = {
    back: () => screen.show(main),
    build(p) {
      heading(p, 'BEGIN ANEW?');
      el(p, 'div', 'This deletes your saved game.', 'opacity:.6;margin-bottom:14px');
      const menu = el(p, 'div', '', 'width:260px');
      button(menu, 'No, go back', () => screen.show(main));
      button(menu, 'Yes, begin anew', () => begin(true));
    },
  };
  screen.show(gate);
}
