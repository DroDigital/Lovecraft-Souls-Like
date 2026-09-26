/** DOM helpers and colours shared by the HUD's halves. */

export const BONE = '#d9d0b8';
export const RUST = '#74493a';
export const SEA = '#5d6c70';
/** A period book face for the title, menus and what is read (system fonts: no font files); the HUD keeps monospace. */
export const SERIF = "'Iowan Old Style','Palatino Linotype',Palatino,'Book Antiqua',Georgia,serif";
/** A telegram's or typescript's face. */
export const TYPEWRITER = "'Courier New',Courier,monospace";

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

/** Writes only what changed, so an unchanged HUD costs the page no style or layout work. */
export function setText(e: HTMLElement, text: string): void {
  if (e.textContent !== text) e.textContent = text;
}

export function setStyle(e: HTMLElement, key: 'width' | 'background' | 'opacity' | 'display' | 'left' | 'top' | 'visibility' | 'color', value: string): void {
  if (e.style[key] !== value) e.style[key] = value;
}

/** A bar fill's width for `value` of `max`, to a tenth of a percent. */
export const percent = (value: number, max: number): string => `${Math.max(0, Math.min(100, (100 * value) / max)).toFixed(1)}%`;
