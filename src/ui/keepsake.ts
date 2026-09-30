/**
 * What a player may keep and show (round 26: nothing left the game): a picture of the dream as the
 * player sees it, taken with P (the canvas read the frame it is drawn, so the grade, mist and
 * sanity's warp are in it, the HUD not), scaled up whole-number times with hard edges; and the run's
 * card, its numbers drawn on a plate. Both are saved as PNGs (a download; the desktop shell too).
 */

import { BONE, SERIF } from './hudKit';

/** Offers `canvas` as a PNG named `name`. */
export function savePng(canvas: HTMLCanvasElement, name: string): void {
  canvas.toBlob((blob) => {
    if (!blob) return;
    const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: `${name}.png` });
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  }, 'image/png');
}

/** A copy of `src` scaled by a whole number of times, edges hard: a low-res picture kept large. */
export function enlarge(src: HTMLCanvasElement, times: number): HTMLCanvasElement {
  const out = Object.assign(document.createElement('canvas'), { width: src.width * times, height: src.height * times });
  const c = out.getContext('2d')!;
  c.imageSmoothingEnabled = false;
  c.drawImage(src, 0, 0, out.width, out.height);
  return out;
}

/** Whole-number scale that brings a picture `w` wide to about 1600 pixels (1 when already as wide). */
export const scaleFor = (w: number): number => Math.max(1, Math.round(1600 / Math.max(1, w)));

/** The run's plate: its title and numbers, drawn on a dark card. */
export function runCard(title: string, rows: readonly [string, string][]): HTMLCanvasElement {
  const [w, h] = [900, 120 + rows.length * 44 + 70];
  const cv = Object.assign(document.createElement('canvas'), { width: w, height: h });
  const c = cv.getContext('2d')!;
  c.fillStyle = '#050506';
  c.fillRect(0, 0, w, h);
  c.strokeStyle = `${BONE}55`;
  c.lineWidth = 2;
  c.strokeRect(14, 14, w - 28, h - 28);
  c.fillStyle = BONE;
  c.textAlign = 'center';
  c.font = `34px ${SERIF}`;
  c.fillText(title.split('').join(' '), w / 2, 84);
  c.font = `22px ${SERIF}`;
  rows.forEach(([k, v], i) => {
    const y = 140 + i * 44;
    c.textAlign = 'left';
    c.globalAlpha = 0.6;
    c.fillText(k, 120, y);
    c.globalAlpha = 1;
    c.textAlign = 'right';
    c.fillText(v, w - 120, y);
  });
  c.globalAlpha = 0.35;
  c.textAlign = 'center';
  c.font = `16px ${SERIF}`;
  c.fillText('LOVECRAFT SOULS-LIKE', w / 2, h - 34);
  return cv;
}
