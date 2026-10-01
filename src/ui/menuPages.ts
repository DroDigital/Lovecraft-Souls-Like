/**
 * Pages the title screen and the pause menu share (Phase 6): the settings, each applied at once and
 * kept, and the controls. Round 12: the settings gained brightness, UI scale, screen shake, invert
 * look, music, effects and ambience volumes, and fullscreen; the keyboard's keys can be rebound on
 * the Controls page (core/bindings.ts), and the buttons each prompt names follow the device in hand.
 */

import { ACTIONS, DEFAULT_KEYS, keyLayout, keyName, rebind, type Action } from '../core/bindings';
import { padFacts, padReport } from '../core/pads';
import { RENDER, SETTINGS } from '../data/tuning';
import { desktop } from './desktop';
import { glyph } from './glyphs';
import { button, el, heading, slider, title, type Page } from './menuKit';
import type { SettingId, Settings } from './settings';

const pct = (v: number): string => `${Math.round(v * 100)}%`;
const LABELS: Record<SettingId, [label: string, show: (v: number) => string]> = {
  fxCap: ['FX intensity', pct],
  sensitivity: ['Sensitivity', (v) => `×${v.toFixed(2)}`],
  invertY: ['Invert look', (v) => (v > 0.5 ? 'On' : 'Off')],
  resolution: ['Resolution', (v) => `${Math.round(RENDER.width * v)}×${Math.round(RENDER.height * v)}`],
  brightness: ['Brightness', pct],
  fog: ['Volumetric fog', (v) => (v > 0 ? pct(v) : 'Off')],
  shadows: ['Shadows', (v) => (v > 0.5 ? 'On' : 'Off')],
  uiScale: ['Text & HUD', (v) => `×${v.toFixed(2)}`],
  shake: ['Screen shake', pct],
  cutscenes: ['Cutscenes', (v) => (v > 0.5 ? 'On' : 'Off')],
  volume: ['Volume', pct],
  music: ['Music', pct],
  sfx: ['Effects', pct],
  ambience: ['Ambience', pct],
  speech: ['Voices', pct],
};
const GROUPS: readonly (readonly [string, readonly SettingId[]])[] = [
  ['VIDEO', ['resolution', 'brightness', 'fog', 'shadows', 'uiScale', 'fxCap', 'shake']],
  ['CONTROLS', ['sensitivity', 'invertY', 'cutscenes']],
  ['SOUND', ['volume', 'music', 'sfx', 'ambience', 'speech']],
];

/** Fullscreen on or off: the desktop shell's window, or the browser's. */
async function fullscreen(on: boolean): Promise<void> {
  if (desktop) return desktop.setFullscreen(on);
  if (on) await document.documentElement.requestFullscreen?.().catch(() => undefined);
  else if (document.fullscreenElement) await document.exitFullscreen().catch(() => undefined);
}
const isFullscreen = async (): Promise<boolean> => (desktop ? desktop.isFullscreen() : !!document.fullscreenElement);

/** Every change goes to `change` (which applies and keeps it); `back` leaves. */
export function settingsPage(s: Settings, change: (id: SettingId, v: number) => void, back: () => void): Page {
  const page: Page = {
    back,
    build(panel) {
      title(panel, 'SETTINGS');
      el(panel, 'div', 'FX intensity caps every effect of a failing mind, for comfort.', 'opacity:.6;margin:4px 0 0');
      for (const [name, ids] of GROUPS) {
        heading(panel, name);
        for (const id of ids) {
          const [label, show] = LABELS[id];
          slider(panel, label, SETTINGS[id], s[id], (v) => change(id, v), show);
        }
        if (name === 'VIDEO') {
          const b = button(panel, 'Fullscreen', () => void isFullscreen().then((on) => fullscreen(!on)).then(() => setTimeout(label, 300)));
          const label = (): void => void isFullscreen().then((on) => (b.textContent = `Fullscreen: ${on ? 'on' : 'off'}`));
          label();
        }
      }
      heading(panel, '');
      button(panel, `Back  (${glyph('back')})`, back);
    },
  };
  return page;
}

