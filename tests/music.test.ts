import { describe, expect, it } from 'vitest';
import { pitchOf, THEMES } from '../src/data/music';
import { TIERS } from '../src/data/schema';

describe('boss themes (data/music.ts)', () => {
  it('every tier has a score that quickens with each phase, in whole bars', () => {
    for (const tier of TIERS) {
      const t = THEMES[tier];
      expect(t.bpm[1], tier).toBeGreaterThan(t.bpm[0]);
      expect(t.bpm[2], tier).toBeGreaterThan(t.bpm[1]);
      expect(t.ostinato, tier).toHaveLength(8);
      expect(t.bells, tier).toHaveLength(4);
      expect(t.chords.length, tier).toBeGreaterThan(0);
    }
  });

  it('counts degrees up the mode, an octave for each turn of it, and below the tonic for negatives', () => {
    const t = THEMES.named;
    expect(pitchOf(t, 0)).toBeCloseTo(t.tonic);
    expect(pitchOf(t, t.mode.length)).toBeCloseTo(t.tonic * 2);
    expect(pitchOf(t, 0, 2)).toBeCloseTo(t.tonic * 4);
    expect(pitchOf(t, -1)).toBeCloseTo(t.tonic * 2 ** ((t.mode.at(-1)! - 12) / 12));
  });

  it('keeps the deepest horrors in the strangest modes', () => {
    expect(THEMES.outer_god.mode).toHaveLength(6); // whole tones: no home to rest in
    expect(THEMES.great_old_one.mode[4]).toBe(6); // a diminished fifth
  });
});
