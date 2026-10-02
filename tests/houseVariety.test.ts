import { describe, expect, it } from 'vitest';
import { createRng } from '../src/core/rng';
import { housePieces } from '../src/render/houseMesh';
import { propAt } from '../src/world/props';

const house = (seed: number, style: 'clapboard' | 'brick' | 'hovel' | 'stone') => housePieces(propAt('house', 0, 0, 0, createRng(seed * 977), 0, undefined, style), [0.6, 0.6, 0.58]);
const tintOf = (g: ReturnType<typeof house>[number]['geo']): string => [...(g.getAttribute('color')?.array ?? [])].slice(0, 3).map((v) => v.toFixed(2)).join(',');

describe('houses are not all the one house (round 35)', () => {
  it('each is painted, roofed and shaped its own way', () => {
    const seeds = Array.from({ length: 24 }, (_, i) => i + 1);
    const walls = new Set(seeds.map((s) => tintOf(house(s, 'clapboard')[0].geo)));
    const roofs = new Set(seeds.map((s) => tintOf(house(s, 'clapboard')[2].geo)));
    const volumes = new Set(seeds.map((s) => house(s, 'clapboard')[0].geo.getAttribute('position').count));
    expect(walls.size).toBeGreaterThan(10);
    expect(roofs.size).toBeGreaterThan(4);
    expect(volumes.size).toBeGreaterThan(5); // wings and bays make different bodies
    expect(new Set(seeds.map((s) => tintOf(house(s, 'brick')[0].geo))).size).toBeGreaterThan(4);
  });

  it('every lit pane carries its place on the glass, for whoever passes behind it', () => {
    for (let s = 1; s <= 12; s++) {
      for (const piece of house(s, 'clapboard').filter((p) => p.mat === 'pane')) {
        const uv = piece.geo.getAttribute('aPaneUv');
        expect(uv?.itemSize).toBe(2);
        expect(uv.count).toBe(piece.geo.getAttribute('position').count);
      }
    }
  });
});
