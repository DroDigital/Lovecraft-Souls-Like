import { describe, expect, it } from 'vitest';
import { WORLD } from '../src/data/tuning';
import { createSea, SEA } from '../src/render/sea';
import { AMP_SUM, seaHeight, WAVES, WAVES_GLSL } from '../src/render/seaWaves';
import { seaChop } from '../src/render/worldLife';
import { createWorldGame } from '../src/systems/game';

describe('the sea (round 30)', () => {
  it('has waves of several lengths, heights bounded by their amplitudes, that move', () => {
    expect(WAVES.length).toBeGreaterThanOrEqual(4);
    expect(new Set(WAVES.map((w) => w.length)).size).toBe(WAVES.length);
    let lo = Infinity;
    let hi = -Infinity;
    for (let i = 0; i < 400; i++) {
      const h = seaHeight(i * 3.7, i * 1.3, i * 0.21);
      lo = Math.min(lo, h);
      hi = Math.max(hi, h);
    }
    expect(hi - lo).toBeGreaterThan(0.3); // it rises and falls
    expect(hi - lo).toBeLessThan(AMP_SUM * 1.2); // and never past what its waves can raise
    expect(seaHeight(10, 20, 0)).not.toBeCloseTo(seaHeight(10, 20, 3), 2); // the same place at another time
    expect(seaHeight(10, 20, 5, 2) - seaHeight(10, 20, 5, 1)).not.toBe(0); // a stronger wind lifts it differently
  });

  it('writes the same waves into the shader', () => {
    expect((WAVES_GLSL.match(/exp\(sin\(phi\)/g) ?? []).length).toBe(WAVES.length);
    for (const w of WAVES) expect(WAVES_GLSL).toContain(w.amp.toFixed(5));
  });

  it('is four rings of grid, the finest whole and the others with the middle left to the finer, kept on whole cells', () => {
    const sea = createSea();
    expect(sea.group.children.length).toBe(4);
    const counts = sea.group.children.map((m) => (m as unknown as { geometry: { index: { count: number } } }).geometry.index.count);
    expect(counts[0]).toBeGreaterThan(counts[1]); // a whole square, then squares with their middles out
    sea.update(103.7, -58.2);
    const steps = [3.2, 6.4, 12.8, 25.6];
    sea.group.children.forEach((m, k) => {
      expect(m.position.x / steps[k]).toBeCloseTo(Math.round(m.position.x / steps[k]), 6);
      expect(m.position.y).toBe(0); // the shader lifts the water to the sea level
    });
    expect(WORLD.seaLevel).toBeLessThan(0);
  });

  it('is driven harder by a gale, by rain, and in R\'lyeh', () => {
    const g = createWorldGame();
    const wx = g.overworld!.weather;
    Object.assign(wx, { kind: 'clear', amount: 0 });
    const calm = seaChop(g);
    Object.assign(wx, { kind: 'gale', amount: 1 });
    expect(seaChop(g)).toBeGreaterThan(calm * 1.5);
    Object.assign(wx, { kind: 'rain', amount: 1 });
    expect(seaChop(g)).toBeGreaterThan(calm);
    Object.assign(wx, { kind: 'clear', amount: 0 });
    g.overworld!.region = 'rlyeh';
    expect(seaChop(g)).toBeGreaterThan(calm);
    expect(SEA.chop.value).toBeGreaterThan(0);
  });
});
