/**
 * When the dream breaks (playtest round 12): the graphics cannot start (no WebGL2), the graphics
 * context is lost (a driver reset, the GPU taken away), or a frame throws. Instead of freezing on
 * black, the game saves what it can and says what happened, with a way back in (and, in the desktop
 * shell, out). Plain DOM, dependent on nothing that may itself have broken.
 */

import { desktop } from './desktop';

export type CrashKind = 'webgl' | 'lost' | 'error';

const WORDS: Record<CrashKind, { title: string; line: string }> = {
  webgl: {
    title: 'THE DREAM CANNOT BEGIN',
    line: 'This computer or browser could not start the graphics the game needs (WebGL 2). Updating the graphics driver or the browser, or turning on hardware acceleration, usually helps.',
  },
  lost: {
    title: 'THE PICTURE WAS LOST',
    line: 'The graphics device stopped answering (a driver reset, or the GPU was taken by something else). Your progress was saved a moment ago.',
  },
  error: {
    title: 'THE DREAM BREAKS',
    line: 'Something went wrong and the game had to stop. Your progress stands as it was last saved, a few moments ago.',
  },
};

let shown = false;

/** Shows the crash screen once; `detail` (an error's message) is printed small beneath. */
export function showCrash(kind: CrashKind, detail?: string): void {
  if (shown) return;
  shown = true;
  try {
    document.exitPointerLock?.();
  } catch {
    // Nothing held.
  }
  const w = WORDS[kind];
  const root = document.createElement('div');
  root.setAttribute('role', 'alertdialog');
  root.style.cssText =
    'position:fixed;inset:0;z-index:50;background:#050506;color:#d9d0b8;display:flex;align-items:center;justify-content:center;font:16px/1.7 "Iowan Old Style",Palatino,"Book Antiqua",Georgia,serif;text-align:center';
  const panel = document.createElement('div');
  panel.style.cssText = 'max-width:560px;padding:24px';
  const title = document.createElement('div');
  title.textContent = w.title;
  title.style.cssText = 'font-size:24px;letter-spacing:8px;margin-bottom:20px';
  const line = document.createElement('div');
  line.textContent = w.line;
  line.style.cssText = 'opacity:.8';
  panel.append(title, line);
  if (detail) {
    const d = document.createElement('div');
    d.textContent = detail.slice(0, 300);
    d.style.cssText = 'font:11px monospace;opacity:.35;margin-top:14px;word-break:break-word';
    panel.append(d);
  }
  const row = document.createElement('div');
  row.style.cssText = 'margin-top:28px';
  const add = (label: string, run: () => void): HTMLButtonElement => {
    const b = document.createElement('button');
    b.textContent = label;
    b.style.cssText = 'margin:0 8px;padding:6px 18px;font:inherit;letter-spacing:2px;color:#d9d0b8;background:#141416;border:1px solid #d9d0b855;cursor:pointer';
    b.addEventListener('click', run);
    row.append(b);
    return b;
  };
  const again = add('Wake again', () => void (location.href = location.pathname));
  if (desktop) add('Quit', () => void desktop!.quit());
  panel.append(row);
  root.append(panel);
  document.body.append(root);
  again.focus();
}
