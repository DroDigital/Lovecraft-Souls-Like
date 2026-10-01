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
import { activePad, muteHeldPad } from '../core/pads';
import { BONE, SERIF } from './hudKit';
import { SCALED_LAYER } from './uiScale';

export interface Page {
  build(panel: HTMLElement): void;
  back?: () => void;
  backKeys?: readonly string[]; // keys besides Esc that go back
  keys?: (e: KeyboardEvent) => void; // hears every key pressed while it is open (the map pans and zooms)
  pad?: (pad: Gamepad) => void; // reads the pad each frame while it is open
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
[data-menu] button{display:block;width:100%;margin:3px 0;padding:5px 10px;text-align:left;font:14px ${SERIF};letter-spacing:.5px;color:${BONE};background:#141416;border:1px solid ${BONE}44;cursor:pointer}
[data-menu] button:disabled{opacity:.4;cursor:default}
[data-menu] button:focus,[data-menu] button:hover:not(:disabled){outline:1px solid ${BONE}aa;background:#26262a!important}
[data-menu] label{display:flex;gap:10px;align-items:center;margin:8px 0}
[data-menu] label span:first-child{min-width:13ch}
[data-menu] label span:last-child{min-width:6ch;text-align:right}
[data-menu] input[type=range]{flex:1;accent-color:${BONE}}
[data-menu] input:focus{outline:1px solid ${BONE}aa}
[data-menu]{scrollbar-width:thin;scrollbar-color:${BONE}55 transparent}
[data-menu]::-webkit-scrollbar{width:8px}
[data-menu]::-webkit-scrollbar-thumb{background:${BONE}44;border-radius:4px}
[data-menu]::-webkit-scrollbar-track{background:transparent}`;

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

/** A screen at stacking level `z`; `panelCss` places and styles its panel. */
export function createScreen(z: number, backdrop = '#050506dd', panelCss = 'left:50%;top:50%;transform:translate(-50%,-50%);width:min(460px,92vw);max-height:86vh;overflow:auto;padding:18px;background:#0b0b0d;border:1px solid #d9d0b833', scaled = true): Screen {
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
      document.exitPointerLock?.();
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

export const heading = (parent: HTMLElement, text: string): HTMLDivElement => el(parent, 'div', text, 'margin:14px 0 4px;letter-spacing:3px;opacity:.75');

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
