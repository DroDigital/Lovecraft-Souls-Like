/**
 * Pages the title screen and the pause menu share (Phase 6): settings (FX intensity cap, look
 * sensitivity, resolution scale, volume; each applies at once and is kept) and the controls.
 */

import { RENDER, SETTINGS } from '../data/tuning';
import { button, el, heading, slider, type Page } from './menuKit';
import type { SettingId, Settings } from './settings';

const LABELS: Record<SettingId, [label: string, show: (v: number) => string]> = {
  fxCap: ['FX intensity', (v) => `${Math.round(v * 100)}%`],
  sensitivity: ['Sensitivity', (v) => `×${v.toFixed(2)}`],
  resolution: ['Resolution', (v) => `${Math.round(RENDER.width * v)}×${Math.round(RENDER.height * v)}`],
  volume: ['Volume', (v) => `${Math.round(v * 100)}%`],
};

/** Every change goes to `change` (which applies and keeps it); `back` leaves. */
export function settingsPage(s: Settings, change: (id: SettingId, v: number) => void, back: () => void): Page {
  return {
    back,
    build(panel) {
      el(panel, 'div', 'SETTINGS', 'font-size:18px;letter-spacing:4px');
      el(panel, 'div', 'FX intensity caps every effect of a failing mind, for comfort.', 'opacity:.6;margin:4px 0 8px');
      for (const id of Object.keys(SETTINGS) as SettingId[]) {
        const [label, show] = LABELS[id];
        slider(panel, label, SETTINGS[id], s[id], (v) => change(id, v), show);
      }
      heading(panel, '');
      button(panel, 'Back  (Esc)', back);
    },
  };
}

/** Action, keyboard and mouse, pad (standard layout). */
export const CONTROLS: readonly (readonly [string, string, string])[] = [
  ['Move', 'WASD', 'left stick'],
  ['Look', 'mouse (click to capture) · arrows', 'right stick'],
  ['Light / heavy attack', 'LMB / Shift+LMB', 'RB / RT'],
  ['Block / parry', 'RMB / Shift+RMB', 'LB / LT'],
  ['Dodge (hold: sprint)', 'Space', 'B'],
  ['Revolver', 'F', 'X'],
  ['Lock on / switch', 'Q or MMB / ← → or flick', 'R3 / flick right stick'],
  ['Laudanum', 'R', 'Y'],
  ['Rest, pass a gate, act', 'E', 'A'],
  ['Pause', 'Esc', 'Start'],
];

export function controlsPage(back: () => void): Page {
  return {
    back,
    build(panel) {
      el(panel, 'div', 'CONTROLS', 'font-size:18px;letter-spacing:4px;margin-bottom:8px');
      const table = el(panel, 'div', '', 'display:grid;grid-template-columns:auto auto auto;gap:3px 14px');
      for (const row of [['', 'KEYBOARD & MOUSE', 'PAD'], ...CONTROLS]) row.forEach((cell, i) => el(table, 'div', cell, i ? 'opacity:.75' : ''));
      heading(panel, '');
      button(panel, 'Back  (Esc)', back);
    },
  };
}
