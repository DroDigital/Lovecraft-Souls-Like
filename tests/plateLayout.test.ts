import { describe, expect, it } from 'vitest';
import { layoutPlates, PLATE_HEIGHT, plateWidth, type PlateIn } from '../src/ui/plateLayout';

const plate = (id: number, x: number, y: number, name = 'Deep One', keep = false): PlateIn => ({ id, x, y, width: plateWidth(name), keep });

/** Whether two placed plates lie over one another (their names would run together). */
const over = (a: { x: number; y: number; width: number }, b: { x: number; y: number; width: number }): boolean =>
  Math.abs(a.x - b.x) < (a.width + b.width) / 2 && Math.abs(a.y - b.y) < PLATE_HEIGHT;

describe('foes\' nameplates never lie over one another (round 32)', () => {
  it('leaves plates that are apart where they are', () => {
    const out = layoutPlates([plate(1, 100, 80), plate(2, 400, 90), plate(3, 100, 300)]);
    expect(out).toEqual([{ id: 1, x: 100, y: 80 }, { id: 2, x: 400, y: 90 }, { id: 3, x: 100, y: 300 }]);
  });

  it('lifts a plate that would lie on an earlier one above it', () => {
    const [a, b] = layoutPlates([plate(1, 200, 100), plate(2, 205, 104)]);
    expect(a).toEqual({ id: 1, x: 200, y: 100 });
    expect(b.id).toBe(2);
    expect(b.y).toBeLessThanOrEqual(100 - PLATE_HEIGHT);
  });

  it('stacks several plates from one spot, none over another, the first where it began', () => {
    const list = Array.from({ length: 4 }, (_, i) => plate(i, 300, 200, 'Marlowe Degenerate'));
    const out = layoutPlates(list);
    expect(out).toHaveLength(4);
    expect(out[0].y).toBe(200);
    for (let i = 0; i < out.length; i++) for (let j = i + 1; j < out.length; j++) expect(over({ ...out[i], width: plateWidth('Marlowe Degenerate') }, { ...out[j], width: plateWidth('Marlowe Degenerate') })).toBe(false);
  });

  it('keeps the order it is given: the earlier plate holds its place against the later', () => {
    const out = layoutPlates([plate(7, 50, 50), plate(3, 52, 52)]);
    expect(out.map((o) => o.id)).toEqual([7, 3]);
    expect(out[0].y).toBe(50);
  });

  it('leaves out a plate that finds no room, unless it is the one locked on to', () => {
    const crowd = Array.from({ length: 12 }, (_, i) => plate(i, 100, 400));
    expect(layoutPlates(crowd).length).toBeLessThan(12);
    const withKeep = layoutPlates([...crowd, plate(99, 100, 400, 'Deep One', true)]);
    expect(withKeep.some((o) => o.id === 99)).toBe(true);
  });

  it('counts a long name as wider than a short one, and never narrower than the bar', () => {
    expect(plateWidth('Rat')).toBe(74);
    expect(plateWidth('Marlowe Degenerate')).toBeGreaterThan(plateWidth('Deep One'));
    expect(plateWidth('Star-spawn of Cthulhu')).toBeGreaterThan(plateWidth('Marlowe Degenerate'));
  });

  it('keeps wide plates side by side apart too: a long name beside a near one makes room', () => {
    const out = layoutPlates([plate(1, 300, 100, 'Marlowe Degenerate'), plate(2, 360, 100, 'Marlowe Degenerate')]);
    const [a, b] = out;
    expect(over({ ...a, width: plateWidth('Marlowe Degenerate') }, { ...b, width: plateWidth('Marlowe Degenerate') })).toBe(false);
  });
});
