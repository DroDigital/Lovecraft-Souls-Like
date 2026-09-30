/**
 * Photo mode (round 26): P takes a picture of the dream as drawn. The game's canvas is only readable
 * in the frame it is drawn, so a press asks, and `after()` (called straight after the render) takes
 * it. A white flash, a shutter, and a line on the HUD say it is done.
 */

import type { Game } from '../systems/components';
import { enlarge, savePng, scaleFor } from './keepsake';

export interface Photo {
  /** Call straight after the frame is rendered. */
  after(): void;
}

export function createPhoto(g: Game, canvas: HTMLCanvasElement, shutter: () => void): Photo {
  let asked = false;
  const flash = Object.assign(document.createElement('div'), { style: 'position:fixed;inset:0;background:#fff;opacity:0;pointer-events:none;transition:opacity .5s;z-index:30' });
  document.body.append(flash);
  addEventListener('keydown', (e) => {
    if (e.code === 'KeyP' && !e.repeat && !e.ctrlKey && !e.metaKey && !e.altKey && !(e.target instanceof HTMLInputElement)) asked = true;
  });
  return {
    after() {
      if (!asked) return;
      asked = false;
      try {
        const name = `dream-${Date.now().toString(36)}`;
        savePng(enlarge(canvas, canvas.width >= 1200 ? 1 : scaleFor(canvas.width)), name);
        flash.style.transition = 'none';
        flash.style.opacity = '0.8';
        requestAnimationFrame(() => ((flash.style.transition = 'opacity .5s'), (flash.style.opacity = '0')));
        shutter();
        g.events.emit('Notice', { text: 'A PICTURE OF THE DREAM IS KEPT' });
      } catch {
        g.events.emit('Notice', { text: 'THE PICTURE WOULD NOT KEEP' });
      }
    },
  };
}
