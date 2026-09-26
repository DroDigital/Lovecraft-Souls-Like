/**
 * Autosave (spec §3D: save/load as localStorage JSON): every WORLD.saveSeconds while the
 * investigator lives, after resting, travelling and rising again from death, and when the page is
 * hidden. Where the browser refuses storage (a private window, a full quota) the game plays on unsaved.
 */

import { desktop } from './desktop';
import { WORLD } from '../data/tuning';
import type { Game } from '../systems/components';
import { saveGame, type SaveStore } from '../systems/save';

/** The page's localStorage, or null where it is unavailable. */
export function browserStore(): SaveStore | null {
  let local: Storage | null = null;
  try {
    local = window.localStorage ?? null;
  } catch {
    // No browser storage (a private window, or refused).
  }
  const files = desktop?.store;
  if (!files) return local;
  return { // the desktop shell keeps them as files (round 12); what the browser's storage held before is taken over on first reading
    getItem(key) {
      const got = files.get(key);
      if (got !== null || !local) return got;
      const old = local.getItem(key);
      if (old !== null) files.set(key, old);
      return old;
    },
    setItem: (key, value) => void files.set(key, value),
    removeItem: (key) => void (files.remove(key), local?.removeItem(key)),
  };
}

let flush: (() => void) | null = null;
let halted = false;

/** Stops saving for good: a frame threw (main.ts), and what it left behind may not be sound. */
export function haltAutosave(): void {
  halted = true;
}

/** Saves at once, if a game is being autosaved (before quitting to the desktop, before a crash screen). */
export function saveNow(): void {
  flush?.();
}

export function startAutosave(g: Game, store: SaveStore): void {
  const save = (): void => {
    if (halted || g.ecs.c.dead.has(g.player.id)) return; // broken, or mid-death: the respawn saves
    try {
      saveGame(g, store);
    } catch {
      // Storage refused: play on unsaved.
    }
  };
  flush = save;
  g.events.on('Rested', save);
  g.events.on('Travelled', save);
  g.events.on('Respawned', save);
  addEventListener('pagehide', save);
  document.addEventListener('visibilitychange', () => document.visibilityState === 'hidden' && save());
  setInterval(save, WORLD.saveSeconds * 1000);
}
