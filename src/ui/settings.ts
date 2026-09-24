/**
 * The player's settings (Phase 6): the FX intensity cap, look sensitivity, resolution scale and
 * volume, kept in localStorage apart from the save. Every value is clamped into its range and snapped
 * to its step (tuning.ts SETTINGS); a missing or bad value falls back to its default. Pure: no DOM.
 */

import { SETTINGS } from '../data/tuning';
import type { SaveStore } from '../systems/save';

export type SettingId = keyof typeof SETTINGS;
export type Settings = Record<SettingId, number>;

export const SETTINGS_KEY = 'lovecraft-souls-like/settings';
export const SETTING_IDS = Object.keys(SETTINGS) as SettingId[];

export function defaultSettings(): Settings {
  return Object.fromEntries(SETTING_IDS.map((id) => [id, SETTINGS[id][3]])) as Settings;
}

/** `v` clamped into the setting's range and snapped to its step; not a number: the default. */
export function clampSetting(id: SettingId, v: unknown): number {
  const [min, max, step, fallback] = SETTINGS[id];
  if (typeof v !== 'number' || !Number.isFinite(v)) return fallback;
  const snapped = min + Math.round((Math.min(max, Math.max(min, v)) - min) / step) * step;
  return Number(Math.min(max, snapped).toFixed(6));
}

export function parseSettings(json: string | null): Settings {
  let raw: unknown = null;
  try {
    raw = json ? JSON.parse(json) : null;
  } catch {
    // A broken entry: the defaults.
  }
  const r = typeof raw === 'object' && raw !== null ? (raw as Record<string, unknown>) : {};
  return Object.fromEntries(SETTING_IDS.map((id) => [id, clampSetting(id, r[id])])) as Settings;
}

export function loadSettings(store: Pick<SaveStore, 'getItem'> | null): Settings {
  try {
    return parseSettings(store?.getItem(SETTINGS_KEY) ?? null);
  } catch {
    return defaultSettings();
  }
}

export function storeSettings(store: Pick<SaveStore, 'setItem'> | null, s: Settings): void {
  try {
    store?.setItem(SETTINGS_KEY, JSON.stringify(s));
  } catch {
    // Storage refused: the settings last until the page closes.
  }
}
