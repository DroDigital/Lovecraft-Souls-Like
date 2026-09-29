/**
 * The main menu (Phase 6): the name and its lines over black, the veil's purple haunting the edges
 * (playtest round 8), then Continue (when the slot in use holds a save), New game (in a slot chosen,
 * asking before one is overwritten), Load (round 12: three slots), Settings, Controls and Credits.
 * It opens on the first key press or click (what lets a browser play the title's theme), or by
 * itself when the theme sounds without one (main.ts). Its choice starts the open world; the title
 * stays until the veil has covered it.
 */

import { TITLE_LINES } from '../data/intro';
import { creditsPage } from './credits';
import { saveNow } from './autosave';
import { desktop } from './desktop';
import { button, createScreen, el, heading, type Page } from './menuKit';
import { wordmark } from './logo';
import { controlsPage, settingsPage } from './menuPages';
import type { SettingId, Settings } from './settings';

export interface TitleOptions {
  slots(): (string | null)[]; // each slot's line, null when empty (titleSlots.ts)
  active: number; // the slot in use
  useSlot(slot: number): void;
  settings: Settings;
  change(id: SettingId, v: number): void;
  saveKeys?: () => void; // keeps the keyboard's layout when rebound
  /** Resolves when the title may open without a key press or click (its theme sounds without one). */
  byItself: Promise<void>;
  /** The title opens: its first key press or click, or by itself. */
  open(): void;
  start(fresh: boolean, close: () => void): void;
}

export function showTitle(o: TitleOptions): void {
  const screen = createScreen(5, '#000', 'left:50%;top:47%;transform:translate(-50%,-50%);width:min(560px,94vw);text-align:center');
  const logo = wordmark(); // the name cut in stone over its seventy treads (round 20), made once
  let begun = false;
  const begin = (fresh: boolean): void => {
    if (begun) return;
    begun = true;
    o.start(fresh, () => screen.close());
  };
  let first = true; // the lines under the name come up once the descent is done, the first time the menu is drawn
  const titleBlock = (p: HTMLElement, rise = false): void => {
    p.append(logo.canvas);
    const lines = [el(p, 'div', TITLE_LINES[0], 'opacity:.6;letter-spacing:2px;margin:0 auto 6px'), el(p, 'div', TITLE_LINES[1], 'opacity:.45;font-style:italic;margin:0 auto 26px;max-width:380px')];
    if (rise) lines.forEach((l, k) => l.animate([{ opacity: 0 }, { opacity: l.style.opacity }], { duration: 1600, delay: 4200 + 500 * k, fill: 'backwards', easing: 'ease-out' }));
  };
  let awake = false;
  const wake = (): void => {
    if (awake) return;
    awake = true;
    o.open();
    logo.play(); // the light sets out down the seventy steps as the dark draws back
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
      titleBlock(p, first);
      first = false;
      const menu = el(p, 'div', '', 'width:260px;margin:0 auto;text-align:left');
      const lines = o.slots();
      if (lines[o.active - 1]) button(menu, 'Continue', () => begin(false));
      button(menu, 'New game', () => screen.show(slotPage('new')));
      if (lines.some(Boolean)) button(menu, 'Load', () => screen.show(slotPage('load')));
      button(menu, 'Settings', () => screen.show(settingsPage(o.settings, o.change, () => screen.show(main))));
      button(menu, 'Controls', () => screen.show(controlsPage(() => screen.show(main), o.saveKeys)));
      button(menu, 'Credits', () => screen.show(creditsPage(() => screen.show(main))));
      if (desktop) button(menu, 'Quit', () => (saveNow(), void desktop!.quit())); // the desktop shell only (playtest round 12)
      el(p, 'div', 'arrows or pad to choose · Enter or A', 'opacity:.3;margin-top:26px');
    },
  };
  const into = (slot: number, fresh: boolean): void => (o.useSlot(slot), begin(fresh));
  /** The slots: to load one, or to begin a new game in one (a full one is asked about first). */
  const slotPage = (to: 'new' | 'load'): Page => ({
    back: () => screen.show(main),
    build(p) {
      heading(p, to === 'new' ? 'NEW GAME · CHOOSE A SLOT' : 'LOAD');
      const menu = el(p, 'div', '', 'width:360px;margin:0 auto;text-align:left');
      o.slots().forEach((line, k) => {
        const slot = k + 1;
        const label = `Slot ${slot}  ·  ${line ?? 'empty'}`;
        if (to === 'load') button(menu, label, () => into(slot, false), !!line);
        else button(menu, label, () => (line ? screen.show(confirm(slot)) : into(slot, true)));
      });
      button(menu, 'Back', () => screen.show(main));
    },
  });
  const confirm = (slot: number): Page => ({
    back: () => screen.show(slotPage('new')),
    build(p) {
      heading(p, 'BEGIN ANEW?');
      el(p, 'div', `This deletes the dream in slot ${slot}. The endings you have reached are remembered.`, 'opacity:.6;margin-bottom:14px');
      const menu = el(p, 'div', '', 'width:260px;margin:0 auto;text-align:left');
      button(menu, 'No, go back', () => screen.show(slotPage('new')));
      button(menu, 'Yes, begin anew', () => into(slot, true));
    },
  });
  screen.show(gate);
}
