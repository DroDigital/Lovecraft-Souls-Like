/**
 * The title's wordmark drawn (playtest round 20; logoPlan.ts says when each part takes light). The
 * letters are the period face's capitals, rasterised once at the wordmark's own coarse pixels and
 * cut like stone: a lit lip along their top and left, a dark one along the bottom and right, grain,
 * pits and chipped edges, a shadow thrown down and to the right, a purple halo about each. The seventy
 * treads are rows of pixels narrowing into the dark; a light comes down them; a small Elder Sign
 * crowns the words; motes climb the flight. Each frame is written straight into the pixels.
 */

import { fbm } from '../core/noise';
import { hash2 } from '../core/rng';
import { SERIF } from './hudKit';
import { glitchAt, headAt, LOGO, letterLight, sigilLight, tread, treadLight } from './logoPlan';

const [W, H] = LOGO.size;
type Rgb = readonly [number, number, number];

const STONE: Rgb = [217, 208, 184]; // the bone of the game's palette
const GLOW: Rgb = [158, 56, 255]; // Cosmic Purple, brightened
const mix = (a: Rgb, b: Rgb, t: number): Rgb => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];

interface Px {
  i: number;
  c: Rgb;
}
interface Halo {
  i: number;
  a: number;
}
interface Cut {
  pixels: Px[]; // the stone
  shadow: number[]; // where it throws its shadow
  halo: Halo[]; // the glow about it
}

/** A box blur of radius `r` over a W×H field, twice: a soft falloff. */
function blur(src: Float32Array, r: number): Float32Array {
  let cur = src;
  for (let pass = 0; pass < 2; pass++) {
    for (const horizontal of [true, false]) {
      const out = new Float32Array(W * H);
      for (let y = 0; y < H; y++) {
        for (let x = 0; x < W; x++) {
          let sum = 0;
          for (let d = -r; d <= r; d++) {
            const [sx, sy] = horizontal ? [x + d, y] : [x, y + d];
            if (sx >= 0 && sy >= 0 && sx < W && sy < H) sum += cur[sy * W + sx];
          }
          out[y * W + x] = sum / (2 * r + 1);
        }
      }
      cur = out;
    }
  }
  return cur;
}

/** A letter's mask cut into stone: chipped, lit along its top and left, dark along its bottom and right, grained and pitted. */
function carve(mask: Uint8Array, seed: number): Cut {
  const at = (x: number, y: number): boolean => x >= 0 && y >= 0 && x < W && y < H && mask[y * W + x] === 1;
  const rim = (x: number, y: number): boolean => !at(x - 1, y) || !at(x + 1, y) || !at(x, y - 1) || !at(x, y + 1);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (mask[y * W + x] === 1 && rim(x, y) && hash2(x, y, seed) < 0.06) mask[y * W + x] = 2; // chips
  for (let i = 0; i < mask.length; i++) if (mask[i] === 2) mask[i] = 0;
  let [top, bottom]: [number, number] = [H, 0];
  for (let i = 0; i < mask.length; i++) if (mask[i]) [top, bottom] = [Math.min(top, Math.floor(i / W)), Math.max(bottom, Math.floor(i / W))];
  const [pixels, shadow, seen] = [[] as Px[], [] as number[], new Uint8Array(W * H)];
  const field = new Float32Array(W * H);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (!at(x, y)) continue;
      field[y * W + x] = 1;
      const grain = 0.72 + 0.32 * fbm(x * 0.4, y * 0.4, seed, 2);
      const [lit, dark] = [!at(x, y - 1) || !at(x - 1, y), !at(x, y + 1) || !at(x + 1, y)];
      const lip = lit && !dark ? 1.28 : dark && !lit ? 0.5 : 1;
      const fall = 1.1 - (0.32 * (y - top)) / Math.max(1, bottom - top); // lighter toward the crown
      const pit = hash2(x * 3, y * 5, seed + 9) < 0.02 ? 0.5 : 1;
      const v = grain * lip * fall * pit * 1.08;
      pixels.push({ i: y * W + x, c: [Math.min(255, STONE[0] * v + (lit ? 8 : 0)), Math.min(255, STONE[1] * v), Math.min(255, STONE[2] * v * (dark ? 1.08 : 1))] });
      for (const s of [2, 3]) {
        const j = (y + s) * W + x + s;
        if (y + s < H && x + s < W && !at(x + s, y + s) && !seen[j]) {
          seen[j] = 1;
          shadow.push(j);
        }
      }
    }
  }
  const soft = blur(field, 2);
  const halo: Halo[] = [];
  for (let i = 0; i < soft.length; i++) if (soft[i] > 0.03 && !at(i % W, Math.floor(i / W))) halo.push({ i, a: Math.min(1, soft[i] * 1.6) });
  return { pixels, shadow, halo };
}

