/**
 * The shroud: a hanging cloth of dark weave on a rod, its hem torn into strips and loose threads that stir, an
 * embroidered border in the haunt's purple. It opens by dropping from above and swinging to rest, the tatters
 * flapping hard and then less.
 */

import type { Skin } from '../menuSkin';
import { grain, lerp, noise, rng, say, settle, sheet, smooth, trace, type Pt } from './skinKit';

const BLEED = 22;
const TOP = 20; // the rod, and the cloth's top edge below it

export const shroud: Skin = {
  id: 'shroud',
  name: 'Tattered shroud',
  bleed: BLEED,
  pad: '56px 46px 66px',
  openMs: 1500,
  maxVh: 87, // the hem hangs below the cloth
  build(w, h) {
    const seed = Math.round(w * 3 + h * 17);
    const r = rng(seed);
    // the hem: strips of various widths and lengths across the bottom
    const strips: { x0: number; x1: number; len: number; tip: number }[] = [];
    for (let x = 0; x < w; ) {
      const sw = 20 + r() * 34;
      strips.push({ x0: x, x1: Math.min(w, x + sw), len: 8 + r() * 44, tip: (r() - 0.5) * 12 });
      x += sw;
    }
    const threads = Array.from({ length: 9 }, () => ({ x: 12 + r() * (w - 24), len: 20 + r() * 52, ph: r() * 6 }));
    const weave = sheet(w, h + 80, (g) => {
      const bg = g.createLinearGradient(0, 0, 0, h);
      bg.addColorStop(0, '#1b1820');
      bg.addColorStop(1, '#121016');
      g.fillStyle = bg;
      g.fillRect(0, 0, w, h + 80);
      for (let x = 0; x < w; x += 2) { // the folds: bands of light and shade down the cloth
        const f = Math.sin(x * 0.046 + 1.3) * 0.5 + Math.sin(x * 0.019 + 4) * 0.5;
        g.fillStyle = f > 0 ? `rgba(255,255,255,${0.035 * f})` : `rgba(0,0,0,${-0.12 * f})`;
        g.fillRect(x, 0, 2, h + 80);
      }
      g.strokeStyle = 'rgba(255,255,255,.025)'; // the weave
      for (let y = 0; y < h + 80; y += 3) {
        g.beginPath();
        g.moveTo(0, y);
        g.lineTo(w, y);
        g.stroke();
      }
      grain(g, w, h + 80, seed, 0.05);
    });
    const shape = (ms: number, open: number): Pt[] => {
      const amp = lerp(3, 16, 1 - smooth(0.2, 1, open)) + 0;
      const pts: Pt[] = [[0, TOP]];
      for (let y = TOP + 40; y < h - 10; y += 40) pts.push([noise(seed, y / 70) * 2.5, y]);
      pts.push([0, h - 6]);
      for (const s of strips) {
        const sway = (x: number): number => Math.sin(ms * 0.0013 + x * 0.03) * amp * 0.5 + noise(seed + 1, x / 30 + ms * 0.0007) * amp * 0.5;
        pts.push([s.x0, h - 6 + s.len * 0.4], [(s.x0 + s.x1) / 2 + s.tip + sway((s.x0 + s.x1) / 2), h - 6 + s.len + Math.abs(sway(s.x0)) * 0.6], [s.x1, h - 6 + s.len * 0.4]);
      }
      pts.push([w, h - 6]);
      for (let y = h - 50; y > TOP + 20; y -= 40) pts.push([w + noise(seed + 2, y / 70) * 2.5, y]);
      pts.push([w, TOP]);
      return pts;
    };
    return {
      draw(g, ms, open) {
        const drop = settle(open / 0.7);
        g.save();
        g.translate(0, -(1 - drop) * (h + 120));
        // the rod
        g.fillStyle = '#25232a';
        g.fillRect(-14, TOP - 14, w + 28, 7);
        g.fillStyle = '#3a3742';
        g.fillRect(-14, TOP - 14, w + 28, 1.5);
        for (const x of [-18, w + 18]) {
          g.beginPath();
          g.arc(x, TOP - 10, 6, 0, Math.PI * 2);
          g.fillStyle = '#34313a';
          g.fill();
        }
        const cloth = shape(ms, open);
        g.save();
        trace(g, cloth);
        g.clip();
        g.drawImage(weave, 0, 0);
        const sh = g.createLinearGradient(0, TOP, 0, TOP + 36); // the gather under the rod
        sh.addColorStop(0, 'rgba(0,0,0,.5)');
        sh.addColorStop(1, 'rgba(0,0,0,0)');
        g.fillStyle = sh;
        g.fillRect(0, TOP, w, 36);
        g.restore();
        g.strokeStyle = 'rgba(0,0,0,.55)';
        g.lineWidth = 1.5;
        trace(g, cloth);
        g.stroke();
        // loose threads
        g.strokeStyle = 'rgba(120,110,135,.45)';
        g.lineWidth = 1;
        for (const t of threads) {
          g.beginPath();
          g.moveTo(t.x, h - 6);
          const sway = Math.sin(ms * 0.0016 + t.ph) * 5 * (1 + (1 - smooth(0.2, 1, open)) * 2);
          g.quadraticCurveTo(t.x + sway * 0.4, h - 6 + t.len * 0.5, t.x + sway, h - 6 + t.len + 4);
          g.stroke();
        }
        // the embroidered border, its diamonds faintly alight
        const breath = 0.6 + 0.4 * Math.sin(ms * 0.0014);
        g.strokeStyle = `rgba(143,114,189,${0.45 + 0.2 * breath})`;
        g.lineWidth = 1;
        g.strokeRect(22, TOP + 22, w - 44, h - TOP - 56);
        g.strokeStyle = 'rgba(143,114,189,.25)';
        g.strokeRect(27, TOP + 27, w - 54, h - TOP - 66);
        g.globalCompositeOperation = 'lighter';
        g.fillStyle = `rgba(199,155,255,${0.25 + 0.5 * breath})`;
        for (let x = 22 + 14; x < w - 22; x += 28) for (const y of [TOP + 22, h - 34]) {
          g.beginPath();
          g.moveTo(x, y - 3);
          g.lineTo(x + 3, y);
          g.lineTo(x, y + 3);
          g.lineTo(x - 3, y);
          g.fill();
        }
        g.restore();
      },
      words(panel, open, base) {
        const drop = settle(open / 0.7);
        say(panel, base, open >= 1 ? {} : { move: `translateY(${-(1 - drop) * (h + 120)}px)`, opacity: smooth(0, 0.2, open) });
      },
    };
  },
};
