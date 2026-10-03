/**
 * Pages the title screen and the pause menu share (Phase 6): the settings, each applied at once and
 * kept, and the controls. Round 12: the settings gained brightness, UI scale, screen shake, invert
 * look, music, effects and ambience volumes, and fullscreen; the keyboard's keys can be rebound on
 * the Controls page (core/bindings.ts), and the buttons each prompt names follow the device in hand.
 */

import { ACTIONS, DEFAULT_KEYS, keyLayout, keyName, rebind, type Action } from '../core/bindings';
import { padReport } from '../core/pads';
import { RENDER, SETTINGS } from '../data/tuning';
import { desktop } from './desktop';
import { button, el, footer, slider, tabs, title, type Page } from './menuKit';
import { menuKeys } from './menuKeys';
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
/** The settings' tabs, each a few lines that fit the panel, and what each line does (said under the list as it is chosen). */
const TABS: readonly (readonly [string, readonly SettingId[]])[] = [
  ['Display', ['resolution', 'brightness', 'fog', 'shadows', 'uiScale']],
  ['Sound', ['volume', 'music', 'sfx', 'ambience', 'speech']],
  ['Play', ['sensitivity', 'invertY', 'shake', 'fxCap', 'cutscenes']],
];
const TAB_NAMES = [...TABS.map(([n]) => n), 'Controls'];
const HINTS: Partial<Record<SettingId, string>> = {
  resolution: 'How sharp the picture is drawn. Lower is faster; the look stays low-res either way.',
  brightness: 'Lifts the dark, for dim screens. The night is meant to be dark.',
  fog: 'The low mist that lies over the land. Off is faster.',
  shadows: 'The moon\u2019s and the lantern\u2019s shadows.',
  uiScale: 'The size of text, the HUD and the menus.',
  volume: 'Everything you hear.',
  music: 'The score: each realm\u2019s theme and the horrors\u2019.',
  sfx: 'Blows, steps, the revolver, the world\u2019s small sounds.',
  ambience: 'Wind, water, crickets and the dark\u2019s hum.',
  speech: 'The voices of the people and the horrors who speak.',
  sensitivity: 'How fast the camera turns with the mouse or the stick.',
  invertY: 'Looking up and down, reversed.',
  shake: 'How hard the screen shakes at a blow or a roar.',
  fxCap: 'Caps every effect of a failing mind (warping, whispers, wrong stars), for comfort.',
  cutscenes: 'The camera-led scenes: a horror\u2019s arrival and fall, the endings. Esc skips one either way.',
};

/** Fullscreen on or off: the desktop shell's window, or the browser's. */
async function fullscreen(on: boolean): Promise<void> {
  if (desktop) return desktop.setFullscreen(on);
  if (on) await document.documentElement.requestFullscreen?.().catch(() => undefined);
  else if (document.fullscreenElement) await document.exitFullscreen().catch(() => undefined);
}
const isFullscreen = async (): Promise<boolean> => (desktop ? desktop.isFullscreen() : !!document.fullscreenElement);

/** Every change goes to `change` (which applies and keeps it); `back` leaves. `at`: the tab it opens on. Controls is the last tab (the keys' table: controlsTab). */
export function settingsPage(s: Settings, change: (id: SettingId, v: number) => void, back: () => void, saveKeys: () => void = () => undefined, at = 0): Page {
  let open = at;
  let waiting: Action | null = null;
  let refused = false; // the last key pressed was one that cannot be taken
  const page: Page = {
    back: () => ((waiting = null), (refused = false), back()),
    keys(e) {
      if (!waiting || e.repeat || e.code === 'Escape') return;
      e.preventDefault();
      refused = !rebind(keyLayout, waiting, e.code);
      if (!refused) saveKeys();
      waiting = null;
      page.redraw?.();
    },
    build(panel) {
      title(panel, 'SETTINGS');
      tabs(panel, TAB_NAMES, open, (i) => ((open = i), (waiting = null), (refused = false), page.redraw?.()), page);
      if (open === TABS.length) return controlsTab(panel, page, () => waiting, (a) => (waiting = a), () => refused, saveKeys);
      const body = el(panel, 'div', '', 'min-height:226px');
      for (const id of TABS[open][1]) {
        const [label, show] = LABELS[id];
        slider(body, label, SETTINGS[id], s[id], (v) => change(id, v), show, HINTS[id]);
      }
      if (open === 0) {
        const b = button(body, 'Fullscreen', () => void isFullscreen().then((on) => fullscreen(!on)).then(() => setTimeout(label, 300)), true, 'F11 does the same, in the desktop game.');
        const label = (): void => void isFullscreen().then((on) => (b.textContent = `Fullscreen: ${on ? 'on' : 'off'}`));
        label();
      }
      footer(panel, 'Each change is applied at once and kept.', menuKeys(true), page.back);
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

/** The controls tab: the actions with their keys (choose one, then press its new key) beside the pad's, and what is fixed. */
function controlsTab(panel: HTMLElement, page: Page, waiting: () => Action | null, wait: (a: Action) => void, refused: () => boolean, save: () => void): void {
  const grid = el(panel, 'div', '', 'display:grid;grid-template-columns:1fr auto auto 1fr auto auto;gap:0 12px;align-items:center;padding:0 10px');
  for (const cell of ['', 'KEY', 'PAD', '', 'KEY', 'PAD']) el(grid, 'div', cell, 'opacity:.5;letter-spacing:3px;font-size:10px;padding-bottom:2px');
  const half = Math.ceil(ACTIONS.length / 2);
  const cells = (a: Action | undefined): void => {
    if (!a) return void [0, 1, 2].forEach(() => el(grid, 'div'));
    el(grid, 'div', KEYED[a], 'font-size:12px;white-space:nowrap');
    const b = button(grid, waiting() === a ? '…' : keyName(keyLayout[a]), () => (wait(a), page.redraw?.()));
    b.classList.add('tag');
    b.style.cssText = 'margin:1px 0;padding:1px 6px;min-width:6ch;font-size:12px';
    el(grid, 'div', PAD_OF[a], 'opacity:.55;font-size:11px;white-space:nowrap');
  };
  for (let i = 0; i < half; i++) [ACTIONS[i], ACTIONS[i + half]].forEach(cells);
  el(panel, 'div', FIXED_CONTROLS.map(([what, keys]) => `${what}: ${keys}`).join('   ·   '), 'opacity:.4;font-size:11px;line-height:1.5;margin:8px 10px 0');
  const row = el(panel, 'div', '', 'display:flex;justify-content:space-between;align-items:center;padding:0 14px;margin-top:8px');
  button(row, 'Reset keys', () => (Object.assign(keyLayout, DEFAULT_KEYS), save(), page.redraw?.())).classList.add('tag');
  el(row, 'div', `Pad: ${padReport() || 'none heard (press a button on it)'}`, 'opacity:.45;font-size:11px');
  footer(panel, refused() ? 'That key is kept (Shift, Tab, Enter, Esc and the arrows belong to the game and its menus). Choose another.' : 'Choose a key, then press its new one.', menuKeys(true), page.back);
}
