/**
 * The pause menu (Phase 6): Esc, the pad's Start, or losing the captured mouse (switching away)
 * opens it whenever no other menu is open. The world stands still while it is open (main.ts). It
 * offers Resume, the Map, the Journal, Arms, Settings (with the Controls) and a return to the title screen, and in
 * the desktop shell a way out to the desktop (playtest round 12).
 */

import { creditsPage } from './credits';
import { ACCENT, button, createScreen, el, footer, menuOpen, onPadStart, title, type Page } from './menuKit';
import { menuKeys } from './menuKeys';
import { saveNow } from './autosave';
import { desktop } from './desktop';
import { settingsPage } from './menuPages';
import type { SettingId, Settings } from './settings';

export interface PauseOptions {
  settings: Settings;
  change(id: SettingId, v: number): void;
  saveKeys?: () => void; // keeps the keyboard's layout when rebound
  resume(): void; // after closing: recapture the mouse
  map?: () => void; // opens the map (not in the arena)
  journal?: (back: () => void, show: (p: Page) => void) => Page; // the journal's page (not in the arena)
  arms?: (back: () => void, show: (p: Page) => void) => Page; // the weapons owned
  achievements?: (back: () => void) => Page; // the achievements, earned or not (round 12)
  next?: () => string | null; // what the story asks next, in a line: a return to the game begins with where it was left (round 38)
  quit(): void;
  held?: () => boolean; // something has the screen (a cutscene, round 20): the pause menu keeps out of it
}

export interface PauseMenu {
  readonly open: boolean;
}

export function createPauseMenu(o: PauseOptions): PauseMenu {
  const screen = createScreen(6);
  const resume = (): void => {
    screen.close();
    o.resume();
  };
  const main: Page = {
    back: resume,
    build(p) {
      title(p, 'PAUSED');
      const next = o.next?.();
      if (next) {
        const line = el(p, 'div', `NEXT  ·  ${next}`, 'margin:-6px 14px 8px;text-align:center;font-size:12px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;opacity:.7');
        [line.title, line.dataset.pin] = [next, ''];
      }
      const list = el(p, 'div');
      button(list, 'Resume', resume, true, 'Return to the dream.');
      const rule = (): void => void el(list, 'div', '', `height:1px;margin:3px 14px;background:${ACCENT}26`);
      rule();
      if (o.map) button(list, 'Map', () => [screen.close(), o.map!()], true, 'The lands you have walked, the signs lit, and the way to travel between them.');
      if (o.journal) button(list, 'Journal', () => screen.show(o.journal!(() => screen.show(main), (pg) => screen.show(pg))), true, 'What is asked of you, the tomes read, and the creatures beheld.');
      if (o.arms) button(list, 'Arms', () => screen.show(o.arms!(() => screen.show(main), (pg) => screen.show(pg))), true, 'The weapons you carry, and which is in hand.');
      if (o.achievements) button(list, 'Achievements', () => screen.show(o.achievements!(() => screen.show(main))), true, 'What you have done, and what remains.');
      rule();
      button(list, 'Settings', () => screen.show(settingsPage(o.settings, o.change, () => screen.show(main), o.saveKeys)), true, 'Picture, sound, how you play, and the keys.');
      button(list, 'Credits', () => screen.show(creditsPage(() => screen.show(main))), true, 'Who made this, and with what.');
      rule();
      button(list, 'Quit to title', o.quit, true, 'Your progress is kept at the last sign you rested at.');
      if (desktop) button(list, 'Quit to desktop', () => (saveNow(), void desktop!.quit()), true, 'Close the game.'); // the shell only: a browser tab is closed by its own hand
      footer(p, 'Return to the dream.', menuKeys());
      p.querySelector<HTMLElement>('.hint')!.style.minHeight = '1.45em'; // every line's hint is one line: no room kept for two
    },
  };
  const pause = (): void => {
    if (!menuOpen() && !o.held?.()) screen.show(main);
  };
  addEventListener('keydown', (e) => e.code === 'Escape' && !e.repeat && pause());
  document.addEventListener('pointerlockchange', () => document.pointerLockElement === null && document.hasFocus() && pause());
  addEventListener('blur', pause);
  onPadStart(pause);
  return {
    get open() {
      return screen.open;
    },
  };
}
