/**
 * What the menu skins are drawn with (round 38): a seeded random, smooth noise along a line, ragged outlines,
 * partial strokes (a line drawn as far as a share of its length), and the easings. Pure canvas and numbers.
 */

export type Pt = readonly [number, number];

/** A small seeded random (mulberry32): the same box is torn the same way each time. */
export function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const hash = (a: number, b = 0, c = 0): number => {
  let h = (Math.imul(a | 0, 374761393) + Math.imul(b | 0, 668265263) + Math.imul(c | 0, 2147483647)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
};

export const clamp01 = (x: number): number => Math.min(1, Math.max(0, x));
export const lerp = (a: number, b: number, k: number): number => a + (b - a) * k;
export const smooth = (a: number, b: number, x: number): number => {
  const t = clamp01((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};
export const easeOut = (x: number): number => 1 - (1 - clamp01(x)) ** 3;
/** A drop that lands and settles: overshoots a little, swings back, rests. */
export const settle = (x: number): number => (x >= 1 ? 1 : 1 - Math.exp(-6 * Math.max(0, x)) * Math.cos(10 * Math.max(0, x)));

/** Smooth value noise at `x` (−1..1). */
export function noise(seed: number, x: number): number {
  const i = Math.floor(x);
  const f = x - i;
  const u = f * f * (3 - 2 * f);
  return lerp(hash(seed, i) * 2 - 1, hash(seed, i + 1) * 2 - 1, u);
}

export const fbm = (seed: number, x: number): number => noise(seed, x) * 0.6 + noise(seed + 7, x * 2.1) * 0.3 + noise(seed + 13, x * 4.3) * 0.1;

/** The outline of a w×h box, walked clockwise from its top left, torn by `amp` pixels every `step`, with `bites` deeper bites burnt out of it. */
export function ragged(w: number, h: number, step: number, amp: number, seed: number, bites = 0): Pt[] {
  const r = rng(seed);
  const edges: [Pt, Pt, Pt][] = [
    [[0, 0], [w, 0], [0, 1]], // top: the push is down (inward)
    [[w, 0], [w, h], [-1, 0]],
    [[w, h], [0, h], [0, -1]],
    [[0, h], [0, 0], [1, 0]],
  ];
  const bite = Array.from({ length: bites }, () => ({ at: Math.floor(r() * 4) + 0.2 + r() * 0.6, wide: 0.12 + r() * 0.16, deep: amp * (1.6 + r() * 1.8) }));
  const pts: Pt[] = [];
  let walked = 0;
  edges.forEach(([a, b, n], e) => {
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
    const count = Math.max(2, Math.round(len / step));
    for (let i = 0; i < count; i++) {
      const k = i / count;
      let push = (fbm(seed + e, walked / 40 + i * 0.35) * 0.5 + 0.5) * amp + r() * amp * 0.25;
      for (const q of bite) {
        const d = Math.abs(e + k - q.at);
        if (d < q.wide) push += q.deep * Math.cos((d / q.wide) * Math.PI * 0.5) ** 2;
      }
      pts.push([lerp(a[0], b[0], k) + n[0] * push, lerp(a[1], b[1], k) + n[1] * push]);
    }
    walked += len;
  });
  return pts;
}

export function trace(ctx: CanvasRenderingContext2D, pts: readonly Pt[], close = true): void {
  ctx.beginPath();
  pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
  if (close) ctx.closePath();
}

/** A polyline drawn as far as the share `f` of its length. */
export function strokePartial(ctx: CanvasRenderingContext2D, pts: readonly Pt[], f: number): void {
  if (f <= 0 || pts.length < 2) return;
  const lens = pts.slice(1).map((p, i) => Math.hypot(p[0] - pts[i][0], p[1] - pts[i][1]));
  let left = lens.reduce((a, b) => a + b, 0) * clamp01(f);
  ctx.beginPath();
  ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length && left > 0; i++) {
    const k = Math.min(1, left / (lens[i - 1] || 1));
    ctx.lineTo(lerp(pts[i - 1][0], pts[i][0], k), lerp(pts[i - 1][1], pts[i][1], k));
    left -= lens[i - 1];
  }
  ctx.stroke();
}

export const circle = (cx: number, cy: number, r: number, n = 48, from = 0): Pt[] => Array.from({ length: n + 1 }, (_, i) => [cx + Math.cos(from + (i / n) * Math.PI * 2) * r, cy + Math.sin(from + (i / n) * Math.PI * 2) * r] as Pt);

/** An offscreen canvas `w`×`h` drawn once by `paint`. */
export function sheet(w: number, h: number, paint: (ctx: CanvasRenderingContext2D) => void): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.ceil(w));
  c.height = Math.max(1, Math.ceil(h));
  paint(c.getContext('2d')!);
  return c;
}

/** Grain over the whole of `ctx`'s canvas: light and dark specks of strength `k`. */
export function grain(ctx: CanvasRenderingContext2D, w: number, h: number, seed: number, k: number): void {
  const img = ctx.getImageData(0, 0, Math.ceil(w), Math.ceil(h));
  const r = rng(seed);
  for (let i = 0; i < img.data.length; i += 4) {
    const n = (r() - 0.5) * k * 255;
    img.data[i] = Math.min(255, Math.max(0, img.data[i] + n));
    img.data[i + 1] = Math.min(255, Math.max(0, img.data[i + 1] + n));
    img.data[i + 2] = Math.min(255, Math.max(0, img.data[i + 2] + n));
  }
  ctx.putImageData(img, 0, 0);
}

/** The menus' colours: neutral ash for the ground and the print, and the haunt's eldritch purple for what is lit. */
export const SKIN_COLOURS = { accent: '#8f72bd', glow: '#c79bff', hot: '#efe2ff', dim: '#4c3a6b' } as const;

/** Sets how a panel's words stand at one moment of an opening; every field left out is the resting state. */
export function say(panel: HTMLElement, base: string, o: { opacity?: number; clip?: string; move?: string; filter?: string } = {}): void {
  panel.style.opacity = o.opacity === undefined || o.opacity >= 1 ? '' : String(Math.max(0, o.opacity));
  panel.style.clipPath = o.clip ?? '';
  panel.style.transform = o.move ? `${base} ${o.move}` : base;
  panel.style.filter = o.filter ?? '';
}
