/**
 * The standing stone: a rough slab, chipped at its crown and cracked, with a row of runes cut along its top and
 * the Elder Sign faint in its foot; the cracks and runes hold a purple light that breathes. It opens by rising
 * out of the ground in a bank of dust, and the runes catch light one after another.
 */

import type { Skin } from '../menuSkin';
import { easeOut, fbm, grain, noise, ragged, rng, say, sheet, smooth, trace, type Pt } from './skinKit';

const BLEED = 18;

/** A rune: a few strokes in a 10×16 cell, from a seed. */
function rune(seed: number): Pt[][] {
  const r = rng(seed);
  const stem: Pt[] = [[5, 0], [5, 16]];
  const arms = Array.from({ length: 2 + Math.floor(r() * 2) }, () => {
    const y = 2 + r() * 12;
    return [[5, y], [r() < 0.5 ? 0 : 10, y + (r() - 0.5) * 8]] as Pt[];
  });
  return [stem, ...arms];
}

export const stone: Skin = {
  id: 'stone',
  name: 'Standing stone',
  bleed: BLEED,
  pad: '52px 46px 34px',
  openMs: 1500,
  build(w, h) {
    const seed = Math.round(w * 5 + h * 11);
    const r = rng(seed);
    const body = ragged(w - 24, h - 20, 12, 6, seed, 4).map(([x, y]) => [x + 12, y + 10] as Pt);
    // the crown is struck off at a slant, and the left shoulder chipped
    const crown = body.map(([x, y]) => [x, y < 40 ? y + Math.max(0, (w * 0.5 - x) * 0.05) + Math.max(0, x - w * 0.86) * 0.35 : y] as Pt);
    const cracks: Pt[][] = Array.from({ length: 3 }, (_, k) => {
      let [x, y] = [r() < 0.5 ? 12 + r() * 30 : w - 12 - r() * 30, 40 + r() * (h - 160) + k * 20];
      const dir = x < w / 2 ? 1 : -1;
      const pts: Pt[] = [[x, y]];
      for (let i = 0; i < 9; i++) pts.push([(x += dir * (6 + r() * 12)), (y += (r() - 0.35) * 18)]);
      return pts;
    });
    const row = Array.from({ length: 11 }, (_, i) => ({ x: 46 + i * ((w - 92) / 10), strokes: rune(seed + i * 31) }));
    const slab = sheet(w + BLEED * 2, h + BLEED * 2, (g) => {
      g.translate(BLEED, BLEED);
      const bg = g.createLinearGradient(0, 0, 0, h);
      bg.addColorStop(0, '#2a2a2f');
      bg.addColorStop(0.5, '#1e1e22');
      bg.addColorStop(1, '#141417');
      trace(g, crown);
      g.fillStyle = bg;
      g.fill();
      g.save();
      g.clip();
      for (let i = 0; i < 14; i++) { // strata
        g.strokeStyle = `rgba(${r() < 0.5 ? '255,255,255,.035' : '0,0,0,.14'})`;
        g.lineWidth = 1 + r() * 2;
        const y = r() * h;
        g.beginPath();
        g.moveTo(0, y);
        for (let x = 0; x <= w; x += 20) g.lineTo(x, y + noise(seed + i, x / 90) * 6);
        g.stroke();
      }
      g.lineJoin = 'round';
      for (const [wd, al] of [[26, 0.14], [14, 0.2], [6, 0.3]] as const) {
        g.strokeStyle = `rgba(0,0,0,${al})`;
        g.lineWidth = wd;
        trace(g, crown);
        g.stroke();
      }
      g.restore();
      g.setTransform(1, 0, 0, 1, 0, 0);
      grain(g, w + BLEED * 2, h + BLEED * 2, seed, 0.07);
      g.globalCompositeOperation = 'destination-in';
      g.translate(BLEED, BLEED);
      trace(g, crown);
      g.fillStyle = '#000';
      g.fill();
    });
    const dust = Array.from({ length: 30 }, () => ({ x: r() * w, v: 0.4 + r(), at: r() }));
    return {
      draw(g, ms, open) {
        const up = easeOut(open / 0.75);
        g.save();
        g.beginPath();
        g.rect(-BLEED, h * (1 - up) - 4, w + BLEED * 2, h + BLEED * 2);
        g.clip();
        g.translate(0, (1 - up) * 26);
        g.drawImage(slab, -BLEED, -BLEED);
        // bevel: a pale edge up and left, a dark one down and right
        g.lineJoin = 'round';
        for (const [dx, dy, col] of [[-1, -1, 'rgba(255,255,255,.1)'], [1.5, 1.5, 'rgba(0,0,0,.5)']] as const) {
          g.save();
          g.translate(dx, dy);
          g.strokeStyle = col;
          g.lineWidth = 2;
          trace(g, crown);
          g.stroke();
          g.restore();
        }
        g.globalCompositeOperation = 'lighter';
        const breath = 0.55 + 0.45 * Math.sin(ms * 0.0015) + 0.2 * fbm(seed + 3, ms * 0.001);
        const lit = smooth(0.55, 1, open);
        for (const c of cracks) { // the light in the cracks
          g.strokeStyle = `rgba(143,100,230,${0.18 * breath * lit})`;
          g.lineWidth = 5;
          trace(g, c, false);
          g.stroke();
          g.strokeStyle = `rgba(199,155,255,${0.5 * breath * lit})`;
          g.lineWidth = 1;
          g.stroke();
        }
        row.forEach((rn, i) => { // the runes, catching light in turn
          const on = smooth(0.5 + i * 0.035, 0.62 + i * 0.035, open);
          const flick = 0.75 + 0.25 * noise(seed + i, ms * 0.003 + i);
          g.save();
          g.translate(rn.x - 5, 22);
          g.lineCap = 'round';
          for (const st of rn.strokes) {
            g.strokeStyle = `rgba(143,100,230,${0.2 * on * flick})`;
            g.lineWidth = 5;
            trace(g, st, false);
            g.stroke();
            g.strokeStyle = `rgba(215,185,255,${0.9 * on * flick})`;
            g.lineWidth = 1.4;
            g.stroke();
          }
          g.restore();
        });
        g.strokeStyle = `rgba(143,100,230,${0.07 * breath * lit})`; // the Elder Sign, faint in the foot
        g.lineWidth = 3;
        for (const [a, b] of [[[w / 2, h - 30], [w / 2, h - 110]], [[w / 2, h - 80], [w / 2 - 34, h - 112]], [[w / 2, h - 80], [w / 2 + 34, h - 112]], [[w / 2, h - 60], [w / 2 - 24, h - 82]], [[w / 2, h - 60], [w / 2 + 24, h - 82]]] as const) {
          g.beginPath();
          g.moveTo(a[0], a[1]);
          g.lineTo(b[0], b[1]);
          g.stroke();
        }
        g.restore();
        if (open < 0.95) { // the dust of its rising, at its foot
          g.globalCompositeOperation = 'source-over';
          for (const d of dust) {
            const life = Math.min(1, (open * 1.6 - d.at * 0.4) / 0.9);
            if (life <= 0) continue;
            g.fillStyle = `rgba(150,145,160,${0.28 * (1 - life)})`;
            const [x, y, s] = [d.x + (d.x - w / 2) * life * 0.25, h - 4 - life * 38 * d.v, 3 + life * 9];
            g.beginPath();
            g.arc(x, y, s, 0, Math.PI * 2);
            g.fill();
          }
        }
      },
      words(panel, open, base) {
        const up = easeOut(open / 0.75);
        const k = smooth(0.55, 0.95, open);
        say(panel, base, open >= 1 ? {} : { clip: `inset(${(1 - up) * 100}% 0 0 0)`, opacity: k, move: `translateY(${(1 - up) * 26}px)` });
      },
    };
  },
};
