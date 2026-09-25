/**
 * The pause menu (Phase 6): Esc, the pad's Start, or losing the captured mouse (switching away)
 * opens it whenever no other menu is open. The world stands still while it is open (main.ts). It
 * offers Resume, the Map, Settings, Controls and a return to the title screen.
 */

import { button, createScreen, el, menuOpen, onPadStart, type Page } from './menuKit';
import { controlsPage, settingsPage } from './menuPages';
import type { SettingId, Settings } from './settings';

export interface PauseOptions {
  settings: Settings;
  change(id: SettingId, v: number): void;
  resume(): void; // after closing: recapture the mouse
  map?: () => void; // opens the map (not in the arena)
  quit(): void;
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
      el(p, 'div', 'PAUSED', 'font-size:18px;letter-spacing:6px;margin-bottom:10px');
      button(p, 'Resume', resume);
      if (o.map) button(p, 'Map', () => [screen.close(), o.map!()]);
      button(p, 'Settings', () => screen.show(settingsPage(o.settings, o.change, () => screen.show(main))));
      button(p, 'Controls', () => screen.show(controlsPage(() => screen.show(main))));
      button(p, 'Quit to title', o.quit);
    },
  };
  const pause = (): void => {
    if (!menuOpen()) screen.show(main);
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
