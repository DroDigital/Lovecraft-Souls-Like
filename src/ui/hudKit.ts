/** DOM helpers and colours shared by the HUD's halves. */

export const BONE = '#d9d0b8';
export const RUST = '#74493a';
export const SEA = '#5d6c70';
// The vitals' own colours (round 32: the three bars were rust, slate and bone, six pixels thin and alike) and the trim of frames:
export const BLOOD = '#ac2f29'; // health
export const LEAF = '#8c9163'; // stamina (round 35: a drab olive; the leaf green of round 32 was too much)
export const GOLD = '#a8935f'; // the rule and the brackets of a frame, the hot edge of a choice
export const PAPER = '#e8dec6'; // a title
/** A period book face for the title, menus, the HUD (round 14) and what is read (system fonts: no font files). */
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

/** `a` turned toward `b` by share `k` (0–1), both '#rrggbb'. */
export function blend(a: string, b: string, k: number): string {
  const [x, y] = [parseInt(a.slice(1), 16), parseInt(b.slice(1), 16)];
  const part = (shift: number): string => Math.round(((x >> shift) & 255) * (1 - k) + ((y >> shift) & 255) * k).toString(16).padStart(2, '0');
  return `#${part(16)}${part(8)}${part(0)}`;
}

/** A framed bar `height` pixels thick (round 32: six was too thin); set the returned fill's width in percent. Its fill has a lit top and a shaded foot, so it reads as a thing and not a line. */
export function bar(parent: HTMLElement, colour: string, height = 6): HTMLDivElement {
  const frame = el(`position:relative;height:${height}px;margin:${height > 8 ? 5 : 4}px 0;border:1px solid ${BONE}77;background:#050507;box-shadow:0 0 0 1px #000c,inset 0 0 5px #000`, '', parent);
  const edge = Math.max(1, Math.round(height / 4));
  return el(`height:100%;width:100%;background:${colour};box-shadow:inset 0 ${edge}px 0 #ffffff2a,inset 0 -${edge}px 0 #0000004d`, '', frame);
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
