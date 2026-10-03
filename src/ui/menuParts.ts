/**
 * The pieces a menu page is made of (round 36, split from menuKit.ts): the panels' style sheet and frame,
 * and the builders a page uses: lines of text, headings, titles, choices, sliders, tabs, and a foot
 * with a hint and the keys. A page with a foot has its title and tabs pinned over a body that scrolls
 * and the foot pinned under it (round 38: a long list, 100 creatures or 53 tomes, pushed the foot and
 * Back off the panel).
 */

import { BONE, GOLD, PAPER, SERIF } from './hudKit';
import type { Page } from './menuKit';

export const CSS = `
[data-menu] button{position:relative;display:block;width:100%;margin:0;padding:7px 14px 7px 30px;text-align:left;font:15px ${SERIF};letter-spacing:.8px;color:${BONE}c0;background:none;border:none;border-top:1px solid transparent;border-bottom:1px solid transparent;cursor:pointer;transition:color .15s,background .15s,border-color .15s}
[data-menu] button::before{content:'';position:absolute;left:12px;top:50%;width:5px;height:5px;margin-top:-3px;border:1px solid ${GOLD};transform:rotate(45deg) scale(.3);opacity:0;transition:opacity .15s,transform .15s}
[data-menu] button:disabled{opacity:.5;cursor:default}
[data-menu] button.quiet{display:inline-block;width:auto;padding:2px 0;opacity:.55;text-shadow:0 0 6px #000,0 1px 2px #000}
[data-menu] button.quiet::before{display:none}
[data-menu] button.quiet:focus,[data-menu] button.quiet:hover:not(:disabled){outline:none;opacity:1;background:none}
[data-menu] button:focus,[data-menu] button:hover:not(:disabled),[data-menu] label:focus-within,[data-menu] label:hover{outline:none;color:${PAPER};background:linear-gradient(90deg,${GOLD}26,${GOLD}0d 55%,transparent);border-top-color:${GOLD}2a;border-bottom-color:${GOLD}2a}
[data-menu] button:focus::before,[data-menu] button:hover:not(:disabled)::before{opacity:1;transform:rotate(45deg) scale(1);background:${GOLD}}
[data-menu] button.tab{display:inline-block;width:auto;margin:0 2px;padding:6px 14px;font-size:12px;letter-spacing:3px;text-transform:uppercase;color:${BONE}70;background:none;border-top-color:transparent;border-bottom:2px solid transparent}
[data-menu] button.tab::before{display:none}
[data-menu] button.tab.on{color:${PAPER};border-bottom-color:${GOLD}}
[data-menu] button.tab:focus,[data-menu] button.tab:hover:not(:disabled){color:${PAPER};background:${GOLD}14}
[data-menu] button.tag{display:inline-block;width:auto;margin:1px 0;padding:2px 8px;border:1px solid ${GOLD}44;text-align:center}
[data-menu] button.tag::before{display:none}
[data-menu] label{display:flex;gap:12px;align-items:center;margin:0;padding:6px 14px;border-top:1px solid transparent;border-bottom:1px solid transparent;transition:background .15s,border-color .15s}
[data-menu] label span:first-child{min-width:14ch}
[data-menu] label span:last-child{min-width:7ch;text-align:right;opacity:.85}
[data-menu] input[type=range]{flex:1;-webkit-appearance:none;appearance:none;height:16px;background:transparent;cursor:pointer}
[data-menu] input[type=range]::-webkit-slider-runnable-track{height:3px;background:linear-gradient(90deg,${GOLD}aa var(--fill,50%),${BONE}22 var(--fill,50%))}
[data-menu] input[type=range]::-moz-range-track{height:3px;background:${BONE}22}
[data-menu] input[type=range]::-moz-range-progress{height:3px;background:${GOLD}aa}
[data-menu] input[type=range]::-webkit-slider-thumb{-webkit-appearance:none;width:9px;height:9px;margin-top:-3px;transform:rotate(45deg);background:#0e0c0b;border:1px solid ${GOLD}}
[data-menu] input[type=range]::-moz-range-thumb{width:8px;height:8px;transform:rotate(45deg);border-radius:0;background:#0e0c0b;border:1px solid ${GOLD}}
[data-menu] input[type=range]:focus{outline:none}
[data-menu] input[type=range]:focus::-webkit-slider-thumb{background:${GOLD}}
[data-menu] input[type=range]:focus::-moz-range-thumb{background:${GOLD}}
[data-menu]:has(>.scroll){display:flex;flex-direction:column;overflow:hidden}
[data-menu]:has(>.scroll)>:not(.scroll){flex:none}
[data-menu] .scroll{flex:1 1 auto;min-height:0;overflow-y:auto;overflow-x:hidden;margin:0 -10px;padding:0 10px;scrollbar-width:thin;scrollbar-color:${GOLD}55 transparent}
[data-menu] .scroll::-webkit-scrollbar{width:6px}
[data-menu] .scroll::-webkit-scrollbar-thumb{background:${GOLD}44}
[data-menu] .hint{min-height:2.9em;padding-bottom:4px;white-space:pre-line;font-size:13px;line-height:1.45;color:${BONE}99}
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
  return `padding:22px 26px 16px;background:linear-gradient(180deg,#14110e${alpha},#0b0a09${alpha} 40%),#0b0a09${alpha};border:1px solid ${GOLD}55;box-shadow:inset 0 0 0 4px #0b0a09${alpha},inset 0 0 0 5px ${GOLD}2a,0 20px 60px #000d,inset 0 0 80px #000b`;
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
  box.dataset.pin = ''; // stays put above a scrolling body (footer)
  el(box, 'div', text, `font-size:17px;letter-spacing:7px;color:${PAPER}`);
  const rule = el(box, 'div', '', 'display:flex;align-items:center;gap:8px;margin:8px 18px 0');
  el(rule, 'span', '', `flex:1;height:1px;background:linear-gradient(90deg,transparent,${GOLD}77)`);
  el(rule, 'span', '', `width:5px;height:5px;transform:rotate(45deg);border:1px solid ${GOLD}`);
  el(rule, 'span', '', `flex:1;height:1px;background:linear-gradient(270deg,transparent,${GOLD}77)`);
  return box;
}

