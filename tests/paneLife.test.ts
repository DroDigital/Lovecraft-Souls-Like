import { describe, expect, it } from 'vitest';
import { paneLit } from '../src/render/paneLife';

describe('lit windows lived behind (round 18: render/paneLife.ts)', () => {
  it('most panes are lit most of the time; some are put out for a spell and lit again; someone passes behind others', () => {
    const seeds = Array.from({ length: 200 }, (_, i) => (i * 0.618034) % 1);
    let [lit, out, passed] = [0, 0, 0];
    let [lowest, highest] = [1, 0]; // checked once at the end: 640,000 expects in the loop took the whole 5 s the test is given
    for (const s of seeds) {
      let [min, max, dips] = [1, 0, 0];
      for (let t = 0; t < 400; t += 0.25) {
        const v = paneLit(s, t);
        [min, max] = [Math.min(min, v), Math.max(max, v)];
        if (v > 0.3 && v < 0.6) dips++;
      }
      [lowest, highest] = [Math.min(lowest, min), Math.max(highest, max)];
      if (min > 0.85) lit++;
      if (min < 0.05 && max > 0.95) out++;
      if (dips > 0) passed++;
    }
    expect(lowest).toBeGreaterThanOrEqual(0);
    expect(highest).toBeLessThanOrEqual(1);
    expect(lit).toBeGreaterThan(seeds.length * 0.3); // steady lamplight
    expect(out).toBeGreaterThan(seeds.length * 0.2); // put out, and lit again
    expect(passed).toBeGreaterThan(seeds.length * 0.1); // someone passes the lamp
  });
});
