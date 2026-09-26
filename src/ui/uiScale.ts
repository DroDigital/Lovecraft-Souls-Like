/**
 * The UI's scale (playtest round 12: the HUD and menus were fixed at 9–16 px type, a tenth of the
 * screen at 2560 × 1440). The HUD and the menus' panels are laid out as ever, in a layer the size of
 * the screen divided by the scale, then drawn scaled up to fill it; so everything anchored to an
 * edge stays there. The scale follows the window's height (1 at 720 px, 2 at 1440) times the
 * player's setting.
 * Round 13: on a screen taller than 16:9 the picture is letterboxed, and the HUD sat half on the
 * black bars; the HUD's layer (`PICTURE_LAYER`) is the picture's own box, and the scale follows its
 * height.
 */

import { RENDER, UI } from '../data/tuning';

/** A full-screen layer drawn at the UI's scale (CSS variable --ui). */
export const SCALED_LAYER = 'position:absolute;left:0;top:0;width:calc(100% / var(--ui, 1));height:calc(100% / var(--ui, 1));transform:scale(var(--ui, 1));transform-origin:0 0';

/** The HUD's layer: the letterboxed picture's box (CSS variables --view-*), drawn at the UI's scale. */
export const PICTURE_LAYER =
  'position:fixed;left:var(--view-l, 0px);top:var(--view-t, 0px);width:calc(var(--view-w, 100vw) / var(--ui, 1));height:calc(var(--view-h, 100vh) / var(--ui, 1));transform:scale(var(--ui, 1));transform-origin:0 0';

/** The picture's box in the window: 16:9, as large as fits, centred (render/pipeline.ts letterboxes the same way). */
export function pictureBox(w: number, h: number): { left: number; top: number; width: number; height: number } {
  const aspect = RENDER.width / RENDER.height;
  const width = Math.min(w, h * aspect);
  const height = width / aspect;
  return { left: (w - width) / 2, top: (h - height) / 2, width, height };
}

let current = 1;

/** The scale now: screen pixels per UI pixel. */
export const uiScale = (): number => current;

/** The scale for a window `height` pixels tall and the player's `setting`. */
export const scaleFor = (height: number, setting: number): number => Math.min(UI.most, Math.max(UI.least, height / UI.baseHeight)) * setting;

/** Sets the scale from the window and the setting (and again whenever the window changes size). */
export function applyUiScale(setting: number): void {
  const box = pictureBox(innerWidth, innerHeight);
  current = scaleFor(box.height, setting);
  const style = document.documentElement.style;
  style.setProperty('--ui', current.toFixed(3));
  style.setProperty('--view-l', `${box.left}px`);
  style.setProperty('--view-t', `${box.top}px`);
  style.setProperty('--view-w', `${box.width}px`);
  style.setProperty('--view-h', `${box.height}px`);
}
