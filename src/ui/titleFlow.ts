/**
 * The way into the world (main.ts): the title screen over black, until a choice starts it. It opens
 * out of the dark with its theme: at once where the browser lets sound play on opening, else on the
 * first key press or click, which the veil asks for (browsers refuse sound until then); after
 * THEME.wait by itself if the theme has neither sounded nor been refused (a slow line: it joins
 * when it can). Also the one-time flag a reload carries (an ending's Begin anew).
 */

import { THEME } from '../data/tuning';
import { playMenuMusic } from '../render/audio/music';
import { activeSlot, useSlot } from '../systems/save';
import { slotLines } from './titleSlots';
import { makeAhead } from './loading';
import type { Shell } from './shell';
import { showTitle } from './titleScreen';

/** Shows the title; `start` makes the world once a choice is made (fresh: a new game, with its opening). */
export function title(shell: Shell, start: (fresh: boolean) => void): void {
  const music = (shell.music = playMenuMusic(shell.engine, shell.settings.volume));
  makeAhead(); // the sprites are drawn while the title waits
  shell.veil.darken();
  let [opened, refused] = [false, false];
  void music.refused.then(() => {
    refused = true;
    if (!opened) shell.veil.darken('press any key');
  });
  showTitle({
    slots: () => slotLines(shell.store),
    active: activeSlot(),
    useSlot: (slot) => useSlot(shell.store, slot),
    settings: shell.settings,
    change: shell.change,
    saveKeys: shell.saveKeys,
    byItself: new Promise((resolve) => {
      void music.sounding.then(resolve);
      setTimeout(() => refused || resolve(), THEME.wait * 1000);
    }),
    open() {
      opened = true;
      shell.veil.haunt(true); // the dark draws back, to haunt the edges in Cosmic Purple
    },
    start(fresh, close) {
      void shell.veil.cover('', 1.1).then(() => {
        close();
        start(fresh);
      });
    },
  });
}

/** Reads and clears a one-time flag left in session storage before a reload. */
export function takeFlag(key: string): boolean {
  try {
    const set = sessionStorage.getItem(key) !== null;
    sessionStorage.removeItem(key);
    return set;
  } catch {
    return false;
  }
}