/** The wordmark's letters, word by word: each rasterised alone at its place and carved. */
function letters(): Cut[][] {
  const canvas = document.createElement('canvas');
  [canvas.width, canvas.height] = [W, H];
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
  return LOGO.words.map((word, w) => {
    ctx.font = `bold ${word.size}px ${SERIF}`;
    ctx.textBaseline = 'alphabetic';
    const widths = [...word.text].map((c) => ctx.measureText(c).width);
    let x = (W - (widths.reduce((a, b) => a + b, 0) + word.track * (word.text.length - 1))) / 2;
    return [...word.text].map((ch, k) => {
      ctx.clearRect(0, 0, W, H);
      ctx.fillStyle = '#fff';
      ctx.fillText(ch, x, word.baseline);
      x += widths[k] + word.track;
      const data = ctx.getImageData(0, 0, W, H).data;
      const mask = new Uint8Array(W * H);
      for (let i = 0; i < mask.length; i++) mask[i] = data[i * 4 + 3] > 112 ? 1 : 0;
      return carve(mask, 40 + w * 17 + k * 5);
    });
  });
}

/** The Elder Sign above the words: a stem with two pairs of branches and a twig at its crown, its core and its glow. */
function sigil(): { core: number[]; halo: Halo[] } {
  const field = new Float32Array(W * H);
  const core = new Set<number>();
  const [cx, cy] = [W / 2, LOGO.sigil.y];
  const line = (x0: number, y0: number, angle: number, len: number): void => {
    for (let s = 0; s <= len; s += 0.25) {
      const [x, y] = [Math.round(x0 + Math.sin(angle) * s), Math.round(y0 - Math.cos(angle) * s)];
      if (x < 0 || y < 0 || x >= W || y >= H) continue;
      core.add(y * W + x);
      field[y * W + x] = 1;
    }
  };
  line(cx, cy + 7, 0, 14);
  line(cx, cy - 1, 0.65, 6);
  line(cx, cy - 1, -0.65, 6);
  line(cx, cy + 3, 0.8, 5);
  line(cx, cy + 3, -0.8, 5);
  const soft = blur(field, 2);
  const halo: Halo[] = [];
  for (let i = 0; i < soft.length; i++) if (soft[i] > 0.03 && !core.has(i)) halo.push({ i, a: Math.min(1, soft[i] * 2.2) });
  return { core: [...core], halo };
}

/** The treads: each a row of pixels, wider nearer, its two ends marked, and the riser under it where the next tread lies clear of it. */
function flight(): { tread: { i: number; edge: boolean }[]; riser: number[] }[] {
  const rows = Array.from({ length: LOGO.steps }, (_, k) => Math.round(tread(k).y));
  return rows.map((row, k) => {
    const { half } = tread(k);
    const [x0, x1] = [Math.round(W / 2 - half), Math.round(W / 2 + half)];
    const clear = k < rows.length - 1 && rows[k + 1] - row >= 2;
    return {
      tread: Array.from({ length: x1 - x0 + 1 }, (_, n) => ({ i: row * W + x0 + n, edge: n === 0 || x0 + n === x1 })),
      riser: clear ? Array.from({ length: x1 - x0 + 1 }, (_, n) => (row + 1) * W + x0 + n) : [],
    };
  });
}

export interface LogoArt {
  /** Writes the frame at `t` seconds into RGBA pixels (W × H). */
  paint(data: Uint8ClampedArray, t: number): void;
}