export function button(parent: HTMLElement, text: string, run: () => void, enabled = true, hint = ''): HTMLButtonElement {
  const b = el(parent, 'button', text);
  if (hint) b.dataset.hint = hint;
  b.disabled = !enabled;
  b.addEventListener('click', run);
  return b;
}

/**
 * A choice that may not be taken now (round 38: a line that was disabled could not be reached, so what it was,
 * and why it could not be taken, could not be read): it stays a line to choose, dimmed, and choosing it says
 * `why` in the page's foot instead of doing anything. `hint` is what the foot says while it is the chosen line.
 */
export function option(parent: HTMLElement, text: string, run: () => void, ok: boolean, why: string, hint = ''): HTMLButtonElement {
  const b = button(parent, text, () => (ok ? run() : void (b.closest('[data-menu]')?.querySelector('.hint') as HTMLElement | null)?.replaceChildren(why)), true, hint);
  if (!ok) b.style.opacity = '.5';
  return b;
}

/** A labelled range slider showing its value through `show`. */
export function slider(parent: HTMLElement, label: string, [min, max, step]: readonly number[], value: number, set: (v: number) => void, show: (v: number) => string, hint = ''): HTMLInputElement {
  const row = el(parent, 'label');
  if (hint) row.dataset.hint = hint;
  el(row, 'span', label);
  const input = el(row, 'input');
  Object.assign(input, { type: 'range', min: String(min), max: String(max), step: String(step), value: String(value) });
  const out = el(row, 'span', show(value));
  const fill = (): void => void input.style.setProperty('--fill', `${((Number(input.value) - min) / (max - min || 1)) * 100}%`);
  fill();
  input.addEventListener('input', () => {
    fill();
    set(Number(input.value));
    out.textContent = show(Number(input.value));
  });
  return input;
}

/** A row of tabs under a page's title: the one open is lit; choosing another calls `pick`. PageUp and PageDown (the bumpers) step along them. */
export function tabs(parent: HTMLElement, names: readonly string[], open: number, pick: (i: number) => void, page: Page): void {
  const row = el(parent, 'div', '', `display:flex;justify-content:center;flex-wrap:wrap;margin:0 0 12px;border-bottom:1px solid ${GOLD}2a`);
  row.dataset.pin = '';
  names.forEach((n, i) => button(row, n, () => pick(i)).classList.add('tab', ...(i === open ? ['on'] : [])));
  page.tab = (by) => pick((open + by + names.length) % names.length);
  queueMicrotask(() => { // the focus rests on the tab that is open, not the first
    const on = row.querySelector<HTMLElement>('.on');
    if (on && (document.activeElement as HTMLElement | null)?.classList.contains('tab')) on.focus({ preventScroll: true });
  });
}

/** A page's foot: a hint line (what the chosen line is: set by `data-hint`), and the keys it answers to, whose Back goes back when clicked. */
export function footer(parent: HTMLElement, hint: string, keys: readonly (readonly [string, string])[], back?: () => void): void {
  const rest = [...parent.children].filter((c) => !(c as HTMLElement).dataset.pin); // all but the title and tabs scroll between them and the foot
  const body = el(parent, 'div');
  body.className = 'scroll';
  body.append(...rest);
  const line = el(parent, 'div', hint, `margin-top:12px;padding-top:8px;border-top:1px solid ${GOLD}2a`);
  line.className = 'hint';
  line.dataset.def = hint; // what it says when the chosen line has nothing of its own to say
  if (!hint && !body.querySelector('[data-hint]')) [line.className, line.style.minHeight] = ['', '0']; // nothing to say (a list of tomes): no room kept for it
  const row = el(parent, 'div', '', `display:flex;justify-content:center;gap:20px;white-space:nowrap;margin-top:8px;font-size:11px;letter-spacing:2px;text-transform:uppercase;color:${BONE}70`);
  for (const [key, what] of keys) {
    const s = el(row, 'span', `${key}  ${what}`);
    if (back && what === 'Back') [s.style.cursor, s.onclick] = ['pointer', back]; // the mouse's way back: a click on it (it is not a choice for the keys)
  }
}
