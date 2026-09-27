/**
 * The small lives' sprites (playtest round 18; data/fauna.ts): each critter drawn in a few 16-pixel
 * frames with the creatures' own raster (raster.ts), facing right: sitting or at rest, and on the wing
 * or on the run. A cat comes in two coats. The fireflies need none (a glow is all they are). Packed
 * into a small atlas of their own. Pure: RGBA bytes, no Three.js.
 */

import type { CritterId } from '../../data/fauna';
import type { Rgb } from '../palette';
import { capsule, createCanvas, ellipse, outline, poly, type Canvas, type Ink } from './raster';

export const CRITTER_CELL = 16;
const COLUMNS = 16;

type Pt = readonly [number, number];
type Draw = (c: Canvas, frame: number) => void;

/** A critter's frames at rest and on the move (atlas cells). */
export interface CritterFrames {
  rest: number[];
  move: number[];
}

export interface CritterAtlas {
  data: Uint8Array;
  width: number;
  height: number;
  coats: Record<Exclude<CritterId, 'firefly'>, CritterFrames[]>;
}

const ink = (rgb: Rgb, o: Partial<Ink> = {}): Ink => ({ rgb, ...o });
const mirror = (pts: readonly Pt[]): Pt[] => pts.map(([x, y]) => [16 - x, y] as const);

/** A bird at rest on its perch, feet at the cell's foot. */
function perched(body: Rgb, wing: Rgb, bill: Rgb, o: { head?: number; tail?: number; fur?: boolean } = {}): Draw {
  const [head, tail] = [o.head ?? 1.9, o.tail ?? 1.3];
  return (c, f) => {
    const skin = o.fur ? ('fur' as const) : undefined;
    capsule(c, 7.5, 12.5, 7.5, 15.2, 0.45, 0.4, ink([0.16, 0.15, 0.14]));
    capsule(c, 4.6, 11.4, 1.8, 13.6, tail, tail * 0.55, ink(wing, { skin }));
    ellipse(c, 7.6, 10.4, 3.6, 2.5, ink(body, { skin }), -0.35);
    ellipse(c, 7, 10.2, 2.6, 1.5, ink(wing, { skin }), -0.35);
    const [hx, hy] = f ? [10.6, 7.9] : [10.8, 7.3]; // the head bobs
    ellipse(c, hx, hy, head, head * 0.95, ink(body, { skin }));
    poly(c, [[hx + 1.4, hy - 0.5], [hx + 3.9, hy + (f ? 0.9 : 0.2)], [hx + 1.4, hy + 0.8]], ink(bill));
  };
}

/** A bird on the wing, side on: its wing high, level or low. */
function flying(body: Rgb, wing: Rgb, bill: Rgb, span = 1): Draw {
  return (c, f) => {
    poly(c, [[4.6, 8], [0.8, 6.8], [0.8, 10.2], [4.6, 9.3]], ink(wing));
    ellipse(c, 8, 8.5, 4, 1.8, ink(body));
    ellipse(c, 12, 7.8, 1.7, 1.6, ink(body));
    poly(c, [[13.4, 7.3], [15.6, 7.9], [13.4, 8.5]], ink(bill));
    const tip = (y: number): number => 8 + (y - 8) * span;
    const wings: readonly (readonly Pt[])[] = [
      [[6, 7.8], [9.5, 7.8], [7.2, tip(1.2)], [5, tip(1.8)]],
      [[5.4, 8], [10, 8], [9.2, tip(5.4)], [3.8, tip(6)]],
      [[6, 9], [9.5, 9], [8.2, tip(14.4)], [5.6, tip(14)]],
    ];
    poly(c, wings[f % 3], ink(wing));
  };
}

