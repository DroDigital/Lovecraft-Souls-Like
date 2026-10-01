/**
 * The outlines of the far silhouettes (data/skylines.ts; render/skyline.ts): each a height, as a share
 * of the silhouette's, along its width, x from −0.5 to 0.5. Kadath's crowned peak, the Mountains of
 * Madness with their cubes, R'lyeh's leaning city, Yuggoth's terraced towers, round hills with standing
 * stones, a horror hunched on the horizon with its wings half open (round 26), and (round 31, when the far
 * land was too dark to show) towns of gables, chimneys and steeples, a reef's jagged rocks, desert
 * dunes, a sea-city's minarets. Pure.
 */

import type { Rng } from '../core/rng';
import type { SilhouetteKind } from '../data/skylines';

export type Profile = (x: number) => number;

/** A pointed spire of half-width `w` and height `h` at `c`. */
const spire = (x: number, c: number, w: number, h: number): number => (Math.abs(x - c) < w ? h * (1 - Math.abs(x - c) / w) ** 0.8 : 0);

/** A house of half-width `w` and wall height `h` at `c`, with a gable roof. */
const gable = (x: number, c: number, w: number, h: number): number => {
  const d = Math.abs(x - c);
  return d >= w ? 0 : d < w * 0.12 ? h * 1.18 : h + (w - d) / w * h * 0.3; // a chimney, then the roof
};

