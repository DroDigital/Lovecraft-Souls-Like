/**
 * The great words (playtest round 14: a death, a horror's fall and a region's name were small
 * monospace lines, and a death's were gone under the veil within a second): drawn in the period face
 * across a dark band that fades in while the words slowly widen, as soulslikes mark their moments.
 * A death's words stand above the veil (z 9), so they stay while the dark falls; the others sit
 * under the menus.
 */

import { BONE, SERIF } from './hudKit';

export type Tone = 'death' | 'victory' | 'place';

export interface Banner {
  show(text: string, tone: Tone, sub?: string, line?: string): void; // `line`: a sentence read under it (a horror's epitaph)
  hide(): void;
}

interface Look {
  color: string;
  size: number; // px at UI scale 1
  top: number; // % of the screen's height
  hold: number; // seconds shown before it fades (Infinity: until hidden)
  band: number; // the dark band's strength
  rise: number; // ms to fade in
  z: number;
}

const LOOK: Record<Tone, Look> = {
  death: { color: '#9b2a20', size: 56, top: 44, hold: Infinity, band: 0.85, rise: 1500, z: 9 },
  victory: { color: '#c9a45c', size: 42, top: 40, hold: 5, band: 0.75, rise: 900, z: 2 },
  place: { color: BONE, size: 30, top: 20, hold: 2.6, band: 0.45, rise: 700, z: 2 },
};

export function createBanner(): Banner {
  const root = document.createElement('div');
  root.style.cssText = `position:fixed;left:0;right:0;pointer-events:none;text-align:center;opacity:0;font-family:${SERIF};padding:calc(14px * var(--ui, 1)) 0`;
  const words = document.createElement('div');
  words.style.cssText = 'text-shadow:0 0 14px #000,0 0 4px #000;white-space:nowrap';
  const sub = document.createElement('div');
  sub.style.cssText = `font-size:calc(13px * var(--ui, 1));letter-spacing:.32em;color:${BONE};opacity:.7;margin-top:calc(6px * var(--ui, 1))`;
  const said = document.createElement('div');
  said.style.cssText = `font-size:calc(15px * var(--ui, 1));font-style:italic;color:${BONE};opacity:.8;max-width:min(720px,86vw);margin:calc(10px * var(--ui, 1)) auto 0;line-height:1.5`;
  root.append(words, sub, said);
  document.body.append(root);
  let anims: Animation[] = [];
  let timer: ReturnType<typeof setTimeout> | undefined;

  const hide = (): void => {
    clearTimeout(timer);
    const from = Number(getComputedStyle(root).opacity) || 0;
    if (from <= 0) return;
    anims.push(root.animate([{ opacity: from }, { opacity: 0 }], { duration: 1200, easing: 'ease-in', fill: 'forwards' }));
  };

  return {
    show(text, tone, under = '', line = '') {
      const L = LOOK[tone];
      clearTimeout(timer);
      for (const a of anims) a.cancel();
      words.textContent = text;
      sub.textContent = under;
      sub.style.display = under ? 'block' : 'none';
      said.textContent = line;
      said.style.display = line ? 'block' : 'none';
      Object.assign(root.style, { top: `${L.top}%`, zIndex: String(L.z), transform: 'translateY(-50%)' });
      root.style.background = `linear-gradient(90deg,#0000,#000${Math.round(L.band * 15).toString(16)} 22%,#000${Math.round(L.band * 15).toString(16)} 78%,#0000)`;
      Object.assign(words.style, { color: L.color, fontSize: `calc(${L.size}px * var(--ui, 1))` });
      const life = (Number.isFinite(L.hold) ? L.hold + 2 : 8) * 1000;
      anims = [
        root.animate([{ opacity: 0 }, { opacity: 1 }], { duration: L.rise, easing: 'ease-out', fill: 'forwards' }),
        words.animate([{ transform: 'scale(0.97)', letterSpacing: '0.26em' }, { transform: 'scale(1.03)', letterSpacing: '0.4em' }], { duration: life, easing: 'linear', fill: 'forwards' }),
      ];
      if (Number.isFinite(L.hold)) timer = setTimeout(hide, L.hold * 1000);
    },
    hide,
  };
}
