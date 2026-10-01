/**
 * Menus (Phase 6): a screen is an overlay with one panel whose page can change. While any screen is
 * open the game hears no key presses. The arrow keys, or a pad's d-pad and left stick, move between
 * the page's buttons and sliders; Enter or Space (pad A) choose; left and right move a slider; Esc
 * (pad B) goes back. With no screen open, the pad's Start calls the `onPadStart` listeners and its
 * Select the `onPadSelect` ones. A page may hear keys and read the pad itself (the map).
 * Round 12: coming back to a page finds the focus where it was left; a page is drawn again when
 * the player picks up the other device, so it names that device's buttons; panels scale with the
 * UI scale (uiScale.ts). Round 17: a long page opens at its top, and scrolls on (the arrows past
 * its last choice, or the pad's right stick).
 */

import { useDevice, onDeviceChange } from '../core/device';
import { activePad, muteHeldPad, type PadReading } from '../core/pads';
import { BONE, GOLD, PAPER, SERIF } from './hudKit';
import { SCALED_LAYER } from './uiScale';

export interface Page {
  build(panel: HTMLElement): void;
  back?: () => void;
  backKeys?: readonly string[]; // keys besides Esc that go back
  keys?: (e: KeyboardEvent) => void; // hears every key pressed while it is open (the map pans and zooms)
  pad?: (pad: PadReading) => void; // reads the pad each frame while it is open
  redraw?: () => void; // set by the screen that shows it: draws it again, keeping the focus
}

export interface Screen {
  readonly open: boolean;
  show(page: Page): void;
  close(): void;
  /** Called once the screen has closed (round 29: the Elder Sign's menu lets the investigator rise). */
  onClose?: () => void;
}

interface Entry {
  panel: HTMLElement;
  page: Page;
  since: number; // when the screen opened: a back key in its first moments is the one that opened it
  redraw(): void; // draws its page again, keeping the focus
}

const GRACE_MS = 250;
const PAD = { a: 0, b: 1, select: 8, start: 9, up: 12, down: 13, left: 14, right: 15 };
const STICK = 0.6;
const REPEAT_MS = [380, 110] as const; // a held direction repeats after the first, then every second

const stack: Entry[] = [];
const padStart: (() => void)[] = [];
const padSelect: (() => void)[] = [];
let sound: () => void = () => undefined;
let started = false;

export const menuOpen = (): boolean => stack.length > 0;
export const onPadStart = (fn: () => void): void => void padStart.push(fn);
/** With no screen open, the pad's Select (Back) calls these (the map). */
export const onPadSelect = (fn: () => void): void => void padSelect.push(fn);
/** A soft tick as the focus moves or a choice is made. */
export const setMenuSound = (fn: () => void): void => void (sound = fn);

