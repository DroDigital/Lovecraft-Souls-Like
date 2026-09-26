import { describe, expect, it } from 'vitest';
import { drawLabels, type MapLabel } from '../src/ui/mapLabels';

/** A canvas context that only measures (6 px a letter) and records what it writes. */
function fakeContext() {
  const drawn: { text: string; x: number; y: number }[] = [];
  const ctx = { font: '', textAlign: '', textBaseline: '', fillStyle: '', measureText: (t: string) => ({ width: t.length * 6 }), fillText: (text: string, x: number, y: number) => void drawn.push({ text, x, y }), strokeText: () => undefined };
  return { drawn, ctx: ctx as unknown as CanvasRenderingContext2D };
}

const label = (text: string, x: number, y: number): MapLabel => ({ text, x, y, size: 10, color: '#fff', gap: 8 });
const overlap = (a: { text: string; x: number; y: number }, b: { text: string; x: number; y: number }): boolean =>
  !(a.x + a.text.length * 6 <= b.x || b.x + b.text.length * 6 <= a.x || a.y + 10 <= b.y || b.y + 10 <= a.y);

describe('map names (playtest round 12)', () => {
  it('names at one spot move aside rather than overlap, and one with no room left is left out', () => {
    const { drawn, ctx } = fakeContext();
    const names = [label('Elder Sign', 100, 100), label('Randolph Carter', 100, 100), label('Kuranes', 100, 100), label('Atal', 100, 100), label('Nobody', 100, 100)];
    drawLabels(ctx, names, [{ x: 100, y: 100, r: 6 }]);
    expect(drawn[0]).toMatchObject({ text: 'Elder Sign', x: 108 }); // the first keeps the right of its mark
    for (const [i, a] of drawn.entries()) for (const b of drawn.slice(i + 1)) expect(overlap(a, b), `${a.text} / ${b.text}`).toBe(false);
    expect(drawn.length).toBe(4); // right, left, above, below: the fifth finds no room
  });

  it('names clear the marks', () => {
    const { drawn, ctx } = fakeContext();
    drawLabels(ctx, [label('Sign', 100, 100)], [{ x: 100, y: 100, r: 6 }, { x: 116, y: 100, r: 6 }]);
    expect(drawn[0].x).toBeLessThan(100); // the right is taken by the next mark: it goes left
  });
});
