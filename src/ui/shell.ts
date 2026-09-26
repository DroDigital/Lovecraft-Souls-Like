/**
 * What outlives the title screen (main.ts): the settings (kept in localStorage), the audio engine and
 * its drones, the veil, and the title's theme while it plays. Made once for the page.
 */

import { STINGERS } from '../data/sounds';
import { createDrones, type Drones } from '../render/audio/drones';
import { createAudioEngine, type AudioEngine } from '../render/audio/engine';
import type { Music } from '../render/audio/music';
import { playSound } from '../render/audio/synth';
import type { SaveStore } from '../systems/save';
import { browserStore } from './autosave';
import { setMenuSound } from './menuKit';
import { clampSetting, loadSettings, storeSettings, type SettingId, type Settings } from './settings';
import { createVeil, type Veil } from './veil';

export interface Shell {
  music?: Music; // the title screen's, while it plays (through a new game's opening)
  settings: Settings;
  change(id: SettingId, v: number): void;
  store: SaveStore | null;
  engine: AudioEngine;
  drones: Drones;
  veil: Veil;
}

/** Settings, the audio engine, the drones and the veil. */
export function createShell(): Shell {
  const store = browserStore();
  const settings = loadSettings(store);
  const engine = createAudioEngine(settings.volume);
  setMenuSound(() => playSound(engine, STINGERS.select));
  const change = (id: SettingId, v: number): void => {
    settings[id] = clampSetting(id, v);
    storeSettings(store, settings);
    if (id === 'volume') {
      engine.setVolume(settings.volume);
      shell.music?.setVolume(settings.volume);
    }
  };
  const shell: Shell = { settings, change, store, engine, drones: createDrones(engine), veil: createVeil() };
  return shell;
}