const CSS = `
[data-menu] button{position:relative;display:block;width:100%;margin:1px 0;padding:6px 10px 6px 26px;text-align:left;font:15px ${SERIF};letter-spacing:.6px;color:${BONE}d0;background:none;border:none;border-bottom:1px solid transparent;cursor:pointer;transition:color .15s,border-color .15s}
[data-menu] button::before{content:'';position:absolute;left:10px;top:50%;width:5px;height:5px;margin-top:-3px;border:1px solid ${GOLD};transform:rotate(45deg) scale(.4);opacity:0;transition:opacity .15s,transform .15s}
[data-menu] button:disabled{opacity:.35;cursor:default}
[data-menu] button.quiet{display:inline-block;width:auto;padding:2px 0;opacity:.55;text-shadow:0 0 6px #000,0 1px 2px #000}
[data-menu] button.quiet::before{display:none}
[data-menu] button.quiet:focus,[data-menu] button.quiet:hover:not(:disabled){outline:none;opacity:1;border-color:transparent}
[data-menu] button:focus,[data-menu] button:hover:not(:disabled){outline:none;color:${PAPER};border-bottom-color:${GOLD}55}
[data-menu] button:focus::before,[data-menu] button:hover:not(:disabled)::before{opacity:1;transform:rotate(45deg) scale(1);background:${GOLD}}
[data-menu] label{display:flex;gap:12px;align-items:center;margin:9px 0}
[data-menu] label span:first-child{min-width:13ch}
[data-menu] label span:last-child{min-width:6ch;text-align:right;opacity:.8}
[data-menu] input[type=range]{flex:1;-webkit-appearance:none;appearance:none;height:16px;background:transparent;cursor:pointer}
[data-menu] input[type=range]::-webkit-slider-runnable-track{height:1px;background:${GOLD}77}
[data-menu] input[type=range]::-moz-range-track{height:1px;background:${GOLD}77}
[data-menu] input[type=range]::-webkit-slider-thumb{-webkit-appearance:none;width:8px;height:8px;margin-top:-4px;transform:rotate(45deg);background:#0e0c0b;border:1px solid ${GOLD}}
[data-menu] input[type=range]::-moz-range-thumb{width:7px;height:7px;transform:rotate(45deg);border-radius:0;background:#0e0c0b;border:1px solid ${GOLD}}
[data-menu] input[type=range]:focus{outline:none}
[data-menu] input[type=range]:focus::-webkit-slider-thumb{background:${GOLD}}
[data-menu] input[type=range]:focus::-moz-range-thumb{background:${GOLD}}
[data-menu]{scrollbar-width:thin;scrollbar-color:${GOLD}55 transparent}
[data-menu]::-webkit-scrollbar{width:6px}
[data-menu]::-webkit-scrollbar-thumb{background:${GOLD}44}
[data-menu]::-webkit-scrollbar-track{background:transparent}`;

/**
 * A panel's look (round 35: round 32's gilt frames, brackets and glowing plaques read as a modern
 * game's menu, and too much of one colour): a leaf of an old field journal. A warm near-black
 * ground with a little light at its head, a single fine rule held inside the edge by a second, and
 * nothing else; its choices are plain lines of print, the one chosen marked by a small lozenge and
 * brightened. `alpha` (two hex digits) lets a dialogue's panel show the world through it.
 */
export function frame(alpha = ''): string {
  return `padding:24px 30px;background:radial-gradient(ellipse at 50% 0%,#17130f${alpha},#0c0a09${alpha} 75%);border:1px solid ${GOLD}44;box-shadow:inset 0 0 0 5px #0c0a09${alpha},inset 0 0 0 6px ${GOLD}33,0 18px 50px #000c,inset 0 0 70px #000a`;
}

const items = (panel: HTMLElement): HTMLElement[] => [...panel.querySelectorAll<HTMLElement>('button:not(:disabled), input')];

function focusAt(panel: HTMLElement, i: number, preventScroll = false): void {
  const list = items(panel);
  if (list.length) list[Math.max(0, Math.min(list.length - 1, i))].focus({ preventScroll });
}

/**
 * The next choice up or down; but past the last choice that way, a long page scrolls on before it
 * wraps round (playtest round 17: a pad could not read what lay above Achievements' one button).
 */
function move(panel: HTMLElement, by: number): void {
  const list = items(panel);
  const i = list.indexOf(document.activeElement as HTMLElement);
  const room = by < 0 ? panel.scrollTop : panel.scrollHeight - panel.clientHeight - panel.scrollTop;
  if (i >= 0 && !list[i + by] && room > 1) panel.scrollBy({ top: by * panel.clientHeight * 0.6, behavior: 'smooth' });
  else if (list.length) list[i < 0 ? 0 : (i + by + list.length) % list.length].focus();
  else return;
  sound();
}

function back(top: Entry): void {
  if (performance.now() - top.since > GRACE_MS) top.page.back?.();
}

function nudge(by: 1 | -1): void {
  const el = document.activeElement;
  if (!(el instanceof HTMLInputElement) || el.type !== 'range') return;
  if (by > 0) el.stepUp();
  else el.stepDown();
  el.dispatchEvent(new Event('input', { bubbles: true }));
}

