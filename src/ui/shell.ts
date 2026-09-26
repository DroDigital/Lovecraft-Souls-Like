/**
 * What outlives the title screen (main.ts): the settings and the keyboard's layout (kept in
 * localStorage), the audio engine and its drones, the veil, and the title's theme while it plays.
 * Made once for the page. A setting changed applies at once: the volumes to the engine's buses, the
 * UI scale to the page (the others are read each frame, main.ts).
 */

import { KEYS_KEY, keyLayout, parseKeys } from '../core/bindings';
import { STINGERS } from '../data/sounds';
import { createDrones, type Drones } from '../render/audio/drones';
import { createAudioEngine, type AudioEngine } from '../render/audio/engine';
import type { Music } from '../render/audio/music';
import { playSound } from '../render/audio/synth';
import type { SaveStore } from '../systems/save';
import { browserStore } from './autosave';
import { setMenuSound } from './menuKit';
import { clampSetting, loadSettings, storeSettings, type SettingId, type Settings } from './settings';
import { applyUiScale } from './uiScale';
import { createVeil, type Veil } from './veil';

export interface Shell {
  music?: Music; // the title screen's, while it plays (through a new game's opening)
  settings: Settings;
  change(id: SettingId, v: number): void;
  saveKeys(): void; // keeps the keyboard's layout as rebound
  store: SaveStore | null;
  engine: AudioEngine;
  drones: Drones;
  veil: Veil;
}

/** Settings, the audio engine, the drones and the veil. */
export function createShell(): Shell {
  const store = browserStore();
  const settings = loadSettings(store);
  const levels = (): { music: number; sfx: number; ambience: number } => ({ music: settings.music, sfx: settings.sfx, ambience: settings.ambience });
  const engine = createAudioEngine(settings.volume, levels());
  setMenuSound(() => playSound(engine, STINGERS.select));
  try {
    Object.assign(keyLayout, parseKeys(store?.getItem(KEYS_KEY) ?? null));
  } catch {
    // No storage: the default keys.
  }
  applyUiScale(settings.uiScale);
  addEventListener('resize', () => applyUiScale(settings.uiScale));
  const change = (id: SettingId, v: number): void => {
    settings[id] = clampSetting(id, v);
    storeSettings(store, settings);
    if (id === 'volume') {
      engine.setVolume(settings.volume);
      shell.music?.setVolume(settings.volume);
    }
    if (id === 'music' || id === 'sfx' || id === 'ambience') engine.setLevels(levels());
    if (id === 'uiScale') applyUiScale(settings.uiScale);
  };
  const saveKeys = (): void => {
    try {
      store?.setItem(KEYS_KEY, JSON.stringify(keyLayout));
    } catch {
      // Storage refused: the layout lasts until the page closes.
    }
  };
  const shell: Shell = { settings, change, saveKeys, store, engine, drones: createDrones(engine), veil: createVeil() };
  return shell;
}