const KEYED: Readonly<Record<Action, string>> = {
  forward: 'Move forward',
  back: 'Move back',
  left: 'Move left',
  right: 'Move right',
  dodge: 'Dodge (hold: sprint)',
  shoot: 'Revolver',
  reload: 'Reload the revolver',
  lock: 'Lock on',
  heal: "West's Reagent (heal)",
  item: 'Laudanum (sanity)',
  throw: 'Flask of lamp oil (throw)',
  interact: 'Rest, talk, act',
  map: 'Map',
};
const PAD_OF: Readonly<Record<Action, string>> = {
  forward: 'left stick', back: 'left stick', left: 'left stick', right: 'left stick',
  dodge: 'B', shoot: 'X', reload: 'D-pad ←', lock: 'R3', heal: 'Y', item: 'D-pad ↓', throw: 'D-pad ↑', interact: 'A', map: 'View',
};
/** What cannot be rebound: the mouse's buttons, looking, and the menus' own keys. */
export const FIXED_CONTROLS: readonly (readonly [string, string, string])[] = [
  ['Light / heavy attack', 'LMB / Shift+LMB', 'RB / RT'],
  ['Block / parry', 'RMB / Shift+RMB', 'LB / LT'],
  ['Look', 'mouse · arrows', 'right stick'],
  ['Switch target', '← → · flick the mouse', 'flick the right stick'],
  ['Pause', 'Esc', 'Menu'],
];

/** The controls, the keyboard's rebindable: choose an action, then press its new key. `save` keeps the layout. */
export function controlsPage(back: () => void, save: () => void = () => undefined): Page {
  let waiting: Action | null = null;
  let refused = false; // the last key pressed was one that cannot be taken
  const page: Page = {
    back: () => ((waiting = null), (refused = false), back()),
    keys(e) {
      if (!waiting || e.repeat || e.code === 'Escape') return;
      e.preventDefault();
      refused = !rebind(keyLayout, waiting, e.code);
      if (!refused) save();
      waiting = null;
      page.redraw?.();
    },
    build(panel) {
      title(panel, 'CONTROLS');
      el(panel, 'div', 'Choose a key to rebind it, then press the new one. Shift, Tab, Enter, Esc and the arrows are kept.', 'opacity:.6;margin:4px 0 10px');
      el(panel, 'div', `Controller: ${padReport() || 'none heard (press a button on it)'}`, 'opacity:.6;margin:0 0 2px');
      el(panel, 'div', padFacts(), 'opacity:.4;font-size:11px;margin:0 0 10px'); // what the game hears (round 31)
      if (refused) el(panel, 'div', 'That key is kept: Shift is the heavy blow and the parry, and the rest are the menus\u2019. Choose another.', 'color:#d9a066;margin:0 0 8px');
      const table = el(panel, 'div', '', 'display:grid;grid-template-columns:1fr auto auto;gap:2px 12px;align-items:center');
      for (const cell of ['', 'KEY', 'PAD']) el(table, 'div', cell, 'opacity:.55;letter-spacing:2px;font-size:11px');
      for (const a of ACTIONS) {
        el(table, 'div', KEYED[a]);
        const b = button(table, waiting === a ? '…' : keyName(keyLayout[a]), () => ((waiting = a), page.redraw?.()));
        b.style.cssText = 'margin:1px 0;padding:2px 8px;min-width:9ch;text-align:center';
        el(table, 'div', PAD_OF[a], 'opacity:.75');
      }
      for (const [what, keys, pad] of FIXED_CONTROLS) for (const [i, cell] of [what, keys, pad].entries()) el(table, 'div', cell, i ? 'opacity:.75' : '');
      heading(panel, '');
      button(panel, 'Reset keys to defaults', () => (Object.assign(keyLayout, DEFAULT_KEYS), save(), page.redraw?.()));
      button(panel, `Back  (${glyph('back')})`, page.back!);
    },
  };
  return page;
}
