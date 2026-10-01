/**
 * The small instruments of the HUD (round 33: the bars of round 32 were thick, saturated slabs that
 * sat on the picture like a game's menu; these are thin, the colours muted, and each is trimmed like
 * a thing in a case): a gauge is a hairline frame of old brass with a shaded fill and, if asked,
 * a diamond at either end; a row of pips counts what is carried (doses as diamonds, cartridges as
 * rounds), full or hollow.
 */

import { BONE, el, GOLD } from './hudKit';

/** A gauge `height` pixels thick; set the returned fill's width in percent. `caps`: a diamond at each end. */
export function gauge(parent: HTMLElement, colour: string, height: number, caps = false): HTMLDivElement {
  const frame = el(`position:relative;height:${height}px;margin:3px 0;border:1px solid ${GOLD}66;background:#060608;box-shadow:0 0 0 1px #000d,inset 0 0 3px #000`, '', parent);
  if (caps) for (const side of ['left', 'right']) el(`position:absolute;${side}:-5px;top:50%;width:5px;height:5px;margin-top:-3px;transform:rotate(45deg);background:${GOLD};box-shadow:0 0 0 1px #000`, '', frame);
  return el(`height:100%;width:100%;background:linear-gradient(#ffffff26,#0000 45%,#0000005c),${colour};filter:saturate(.7) brightness(.92)`, '', frame);
}

export interface Pips {
  /** Shows `on` of `max` filled; the row is made again only when `max` changes. */
  set(on: number, max: number): void;
}

/** A row of `shape` pips after a small `label`; `after` is a text that follows them. */
export function pipRow(parent: HTMLElement, label: string, shape: 'diamond' | 'round', fill: string): Pips & { after: HTMLSpanElement } {
  const row = el('display:flex;align-items:center;gap:6px;height:11px;margin-top:3px;font-size:9px;letter-spacing:2px', '', parent);
  el('opacity:.5;width:62px', label, row);
  const holder = el('display:flex;gap:4px;align-items:center', '', row);
  const after = document.createElement('span');
  after.style.cssText = 'opacity:.7;font-size:10px;letter-spacing:1px';
  row.append(after);
  let made = -1;
  let marks: HTMLElement[] = [];
  return {
    after,
    set(on, max) {
      if (max !== made) {
        made = max;
        holder.replaceChildren();
        marks = Array.from({ length: max }, () => el(`width:5px;height:5px;${shape === 'diamond' ? 'transform:rotate(45deg);' : 'border-radius:50%;'}box-shadow:0 0 0 1px #000`, '', holder));
      }
      marks.forEach((m, i) => {
        const full = i < on;
        m.style.background = full ? fill : 'transparent';
        m.style.border = `1px solid ${full ? fill : `${BONE}55`}`;
        m.style.boxSizing = 'border-box';
      });
    },
  };
}
