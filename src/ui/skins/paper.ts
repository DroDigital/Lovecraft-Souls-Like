/**
 * Burnt paper: a leaf of old, smoke-dark paper whose edges have been burnt away, ragged and bitten, and still
 * glow where the fire is dying, in the haunt's purple; sparks lift from the rim. It opens by burning outward
 * from its middle: a bright front crosses the leaf and the words come up behind it.
 */

import type { Skin } from '../menuSkin';
import { easeOut, fbm, grain, lerp, noise, ragged, rng, say, sheet, smooth, trace, type Pt } from './skinKit';

const BLEED = 26;

export const paper: Skin = {
  id: 'paper',
  name: 'Burnt paper',
  bleed: BLEED,
  pad: '34px 44px 36px',
  openMs: 1300,
  build(w, h) {
    const seed = Math.round(w * 7 + h * 13);
    const inset = 12;
    const rim = ragged(w - inset * 2, h - inset * 2, 5, 9, seed, 6).map(([x, y]) => [x + inset, y + inset] as Pt);
    const leaf = sheet(w + BLEED * 2, h + BLEED * 2, (g) => {
      g.translate(BLEED, BLEED);
      const bg = g.createRadialGradient(w / 2, h * 0.4, 20, w / 2, h / 2, Math.hypot(w, h) / 2);
      bg.addColorStop(0, '#2a2622');
      bg.addColorStop(0.7, '#1f1c19');
      bg.addColorStop(1, '#14110f');
      trace(g, rim);
      g.fillStyle = bg;
      g.fill();
      g.save();
      g.clip();
      const r = rng(seed);
      for (let i = 0; i < 26; i++) { // stains
        const [x, y, rad] = [r() * w, r() * h, 30 + r() * 90];
        const s = g.createRadialGradient(x, y, 0, x, y, rad);
        s.addColorStop(0, r() < 0.5 ? 'rgba(70,56,40,.16)' : 'rgba(0,0,0,.18)');
        s.addColorStop(1, 'rgba(0,0,0,0)');
        g.fillStyle = s;
        g.fillRect(x - rad, y - rad, rad * 2, rad * 2);
      }
      g.lineWidth = 1;
      for (let i = 0; i < 420; i++) { // fibres
        const [x, y, a] = [r() * w, r() * h, r() * Math.PI];
        g.strokeStyle = r() < 0.5 ? 'rgba(255,240,220,.05)' : 'rgba(0,0,0,.12)';
        g.beginPath();
        g.moveTo(x, y);
        g.lineTo(x + Math.cos(a) * (6 + r() * 16), y + Math.sin(a) * (6 + r() * 16));
        g.stroke();
      }
      g.lineJoin = 'round';
      for (const [wd, al] of [[44, 0.16], [32, 0.2], [22, 0.26], [12, 0.34], [5, 0.5]] as const) { // the char, darkest at the rim
        g.strokeStyle = `rgba(4,3,3,${al})`;
        g.lineWidth = wd;
        trace(g, rim);
        g.stroke();
      }
      g.restore();
      g.setTransform(1, 0, 0, 1, 0, 0);
      grain(g, w + BLEED * 2, h + BLEED * 2, seed, 0.05);
      g.globalCompositeOperation = 'destination-in'; // grain only on the leaf
      g.translate(BLEED, BLEED);
      trace(g, rim);
      g.fillStyle = '#000';
      g.fill();
    });
    const r = rng(seed + 5);
    const sparks = Array.from({ length: 22 }, () => ({ at: Math.floor(r() * rim.length), phase: r(), rate: 0.00022 + r() * 0.0003, drift: (r() - 0.5) * 30 }));
    const reach = Math.hypot(w, h) / 2 + 30;
    return {
      draw(g, ms, open) {
        const R = easeOut(open) * reach;
        g.save();
        if (open < 1) {
          g.beginPath();
          g.arc(w / 2, h / 2, R, 0, Math.PI * 2);
          g.clip();
        }
        g.drawImage(leaf, -BLEED, -BLEED);
        // the embers of the rim: a pattern of heat that crawls along it
        g.globalCompositeOperation = 'lighter';
        g.lineCap = 'round';
        for (let i = 0; i < rim.length; i++) {
          const a = rim[i];
          const b = rim[(i + 1) % rim.length];
          const heat = 0.5 + 0.7 * fbm(seed + 9, i * 0.09 - ms * 0.0006) + 0.2 * noise(seed + 2, i * 0.5 + ms * 0.004);
          const k = smooth(0.55, 1.05, heat); // only a share of the rim is alive at a time, and it crawls
          g.strokeStyle = `rgba(110,70,170,${0.1 + 0.2 * k})`;
          g.lineWidth = 1.3;
          g.beginPath();
          g.moveTo(a[0], a[1]);
          g.lineTo(b[0], b[1]);
          g.stroke();
          if (k < 0.03) continue;
          g.strokeStyle = `rgba(143,100,230,${0.2 * k})`;
          g.lineWidth = 6;
          g.stroke();
          g.strokeStyle = k > 0.7 ? `rgba(239,226,255,${0.3 + 0.45 * k})` : `rgba(199,155,255,${0.15 + 0.6 * k})`;
          g.lineWidth = 0.8 + 1.5 * k;
          g.stroke();
        }
        for (const s of sparks) { // sparks lifting off the rim
          const life = (ms * s.rate + s.phase) % 1;
          const p = rim[s.at];
          const [x, y] = [p[0] + s.drift * life, p[1] - life * 46 * (0.6 + s.phase)];
          g.fillStyle = `rgba(215,175,255,${(1 - life) * 0.75})`;
          g.fillRect(x, y, 1.6, 1.6);
        }
        g.restore();
        if (open < 1) { // the burning front: a ring of white-violet fire where the paper is going
          g.save();
          trace(g, rim);
          g.clip();
          const f = 1 - smooth(0.7, 1, open);
          g.globalCompositeOperation = 'lighter';
          for (const [wd, col] of [[26, `rgba(120,70,200,${0.22 * f})`], [10, `rgba(199,155,255,${0.5 * f})`], [3, `rgba(255,245,255,${0.95 * f})`]] as const) {
            g.strokeStyle = col;
            g.lineWidth = wd;
            g.beginPath();
            g.arc(w / 2, h / 2, R, 0, Math.PI * 2);
            g.stroke();
          }
          g.restore();
        }
      },
      words(panel, open, base) {
        const R = easeOut(open) * reach - 14;
        say(panel, base, open >= 1 ? {} : { clip: `circle(${Math.max(0, R)}px at 50% 50%)`, opacity: lerp(0.4, 1, smooth(0, 0.5, open)) });
      },
    };
  },
};
