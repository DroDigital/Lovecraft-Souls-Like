/**
 * The main menu (Phase 6): the name and its lines over black, the veil's purple haunting the edges
 * (playtest round 8), then Continue (when the slot in use holds a save), New game (in a slot chosen,
 * asking before one is overwritten), Load (round 12: three slots), Settings, Controls and Credits.
 * It opens on the first key press or click (what lets a browser play the title's theme), or by
 * itself when the theme sounds without one (main.ts). Its choice starts the open world; the title
 * stays until the veil has covered it.
 */

import { TITLE_LINES } from '../data/intro';
import { DIFFICULTIES, DIFFICULTY_IDS, type DifficultyId } from '../data/tuning';
import { BONE, SERIF } from './hudKit';
import { SCALED_LAYER } from './uiScale';
import { creditsPage } from './credits';
import { saveNow } from './autosave';
import { desktop } from './desktop';
import { button, createScreen, el, heading, type Page } from './menuKit';
import { wordmark } from './logo';
import { menuKeys } from './menuKeys';
import { settingsPage } from './menuPages';
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
  start(fresh: boolean, close: () => void, difficulty?: DifficultyId): void;
}

export function showTitle(o: TitleOptions): void {
  const screen = createScreen(5, '#000', 'left:50%;top:66%;transform:translate(-50%,-50%);width:min(560px,94vw);max-height:60vh;overflow-x:hidden;overflow-y:auto;text-align:center'); // the menu stands in the lower half; the name has the upper (round 38)
  const logo = wordmark(); // the name cut in stone (round 20), made once
  // The name and its two lines: a layer of their own over the upper half, centred in it, so each page of the menu below can stand where it likes.
  const head = document.createElement('div');
  head.style.cssText = `position:fixed;inset:0;z-index:6;pointer-events:none;transition:opacity .5s;font:14px/1.45 ${SERIF};color:${BONE}`;
  const headLayer = el(head, 'div', '', SCALED_LAYER);
  const headBox = el(headLayer, 'div', '', 'position:absolute;left:0;right:0;top:25%;transform:translateY(-50%);text-align:center');
  headBox.append(logo.canvas);
  const headLines = [el(headBox, 'div', TITLE_LINES[0], 'opacity:.6;letter-spacing:2px;margin:6px auto'), el(headBox, 'div', TITLE_LINES[1], 'opacity:.45;font-style:italic;margin:0 auto;max-width:380px')];
  document.body.append(head);
  const showHead = (on: boolean): void => void (head.style.opacity = on ? '1' : '0');
  screen.onClose = () => head.remove();
  /** Where a page stands, and whether the name is over it: set as the page is built. */
  const placed = (page: Page, top: string, name: boolean): Page => {
    const build = page.build.bind(page);
    page.build = (p) => {
      p.style.top = top;
      showHead(name);
      build(p);
    };
    return page;
  };
  let begun = false;
  const begin = (fresh: boolean, difficulty?: DifficultyId): void => {
    if (begun) return;
    begun = true;
    o.start(fresh, () => screen.close(), difficulty);
  };
  let first = true; // the lines under the name come up once the lighting is done, the first time the menu is drawn
  const riseLines = (): void => headLines.forEach((l, k) => l.animate([{ opacity: 0 }, { opacity: l.style.opacity }], { duration: 1600, delay: 2600 + 500 * k, fill: 'backwards', easing: 'ease-out' }));
  let awake = false;
  const wake = (): void => {
    if (awake) return;
    awake = true;
    o.open();
    logo.play(); // the letters take fire as the dark draws back
    removeEventListener('pointerdown', wake, true);
    setTimeout(() => screen.show(main), 350); // a beat, and the waking key or click is spent before the menu stands under it
  };
  void o.byItself.then(wake);
  const gate: Page = placed({
    keys: wake,
    build(p) {
      const call = button(el(p, 'div', '', 'width:260px;margin:0 auto'), 'press any key', wake);
      call.style.cssText += ';text-align:center;border-color:transparent;background:none;letter-spacing:3px';
      call.animate([{ opacity: 0.2 }, { opacity: 0.75 }], { duration: 1600, direction: 'alternate', iterations: Infinity, easing: 'ease-in-out' });
    },
  }, '66%', true);
  addEventListener('pointerdown', wake, true);
  const main: Page = placed({
    build(p) {
      if (first) riseLines();
      first = false;
      const menu = el(p, 'div', '', 'width:260px;margin:0 auto;text-align:left');
      const lines = o.slots();
      if (lines[o.active - 1]) {
        button(menu, 'Continue', () => begin(false));
        el(menu, 'div', lines[o.active - 1]!, 'margin:-2px 0 8px 30px;font-size:12px;opacity:.5;letter-spacing:.5px'); // where that dream was left (round 38)
      }
      button(menu, 'New game', () => screen.show(slotPage('new')));
      if (lines.some(Boolean)) button(menu, 'Load', () => screen.show(slotPage('load')));
      button(menu, 'Settings', () => screen.show(placed(settingsPage(o.settings, o.change, () => screen.show(main), o.saveKeys), '50%', false)));
      button(menu, 'Credits', () => screen.show(placed(creditsPage(() => screen.show(main)), '50%', false)));
      if (desktop) button(menu, 'Quit', () => (saveNow(), void desktop!.quit())); // the desktop shell only (playtest round 12)
      el(p, 'div', menuKeys().map(([k, w]) => `${k} ${w}`).join('   ·   '), 'opacity:.3;margin-top:26px;font-size:11px;letter-spacing:2px;text-transform:uppercase');
    },
  }, '66%', true);
  const into = (slot: number, fresh: boolean, difficulty?: DifficultyId): void => (o.useSlot(slot), begin(fresh, difficulty));
  /** How hard the dream is: chosen here, once, as a new one begins, and never after (round 38). */
  const difficultyPage = (slot: number): Page => placed({
    focus: DIFFICULTY_IDS.indexOf('deep'), // the dream as made
    back: () => screen.show(slotPage('new')),
    build(p) {
      heading(p, 'HOW DEEP DO YOU SLEEP?');
      const menu = el(p, 'div', '', 'width:420px;margin:0 auto;text-align:left');
      for (const id of DIFFICULTY_IDS) {
        button(menu, DIFFICULTIES[id].name, () => into(slot, true, id), true, DIFFICULTIES[id].note);
      }
      el(p, 'div', 'Only the blows of the dream\u2019s creatures change. This is chosen now, and cannot be changed once the dream has begun.', 'opacity:.5;font-size:12px;line-height:1.5;margin:14px auto 0;max-width:420px');
      const note = el(p, 'div', DIFFICULTIES.deep.note, 'opacity:.75;font-size:13px;line-height:1.5;margin:10px auto 0;max-width:420px;min-height:3em');
      note.className = 'hint';
      note.dataset.def = DIFFICULTIES.deep.note;
      const back = button(menu, 'Back', () => screen.show(slotPage('new')));
      back.style.marginTop = '8px';
    },
  }, '66%', true);
  /** The slots: to load one, or to begin a new game in one (a full one is asked about first). */
  const slotPage = (to: 'new' | 'load'): Page => placed({
    back: () => screen.show(main),
    build(p) {
      heading(p, to === 'new' ? 'NEW GAME · CHOOSE A SLOT' : 'LOAD');
      const menu = el(p, 'div', '', 'width:360px;margin:0 auto;text-align:left');
      o.slots().forEach((line, k) => {
        const slot = k + 1;
        const label = `Slot ${slot}  ·  ${line ?? 'empty'}`;
        if (to === 'load') button(menu, label, () => into(slot, false), !!line);
        else button(menu, label, () => (line ? screen.show(confirm(slot)) : screen.show(difficultyPage(slot))));
      });
      button(menu, 'Back', () => screen.show(main));
    },
  }, '66%', true);
  const confirm = (slot: number): Page => placed({
    back: () => screen.show(slotPage('new')),
    build(p) {
      heading(p, 'BEGIN ANEW?');
      el(p, 'div', `This deletes the dream in slot ${slot}. The endings you have reached are remembered.`, 'opacity:.6;margin-bottom:14px');
      const menu = el(p, 'div', '', 'width:260px;margin:0 auto;text-align:left');
      button(menu, 'No, go back', () => screen.show(slotPage('new')));
      button(menu, 'Yes, begin anew', () => screen.show(difficultyPage(slot)));
    },
  }, '66%', true);
  screen.show(gate);
}
