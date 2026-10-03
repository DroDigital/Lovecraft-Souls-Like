/**
 * The menus' skin (round 38; the panel was a flat box): a panel is drawn behind its words on a canvas of its own,
 * with art that moves while it is open and its own way of opening. Five were made (burnt paper, a gothic window,
 * a standing stone, a tattered shroud, mist) and one chosen: the mist, which has no frame, no edge and no box, only
 * a dark ground feathered into drifting mist. The panel itself keeps its words and its scrolling; the skin gives
 * it its padding and its look. `?debug` lets a script seek an opening (`window.skins`).
 */

import { mist } from './skins/mist';

export interface SkinArt {
  /** Draws the art for `ms` since the screen opened; (0,0) is the panel's top left, and the art may reach `bleed` past it. `open` is 0 to 1 over the opening. */
  draw(ctx: CanvasRenderingContext2D, ms: number, open: number): void;
  /** Sets how the words come in at `open` (0 to 1): styles on the panel, whose resting transform is `base`. */
  words(panel: HTMLElement, open: number, base: string): void;
}

export interface Skin {
  id: string;
  name: string;
  bleed: number; // pixels the art reaches past the panel's box
  pad: string; // the panel's padding: where its words may stand within the art
  openMs: number;
  maxVh?: number; // the most of the window's height the panel may take (else 95)
  build(w: number, h: number): SkinArt;
}

/** The menus' one skin (round 38: chosen from five that were shown: burnt paper, a gothic window, a standing stone, a shroud, and this). */
export const SKIN: Skin = mist;

export const BASE = 'translate(-50%,-50%)'; // the panel's resting transform (menuKit's panelCss)
const FPS = 30;

export interface Attached {
  /** The screen opens: the skin plays its opening. */
  open(): void;
  /** The screen closes. */
  close(): void;
  /** The panel's size or contents changed. */
  fit(): void;
  /** For a script: the art as it is `ms` after opening (and still). */
  seek(ms: number): void;
}

/** Puts the skin's canvas behind `panel` in `layer`. */
export function attachSkin(layer: HTMLElement, panel: HTMLElement, skin: Skin): Attached {
  const canvas = document.createElement('canvas');
  canvas.style.cssText = 'position:absolute;pointer-events:none';
  layer.insertBefore(canvas, panel);
  const ctx = canvas.getContext('2d')!;
  let art: SkinArt | null = null;
  let size = '';
  let [t0, timer, still] = [0, 0, -1];
  let ratio = 1;

  const elapsed = (): number => (still >= 0 ? still : performance.now() - t0);
  const frame = (): void => {
    if (!art) return;
    const ms = elapsed();
    const open = Math.min(1, ms / skin.openMs);
    ctx.setTransform(ratio, 0, 0, ratio, skin.bleed * ratio, skin.bleed * ratio);
    ctx.clearRect(-skin.bleed, -skin.bleed, canvas.width / ratio, canvas.height / ratio);
    art.draw(ctx, ms, open);
    art.words(panel, open, BASE);
  };
  const loop = (): void => {
    frame();
    timer = window.setTimeout(loop, 1000 / FPS);
  };
  const fit = (): void => {
    // in layout units (a transform on the panel, while its words come in, must not move the art): the panel is centred in its layer
    const [w, h] = [Math.round(panel.offsetWidth / 4) * 4, Math.round(panel.offsetHeight / 4) * 4];
    if (!w) return;
    const k = layer.getBoundingClientRect().width / (layer.offsetWidth || 1); // the layer is drawn at the UI scale
    Object.assign(canvas.style, { left: `${(layer.offsetWidth - panel.offsetWidth) / 2 - skin.bleed}px`, top: `${(layer.offsetHeight - panel.offsetHeight) / 2 - skin.bleed}px`, width: `${w + skin.bleed * 2}px`, height: `${h + skin.bleed * 2}px` });
    ratio = Math.min(2, Math.max(1, k * (window.devicePixelRatio || 1)));
    canvas.width = Math.ceil((w + skin.bleed * 2) * ratio);
    canvas.height = Math.ceil((h + skin.bleed * 2) * ratio);
    if (size !== `${w}x${h}`) [size, art] = [`${w}x${h}`, skin.build(w, h)];
    frame();
  };
  new ResizeObserver(() => panel.isConnected && layer.offsetParent !== null && fit()).observe(panel);

  const api: Attached = {
    open() {
      [t0, still] = [performance.now(), -1];
      fit();
      clearTimeout(timer);
      loop();
    },
    close() {
      clearTimeout(timer);
      panel.style.cssText = panel.style.cssText.replace(/(?:opacity|clip-path|filter):[^;]*;?/g, '');
      panel.style.transform = BASE;
    },
    fit,
    seek(ms) {
      clearTimeout(timer);
      still = ms;
      fit();
    },
  };
  if (new URLSearchParams(location.search).has('debug')) ((window as unknown as { skins?: Attached[] }).skins ??= []).push(api);
  return api;
}
