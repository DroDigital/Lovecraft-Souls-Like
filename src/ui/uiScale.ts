/**
 * The UI's scale (playtest round 12: the HUD and menus were fixed at 9–16 px type, a tenth of the
 * screen at 2560 × 1440). The HUD and the menus' panels are laid out as ever, in a layer the size of
 * the screen divided by the scale, then drawn scaled up to fill it; so everything anchored to an
 * edge stays there. The scale follows the window's height (1 at 720 px, 2 at 1440) times the
 * player's setting.
 */

import { UI } from '../data/tuning';

/** A full-screen layer drawn at the UI's scale (CSS variable --ui). */
export const SCALED_LAYER = 'position:absolute;left:0;top:0;width:calc(100% / var(--ui, 1));height:calc(100% / var(--ui, 1));transform:scale(var(--ui, 1));transform-origin:0 0';

let current = 1;

/** The scale now: screen pixels per UI pixel. */
export const uiScale = (): number => current;

/** The scale for a window `height` pixels tall and the player's `setting`. */
export const scaleFor = (height: number, setting: number): number => Math.min(UI.most, Math.max(UI.least, height / UI.baseHeight)) * setting;

/** Sets the scale from the window and the setting (and again whenever the window changes size). */
export function applyUiScale(setting: number): void {
  current = scaleFor(innerHeight, setting);
  document.documentElement.style.setProperty('--ui', current.toFixed(3));
}
