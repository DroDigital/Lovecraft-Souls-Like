import { describe, expect, it } from 'vitest';
import { momentOf, voicedCurve, wordMoments } from '../src/core/pace';

const RATE = 8000;
/** A recording: tone bursts at the given [from, to] seconds, silence between. */
function voice(bursts: [number, number][], seconds: number): Float32Array {
  const out = new Float32Array(Math.round(seconds * RATE));
  for (const [a, b] of bursts) for (let i = Math.round(a * RATE); i < Math.round(b * RATE); i++) out[i] = 0.4 * Math.sin((2 * Math.PI * 180 * i) / RATE);
  return out;
}

describe('a line is said as it is spoken (round 30)', () => {
  it('rises from nothing to the whole, and does not count a pause as speech', () => {
    const curve = voicedCurve(voice([[0, 1], [3, 4]], 4), RATE);
    expect(curve[curve.length - 1]).toBeCloseTo(1, 5);
    for (let i = 1; i < curve.length; i++) expect(curve[i]).toBeGreaterThanOrEqual(curve[i - 1]);
    expect(momentOf(curve, 0.45)).toBeCloseTo(0.9, 1); // nearly half of the speech is done as the first burst ends
    expect(momentOf(curve, 0.52)).toBeGreaterThanOrEqual(3); // and what comes after it is said when the voice is back, not in the silence
    expect(momentOf(curve, 0.75)).toBeCloseTo(3.5, 1); // and the pause between did not take any of the share
    expect(momentOf(curve, 0)).toBe(0);
  });

  it('gives each word the moment its share of the text begins: later words later, a pause held in its place', () => {
    const words = 'The ceiling slopes the wrong way. Mind the attic'.split(' ');
    const curve = voicedCurve(voice([[0.2, 3], [4.2, 5.4]], 5.6), RATE);
    const t = wordMoments(words, curve);
    expect(t[0]).toBeLessThan(0.4);
    for (let i = 1; i < t.length; i++) expect(t[i]).toBeGreaterThanOrEqual(t[i - 1]);
    const mind = words.indexOf('Mind');
    expect(t[mind]).toBeGreaterThanOrEqual(4.1); // after the pause, as the voice returns (the first sentence is seven tenths of the words, and of the voice)
    expect(t[mind]).toBeLessThan(4.7);
    expect(t[words.length - 1]).toBeLessThan(5.6);
  });

  it('without a recording spreads the words over the time a line takes', () => {
    const t = wordMoments(['a', 'long', 'line', 'of', 'words'], null, 1, 4);
    expect(t[0]).toBe(0);
    expect(t[4]).toBeGreaterThan(2.5);
    expect(t[4]).toBeLessThan(4);
  });

  it('is slower at a lower rate', () => {
    const curve = voicedCurve(voice([[0, 2]], 2), RATE);
    expect(momentOf(curve, 0.5, 0.5)).toBeCloseTo(2 * momentOf(curve, 0.5, 1), 5);
  });
});