const bat: Draw = (c, f) => {
  const wing: readonly (readonly Pt[])[] = [
    [[7, 8], [1.5, 3], [3, 6.5], [0.8, 8.6], [4, 8.2], [6.6, 9.2]],
    [[7, 8], [1, 6.4], [2.6, 9], [0.6, 10.6], [4, 9.8], [6.6, 9.6]],
    [[7, 8.6], [2, 12], [3.6, 10.6], [1.6, 14], [5, 11], [7, 10]],
  ];
  const w = ink([0.22, 0.18, 0.17]);
  poly(c, wing[f % 3], w);
  poly(c, mirror(wing[f % 3]), w);
  const b = ink([0.19, 0.16, 0.15], { skin: 'fur' });
  ellipse(c, 8, 8.2, 1.6, 2, b);
  poly(c, [[6.9, 6.8], [6.6, 4.9], [7.7, 6.3]], b);
  poly(c, mirror([[6.9, 6.8], [6.6, 4.9], [7.7, 6.3]]), b);
};

const rat = (run: boolean): Draw => (c, f) => {
  const fur = ink([0.34, 0.3, 0.27], { skin: 'fur' });
  capsule(c, 3.6, 13.4, 0.4, 14.6, 0.5, 0.3, ink([0.52, 0.44, 0.41]));
  const legs: readonly (readonly [number, number, number, number])[] = run ? (f ? [[6, 14, 6.4, 15.3], [9, 14, 8.6, 15.3]] : [[5.4, 14, 4.2, 15.3], [9.6, 14, 10.8, 15.3]]) : [[6, 14.2, 6, 15.3], [9, 14.2, 9, 15.3]];
  for (const [x0, y0, x1, y1] of legs) capsule(c, x0, y0, x1, y1, 0.4, 0.35, ink([0.27, 0.23, 0.21]));
  ellipse(c, 7, 12.8, 3.8, 2.1, fur);
  const up = !run && f ? -0.7 : 0; // sniffing the air
  ellipse(c, 11.2, 12.7 + up, 2.2, 1.6, fur, 0.15);
  ellipse(c, 13.2, 13.1 + up * 1.4, 1, 0.8, fur);
  ellipse(c, 10.4, 10.9 + up, 0.9, 1, ink([0.46, 0.38, 0.36]));
  ellipse(c, 11.9, 12.1 + up, 0.5, 0.5, ink([0.75, 0.42, 0.34], { glint: true }));
};

const moth: Draw = (c, f) => {
  const pale = ink([0.86, 0.83, 0.73]);
  for (const side of [-1, 1]) ellipse(c, 8 + side * (f ? 1.1 : 2), f ? 8.2 : 8, f ? 1.2 : 2.3, f ? 1.9 : 1.6, pale, f ? 0 : -0.3 * side); // wings shut, or open
  capsule(c, 8, 7, 8, 10.2, 0.7, 0.5, ink([0.55, 0.5, 0.42]));
};

const cat = (coat: Rgb, walking: boolean): Draw => (c, f) => {
  const fur = ink(coat, { skin: 'fur' });
  const eye = ink([0.74, 0.8, 0.5], { glint: true });
  if (!walking) {
    if (f) capsule(c, 4.3, 14.2, 2, 10.6, 0.7, 0.45, fur);
    else capsule(c, 4.3, 14.6, 1.2, 13.4, 0.7, 0.45, fur);
    ellipse(c, 6.8, 11.5, 2.8, 3.6, fur, 0.15);
    ellipse(c, 8.3, 11.3, 1.6, 2.6, fur);
    capsule(c, 8.6, 12.8, 8.8, 15.2, 0.6, 0.5, fur);
    ellipse(c, 9.4, 6.6, 2.3, 2, fur);
    poly(c, [[8, 5.3], [8.3, 3.2], [9.4, 4.7]], fur);
    poly(c, [[9.8, 4.7], [10.9, 3.2], [11.1, 5.4]], fur);
    ellipse(c, 10.4, 6.3, 0.45, 0.45, eye);
    return;
  }
  capsule(c, 3.4, 9.8, 1.3, 6.2 + f * 0.6, 0.6, 0.4, fur);
  const legs = f ? [[4.8, 12, 5.4, 15.2], [9.8, 12, 9.2, 15.2]] : [[4.5, 12, 3.8, 15.2], [10.2, 12, 11, 15.2]];
  for (const [x0, y0, x1, y1] of legs) capsule(c, x0, y0, x1, y1, 0.55, 0.45, fur);
  ellipse(c, 7.5, 10.6, 4.4, 2.1, fur);
  ellipse(c, 12.3, 8.6, 2, 1.8, fur);
  poly(c, [[11.1, 7.4], [11.3, 5.6], [12.2, 7]], fur);
  poly(c, [[12.6, 7], [13.6, 5.6], [13.7, 7.6]], fur);
  ellipse(c, 13.2, 8.3, 0.45, 0.45, eye);
};