/** Keys: capture phase, so the game's own listeners never hear a key pressed in a menu. */
function onKey(e: KeyboardEvent): void {
  const top = stack.at(-1);
  if (!top) return;
  useDevice('keys');
  e.stopImmediatePropagation();
  top.page.keys?.(e);
  if (e.code === 'Escape' || top.page.backKeys?.includes(e.code)) {
    e.preventDefault();
    if (!e.repeat) back(top);
  } else if (e.code === 'ArrowDown' || e.code === 'ArrowUp' || e.code === 'Tab') {
    e.preventDefault();
    move(top.panel, e.code === 'ArrowUp' || (e.code === 'Tab' && e.shiftKey) ? -1 : 1);
  }
}

let prev = new Set<number>();
let held = 0; // the direction held: -1 up, 1 down, 0 none
let repeatAt = 0;

function pollPad(now: number): void {
  const pad = activePad();
  const down = new Set<number>();
  pad?.buttons.forEach((b, i) => (b.pressed || b.value > 0.5) && down.add(i));
  const [lx, ly] = [pad?.axes[0] ?? 0, pad?.axes[1] ?? 0];
  const edge = (i: number): boolean => down.has(i) && !prev.has(i);
  if ([...down].some((i) => !prev.has(i)) || Math.abs(lx) > STICK || Math.abs(ly) > STICK) useDevice('pad');
  const top = stack.at(-1);
  if (top) {
    const dir = down.has(PAD.up) || ly < -STICK ? -1 : down.has(PAD.down) || ly > STICK ? 1 : 0;
    if (dir !== held || (dir && now >= repeatAt)) {
      if (dir) move(top.panel, dir);
      repeatAt = now + REPEAT_MS[dir === held ? 1 : 0];
      held = dir;
    }
    const ry = pad?.axes[3] ?? 0; // the right stick scrolls a long page
    if (Math.abs(ry) > STICK) top.panel.scrollTop += ry * 14;
    if (edge(PAD.left) || (lx < -STICK && !prev.has(-1))) nudge(-1);
    if (edge(PAD.right) || (lx > STICK && !prev.has(-2))) nudge(1);
    if (edge(PAD.a)) {
      const el = document.activeElement;
      if (el instanceof HTMLButtonElement && top.panel.contains(el)) el.click();
      else focusAt(top.panel, 0);
    }
    if (edge(PAD.b) || edge(PAD.start) || edge(PAD.select)) back(top);
    if (pad) top.page.pad?.(pad);
  } else if (edge(PAD.start)) for (const fn of padStart) fn();
  else if (edge(PAD.select)) for (const fn of padSelect) fn();
  if (lx < -STICK) down.add(-1); // stick sideways, latched like a button
  if (lx > STICK) down.add(-2);
  prev = down;
  requestAnimationFrame(pollPad);
}

function startOnce(): void {
  if (started) return;
  started = true;
  const style = document.createElement('style');
  style.textContent = CSS;
  document.head.append(style);
  addEventListener('keydown', onKey, true);
  addEventListener('pointerdown', () => useDevice('keys'), true);
  onDeviceChange(() => stack.at(-1)?.redraw()); // name the new device's buttons
  requestAnimationFrame(pollPad);
}