export function buildLogoArt(): LogoArt {
  const words = letters();
  const crown = sigil();
  const treads = flight();
  const acc = new Float32Array(W * H * 3);
  const set = (i: number, c: Rgb, k: number): void => void ((acc[i * 3] = c[0] * k), (acc[i * 3 + 1] = c[1] * k), (acc[i * 3 + 2] = c[2] * k));
  const add = (i: number, c: Rgb, k: number): void => void ((acc[i * 3] += c[0] * k), (acc[i * 3 + 1] += c[1] * k), (acc[i * 3 + 2] += c[2] * k));
  const dim = (i: number, k: number): void => void ((acc[i * 3] *= k), (acc[i * 3 + 1] *= k), (acc[i * 3 + 2] *= k));
  const cx = W / 2;
  const ambient: Halo[] = []; // the glow behind the words
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const a = Math.exp(-(((x - cx) / 96) ** 2 + ((y - 52) / 34) ** 2));
      if (a > 0.02) ambient.push({ i: y * W + x, a });
    }
  }

  return {
    paint(data, t) {
      acc.fill(0);
      const lit = Math.min(1, letterLight(0, 0, t) + letterLight(1, 0, t)); // the glow behind the words rises with the first letters
      for (const a of ambient) add(a.i, GLOW, a.a * 0.16 * lit);
      treads.forEach(({ tread: row, riser }, k) => {
        const light = treadLight(k, t);
        if (light <= 0.002) return;
        const c = mix(STONE, GLOW, (k / (treads.length - 1)) ** 0.8);
        const fade = 1 - 0.55 * (k / (treads.length - 1));
        for (const i of riser) dim(i, 0.4); // the shadow the tread throws on the riser below it
        for (const p of row) add(p.i, c, light * fade * (p.edge ? 1.5 : 1));
      });
      const head = headAt(t); // the light coming down, and at the bottom the glow it blooms into
      if (head > 0) {
        const { y } = tread(Math.min(head, LOGO.steps - 1));
        const bloom = head < LOGO.steps ? 1 : 1 + 0.25 * Math.sin(t * 2.4);
        for (let dy = -7; dy <= 7; dy++) {
          for (let dx = -7; dx <= 7; dx++) {
            const [px, py] = [Math.round(cx + dx), Math.round(y + dy)];
            if (py < 0 || py >= H) continue;
            add(py * W + px, mix(STONE, GLOW, 0.4), (Math.max(0, 1 - Math.hypot(dx, dy) / 7) ** 2) * 0.9 * bloom);
          }
        }
      }
      const shudder = glitchAt(t);
      const stir = Math.ceil(2.4 * shudder); // pixels the colours part by
      words.forEach((word, w) =>
        word.forEach((cut, k) => {
          const L = letterLight(w as 0 | 1, k, t);
          if (L <= 0) return;
          for (const h of cut.halo) add(h.i, GLOW, h.a * 0.55 * Math.min(1, L));
          for (const s of cut.shadow) dim(s, 1 - 0.7 * Math.min(1, L));
          for (const p of cut.pixels) {
            if (stir > 0) {
              add(p.i - stir, [p.c[0], 0, 0], 0.55);
              add(p.i + stir, [0, 0, p.c[2]], 0.55);
            }
            set(p.i, p.c, Math.min(1.7, L));
          }
        }),
      );
      const seal = sigilLight(t);
      if (seal > 0) {
        for (const h of crown.halo) add(h.i, GLOW, h.a * 0.9 * Math.min(1, seal));
        for (const i of crown.core) set(i, STONE, Math.min(1.5, seal * 1.1));
      }
      const climb = Math.min(1, Math.max(0, (t - 3) / 2)); // motes climbing the flight out of the dark
      if (climb > 0) {
        for (let j = 0; j < 26; j++) {
          const s = (t * (0.05 + 0.06 * hash2(j, 3, 7)) + hash2(j, 1, 7)) % 1;
          const y = 130 - s * 104;
          const reach = Math.min(88, 3 + Math.max(0, 132 - y) * 1.6);
          const x = Math.round(cx + (hash2(j, 2, 7) - 0.5) * 1.8 * reach + Math.sin(t * 0.7 + j * 1.7) * 2);
          const a = Math.min(1, s * 5) * Math.sqrt(1 - s) * 0.7 * climb;
          if (x >= 0 && x < W) add(Math.round(y) * W + x, mix(STONE, GLOW, hash2(j, 4, 7)), a);
        }
      }
      const flicker = 0.97 + 0.03 * hash2(Math.floor(t * 12), 5, 3);
      for (let i = 0; i < W * H; i++) {
        data[i * 4] = Math.min(255, acc[i * 3] * flicker);
        data[i * 4 + 1] = Math.min(255, acc[i * 3 + 1] * flicker);
        data[i * 4 + 2] = Math.min(255, acc[i * 3 + 2] * flicker);
        data[i * 4 + 3] = 255;
      }
    },
  };
}
