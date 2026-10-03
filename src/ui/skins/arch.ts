/**
 * The gothic window: a pointed arch of dark glass in a frame of old stone, its tracery (the quatrefoil of the head,
 * the mullion lines at its sides) lit in the haunt's purple and breathing. It opens by drawing itself: the stone
 * traces its outline from the sill up, the tracery follows, the glass darkens behind, and the words come last.
 */

import type { Skin } from '../menuSkin';
import { circle, easeOut, noise, say, sheet, smooth, strokePartial, trace, type Pt, lerp } from './skinKit';

const BLEED = 16;

/** The outline of the window: straight sides, a pointed head of two arcs, chamfered feet; clockwise from the bottom left. */
function outline(w: number, h: number, rise: number, inset: number): Pt[] {
  const [x0, x1, y0, y1] = [inset, w - inset, inset, h - inset];
  const mid = w / 2;
  const side = (sign: number): Pt[] =>
    Array.from({ length: 28 }, (_, i) => {
      const t = i / 27; // from the spring of the arch to the apex
      const x = lerp(sign < 0 ? x0 : x1, mid, t ** 1.0);
      const y = y0 + rise * (1 - Math.sin(t * Math.PI * 0.5) ** 0.78) ;
      return [x, y] as Pt;
    });
  const left = side(-1); // spring to apex
  const right = side(1).reverse(); // apex to spring
  return [[x0 + 14, y1], [x0, y1 - 14], ...left, ...right, [x1, y1 - 14], [x1 - 14, y1]];
}

export const arch: Skin = {
  id: 'arch',
  name: 'Gothic window',
  bleed: BLEED,
  pad: '104px 48px 32px',
  openMs: 1500,
  build(w, h) {
    const rise = Math.min(92, w * 0.17);
    const frame = outline(w, h, rise, 10);
    const inner = outline(w, h, rise, 24);
    const cx = w / 2;
    const cy = rise * 0.62;
    const rr = rise * 0.2;
    const lines: Pt[][] = [
      circle(cx, cy, rr),
      ...[0, 1, 2, 3].map((k) => circle(cx + Math.cos((k * Math.PI) / 2 + Math.PI / 4) * rr * 0.5, cy + Math.sin((k * Math.PI) / 2 + Math.PI / 4) * rr * 0.5, rr * 0.42, 28)),
      [[34, rise + 24], [34, h - 34]],
      [[w - 34, rise + 24], [w - 34, h - 34]],
      [[34, h - 34], [w - 34, h - 34]],
    ];
    const glass = sheet(w + BLEED * 2, h + BLEED * 2, (g) => {
      g.translate(BLEED, BLEED);
      const bg = g.createLinearGradient(0, 0, 0, h);
      bg.addColorStop(0, '#15111d');
      bg.addColorStop(0.5, '#0f0d14');
      bg.addColorStop(1, '#0a090d');
      trace(g, frame);
      g.fillStyle = bg;
      g.fill();
    });
    return {
      draw(g, ms, open) {
        const wake = smooth(0.45, 0.95, open);
        g.save();
        g.globalAlpha = wake;
        g.drawImage(glass, -BLEED, -BLEED);
        g.restore();
        g.lineJoin = 'round';
        // the stone, traced from the sill upward (the outline starts at the foot)
        const stone = smooth(0, 0.55, open);
        g.strokeStyle = '#34343a';
        g.lineWidth = 9;
        strokePartial(g, [...frame, frame[0]], stone);
        g.strokeStyle = '#4a4a52';
        g.lineWidth = 1.5;
        strokePartial(g, [...frame, frame[0]], stone);
        g.strokeStyle = 'rgba(143,114,189,.35)';
        g.lineWidth = 1;
        strokePartial(g, [...inner, inner[0]], smooth(0.1, 0.65, open));
        // the tracery, breathing
        const breath = 0.6 + 0.4 * Math.sin(ms * 0.0017) + 0.15 * noise(3, ms * 0.002);
        g.globalCompositeOperation = 'lighter';
        lines.forEach((l, i) => {
          const f = smooth(0.22 + i * 0.03, 0.82, open);
          g.strokeStyle = `rgba(143,100,230,${0.12 * breath})`;
          g.lineWidth = 6;
          strokePartial(g, l, f);
          g.strokeStyle = `rgba(199,155,255,${0.3 + 0.3 * breath})`;
          g.lineWidth = 1.2;
          strokePartial(g, l, f);
        });
        g.globalCompositeOperation = 'source-over';
      },
      words(panel, open, base) {
        const k = easeOut(smooth(0.6, 1, open));
        say(panel, base, open >= 1 ? {} : { opacity: k, move: `translateY(${(1 - k) * 12}px)` });
      },
    };
  },
};
