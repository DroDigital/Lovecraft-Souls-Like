/**
 * The mist: no frame at all. The words stand on a feathered dark ground whose edges are lost in a drift of cold
 * mist with a purple cast, which turns slowly round them. It opens as the mist rolls in from beyond and settles,
 * the words coming clear out of a blur.
 */

import type { Skin } from '../menuSkin';
import { easeOut, lerp, rng, say, smooth } from './skinKit';

const BLEED = 90;

export const mist: Skin = {
  id: 'mist',
  name: 'Mist',
  bleed: BLEED,
  pad: '40px 46px 34px',
  openMs: 1400,
  build(w, h) {
    const r = rng(Math.round(w * 9 + h * 2));
    const banks = Array.from({ length: 26 }, (_, i) => {
      const a = (i / 26) * Math.PI * 2 + r() * 0.5;
      return { a, ring: 0.9 + r() * 0.35, rad: 70 + r() * 120, al: 0.05 + r() * 0.09, spin: (r() - 0.5) * 0.00012, sway: r() * 6 };
    });
    return {
      draw(g, ms, open) {
        const roll = easeOut(open);
        const [cx, cy] = [w / 2, h / 2];
        // the ground: a dark core feathered into nothing
        for (let i = 0; i < 16; i++) {
          const k = i / 15;
          const grow = (1 - k) * 46;
          g.fillStyle = `rgba(9,8,13,${0.05 + 0.04 * k})`;
          const [x, y, ww, hh] = [-grow + 6, -grow + 6, w + grow * 2 - 12, h + grow * 2 - 12];
          g.beginPath();
          g.roundRect(x, y, ww, hh, 18 + (1 - k) * 40);
          g.fill();
        }
        g.globalAlpha = roll;
        for (const b of banks) { // the mist, turning
          const a = b.a + ms * b.spin;
          const out = lerp(1.9, b.ring, roll); // it comes from far off
          const [x, y] = [cx + Math.cos(a) * (w / 2) * out + Math.sin(ms * 0.0006 + b.sway) * 10, cy + Math.sin(a) * (h / 2) * out + Math.cos(ms * 0.0005 + b.sway) * 8];
          const grd = g.createRadialGradient(x, y, 0, x, y, b.rad);
          grd.addColorStop(0, `rgba(138,118,170,${b.al})`);
          grd.addColorStop(0.5, `rgba(96,88,120,${b.al * 0.5})`);
          grd.addColorStop(1, 'rgba(60,56,80,0)');
          g.fillStyle = grd;
          g.fillRect(x - b.rad, y - b.rad, b.rad * 2, b.rad * 2);
        }
        g.globalAlpha = 1;
        // a thin thread of light along the foot, in the haunt's purple, as a horizon
        const gl = g.createLinearGradient(w * 0.12, 0, w * 0.88, 0);
        gl.addColorStop(0, 'rgba(143,100,230,0)');
        gl.addColorStop(0.5, `rgba(199,155,255,${0.28 * roll * (0.7 + 0.3 * Math.sin(ms * 0.0012))})`);
        gl.addColorStop(1, 'rgba(143,100,230,0)');
        g.fillStyle = gl;
        g.fillRect(w * 0.12, h - 8, w * 0.76, 1.2);
      },
      words(panel, open, base) {
        const k = smooth(0.25, 1, open);
        say(panel, base, open >= 1 ? {} : { opacity: k, filter: `blur(${(1 - k) * 9}px)` });
      },
    };
  },
};