/** A screen at stacking level `z`; `panelCss` places and styles its panel. `keepLock`: the mouse stays captured while it is open (a talk, which is read and answered by key: round 31, so leaving one needs no click to look about again). */
export function createScreen(z: number, backdrop = '#050506dd', panelCss = `left:50%;top:50%;transform:translate(-50%,-50%);width:min(460px,92vw);max-height:86vh;overflow:auto;${frame()}`, scaled = true, keepLock = false): Screen {
  startOnce();
  const root = document.createElement('div');
  root.style.cssText = `position:fixed;inset:0;display:none;z-index:${z};background:${backdrop};font:14px/1.45 ${SERIF};color:${BONE}`;
  const layer = document.createElement('div'); // the panel's world, scaled with the UI (its vw and vh become shares of it)
  layer.style.cssText = scaled ? SCALED_LAYER : 'position:absolute;inset:0';
  const panel = document.createElement('div');
  panel.style.cssText = `position:absolute;${scaled ? panelCss.replace(/(\d+)v[wh]/g, '$1%') : panelCss}`;
  panel.dataset.menu = '';
  layer.append(panel);
  root.append(layer);
  document.body.append(root);
  let entry: Entry | null = null;
  const memory = new Map<Page, number>(); // where the focus was on each page left while the screen stays open
  const focused = (): number => items(panel).indexOf(document.activeElement as HTMLElement);
  // A choice that rebuilds the page keeps the focus where it was.
  panel.addEventListener('click', (e) => {
    const i = items(panel).indexOf(e.target as HTMLElement);
    sound();
    queueMicrotask(() => entry && i >= 0 && !panel.contains(document.activeElement) && focusAt(panel, i));
  });
  const self: Screen = {
    get open() {
      return entry !== null;
    },
    show(page) {
      const same = entry?.page === page;
      const fresh = !same && !memory.has(page); // a page first opened is read from its top
      const at = same ? focused() : (memory.get(page) ?? 0);
      if (entry && !same) memory.set(entry.page, Math.max(0, focused()));
      page.redraw = () => void (entry?.page === page && self.show(page));
      panel.replaceChildren();
      page.build(panel);
      root.style.display = 'block';
      if (entry) entry.page = page;
      else {
        const redraw = (): void => void (entry && self.show(entry.page));
        stack.push((entry = { panel, page, since: performance.now(), redraw }));
      }
      if (!keepLock) document.exitPointerLock?.();
      focusAt(panel, Math.max(0, at), fresh);
      if (fresh) panel.scrollTop = 0;
    },
    close() {
      if (!entry) return;
      memory.clear();
      stack.splice(stack.indexOf(entry), 1);
      entry = null;
      root.style.display = 'none';
      if (!stack.length) muteHeldPad(); // the B or A that closed it is not a dodge or a word
      (document.activeElement as HTMLElement | null)?.blur?.();
      self.onClose?.();
    },
  };
  return self;
}

export function el<K extends keyof HTMLElementTagNameMap>(parent: HTMLElement, tag: K, text = '', style = ''): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag);
  e.textContent = text;
  e.style.cssText = style;
  parent.append(e);
  return e;
}

/** A page's section: small capitals in old brass over a hair rule (an empty one is the rule alone, before a closing button). */
export const heading = (parent: HTMLElement, text: string): HTMLDivElement => el(parent, 'div', text, `margin:16px 0 6px;padding-bottom:3px;letter-spacing:3px;font-size:11px;color:${GOLD};border-bottom:1px solid ${GOLD}33`);

/** A page's title: its name in pale capitals and a hair rule with a small lozenge, no more. */
export function title(parent: HTMLElement, text: string): HTMLDivElement {
  const box = el(parent, 'div', '', 'margin:0 0 14px;text-align:center');
  el(box, 'div', text, `font-size:17px;letter-spacing:7px;color:${PAPER}`);
  const rule = el(box, 'div', '', 'display:flex;align-items:center;gap:8px;margin:8px 18px 0');
  el(rule, 'span', '', `flex:1;height:1px;background:linear-gradient(90deg,transparent,${GOLD}77)`);
  el(rule, 'span', '', `width:5px;height:5px;transform:rotate(45deg);border:1px solid ${GOLD}`);
  el(rule, 'span', '', `flex:1;height:1px;background:linear-gradient(270deg,transparent,${GOLD}77)`);
  return box;
}

export function button(parent: HTMLElement, text: string, run: () => void, enabled = true): HTMLButtonElement {
  const b = el(parent, 'button', text);
  b.disabled = !enabled;
  b.addEventListener('click', run);
  return b;
}

/** A labelled range slider showing its value through `show`. */
export function slider(parent: HTMLElement, label: string, [min, max, step]: readonly number[], value: number, set: (v: number) => void, show: (v: number) => string): HTMLInputElement {
  const row = el(parent, 'label');
  el(row, 'span', label);
  const input = el(row, 'input');
  Object.assign(input, { type: 'range', min: String(min), max: String(max), step: String(step), value: String(value) });
  const out = el(row, 'span', show(value));
  input.addEventListener('input', () => {
    set(Number(input.value));
    out.textContent = show(Number(input.value));
  });
  return input;
}
