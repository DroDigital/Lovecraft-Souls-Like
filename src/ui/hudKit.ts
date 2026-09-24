/** DOM helpers and colours shared by the HUD's halves. */

export const BONE = '#d9d0b8';
export const RUST = '#74493a';
export const SEA = '#5d6c70';

export function el(style: string, text = '', parent?: HTMLElement): HTMLDivElement {
  const d = document.createElement('div');
  d.style.cssText = style;
  d.textContent = text;
  parent?.append(d);
  return d;
}

/** A thin framed bar; set the returned fill's width in percent. */
export function bar(parent: HTMLElement, colour: string): HTMLDivElement {
  const frame = el(`position:relative;height:6px;margin:4px 0;border:1px solid ${BONE}55;background:#0008`, '', parent);
  return el(`height:100%;width:100%;background:${colour}`, '', frame);
}
