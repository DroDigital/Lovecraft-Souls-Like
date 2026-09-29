import { describe, expect, it } from 'vitest';
import { glitchAt, headAt, LOGO, letterLight, letterTime, SETTLED, sigilLight, tread, treadLight } from '../src/ui/logoPlan';

const [W, H] = LOGO.size;

describe('the title’s wordmark (round 20: ui/logoPlan.ts)', () => {
  it('seventy treads run down and in, each within the picture, closing up toward the dark', () => {
    let [y, half] = [-1, Infinity];
    let gap = Infinity;
    for (let k = 0; k < LOGO.steps; k++) {
      const t = tread(k);
      expect(t.y).toBeGreaterThanOrEqual(y);
      expect(t.half).toBeLessThan(half);
      expect(Math.round(t.y)).toBeGreaterThanOrEqual(0);
      expect(Math.round(t.y)).toBeLessThan(H);
      expect(t.half * 2).toBeLessThanOrEqual(W);
      if (k > 0) {
        expect(t.y - y).toBeLessThanOrEqual(gap + 1e-9); // each step down a little shorter than the last
        gap = t.y - y;
      }
      [y, half] = [t.y, t.half];
    }
    expect(tread(0).y).toBe(LOGO.stair.top);
    expect(tread(LOGO.steps - 1).y).toBeCloseTo(LOGO.stair.bottom);
    expect(tread(0).half * 2).toBeCloseTo(LOGO.stair.widest);
    expect(tread(LOGO.steps - 1).half * 2).toBeCloseTo(LOGO.stair.narrowest);
    expect(tread(1).y - tread(0).y).toBeGreaterThan(2); // the near steps stand apart: tread, then riser
  });

  it('the light sets out, goes down all seventy in its time, and no tread is lit before it comes', () => {
    const { start, seconds } = LOGO.descent;
    expect(headAt(0)).toBe(0);
    expect(headAt(start + seconds / 2)).toBeCloseTo(LOGO.steps / 2);
    expect(headAt(start + seconds)).toBe(LOGO.steps);
    expect(headAt(99)).toBe(LOGO.steps);
    for (const k of [0, 20, 69]) {
      expect(treadLight(k, (start + (k / LOGO.steps) * seconds) - 0.05)).toBe(0);
      expect(treadLight(k, start + ((k + 0.3) / LOGO.steps) * seconds), `${k}`).toBeGreaterThan(0.5); // it blazes as the light passes
      expect(treadLight(k, 30)).toBeGreaterThan(0.25); // and rests lit
    }
    expect(treadLight(20, 30)).toBeLessThan(0.6);
    expect(treadLight(69, 30)).toBeGreaterThan(treadLight(20, 30)); // the light pools at the foot of the flight
  });

  it('the letters take fire one after another, SEVENTY before STEPS, each flashing and settling, and the sign last', () => {
    const times = LOGO.words.flatMap((w, i) => [...w.text].map((_, k) => letterTime(i as 0 | 1, k)));
    expect([...times].sort((a, b) => a - b)).toEqual(times);
    for (const [i, w] of LOGO.words.entries()) {
      for (let k = 0; k < w.text.length; k++) {
        const at = letterTime(i as 0 | 1, k);
        expect(letterLight(i as 0 | 1, k, at - 0.01)).toBe(0);
        expect(letterLight(i as 0 | 1, k, at + 0.12)).toBeGreaterThan(1.4); // the flash
        const rest = letterLight(i as 0 | 1, k, at + 8);
        expect(rest).toBeGreaterThan(0.85);
        expect(rest).toBeLessThan(1.05);
      }
    }
    expect(sigilLight(LOGO.sigil.at - 0.1)).toBe(0);
    expect(sigilLight(LOGO.sigil.at + 0.3)).toBeGreaterThan(1);
    expect(sigilLight(SETTLED + 10)).toBeGreaterThan(0.7);
    expect(LOGO.sigil.at).toBeGreaterThanOrEqual(letterTime(1, LOGO.words[1].text.length - 1)); // it crowns what is already lit
    expect(SETTLED).toBeGreaterThan(letterTime(1, LOGO.words[1].text.length - 1));
    expect(SETTLED).toBeGreaterThan(LOGO.descent.start + LOGO.descent.seconds);
  });

  it('the letters shudder now and then once it has settled, never while it is being lit', () => {
    expect(glitchAt(0)).toBe(0);
    expect(glitchAt(SETTLED - 0.5)).toBe(0);
    expect(glitchAt(LOGO.glitch.from)).toBe(1);
    expect(glitchAt(LOGO.glitch.from + LOGO.glitch.seconds + 0.01)).toBe(0);
    expect(glitchAt(LOGO.glitch.from + LOGO.glitch.every)).toBe(1);
    expect(LOGO.glitch.from).toBeGreaterThanOrEqual(SETTLED);
  });
});