export function profile(kind: SilhouetteKind, rng: Rng): Profile {
  const r = (lo: number, hi: number): number => lo + (hi - lo) * rng();
  const bumps = Array.from({ length: 64 }, () => rng());
  const rough = (x: number, k: number): number => bumps[Math.floor((x + 0.5) * 63.99)] * k;
  switch (kind) {
    case 'peak': { // one great mountain, a castle of towers on its summit
      const towers = [0.93, 0.87, 1, 0.9, 0.96, 0.85];
      return (x) => {
        if (Math.abs(x) < 0.08) return towers[Math.min(5, Math.floor(((x + 0.08) / 0.16) * 6))];
        const t = 1 - (Math.abs(x) - 0.08) / 0.42;
        return 0.84 * Math.max(0, t) ** 1.7 + rough(x, 0.03);
      };
    }
    case 'range': { // peaks upon peaks, cubes on the highest (the Elder Things' ramparts)
      const peaks = Array.from({ length: 8 }, () => ({ c: r(-0.45, 0.45), h: r(0.35, 1), w: r(0.05, 0.13) }));
      const cubes = [...peaks].sort((a, b) => b.h - a.h).slice(0, 3);
      return (x) => {
        let y = 0.06 + rough(x, 0.02);
        for (const p of peaks) y = Math.max(y, p.h * Math.max(0, 1 - Math.abs(x - p.c) / p.w) ** 0.9);
        for (const p of cubes) if (Math.abs(x - p.c) < 0.012) y = Math.max(y, p.h + 0.07);
        return y;
      };
    }
    case 'city': { // a black mass of masonry, and spires leaning out of it at every angle
      const spires = Array.from({ length: 22 }, () => ({ c: r(-0.46, 0.46), h: r(0.35, 1), w: r(0.008, 0.03) }));
      return (x) => {
        let y = 0.22 + rough(x, 0.08) * (1 - Math.abs(x) * 1.6);
        for (const s of spires) y = Math.max(y, s.h * Math.max(0, 1 - Math.abs(x - s.c) / s.w) ** 0.35);
        return Math.max(0, y);
      };
    }
    case 'towers': { // Yuggoth's: windowless, in terraces
      const towers = Array.from({ length: 14 }, () => ({ c: r(-0.45, 0.45), h: r(0.3, 1), w: r(0.012, 0.03) }));
      return (x) => {
        let y = 0.08 + rough(x, 0.03);
        for (const t of towers) {
          const d = Math.abs(x - t.c);
          y = Math.max(y, d < t.w ? t.h * 0.85 : 0, d < t.w * 0.6 ? t.h : 0, d < t.w * 0.25 ? t.h * 1.1 : 0);
        }
        return y;
      };
    }
    case 'hills': { // round hills, standing stones on the highest
      const hills = Array.from({ length: 6 }, () => ({ c: r(-0.4, 0.4), h: r(0.4, 1), s: r(0.08, 0.16) }));
      const top = hills.reduce((a, b) => (b.h > a.h ? b : a));
      return (x) => {
        let y = 0;
        for (const h of hills) y = Math.max(y, h.h * Math.exp(-(((x - h.c) / h.s) ** 2)));
        for (let k = -2; k <= 2; k++) if (Math.abs(x - (top.c + k * 0.006)) < 0.0015) y += 0.05;
        return y;
      };
    }
    case 'titan': { // a great shape, hunched, its wings half open and a crown of feelers on its head (round 26)
      const feelers = Array.from({ length: 7 }, (_, i) => ({ c: -0.045 + i * 0.015, h: r(0.05, 0.16), w: r(0.004, 0.009) }));
      return (x) => {
        const a = Math.abs(x);
        let y = 0.7 * Math.exp(-((x / 0.17) ** 2)); // the shoulders
        y = Math.max(y, 0.82 * Math.exp(-(((x - 0.02) / 0.06) ** 2))); // the head, bowed a little to one side
        for (const f of feelers) {
          const d = Math.abs(x - 0.02 - f.c);
          if (d < f.w) y = Math.max(y, 0.8 + f.h * (1 - d / f.w));
        }
        const wing = a > 0.15 && a < 0.47 ? 0.9 * Math.max(0, 1 - Math.abs(a - 0.27) / 0.22) ** 1.3 * (0.88 + 0.2 * Math.sin(a * 140)) : 0; // the wings, their edges torn
        return Math.max(y, wing, 0.08 + rough(x, 0.03));
      };
    }
    case 'town': { // gabled roofs and chimneys in a close run, and a few steeples over them
      const houses = Array.from({ length: 70 }, () => ({ c: r(-0.49, 0.49), w: r(0.008, 0.02), h: r(0.1, 0.3) }));
      const steeples = Array.from({ length: 4 }, () => ({ c: r(-0.4, 0.4), w: r(0.007, 0.013), h: r(0.55, 1) }));
      return (x) => {
        let y = 0.06 + rough(x, 0.03);
        for (const h of houses) y = Math.max(y, gable(x, h.c, h.w, h.h));
        for (const s of steeples) y = Math.max(y, spire(x, s.c, s.w, s.h), x > s.c - s.w * 3 && x < s.c + s.w * 3 ? s.h * 0.32 : 0); // a church's body at the foot of each
        return y * (1 - Math.abs(x) ** 3 * 5); // thinning toward the ends
      };
    }
    case 'reef': { // jagged rocks standing out of the sea, one with a light on it
      const rocks = Array.from({ length: 12 }, () => ({ c: r(-0.45, 0.45), h: r(0.2, 0.7), w: r(0.02, 0.06) }));
      const light = rocks[0];
      return (x) => {
        let y = 0;
        for (const k of rocks) y = Math.max(y, k.h * Math.max(0, 1 - Math.abs(x - k.c) / k.w) ** 0.7);
        if (Math.abs(x - light.c) < 0.004) y = Math.max(y, light.h + 0.28); // the lamp-tower
        return y;
      };
    }
    case 'dunes': { // long slow waves with sharp crests, a few cyclopean stones among them
      const waves = Array.from({ length: 5 }, () => ({ f: r(2, 9), p: r(0, 6.28), a: r(0.08, 0.28) }));
      const stones = Array.from({ length: 5 }, () => ({ c: r(-0.4, 0.4), w: r(0.01, 0.03), h: r(0.5, 0.9) }));
      return (x) => {
        let y = 0.12;
        for (const w of waves) y += w.a * 0.4 * Math.abs(Math.sin(x * w.f + w.p));
        for (const s of stones) if (Math.abs(x - s.c) < s.w) y = Math.max(y, s.h);
        return y;
      };
    }
    case 'minarets': { // a city of slender towers with domes, tall and thin (the Dreamlands')
      const towers = Array.from({ length: 16 }, () => ({ c: r(-0.46, 0.46), w: r(0.006, 0.014), h: r(0.35, 1) }));
      return (x) => {
        let y = 0.1 + rough(x, 0.03);
        for (const t of towers) {
          const d = Math.abs(x - t.c);
          if (d < t.w) y = Math.max(y, t.h * 0.82 + (d < t.w * 0.5 ? t.h * 0.18 * (1 - d / (t.w * 0.5)) : 0)); // a dome-tipped shaft
        }
        return y;
      };
    }
  }
}
