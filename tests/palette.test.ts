import { describe, expect, it } from 'vitest';
import { LOOKS, lookOf, type Look } from '../src/data/looks';
import { REGIONS } from '../src/data/regions';
import { ANOMALY, ANOMALY_HUES, luma, rgbToHsv } from '../src/render/palette';
import { ANOMALY_FROM, ANOMALY_TO, buildRealmPalette, gradeTint, gradeTints } from '../src/render/realmPalette';

const anomalies = Object.values(ANOMALY);
const hueGap = (a: number, b: number): number => Math.min(Math.abs(a - b), 1 - Math.abs(a - b));
/** Whether a colour would be taken for an anomaly by the post pass's colour isolation: an anomaly's hue, more than FX.minSaturation of it, and not so dark the pass ignores it (shaders/post.ts). */
const reads = (c: readonly [number, number, number]): boolean => {
  const [h, s, v] = rgbToHsv(c);
  return s > 0.3 && v > 0.08 && ANOMALY_HUES.some((a) => hueGap(h, a) < 0.1);
};

describe('the realms\' looks (round 32: every realm was the same dark grey-sepia)', () => {
  it('give every region its own look, and name no other', () => {
    for (const r of REGIONS) expect(LOOKS[r.id], r.id).toBeDefined();
    for (const id of Object.keys(LOOKS)) expect(REGIONS.some((r) => r.id === id), id).toBe(true);
    expect(lookOf(null)).toBe(LOOKS.hub);
  });

  it('are told apart: no two realms grade the picture alike', () => {
    const signature = (l: Look): number[] => {
      const t = gradeTints(l);
      return [0.12, 0.3, 0.6].flatMap((b) => gradeTint(t, b).map((c) => c * b));
    };
    const ids = Object.keys(LOOKS);
    for (let i = 0; i < ids.length; i++) {
      for (let j = i + 1; j < ids.length; j++) {
        const [a, b] = [signature(LOOKS[ids[i]]), signature(LOOKS[ids[j]])];
        const gap = Math.sqrt(a.reduce((s, x, k) => s + (x - b[k]) ** 2, 0));
        expect(gap, `${ids[i]} and ${ids[j]}`).toBeGreaterThan(0.1);
      }
    }
  });

  it('light and fill the scene only in colours the isolation does not take for an anomaly (their saturation is muted where their hue is an anomaly\'s)', () => {
    for (const [id, l] of Object.entries(LOOKS)) {
      for (const [what, c] of [['ambient', l.ambient], ['moon', l.moon], ['horizon', l.horizon], ['zenith', l.zenith], ['far', l.far]] as const) {
        expect(reads(c), `${id}: ${what}`).toBe(false);
      }
    }
  });

  it('keep some of a pixel\'s own colour through the grade, but not all of it', () => {
    for (const [id, l] of Object.entries(LOOKS)) {
      expect(l.native, id).toBeGreaterThan(0.3);
      expect(l.native, id).toBeLessThan(0.8);
    }
  });
});

describe('a realm\'s palette', () => {
  for (const [id, look] of Object.entries(LOOKS)) {
    const palette = buildRealmPalette(look);

    it(`${id}: has at most 64 colours, all displayable, and the three anomaly colours exactly`, () => {
      expect(palette.length).toBeLessThanOrEqual(64);
      for (const c of palette) for (const x of c) expect(x >= 0 && x <= 1).toBe(true);
      for (const a of anomalies) expect(palette).toContainEqual(a);
    });

    it(`${id}: keeps its anomaly colours where the shader makes them dear to match, and warm steps for the lantern's pool`, () => {
      const slots = palette.slice(ANOMALY_FROM, ANOMALY_TO);
      for (const a of anomalies) expect(slots).toContainEqual(a);
      expect(ANOMALY_TO - ANOMALY_FROM).toBe(15);
      expect(palette.filter((c) => c[0] > c[2] + 0.1 && luma(c) > 0.3).length, 'warm steps').toBeGreaterThanOrEqual(3);
    });

    it(`${id}: runs its graded ramp from black up to its lights, brightest last`, () => {
      const ramp = palette.slice(0, 24);
      expect(luma(ramp[0])).toBe(0);
      for (let i = 1; i < ramp.length; i++) expect(luma(ramp[i]), `${i}`).toBeGreaterThanOrEqual(luma(ramp[i - 1]) - 0.02);
      expect(luma(ramp[23])).toBeGreaterThan(0.7);
    });
  }

  it('turns the grade\'s four stops into tints of brightness 1', () => {
    for (const look of Object.values(LOOKS)) for (const t of gradeTints(look)) expect(luma(t)).toBeCloseTo(1, 5);
  });

  it('grades the darks toward the shade and the lights toward the high stop', () => {
    const l = LOOKS.hub;
    const t = gradeTints(l);
    const [dark, light] = [gradeTint(t, 0.04), gradeTint(t, 0.95)];
    expect(dark[2]).toBeGreaterThan(dark[0]); // the hub's shade is indigo: blue over red
    expect(light[0]).toBeGreaterThan(light[2]); // its high is lamplight: red over blue
  });

  it('knows the anomaly hues', () => {
    expect(ANOMALY_HUES[0] * 360).toBeCloseTo(328, 0);
    expect(ANOMALY_HUES[1] * 360).toBeCloseTo(275, 0);
    expect(ANOMALY_HUES[2] * 360).toBeCloseTo(153, 0);
  });
});
