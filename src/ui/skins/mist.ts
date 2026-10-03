/**
 * The mist: the menu has no frame at all. The words stand on a dark ground with no edge, feathered out into
 * nothing, and a drift of cold mist with a purple cast turns slowly about them, thicker beyond the words than
 * behind them. It opens as the mist rolls in from beyond and settles, the words coming clear out of a blur.
 */

import type { Skin } from '../menuSkin';
import { easeOut, lerp, rng, say, smooth } from './skinKit';

const BLEED = 110;
const FEATHER = 96; // how far the dark ground fades out beyond the words

/** A dark rectangle whose edge is lost: solid inside, fading to nothing over `f` pixels outside, sides and corners alike. */
function feathered(g: CanvasRenderingContext2D, x0: number, y0: number, x1: number, y1: number, f: number, rgb: string, a: number): void {
  const fade = (grd: CanvasGradient): CanvasGradient => {
    for (const [k, v] of [[0, 1], [0.25, 0.8], [0.5, 0.45], [0.75, 0.16], [1, 0]] as const) grd.addColorStop(k, `rgba(${rgb},${a * v})`);
    return grd;
  };
  g.fillStyle = `rgba(${rgb},${a})`;
  g.fillRect(x0, y0, x1 - x0, y1 - y0);
  const side = (gx0: number, gy0: number, gx1: number, gy1: number, rx: number, ry: number, rw: number, rh: number): void => {
    const grd = g.createLinearGradient(gx0, gy0, gx1, gy1);
    for (const [k, v] of [[0, 0], [0.25, 0.16], [0.5, 0.45], [0.75, 0.8], [1, 1]] as const) grd.addColorStop(k, `rgba(${rgb},${a * v})`);
    g.fillStyle = grd;
    g.fillRect(rx, ry, rw, rh);
  };
  side(0, y0 - f, 0, y0, x0, y0 - f, x1 - x0, f); // top
  side(0, y1 + f, 0, y1, x0, y1, x1 - x0, f); // bottom
  side(x0 - f, 0, x0, 0, x0 - f, y0, f, y1 - y0); // left
  side(x1 + f, 0, x1, 0, x1, y0, f, y1 - y0); // right
  for (const [cx, cy, rx, ry] of [[x0, y0, x0 - f, y0 - f], [x1, y0, x1, y0 - f], [x0, y1, x0 - f, y1], [x1, y1, x1, y1]] as const) {
    g.fillStyle = fade(g.createRadialGradient(cx, cy, 0, cx, cy, f));
    g.fillRect(rx, ry, f, f);
  }
}

export const mist: Skin = {
  id: 'mist',
  name: 'Mist',
  bleed: BLEED,
  pad: '40px 46px 34px',
  openMs: 1300,
  build(w, h) {
    const r = rng(Math.round(w * 9 + h * 2));
    const banks = Array.from({ length: 30 }, (_, i) => {
      const a = (i / 30) * Math.PI * 2 + r() * 0.5;
      return { a, ring: 0.95 + r() * 0.4, rad: 80 + r() * 130, al: 0.045 + r() * 0.08, spin: (r() - 0.5) * 0.0001, sway: r() * 6 };
    });
    return {
      draw(g, ms, open) {
        const roll = easeOut(open);
        const [cx, cy] = [w / 2, h / 2];
        g.globalAlpha = smooth(0, 0.6, open);
        feathered(g, 4, 4, w - 8, h - 8, FEATHER, '8,7,12', 0.7); // the ground, with no edge to it
        g.globalAlpha = roll;
        for (const b of banks) { // the mist, turning
          const a = b.a + ms * b.spin;
          const out = lerp(1.9, b.ring, roll); // it comes from far off
          const [x, y] = [cx + Math.cos(a) * (w / 2) * out + Math.sin(ms * 0.0006 + b.sway) * 10, cy + Math.sin(a) * (h / 2) * out + Math.cos(ms * 0.0005 + b.sway) * 8];
          const grd = g.createRadialGradient(x, y, 0, x, y, b.rad);
          grd.addColorStop(0, `rgba(132,114,166,${b.al})`);
          grd.addColorStop(0.5, `rgba(92,84,118,${b.al * 0.45})`);
          grd.addColorStop(1, 'rgba(60,56,80,0)');
          g.fillStyle = grd;
          g.fillRect(x - b.rad, y - b.rad, b.rad * 2, b.rad * 2);
        }
        g.globalAlpha = 1;
      },
      words(panel, open, base) {
        const k = smooth(0.25, 1, open);
        say(panel, base, open >= 1 ? {} : { opacity: k, filter: `blur(${(1 - k) * 9}px)` });
      },
    };
  },
};
