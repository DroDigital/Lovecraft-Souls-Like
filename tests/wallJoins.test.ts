import { describe, expect, it } from 'vitest';
import { floorRange, kitOfRoom } from '../src/world/dungeonKit';
import { type BoxPart } from '../src/world/dungeonParts';
import { worldLayout } from '../src/world/placements';
import { cutBack, drawn } from '../src/world/wallJoins';

const wall = (x0: number, x1: number, z0: number, z1: number, y0 = 0, y1 = 6): BoxPart => ({ shape: 'box', look: 'wall', solid: true, room: 0, min: { x: x0, y: y0, z: z0 }, max: { x: x1, y: y1, z: z1 } });

describe('where walls of two kits meet (round 21: a timber parlour and a brick cellar fought for the corner)', () => {
  it('a wall that runs on into another in line is cut back the whole of the stub', () => {
    const cut = cutBack(wall(311.5, 318, 703.5, 704.5, 12, 18), wall(295.5, 312.5, 703.5, 704.5, 8, 18));
    expect(cut.min.x).toBeCloseTo(312.5);
    expect(cut.max.x).toBeCloseTo(318);
  });

  it("one that crosses another ends at that wall's middle, not on its far face", () => {
    const cut = cutBack(wall(279.5, 296.5, 735.5, 736.5), wall(295.5, 296.5, 729.6, 736.5));
    expect(cut.max.x).toBeCloseTo(296);
    expect(cut.min.x).toBeCloseTo(279.5);
  });

  it('a wall taller than the other, or meeting it in the middle, or not at all, is left as it is', () => {
    const [q, p] = [wall(311.5, 318, 703.5, 704.5, 4, 18), wall(295.5, 312.5, 703.5, 704.5, 8, 18)];
    expect(cutBack(q, p)).toBe(q); // it would open a hole below the other
    const mid = wall(300, 306, 703.5, 704.5, 8, 18);
    expect(cutBack(mid, p)).toBe(mid);
    const apart = wall(320, 326, 703.5, 704.5, 8, 18);
    expect(cutBack(apart, p)).toBe(apart);
  });

  it('what is drawn of a dungeon is its parts, walls only shortened, and never longer', () => {
    let cut = 0;
    for (const d of worldLayout().dungeons) {
      const seen = drawn(d.layout, d.parts);
      expect(seen.length).toBe(d.parts.length);
      seen.forEach(({ part, index }) => {
        const was = d.parts[index];
        if (part === was) return;
        expect(part.shape === 'box' && was.shape === 'box' && part.look === 'wall' && was.look === 'wall').toBe(true);
        const [a, b] = [part as BoxPart, was as BoxPart];
        for (const k of ['x', 'y', 'z'] as const) {
          expect(a.min[k]).toBeGreaterThanOrEqual(b.min[k] - 1e-9);
          expect(a.max[k]).toBeLessThanOrEqual(b.max[k] + 1e-9);
        }
        cut++;
      });
    }
    expect(cut).toBeGreaterThan(0);
  });

  it("a roofed room's ceiling reaches the middle of the walls about it and no further (the cellar's dark ceiling lay in the plane of the library's walls)", () => {
    let ceilings = 0;
    for (const d of worldLayout().dungeons) {
      for (const p of d.parts) {
        if (p.shape !== 'box' || p.look !== 'ceiling') continue;
        const r = d.layout.rooms[p.room];
        expect(kitOfRoom(d.layout, r).roof).not.toBe('open');
        expect(p.min.x).toBeGreaterThanOrEqual(r.x - r.half - 1e-9);
        expect(p.max.x).toBeLessThanOrEqual(r.x + r.half + 1e-9);
        expect(p.min.z).toBeGreaterThanOrEqual(r.z - r.half - 1e-9);
        expect(p.max.z).toBeLessThanOrEqual(r.z + r.half + 1e-9);
        expect(p.min.y).toBeGreaterThan(floorRange(r)[1]);
        ceilings++;
      }
    }
    expect(ceilings).toBeGreaterThan(50);
  });
});
