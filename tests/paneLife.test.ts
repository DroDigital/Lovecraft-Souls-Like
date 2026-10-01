import { describe, expect, it } from 'vitest';
import { CLOCK } from '../src/data/tuning';
import { paneLit } from '../src/render/paneLife';

const at = (phase: number): number => (((phase - CLOCK.start) % 1) + 1) % 1 * CLOCK.night; // the game's seconds at a phase of the night (a journey opens at CLOCK.start)

describe('lit windows lived behind (round 18: render/paneLife.ts)', () => {
  it('most panes are lit most of the time; some are put out for a spell and lit again; someone passes behind others', () => {
    const seeds = Array.from({ length: 200 }, (_, i) => (i * 0.618034) % 1);
    let [lit, out, passed] = [0, 0, 0];
    let [lowest, highest] = [1, 0]; // checked once at the end: 640,000 expects in the loop took the whole 5 s the test is given
    for (const s of seeds) {
      let [min, max, dips] = [1, 0, 0];
      for (let t = at(0.03); t < at(0.03) + 400; t += 0.25) { // a spell of the gloaming's lamplight
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

  it("the night puts the windows out as it wears on, the last seeds first, and lights them all again as it turns (round 26)", () => {
    const seeds = Array.from({ length: 100 }, (_, i) => i / 100 + 0.004);
    const litAt = (t: number): number => seeds.filter((s) => paneLit(s, t) > 0.5).length;
    expect(litAt(at(0.03))).toBeGreaterThan(seeds.length * 0.7); // the gloaming: all but those put out for a spell
    expect(litAt(at(0.9))).toBeLessThan(litAt(at(0.03)) * 0.55); // the hour before the dawn that does not come
    expect(litAt(at(0.98))).toBeGreaterThan(litAt(at(0.9))); // and it turns
    expect(paneLit(0.97, at(0.9))).toBe(0);
    expect(paneLit(0.05, at(0.9))).toBeGreaterThanOrEqual(0);
  });
});