const CROW = [0.25, 0.25, 0.28] as const;
const BILL = [0.3, 0.28, 0.26] as const;

/** Each critter's coats: its drawings at rest and on the move, with how many frames of each. */
const PLANS: Record<Exclude<CritterId, 'firefly'>, readonly { rest: readonly [Draw, number]; move: readonly [Draw, number] }[]> = {
  crow: [{ rest: [perched(CROW, [0.17, 0.17, 0.2], BILL), 2], move: [flying(CROW, [0.17, 0.17, 0.2], BILL), 3] }],
  gull: [{ rest: [perched([0.8, 0.78, 0.72], [0.46, 0.5, 0.52], [0.66, 0.6, 0.46], { tail: 1.1 }), 2], move: [flying([0.8, 0.78, 0.72], [0.5, 0.54, 0.56], [0.66, 0.6, 0.46], 1.15), 3] }],
  whippoorwill: [{ rest: [perched([0.42, 0.33, 0.25], [0.34, 0.27, 0.21], [0.24, 0.2, 0.17], { head: 2.1, fur: true }), 2], move: [flying([0.42, 0.33, 0.25], [0.36, 0.29, 0.22], [0.24, 0.2, 0.17], 1.1), 3] }],
  bat: [{ rest: [bat, 3], move: [bat, 3] }],
  rat: [{ rest: [rat(false), 2], move: [rat(true), 2] }],
  moth: [{ rest: [moth, 2], move: [moth, 2] }],
  cat: [
    { rest: [cat([0.13, 0.13, 0.14], false), 2], move: [cat([0.13, 0.13, 0.14], true), 2] },
    { rest: [cat([0.52, 0.37, 0.26], false), 2], move: [cat([0.52, 0.37, 0.26], true), 2] },
  ],
};

/** Every critter's frames, drawn and packed. */
export function critterAtlas(): CritterAtlas {
  const drawn: { canvas: Canvas }[] = [];
  const coats = {} as CritterAtlas['coats'];
  const draw = ([plan, n]: readonly [Draw, number], seed: number): number[] =>
    Array.from({ length: n }, (_, f) => {
      const canvas = createCanvas(CRITTER_CELL, CRITTER_CELL, seed + f);
      plan(canvas, f);
      outline(canvas, [0.05, 0.05, 0.06]);
      return drawn.push({ canvas }) - 1;
    });
  for (const [id, plans] of Object.entries(PLANS) as [keyof typeof PLANS, (typeof PLANS)[keyof typeof PLANS]][]) {
    coats[id] = plans.map((p, k) => ({ rest: draw(p.rest, k * 31), move: draw(p.move, k * 31 + 7) }));
  }
  const rows = Math.ceil(drawn.length / COLUMNS);
  const [width, height] = [COLUMNS * CRITTER_CELL, rows * CRITTER_CELL];
  const data = new Uint8Array(width * height * 4);
  drawn.forEach(({ canvas }, cell) => {
    const [cx, cy] = [(cell % COLUMNS) * CRITTER_CELL, Math.floor(cell / COLUMNS) * CRITTER_CELL];
    for (let y = 0; y < CRITTER_CELL; y++) data.set(canvas.px.subarray(y * CRITTER_CELL * 4, (y + 1) * CRITTER_CELL * 4), ((cy + y) * width + cx) * 4);
  });
  return { data, width, height, coats };
}

/** Top-left pixel of a critter atlas cell. */
export const critterCell = (cell: number): readonly [number, number] => [(cell % COLUMNS) * CRITTER_CELL, Math.floor(cell / COLUMNS) * CRITTER_CELL];
