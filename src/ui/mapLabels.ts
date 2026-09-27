/**
 * The map's names, set without overlapping (playtest round 12: sign names lay over the people's).
 * Each name tries the right of its mark, then the left, above and below; one that finds no free
 * spot is left out, so the names asked for first (the regions, then the Elder Signs) always show.
 * Marks are kept clear as well.
 */

import { SERIF } from './hudKit';

export interface MapLabel {
  text: string;
  x: number; // the mark it names, in canvas pixels
  y: number;
  size: number; // font size, pixels
  color: string;
  gap: number; // pixels between the mark and the name
  centred?: boolean; // a region's name: only where it is asked for
}

interface Box {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

const clear = (b: Box, taken: readonly Box[]): boolean => taken.every((t) => b.x1 <= t.x0 || b.x0 >= t.x1 || b.y1 <= t.y0 || b.y0 >= t.y1);

/** Draws `labels` in order, each where it overlaps no earlier name and none of `marks` (centres, `r` pixels about). */
export function drawLabels(ctx: CanvasRenderingContext2D, labels: readonly MapLabel[], marks: readonly { x: number; y: number; r: number }[]): void {
  const taken: Box[] = marks.map(({ x, y, r }) => ({ x0: x - r, y0: y - r, x1: x + r, y1: y + r }));
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.lineJoin = 'round';
  ctx.lineWidth = 3;
  ctx.strokeStyle = 'rgba(5,5,6,0.8)';
  for (const l of labels) {
    ctx.font = `${l.size}px ${SERIF}`; // the period face, as an old chart's (round 14)
    const [w, h] = [ctx.measureText(l.text).width, l.size];
    const spots: readonly [number, number][] = l.centred
      ? [[l.x - w / 2, l.y]]
      : [[l.x + l.gap, l.y - h / 2], [l.x - l.gap - w, l.y - h / 2], [l.x - w / 2, l.y - l.gap - h], [l.x - w / 2, l.y + l.gap]];
    const spot = spots.find(([x, y]) => clear({ x0: x, y0: y, x1: x + w, y1: y + h }, taken));
    if (!spot) continue;
    const [x, y] = spot;
    taken.push({ x0: x - 1, y0: y - 1, x1: x + w + 1, y1: y + h + 1 });
    ctx.strokeText(l.text, x, y); // a dark edge, so a name reads over lit ground
    ctx.fillStyle = l.color;
    ctx.fillText(l.text, x, y);
  }
  ctx.textBaseline = 'alphabetic';
}
