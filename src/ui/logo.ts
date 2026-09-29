/**
 * The title's wordmark (playtest round 20): SEVENTY STEPS cut in stone above a flight of seventy
 * treads running down into the dark, a light coming down them (logoPlan.ts says when each part takes
 * light, logoArt.ts draws it). One canvas of coarse pixels, drawn at two screen pixels each, made
 * once and kept: a page of the title that is built again takes the same canvas, so the descent is not
 * played twice. It runs while it is on the page and the tab is showing.
 */

import { buildLogoArt, type LogoArt } from './logoArt';
import { LOGO } from './logoPlan';

export interface Logo {
  readonly canvas: HTMLCanvasElement;
  /** Starts the descent from its beginning (the title has opened). */
  play(): void;
}

let made: Logo | null = null;

export function wordmark(): Logo {
  if (made) return made;
  const [w, h] = LOGO.size;
  const canvas = document.createElement('canvas');
  [canvas.width, canvas.height] = [w, h];
  canvas.style.cssText = `display:block;margin:0 auto 6px;width:${w * 2}px;max-width:94%;height:auto;aspect-ratio:${w}/${h};image-rendering:pixelated`;
  canvas.setAttribute('role', 'img');
  canvas.setAttribute('aria-label', 'Seventy Steps');
  const ctx = canvas.getContext('2d');
  let art: LogoArt | null = null;
  const image = ctx?.createImageData(w, h);
  let began = performance.now();
  let running = false;
  const frame = (now: number): void => {
    if (!canvas.isConnected) return void (running = false); // taken off the page: it stops until it is put back
    if (ctx && image && !document.hidden) {
      art ??= buildLogoArt();
      art.paint(image.data, (now - began) / 1000);
      ctx.putImageData(image, 0, 0);
    }
    requestAnimationFrame(frame);
  };
  const run = (): void => {
    if (running) return;
    running = true;
    requestAnimationFrame(frame);
  };
  new MutationObserver(run).observe(document.body, { childList: true, subtree: true }); // put back on a new page: it runs again
  made = {
    canvas,
    play() {
      began = performance.now();
      run();
    },
  };
  return made;
}
