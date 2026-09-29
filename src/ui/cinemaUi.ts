/**
 * What a cutscene lays over the picture (playtest round 20): bars top and bottom that slide in, a
 * fade to a colour and back, a line said low on the screen, a horror's name with a line beneath it,
 * and the small hint that a key skips it. All of it sits under the menus (z 5, the pause menu's 6
 * above), and none of it takes a click. The scene's timing is cinema.ts's; each call here starts a
 * transition of the browser's own.
 */

import type { Tint } from '../data/cutscenes';
import { glyph } from './glyphs';
import { BONE, SERIF } from './hudKit';

const COLOURS: Readonly<Record<Exclude<Tint, 'clear'>, string>> = {
  black: '#000',
  white: '#f4efe0',
  red: '#4a0606',
  violet: '#25093f',
  gold: '#e8cf8c',
};
const BAR = 11.5; // % of the screen's height, each

export interface CinemaUi {
  /** The bars slide in (or out) over `seconds`. */
  bars(on: boolean, seconds?: number): void;
  /** The screen goes to `tint` (or, for clear, lifts) over `seconds`; a `seconds` of 0 is at once. */
  fade(tint: Tint, seconds: number): void;
  caption(text: string, hold: number): void;
  title(name: string, line: string | undefined, hold: number): void;
  /** Shows or hides the skip hint. */
  hint(on: boolean): void;
  /** The bars slide away over `seconds`, and the words and the hint go; the fade is left as it stands. */
  clear(seconds?: number): void;
  /** Everything gone at once, the fade too. */
  wipe(): void;
}

const div = (css: string, parent: HTMLElement, text = ''): HTMLDivElement => {
  const d = document.createElement('div');
  d.style.cssText = css;
  d.textContent = text;
  parent.append(d);
  return d;
};

export function createCinemaUi(): CinemaUi {
  const root = div('position:fixed;inset:0;z-index:5;pointer-events:none;display:none;overflow:hidden', document.body);
  const veil = div('position:absolute;inset:0;background:#000;opacity:0', root);
  const bar = (edge: 'top' | 'bottom'): HTMLDivElement => div(`position:absolute;left:0;right:0;${edge}:0;height:${BAR}%;background:#000;transform:translateY(${edge === 'top' ? '-100%' : '100%'})`, root);
  const [top, bottom] = [bar('top'), bar('bottom')];
  const caption = div(`position:absolute;left:0;right:0;bottom:${BAR / 2}%;transform:translateY(50%);text-align:center;font:italic calc(22px * var(--ui, 1))/1.5 ${SERIF};letter-spacing:.06em;color:${BONE};text-shadow:0 0 10px #000,0 0 3px #000;opacity:0;padding:0 8vw`, root);
  const card = div(`position:absolute;left:0;right:0;bottom:${BAR + 3}%;text-align:center;opacity:0;padding:calc(14px * var(--ui, 1)) 0;background:linear-gradient(90deg,#0000,#000b 25%,#000b 75%,#0000)`, root);
  const name = div(`font-family:${SERIF};font-size:calc(44px * var(--ui, 1));letter-spacing:.32em;color:#c9a45c;text-shadow:0 0 16px #000,0 0 4px #000;white-space:nowrap`, card);
  const line = div(`font:italic calc(16px * var(--ui, 1))/1.5 ${SERIF};letter-spacing:.12em;color:${BONE};opacity:.75;margin-top:calc(8px * var(--ui, 1));text-shadow:0 0 8px #000`, card);
  const hint = div(`position:absolute;right:3vw;top:${BAR / 2 - 1}%;font:calc(11px * var(--ui, 1)) ${SERIF};letter-spacing:.2em;color:${BONE};opacity:0`, root);
  let veilAnim: Animation | undefined;
  let scene = 0; // which scene's bars these are: a scene begun since a clear keeps the layer

  const to = (node: HTMLElement, keyframes: Keyframe[], ms: number, easing = 'ease-out'): Animation => {
    const a = node.animate(keyframes, { duration: Math.max(1, ms), easing, fill: 'forwards' });
    const last = keyframes[keyframes.length - 1];
    a.onfinish = () => {
      Object.assign(node.style, last);
      a.cancel();
    };
    return a;
  };
  const shown = (node: HTMLElement, hold: number, rise = 1100): void => {
    node.getAnimations().forEach((a) => a.cancel());
    node.animate([{ opacity: 0 }, { opacity: 1, offset: rise / (rise + hold * 1000 + 1000) }, { opacity: 1, offset: (rise + hold * 1000) / (rise + hold * 1000 + 1000) }, { opacity: 0 }], { duration: rise + hold * 1000 + 1000, easing: 'ease-in-out', fill: 'forwards' });
  };
  const slide = (node: HTMLElement, edge: 'top' | 'bottom', on: boolean, seconds: number): void => {
    const [out, at] = [edge === 'top' ? '-100%' : '100%', 'translateY(0)'];
    const now = getComputedStyle(node).transform;
    to(node, [{ transform: now === 'none' ? (on ? `translateY(${out})` : at) : now }, { transform: on ? at : `translateY(${out})` }], seconds * 1000, 'ease-in-out');
  };

  return {
    bars(on, seconds = 0.8) {
      root.style.display = 'block';
      if (on) scene++;
      slide(top, 'top', on, seconds);
      slide(bottom, 'bottom', on, seconds);
    },
    fade(tint, seconds) {
      root.style.display = 'block';
      const from = Number(getComputedStyle(veil).opacity) || 0;
      veilAnim?.cancel();
      veil.style.opacity = String(from);
      if (tint !== 'clear') veil.style.background = COLOURS[tint];
      const goal = tint === 'clear' ? 0 : 1;
      if (seconds <= 0.02) veil.style.opacity = String(goal);
      else veilAnim = to(veil, [{ opacity: from }, { opacity: goal }], seconds * 1000, tint === 'clear' ? 'ease-out' : 'ease-in');
    },
    caption(text, hold) {
      caption.textContent = text;
      shown(caption, hold, 900);
    },
    title(words, under, hold) {
      name.textContent = words;
      line.textContent = under ?? '';
      line.style.display = under ? 'block' : 'none';
      shown(card, hold, 1300);
      name.getAnimations().forEach((a) => a.cancel());
      name.animate([{ letterSpacing: '.26em' }, { letterSpacing: '.4em' }], { duration: (hold + 2.3) * 1000, easing: 'linear', fill: 'forwards' });
    },
    hint(on) {
      hint.textContent = on ? `${glyph('back')} · skip` : '';
      hint.style.opacity = on ? '.45' : '0';
    },
    clear(seconds = 0.8) {
      for (const n of [caption, card]) n.getAnimations().forEach((a) => a.cancel());
      caption.style.opacity = card.style.opacity = '0';
      hint.style.opacity = '0';
      slide(top, 'top', false, seconds);
      slide(bottom, 'bottom', false, seconds);
      const mine = scene;
      setTimeout(() => void (mine === scene && Number(getComputedStyle(veil).opacity) < 0.01 && (root.style.display = 'none')), seconds * 1000 + 700); // the layer goes once its bars have, unless another scene has taken it or a fade still shows
    },
    wipe() {
      for (const n of [caption, card, veil, top, bottom]) n.getAnimations().forEach((a) => a.cancel());
      veilAnim = undefined;
      veil.style.opacity = caption.style.opacity = card.style.opacity = hint.style.opacity = '0';
      top.style.transform = 'translateY(-100%)';
      bottom.style.transform = 'translateY(100%)';
      root.style.display = 'none';
    },
  };
}
