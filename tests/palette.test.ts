import { describe, expect, it } from 'vitest';
import { ANOMALY, ANOMALY_HUES, buildPalette, rgbToHsv } from '../src/render/palette';

const anomalies = Object.values(ANOMALY);
const isAnomalyShade = (c: readonly number[]): boolean =>
  anomalies.some((a) => Math.abs(rgbToHsv([c[0], c[1], c[2]])[0] - rgbToHsv(a)[0]) < 0.02);

describe('palette', () => {
  const palette = buildPalette();

  it('has at most 64 colours', () => {
    expect(palette.length).toBeLessThanOrEqual(64);
  });

  it('contains the three anomaly colours exactly', () => {
    for (const a of anomalies) expect(palette).toContainEqual(a);
  });

  it('keeps everything except anomaly shades desaturated', () => {
    for (const c of palette) {
      if (rgbToHsv(c)[1] > 0.55) expect(isAnomalyShade(c)).toBe(true);
    }
  });

  it('knows the anomaly hues', () => {
    expect(ANOMALY_HUES[0] * 360).toBeCloseTo(328, 0);
    expect(ANOMALY_HUES[1] * 360).toBeCloseTo(275, 0);
    expect(ANOMALY_HUES[2] * 360).toBeCloseTo(153, 0);
  });
});
