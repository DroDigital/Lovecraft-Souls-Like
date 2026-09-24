/**
 * Autosave (spec §3D: save/load as localStorage JSON): every WORLD.saveSeconds while the
 * investigator lives, after resting, travelling and rising again from death, and when the page is
 * hidden. Where the browser refuses storage (a private window, a full quota) the game plays on unsaved.
 */

import { WORLD } from '../data/tuning';
import type { Game } from '../systems/components';
import { saveGame, type SaveStore } from '../systems/save';

/** The page's localStorage, or null where it is unavailable. */
export function browserStore(): SaveStore | null {
  try {
    return window.localStorage ?? null;
  } catch {
    return null;
  }
}

export function startAutosave(g: Game, store: SaveStore): void {
  const save = (): void => {
    if (g.ecs.c.dead.has(g.player.id)) return; // mid-death: the respawn saves
    try {
      saveGame(g, store);
    } catch {
      // Storage refused: play on unsaved.
    }
  };
  g.events.on('Rested', save);
  g.events.on('Travelled', save);
  g.events.on('Respawned', save);
  addEventListener('pagehide', save);
  document.addEventListener('visibilitychange', () => document.visibilityState === 'hidden' && save());
  setInterval(save, WORLD.saveSeconds * 1000);
}
